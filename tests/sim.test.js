// Test luật game Phase 1 (mã yêu cầu R* xem docs/notes/phase-1.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runHeadless, toJsonl } from '../src/core/runner.js';
import { loadContract } from '../src/headless/contract.js';
import { WORLD } from '../src/core/sim.js';

const contract = loadContract();
const T = contract.tuning;
const quiet = { random_motes: false, random_shades: false };
const run = (scenario, frames = [], ticks = 60, seed = 1, snapshotEvery = 1) =>
  runHeadless({ tuning: T, seed, scenario: { ...quiet, ...scenario }, inputs: { frames }, ticks, snapshotEvery });
const snaps = (lines) => lines.filter((l) => l.type === 'snapshot');
const events = (lines, name) => lines.filter((l) => l.type === 'event' && (!name || l.name === name));
const last = (lines) => snaps(lines).at(-1);
const ticksOf = (s) => Math.round(s * 60);

test('C1 game.contract.json có đủ khóa của contract v1.0', () => {
  assert.equal(contract.contract_version, '1.0');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof contract[k], 'string', k);
  const keys = ['player_speed', 'carry_capacity', 'lantern_cost', 'lantern_count_night1', 'pickup_radius',
    'interact_radius', 'pulse_cost', 'pulse_radius', 'night1_duration_s', 'flames', 'invuln_s', 'hit_drop_ratio',
    'pulse_stun_s', 'pulse_push_m', 'pulse_cooldown_s', 'safe_radius', 'shade_speed', 'shade_hit_radius'];
  for (const k of keys) assert.equal(typeof T[k], 'number', k);
  assert.equal(T.lantern_count_night1, 5);
  assert.equal(T.fall_enabled, false);
  for (const k of ['per_mote', 'per_lantern', 'per_stun', 'per_second_left', 'per_flame_left']) assert.equal(typeof T.score[k], 'number');
});

test('R2 di chuyển: move [0,1], yaw 0, 60 tick => đi player_speed mét theo +Z', () => {
  assert.deepEqual(last(run({}, [{ tick: 0, move: [0, 1] }])).player.pos, [0, 0, T.player_speed]);
});

test('R2 xoay theo cam_yaw_deg: yaw 90 + [0,1] => +X; yaw 0 + [1,0] => +X', () => {
  assert.deepEqual(last(run({}, [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }])).player.pos, [T.player_speed, 0, 0]);
  assert.deepEqual(last(run({}, [{ tick: 0, move: [1, 0] }])).player.pos, [T.player_speed, 0, 0]);
});

test('R2 vector dài hơn 1 được chuẩn hóa', () => {
  const [x, , z] = last(run({}, [{ tick: 0, move: [1, 1] }])).player.pos;
  assert.ok(Math.abs(Math.hypot(x, z) - T.player_speed) < 0.01);
});

test('R2 nhảy: chỉ kích hoạt khi false->true, rời đất rồi về Y=0', () => {
  const ss = snaps(run({}, [{ tick: 0, jump: true }], 90));
  assert.ok(Math.max(...ss.map((s) => s.player.pos[1])) > 0.5);
  assert.equal(ss.at(-1).player.pos[1], 0);
  // giữ nút suốt 90 tick không nhảy lần 2
  assert.equal(ss.slice(60).filter((s) => s.player.pos[1] > 0).length, 0);
});

test('R2 không rơi khỏi đảo (fall_enabled=false): bị giữ trong bán kính đảo', () => {
  const s = last(run({}, [{ tick: 0, move: [0, 1] }], 60 * 10));
  assert.ok(Math.hypot(s.player.pos[0], s.player.pos[2]) < 40);
});

test('R3 nhặt đom đóm trong pickup_radius (<=), không nhặt ngoài', () => {
  const lines = run({ motes: [[0, 0, T.pickup_radius], [0, 0, T.pickup_radius + 0.1]] }, [], 1);
  assert.deepEqual(events(lines, 'mote_picked').map((e) => [e.tick, e.data]), [[1, { carried: 1 }]]);
  assert.equal(last(lines).motes_active, 1);
  assert.equal(last(lines).score, T.score.per_mote);
});

test('R3 không mang quá carry_capacity', () => {
  const motes = Array.from({ length: T.carry_capacity + 2 }, () => [0, 0, 0]);
  const s = last(run({ motes }, [], 1));
  assert.equal(s.player.carried, T.carry_capacity);
  assert.equal(s.motes_active, 2);
});

