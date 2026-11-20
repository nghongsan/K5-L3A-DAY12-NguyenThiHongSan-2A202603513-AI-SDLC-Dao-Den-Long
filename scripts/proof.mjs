// Chạy toàn bộ kiểm chứng và ghi bằng chứng: npm run proof [-- --phase 4] [--no-fps] [--no-ui]
// Kết quả: docs/proof/phase-N/{proof-summary.md, test-report.txt, runs/*}
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { loadContract } from '../src/headless/contract.js';
import { playBot } from '../src/core/bot.js';

const ai = process.argv.indexOf('--phase');
const phase = ai > 0 ? process.argv[ai + 1] : '2';
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

// 2) tất định qua CLI cho từng Đêm (đúng lệnh trong game.contract.json)
const demo = 'scenarios/demo-inputs.json';
for (const night of [1, 2, 3]) {
  const outA = `${dir}/runs/demo-night${night}-seed42.jsonl`;
  const outB = join(tmp, `ddl-demo-${night}-b.jsonl`);
  const outC = join(tmp, `ddl-demo-${night}-c.jsonl`);
  const ra = headless('--seed', '42', '--night', String(night), '--inputs', demo, '--ticks', '3000', '--out', outA);
  const rb = headless('--seed', '42', '--night', String(night), '--inputs', demo, '--ticks', '3000', '--out', outB);
  const rc = headless('--seed', '43', '--night', String(night), '--inputs', demo, '--ticks', '3000', '--out', outC);
  const [ha, hb, hc] = [outA, outB, outC].map(sha);
  check(`Tất định Đêm ${night}: seed 42 hai lần giống từng byte, seed 43 khác`, ra.status === 0 && rb.status === 0 && rc.status === 0 && ha === hb && ha !== hc, `sha256 ${ha.slice(0, 12)}… = ${hb.slice(0, 12)}… ≠ ${hc.slice(0, 12)}… → [runs/demo-night${night}-seed42.jsonl](runs/demo-night${night}-seed42.jsonl)`);
}

// 3) mã thoát với file sai định dạng
const bad = join(tmp, 'ddl-bad-inputs.json');
writeFileSync(bad, JSON.stringify({ frames: [{ tick: 3 }, { tick: 1 }] }));
const rbad = headless('--seed', '1', '--night', '2', '--inputs', bad, '--ticks', '10', '--out', join(tmp, 'ddl-bad.jsonl'));
check('File inputs sai định dạng → mã thoát 2', rbad.status === 2, `status ${rbad.status}, stderr: \`${rbad.stderr.trim().slice(0, 90)}\``);

// 4) hiệu năng headless: một Đêm đầy đủ mỗi Đêm (tối đa 21600 tick) phải <= 30 s
for (const night of [1, 2, 3]) {
  const ticks = T[`night${night}_duration_s`] * 60;
  const perfOut = join(tmp, `ddl-perf-${night}.jsonl`);
  const rp = headless('--seed', '5', '--night', String(night), '--scenario', 'scenarios/long-night.json', '--ticks', String(ticks), '--out', perfOut);
  const pe = endOf(perfOut);
  check(`Hiệu năng headless Đêm ${night}: ${ticks} tick <= 30 s`, rp.status === 0 && pe.ticks === ticks && rp.ms <= 30000, `${rp.ms.toFixed(0)} ms (gồm khởi động Node)`);
}

// 5) chơi được: bot 10 seed mỗi Đêm; phát lại 1 ván thắng qua CLI
const games = [];
for (const night of [1, 2, 3]) for (let s = 1; s <= 10; s++) games.push({ night, seed: s, ...playBot(T, s, night) });
const won = (nt) => games.filter((g) => g.night === nt && g.result === 'won').length;
check('Mỗi ván chơi tới kết thúc (bot, 3 Đêm × 10 seed)', games.every((g) => g.result === 'won' || g.result === 'lost'), `thắng Đêm 1: ${won(1)}/10, Đêm 2: ${won(2)}/10, Đêm 3: ${won(3)}/10 (bảng bên dưới)`);
const gw = games.find((g) => g.result === 'won') ?? games[0];
const botInputs = `${dir}/runs/bot-night${gw.night}-seed${gw.seed}-inputs.json`;
const botOut = `${dir}/runs/bot-night${gw.night}-seed${gw.seed}.jsonl`;
writeFileSync(botInputs, JSON.stringify({ frames: gw.frames }));
const rbot = headless('--seed', String(gw.seed), '--night', String(gw.night), '--inputs', botInputs, '--ticks', '21600', '--out', botOut);
const e = endOf(botOut);
check(`Phát lại input bot (Đêm ${gw.night}, seed ${gw.seed}) qua CLI ra đúng kết quả`, rbot.status === 0 && e.state === gw.result && e.score === gw.score && e.ticks === gw.ticks, `end ${JSON.stringify(e)} → [runs/${botOut.split('/').pop()}](runs/${botOut.split('/').pop()})`);

