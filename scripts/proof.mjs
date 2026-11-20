// Chạy toàn bộ kiểm chứng và ghi bằng chứng: npm run proof [-- --phase 1]
// Kết quả: docs/proof/phase-N/{proof-summary.md, test-report.txt, runs/*}
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { loadContract } from '../src/headless/contract.js';
import { playBot } from '../src/core/bot.js';

const ai = process.argv.indexOf('--phase');
const phase = ai > 0 ? process.argv[ai + 1] : '1';
const dir = `docs/proof/phase-${phase}`;
mkdirSync(`${dir}/runs`, { recursive: true });
const tmp = os.tmpdir();
const contract = loadContract();
const T = contract.tuning;
const [bin, ...pre] = contract.headless_cmd.split(' ');
const headless = (...args) => {
  const t0 = performance.now();
  const r = spawnSync(bin === 'node' ? process.execPath : bin, [...pre, ...args], { encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr, ms: performance.now() - t0 };
};
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const endOf = (p) => JSON.parse(readFileSync(p, 'utf8').trim().split('\n').at(-1));
const git = (...a) => spawnSync('git', a, { encoding: 'utf8' }).stdout.trim();
const rows = [];
let allOk = true;
const check = (name, ok, detail) => {
  rows.push(`| ${name} | ${ok ? 'ĐẠT' : '**KHÔNG ĐẠT**'} | ${detail} |`);
  allOk &&= ok;
};

// 1) test đơn vị + scenario
const test = spawnSync(process.execPath, ['--test'], { encoding: 'utf8' });
writeFileSync(`${dir}/test-report.txt`, test.stdout + test.stderr);
const n = (k) => new RegExp(`# ${k} (\\d+)`).exec(test.stdout)?.[1];
check('Test đơn vị + scenario (`npm test`)', test.status === 0, `pass ${n('pass')}, fail ${n('fail')} → [test-report.txt](test-report.txt)`);

// 2) tất định qua CLI (đúng lệnh trong game.contract.json)
const demo = 'scenarios/demo-inputs.json';
const outA = `${dir}/runs/demo-seed42.jsonl`;
const outB = join(tmp, 'ddl-demo-seed42-b.jsonl');
const outC = join(tmp, 'ddl-demo-seed43.jsonl');
const ra = headless('--seed', '42', '--night', '1', '--inputs', demo, '--ticks', '3000', '--out', outA);
const rb = headless('--seed', '42', '--night', '1', '--inputs', demo, '--ticks', '3000', '--out', outB);
const rc = headless('--seed', '43', '--night', '1', '--inputs', demo, '--ticks', '3000', '--out', outC);
const [ha, hb, hc] = [outA, outB, outC].map(sha);
check('Tất định: seed 42 chạy 2 lần giống từng byte', ra.status === 0 && rb.status === 0 && ha === hb, `sha256 ${ha.slice(0, 16)}… = ${hb.slice(0, 16)}… → [runs/demo-seed42.jsonl](runs/demo-seed42.jsonl)`);
check('Khác seed (43) → output khác', rc.status === 0 && ha !== hc, `sha256 ${hc.slice(0, 16)}…`);

// 3) mã thoát với file sai định dạng
const bad = join(tmp, 'ddl-bad-inputs.json');
writeFileSync(bad, JSON.stringify({ frames: [{ tick: 3 }, { tick: 1 }] }));
const rbad = headless('--seed', '1', '--night', '1', '--inputs', bad, '--ticks', '10', '--out', join(tmp, 'ddl-bad.jsonl'));
check('File inputs sai định dạng → mã thoát 2', rbad.status === 2, `status ${rbad.status}, stderr: \`${rbad.stderr.trim().slice(0, 90)}\``);

// 4) chơi được từ đầu tới thắng/thua: bot chơi 10 seed, phát lại seed 1 qua CLI
const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
const games = seeds.map((s) => ({ seed: s, ...playBot(T, s) }));
const won = games.filter((g) => g.result === 'won').length;
check('Đêm 1 chơi được tới kết thúc (bot, 10 seed)', games.every((g) => g.result !== 'playing'), `${won}/10 thắng, còn lại thua; bảng bên dưới`);
const g1 = games[0];
const botInputs = `${dir}/runs/bot-seed1-inputs.json`;
const botOut = `${dir}/runs/bot-seed1.jsonl`;
writeFileSync(botInputs, JSON.stringify({ frames: g1.frames }));
const rbot = headless('--seed', '1', '--night', '1', '--inputs', botInputs, '--ticks', String(T.night1_duration_s * 60), '--out', botOut);
const e = endOf(botOut);
check(
  'Phát lại input của bot qua CLI ra đúng kết quả ván',
  rbot.status === 0 && e.state === g1.result && e.score === g1.score && e.ticks === g1.ticks,
  `end ${JSON.stringify(e)} → [runs/bot-seed1.jsonl](runs/bot-seed1.jsonl)`,
);

// 5) hiệu năng headless: một đêm đầy đủ 18000 tick
const perfOut = join(tmp, 'ddl-perf.jsonl');
const rp = headless('--seed', '5', '--night', '1', '--scenario', 'scenarios/long-night.json', '--ticks', String(T.night1_duration_s * 60), '--out', perfOut);
const pe = endOf(perfOut);
check('Hiệu năng: 1 đêm đủ 18000 tick (đo cả khởi động Node)', rp.status === 0 && pe.ticks === T.night1_duration_s * 60, `${rp.ms.toFixed(0)} ms, end ${JSON.stringify(pe)}`);

const dirty = git('status', '--porcelain', '--', 'src', 'web', 'tests', 'game.contract.json', 'scenarios', 'package.json');
const md = `# Bằng chứng tự động — Phase ${phase}

Sinh bởi \`npm run proof\` (scripts/proof.mjs). Không sửa tay file này.

- Thời điểm: ${new Date().toISOString()}
- Commit mã: \`${git('rev-parse', '--short', 'HEAD')}\`${dirty ? ' (có thay đổi chưa commit trong src/tests)' : ''}
- Máy: ${os.type()} ${os.release()} · ${os.cpus()[0]?.model} · ${os.cpus().length} nhân · Node ${process.version}

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
${rows.join('\n')}

## Bot chơi thử 10 seed (src/core/bot.js, chỉ dùng input như người chơi)

| seed | kết quả | lý do | thời gian (s) | điểm | đèn thắp | lửa còn |
|---:|---|---|---:|---:|---:|---:|
${games.map((g) => `| ${g.seed} | ${g.result} | ${g.reason} | ${(g.ticks / 60).toFixed(1)} | ${g.score} | ${g.lit}/5 | ${g.flames} |`).join('\n')}
`;
writeFileSync(`${dir}/proof-summary.md`, md);
console.log(md);
process.exit(allOk ? 0 : 1);