test('R4 nạp đủ lantern_cost thì thắp đèn, cộng per_lantern', () => {
  const sc = { player: { carried: T.lantern_cost }, lanterns: [{ id: 'L1', pos: [0, 0, T.interact_radius] }] };
  const lines = run(sc, [{ tick: 0, interact: true }], 2);
  assert.deepEqual(events(lines).map((e) => [e.tick, e.name]), [[1, 'deposit'], [1, 'lantern_lit']]);
  assert.deepEqual(events(lines, 'deposit')[0].data, { lantern_id: 'L1', amount: T.lantern_cost, deposited: T.lantern_cost });
  const s = last(lines);
  assert.equal(s.lanterns[0].lit, true);
  assert.equal(s.player.carried, 0);
  assert.equal(s.score, T.score.per_lantern);
});

test('R4 nạp thiếu thì chưa thắp; giữ nút không nạp lặp; ngoài interact_radius thì không nạp', () => {
  const sc = { player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] };
  let lines = run(sc, [{ tick: 0, interact: true }], 5);
  assert.deepEqual(events(lines).map((e) => [e.name, e.data]), [['deposit', { lantern_id: 'L1', amount: 2, deposited: 2 }]]);
  assert.equal(last(lines).lanterns[0].lit, false);
  lines = run({ ...sc, lanterns: [{ id: 'L1', pos: [0, 0, T.interact_radius + 0.1] }] }, [{ tick: 0, interact: true }], 2);
  assert.equal(events(lines).length, 0);
});

test('R8 thắng khi đủ 5 đèn sáng; đèn đặt sẵn lit không được cộng điểm', () => {
  const lanterns = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true }));
  lanterns.push({ id: 'L5', pos: [0, 0, 1] });
  const lines = run({ player: { carried: T.lantern_cost }, lanterns, time_left_s: 100 }, [{ tick: 0, interact: true }], 10);
  assert.deepEqual(events(lines, 'game_over').map((e) => [e.tick, e.data]), [[1, { result: 'won', reason: 'all_lit' }]]);
  const secondsLeft = Math.floor((100 * 60 - 1) / 60);
  const score = T.score.per_lantern + T.score.per_second_left * secondsLeft + T.score.per_flame_left * T.flames;
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 1, state: 'won', score });
  assert.equal(lines[0].score, 0);
});

test('R6 tỏa sáng: tốn pulse_cost, choáng + đẩy Bóng Mực trong pulse_radius, cộng per_stun', () => {
  const sc = { player: { carried: 2 }, shades: [{ id: 'A', pos: [T.pulse_radius, 1, 0] }, { id: 'B', pos: [T.pulse_radius + 1, 1, 0] }] };
  const lines = run(sc, [{ tick: 0, pulse: true }], 1);
  assert.deepEqual(events(lines, 'pulse').map((e) => [e.tick, e.data]), [[1, { stunned_ids: ['A'] }]]);
  const s = last(lines);
  assert.equal(s.player.carried, 2 - T.pulse_cost);
  const a = s.shades.find((x) => x.id === 'A');
  assert.equal(a.state, 'stunned');
  assert.equal(a.pos[0], T.pulse_radius + T.pulse_push_m);
  assert.equal(s.shades.find((x) => x.id === 'B').state, 'chase');
  assert.equal(s.score, T.score.per_stun);
});

test('R6 choáng đúng pulse_stun_s rồi đuổi tiếp', () => {
  const st = ticksOf(T.pulse_stun_s);
  const ss = snaps(run({ player: { carried: 1 }, shades: [{ id: 'A', pos: [3, 1, 0] }] }, [{ tick: 0, pulse: true }], st + 1));
  assert.equal(ss[st].shades[0].state, 'stunned');
  assert.equal(ss[st].shades[0].pos[0], 3 + T.pulse_push_m);
  assert.equal(ss[st + 1].shades[0].state, 'chase');
  assert.ok(ss[st + 1].shades[0].pos[0] < 3 + T.pulse_push_m);
});

test('R6 hồi chiêu pulse_cooldown_s; thiếu ánh sáng thì không tỏa', () => {
  const cd = ticksOf(T.pulse_cooldown_s);
  const sc = { player: { carried: 3 }, shades: [] };
  const early = run(sc, [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: cd - 1, pulse: true }], cd + 5);
  assert.deepEqual(events(early, 'pulse').map((e) => e.tick), [1]);
  const ready = run(sc, [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: cd, pulse: true }], cd + 5);
  assert.deepEqual(events(ready, 'pulse').map((e) => e.tick), [1, cd + 1]);
  const broke = run({ player: { carried: T.pulse_cost - 1 } }, [{ tick: 0, pulse: true }], 5);
  assert.equal(events(broke, 'pulse').length, 0);
});