// 6) FPS bản thường ở 1280×720 (Chrome, GPU mặc định) — tự bật server tạm
let fpsRows = '';
if (!process.argv.includes('--no-fps')) {
  const port = 5600 + Math.floor(Math.random() * 300);
  const srv = spawn(process.execPath, ['server.mjs', '--no-open'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const bench = (extra) => {
    const r = spawnSync(process.execPath, ['scripts/bench-fps.mjs', '--url', `http://127.0.0.1:${port}`, '--secs', '8', ...extra], { encoding: 'utf8', timeout: 90000 });
    try {
      return JSON.parse(r.stdout.trim().split('\n').at(-1));
    } catch {
      return null;
    }
  };
  const res = [];
  for (const night of ['1', '2', '3']) res.push({ night, capped: bench(['--night', night]), uncapped: bench(['--night', night, '--uncapped']) });
  srv.kill();
  const ok = res.every((r) => r.capped && r.capped.avgFps >= 29.5);
  check('FPS bản thường 1280×720 >= 30 (Chrome, GPU)', ok, 'bảng FPS bên dưới; headless Chrome có trần khung hình (30 hoặc 60) nên đo thêm bản bỏ trần');
  fpsRows = `\n## FPS bản thường (scripts/bench-fps.mjs, bot chơi 8 s, bỏ 1 s đầu)\n\n| Đêm | Trung bình (có trần khung hình của headless) | Trung bình (bỏ trần) | Khung hình | Renderer |\n|---|---:|---:|---|---|\n${res
    .map((r) => `| ${r.night} | ${r.capped?.avgFps ?? '—'} | ${r.uncapped?.avgFps ?? '—'} | ${r.capped?.size ?? '—'} | ${r.capped?.renderer ?? '—'} |`)
    .join('\n')}\n`;
}

// 7) giao diện thật qua Chrome DevTools (menu, tạm dừng, đổi phím, cỡ chữ, lưu điểm, bảng xếp hạng)
if (!process.argv.includes('--no-ui')) {
  const ui = spawnSync(process.execPath, ['scripts/ui-smoke.mjs'], { encoding: 'utf8', timeout: 180000 });
  writeFileSync(`${dir}/ui-smoke.txt`, ui.stdout + ui.stderr);
  const pass = (ui.stdout.match(/^PASS/gm) ?? []).length;
  const fail = (ui.stdout.match(/^(FAIL|CRASH)/gm) ?? []).length;
  check('Giao diện thật qua Chrome (scripts/ui-smoke.mjs)', ui.status === 0 && fail === 0 && pass > 0, `${pass} bước đạt, ${fail} lỗi → [ui-smoke.txt](ui-smoke.txt)`);
}

const dirty = git('status', '--porcelain', '--', 'src', 'web', 'tests', 'scripts', 'server.mjs', 'game.contract.json', 'scenarios', 'package.json');
const md = `# Bằng chứng tự động — Phase ${phase}

Sinh bởi \`npm run proof -- --phase ${phase}\` (scripts/proof.mjs). Không sửa tay file này.

- Thời điểm: ${new Date().toISOString()}
- Commit mã: \`${git('rev-parse', '--short', 'HEAD')}\`${dirty ? ' (có thay đổi chưa commit trong src/tests/web)' : ''}
- Máy: ${os.type()} ${os.release()} · ${os.cpus()[0]?.model} · ${os.cpus().length} nhân · Node ${process.version}
- Contract: v${contract.contract_version}

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
${rows.join('\n')}
${fpsRows}
## Bot chơi thử (src/core/bot.js, chỉ dùng input như người chơi)

| Đêm | seed | kết quả | lý do | thời gian (s) | điểm | đèn | lửa còn |
|---:|---:|---|---|---:|---:|---:|---:|
${games.map((g) => `| ${g.night} | ${g.seed} | ${g.result} | ${g.reason} | ${(g.ticks / 60).toFixed(1)} | ${g.score} | ${g.lit}/${g.total} | ${g.flames} |`).join('\n')}
`;
writeFileSync(`${dir}/proof-summary.md`, md);
console.log(md);
process.exit(allOk ? 0 : 1);
