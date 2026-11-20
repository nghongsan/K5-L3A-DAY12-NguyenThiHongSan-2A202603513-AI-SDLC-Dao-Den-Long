// Test CLI headless từ đầu đến cuối (đúng lệnh trong game.contract.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const contract = JSON.parse(readFileSync(join(ROOT, 'game.contract.json'), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'ddl-'));
const cli = (...args) => {
  const [bin, ...pre] = contract.headless_cmd.split(' ');
  return spawnSync(bin === 'node' ? process.execPath : bin, [...pre, ...args], { cwd: ROOT, encoding: 'utf8' });
};
const file = (name, content) => {
  const p = join(tmp, name);
  writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
  return p;
};
const readLines = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('CLI chạy theo contract: thoát 0, snapshot tick 0, dòng cuối end', () => {
  const out = join(tmp, 'a.jsonl');
  const sc = file('sc.json', { random_motes: false, random_shades: false, motes: [[0, 0, 5]], time_left_s: 300 });
  const inp = file('in.json', { frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 0 }] });
  const r = cli('--seed', '1', '--night', '1', '--scenario', sc, '--inputs', inp, '--ticks', '120', '--out', out, '--snapshot-every', '60');
  assert.equal(r.status, 0, r.stderr);
  const lines = readLines(out);
  assert.equal(lines[0].type, 'snapshot');
  assert.equal(lines[0].tick, 0);
  assert.deepEqual(lines.filter((l) => l.type === 'snapshot').map((l) => l.tick), [0, 60, 120]);
  assert.equal(lines.filter((l) => l.name === 'mote_picked').length, 1);
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 120, state: 'playing', score: contract.tuning.score.per_mote });
});

test('CLI tất định: 2 lần chạy cho file giống từng byte (kể cả id tự sinh)', () => {
  const inp = join(ROOT, 'scenarios', 'demo-inputs.json');
  const a = join(tmp, 'd1.jsonl');
  const b = join(tmp, 'd2.jsonl');
  for (const out of [a, b]) assert.equal(cli('--seed', '42', '--night', '1', '--inputs', inp, '--ticks', '2000', '--out', out).status, 0);
  assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
});

test('CLI: file sai định dạng => mã 2 và báo lỗi ra stderr', () => {
  const out = join(tmp, 'bad.jsonl');
  const cases = {
    'json hỏng': ['--inputs', file('bad1.json', '{ "frames": [ ')],
    'tick không tăng': ['--inputs', file('bad2.json', { frames: [{ tick: 5 }, { tick: 5 }] })],
    'move ngoài [-1,1]': ['--inputs', file('bad3.json', { frames: [{ tick: 0, move: [2, 0] }] })],
    'thiếu frames': ['--inputs', file('bad4.json', { tick: 0 })],
    'đèn không tồn tại': ['--scenario', file('bad5.json', { lanterns: [{ id: 'L9', lit: true }] })],
    'pos sai kiểu': ['--scenario', file('bad6.json', { player: { pos: [0, 0] } })],
  };
  for (const [name, extra] of Object.entries(cases)) {
    const r = cli('--seed', '1', '--night', '1', ...extra, '--ticks', '10', '--out', out);
    assert.equal(r.status, 2, name);
    assert.ok(r.stderr.length > 0, name);
  }
});

test('CLI: thiếu tham số bắt buộc => mã khác 0', () => {
  const r = cli('--seed', '1', '--night', '1', '--ticks', '10');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--out/);
});
