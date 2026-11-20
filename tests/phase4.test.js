// Ticket-04: bảng xếp hạng (lưu đĩa + lệnh xuất), soak, chế độ bench của lõi. Mã L*/S*/B* xem docs/notes/phase-4.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../src/core/sim.js';
import { T } from './helpers.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'ddl-p4-'));
const lbFile = join(tmp, 'leaderboard.json');
process.env.DDL_LEADERBOARD = lbFile;
const { addEntry, readBoard, validateEntry, sortEntries } = await import('../server.mjs');
const entry = (name, score, at, nights_won = 1) => ({ name, score, nights_won, achieved_at: at, seed: 42 });

test('L1 Tên 3–12 ký tự [A-Za-z0-9_] (+ tiếng Việt có dấu); achieved_at ISO 8601 có múi giờ', () => {
  assert.equal(validateEntry(entry('May_01', 10, '2026-11-20T19:00:00+07:00')), null);
  assert.equal(validateEntry(entry('Mây', 10, '2026-11-20T19:00:00+07:00')), null);
  for (const bad of ['ab', 'abcdefghijklm', 'có dấu cách', 'x-y']) assert.ok(validateEntry(entry(bad, 1, '2026-11-20T19:00:00Z')), bad);
  assert.ok(validateEntry(entry('Good', 1, '2026-11-20T19:00:00')), 'thiếu múi giờ');
  assert.ok(validateEntry({ ...entry('Good', 1, '2026-11-20T19:00:00Z'), nights_won: 4 }));
});

test('L2 Top 10, score giảm dần, bằng điểm thì ai đạt trước đứng trên; lưu trên đĩa', () => {
  for (let i = 0; i < 12; i++) addEntry(entry(`P${String(i).padStart(2, '0')}`, i % 4 === 0 ? 500 : i * 10, `2026-11-20T19:${String(i).padStart(2, '0')}:00+07:00`));
  const b = readBoard();
  assert.equal(b.length, 10);
  assert.deepEqual(b.slice(0, 3).map((e) => e.name), ['P00', 'P04', 'P08']);
  assert.deepEqual(b, sortEntries(b));
  assert.deepEqual(JSON.parse(readFileSync(lbFile, 'utf8')).entries, b);
});

test('L3 Lệnh xuất: <run_cmd> --export-leaderboard out.json => {"entries": [...]} đúng thứ tự', () => {
  const out = join(tmp, 'out.json');
  const contract = JSON.parse(readFileSync(join(ROOT, 'game.contract.json'), 'utf8'));
  const [bin, ...pre] = contract.run_cmd.split(' ');
  const r = spawnSync(bin === 'node' ? process.execPath : bin, [...pre, '--export-leaderboard', out], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: lbFile } });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { entries: readBoard() });
});

test('S1 Soak: 10 Đêm trong một tiến trình, crashes = 0, mem_end <= 1.2 × mem_start, đúng định dạng', () => {
  const contract = JSON.parse(readFileSync(join(ROOT, 'game.contract.json'), 'utf8'));
  const [bin, ...pre] = contract.soak_cmd.split(' ');
  const out = join(tmp, 'soak.json');
  const r = spawnSync(bin === 'node' ? process.execPath : bin, [...pre, '--seed', '7', '--nights', '10', '--out', out], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const s = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(s.nights, 10);
  assert.equal(s.crashes, 0);
  assert.equal(s.results.length, 10);
  assert.ok(s.results.every((x) => x === 'won' || x === 'lost'));
  assert.deepEqual(s.details.map((d) => [d.night, d.seed]), Array.from({ length: 10 }, (_, i) => [(i % 3) + 1, 7 + i]));
  assert.ok(s.mem_end_mb <= 1.2 * s.mem_start_mb, `${s.mem_end_mb} vs ${s.mem_start_mb}`);
  assert.equal(typeof s.duration_s, 'number');
});

test('B1 Chế độ bench của lõi: không sinh thêm, không sát thương, không nhặt, không hao dầu, không kết thúc; bóng vẫn di chuyển', () => {
  const shades = Array.from({ length: 20 }, (_, i) => ({ pos: [Math.cos(i) * (3 + i), 1, Math.sin(i) * (3 + i)], state: 'wander' }));
  const motes = Array.from({ length: 10 }, (_, i) => [i * 0.1, 0, 0]);
  const scenario = { random_motes: false, random_shades: false, lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: 100 })), shades, motes, time_left_s: 1 };
  const g = new Game({ tuning: T, seed: 42, night: 1, scenario, benchMode: true });
  const p0 = g.shades.map((s) => [...s.pos]);
  const ev = [];
  for (let k = 0; k < 600; k++) ev.push(...g.step({}));
  assert.equal(g.state, 'playing');
  assert.equal(g.shades.length, 20);
  assert.equal(g.motes.length, 10);
  assert.equal(g.player.flames, 3);
  assert.ok(g.lanterns.slice(0, 3).every((l) => l.lit && l.fuel === 6000));
  assert.deepEqual(ev.filter((e) => ['player_hit', 'mote_picked', 'shade_spawned', 'game_over', 'lantern_out'].includes(e.name)), []);
  assert.ok(g.shades.some((s, i) => Math.hypot(s.pos[0] - p0[i][0], s.pos[2] - p0[i][2]) > 1), 'bóng vẫn di chuyển');
});