test('R5 Bóng Mực đuổi theo người chơi với shade_speed', () => {
  const s = last(run({ shades: [{ id: 'A', pos: [20, 1, 0] }] }, [], 60));
  assert.equal(s.shades[0].pos[0], 20 - T.shade_speed);
  assert.equal(s.shades[0].state, 'chase');
});

test('R5 bị chạm: mất 1 lửa, rơi hit_drop_ratio đom đóm, bất tử invuln_s', () => {
  const inv = ticksOf(T.invuln_s);
  const lines = run({ player: { carried: 4 }, shades: [{ id: 'A', pos: [0, 1, 0] }] }, [], inv + 1);
  const hits = events(lines, 'player_hit');
  assert.deepEqual(hits.map((h) => h.tick), [1, 1 + inv]);
  assert.deepEqual(hits[0].data, { by: 'shade', flames: T.flames - 1, dropped: Math.floor(4 * T.hit_drop_ratio) });
});

test('R5 Bóng Mực không vào safe_radius của đèn đã thắp', () => {
  const L = [0, 0, 25];
  const sc = { player: { pos: L }, lanterns: [{ id: 'L1', pos: L, lit: true }], shades: [{ id: 'A', pos: [0, 1, 10] }, { id: 'B', pos: [3, 1, 27] }] };
  const lines = run(sc, [], 600);
  for (const s of snaps(lines).slice(1)) {
    for (const sh of s.shades) assert.ok(Math.hypot(sh.pos[0] - L[0], sh.pos[2] - L[2]) > T.safe_radius, `tick ${s.tick} ${sh.id}`);
  }
  assert.equal(events(lines, 'player_hit').length, 0);
});

test('R8 thua khi hết lửa (no_flames)', () => {
  const lines = run({ player: { flames: 1 }, shades: [{ pos: [0, 1, 0] }] }, [], 10);
  assert.deepEqual(events(lines, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 1, state: 'lost', score: 0 });
});

test('R8 thua khi trời sáng (dawn) đúng lúc hết giờ', () => {
  const lines = run({ time_left_s: 1 }, [], 1000);
  assert.equal(events(lines, 'game_over')[0].tick, 60);
  assert.deepEqual(events(lines, 'game_over')[0].data, { result: 'lost', reason: 'dawn' });
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 60, state: 'lost', score: 0 });
});

test('C2 snapshot từ tick 0, đều mỗi --snapshot-every, dòng cuối là end, dựng scenario không phát event', () => {
  const lines = runHeadless({ tuning: T, seed: 7, scenario: { lanterns: [{ id: 'L2', lit: true }] }, ticks: 95, snapshotEvery: 10 });
  assert.deepEqual(snaps(lines).map((s) => s.tick), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 95, state: 'playing', score: 0 });
  const s0 = lines[0];
  assert.equal(s0.lanterns.length, 5);
  assert.equal(s0.score, 0);
  assert.equal(s0.time_left_s, T.night1_duration_s);
  assert.deepEqual(s0.player, { pos: [0, 0, 0], flames: T.flames, carried: 0 });
  assert.ok(events(lines).every((e) => e.tick >= 1));
});

test('R5 Bóng Mực mới xuất hiện theo thời gian, phát shade_spawned với id mới', () => {
  const every = ticksOf(WORLD.shadeSpawnEveryS);
  const lines = runHeadless({ tuning: T, seed: 3, scenario: { player: { flames: 99 } }, ticks: every, snapshotEvery: 600 });
  assert.equal(lines[0].shades.length, WORLD.initialShades);
  assert.deepEqual(events(lines, 'shade_spawned').map((e) => [e.tick, e.data.id]), [[every, `S${WORLD.initialShades + 1}`]]);
});

test('C3 tất định: cùng seed + inputs => output giống hệt; khác seed => khác', () => {
  const inputs = JSON.parse(readFileSync(new URL('../scenarios/demo-inputs.json', import.meta.url), 'utf8'));
  const go = (seed) => toJsonl(runHeadless({ tuning: T, seed, inputs, ticks: 3000 }));
  assert.equal(go(42), go(42));
  assert.notEqual(go(42), go(43));
});
