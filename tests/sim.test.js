// Luật lõi (Phase 1) chạy với SỐ CHUẨN Ticket-02 / contract v1.1.
// Test nào đổi kỳ vọng so với Phase 1 có ghi "[P2: ...]" = lý do (xem docs/notes/phase-2.md §5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runHeadless, toJsonl } from '../src/core/runner.js';
import { T, contract, run, snaps, events, last, at, ticksOf, hd } from './helpers.js';

test('C1 contract v1.1: đủ khóa, tuning khớp số chuẩn Ticket-02', () => {
  assert.equal(contract.contract_version, '1.1');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof contract[k], 'string', k);
  const std = {
    player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5, pickup_radius: 1, interact_radius: 2,
    pulse_cost: 3, pulse_radius: 5, night1_duration_s: 300, night2_duration_s: 330, night3_duration_s: 360, flames: 3,
    invuln_s: 1.5, hit_drop_ratio: 0.5, pulse_stun_s: 2, pulse_push_m: 4, pulse_cooldown_s: 3, safe_radius: 6,
    shade_speed: 4, shade_hit_radius: 1, fall_enabled: true, dash_speed: 14, dash_duration_s: 0.2, dash_cooldown_s: 1.5,
  };
  for (const [k, v] of Object.entries(std)) assert.equal(T[k], v, k);
  assert.deepEqual(T.score, { per_mote: 10, per_lantern: 100, per_stun: 5, per_second_left: 2, per_flame_left: 50 });
});

test('R2 di chuyển: move [0,1], yaw 0, 60 tick => 6 m theo +Z (tăng tốc tức thì ≤ 0.1 s)', () => {
  assert.deepEqual(last(run({}, [{ tick: 0, move: [0, 1] }])).player.pos, [0, 0, 6]);
  assert.deepEqual(at(run({}, [{ tick: 0, move: [0, 1] }], 2), 1).player.vel, [0, 0, 6]);
});

test('R2 xoay theo cam_yaw_deg: yaw 90 + [0,1] => +X; yaw 0 + [1,0] => +X; vector dài được chuẩn hóa', () => {
  assert.deepEqual(last(run({}, [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }])).player.pos, [6, 0, 0]);
  assert.deepEqual(last(run({}, [{ tick: 0, move: [1, 0] }])).player.pos, [6, 0, 0]);
  const [x, , z] = last(run({}, [{ tick: 0, move: [1, 1] }])).player.pos;
  assert.ok(Math.abs(Math.hypot(x, z) - 6) < 0.01);
});

test('R2 nhảy 7 m/s, trọng lực 20: chỉ khi chạm đất, giữ nút không nhảy lần 2', () => {
  const ss = snaps(run({}, [{ tick: 0, jump: true }], 90));
  const top = Math.max(...ss.map((s) => s.player.pos[1]));
  assert.ok(top > 1.1 && top < 1.3, `đỉnh ${top}`);
  assert.equal(ss[1].player.grounded, false);
  assert.equal(ss.at(-1).player.pos[1], 0);
  assert.equal(ss.at(-1).player.grounded, true);
  assert.equal(ss.slice(50).filter((s) => s.player.pos[1] > 0).length, 0);
});

test('R3 nhặt tự động trong 1.0 m (<=) và chênh cao <= 1.5 m; nhặt không cộng điểm [P2: điểm tính lúc nạp]', () => {
  const lines = run({ motes: [[0, 0, 1], [0, 0, 1.1], [0, 1.5, 0], { id: 'HIGH', pos: [0, 1.6, 0] }] }, [], 1);
  assert.deepEqual(events(lines, 'mote_picked').map((e) => e.data.carried), [1, 2]);
  assert.deepEqual(last(lines).motes.map((m) => m.id).sort(), ['HIGH', 'M2']);
  assert.equal(last(lines).score, 0);
});

test('R3 không mang quá carry_capacity (10)', () => {
  const s = last(run({ motes: Array.from({ length: 12 }, () => [0, 0, 0]) }, [], 1));
  assert.equal(s.player.carried, 10);
  assert.equal(s.motes_active, 2);
});

test('R4 nạp đủ 10 thì thắp, +10/đom đóm nạp +100/đèn', () => {
  const lines = run({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] }, [{ tick: 0, interact: true }], 2);
  assert.deepEqual(events(lines).filter((e) => e.tick > 0).map((e) => [e.tick, e.name]), [[1, 'deposit'], [1, 'lantern_lit']]);
  assert.deepEqual(events(lines, 'deposit')[0].data, { lantern_id: 'L1', amount: 10, deposited: 10 });
  assert.equal(last(lines).score, 10 * 10 + 100);
});

test('R4 nạp nhiều lần, đèn nhớ tiến độ; giữ nút không nạp lặp; ngoài 2.0 m không nạp', () => {
  let lines = run({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], deposited: 6 }] }, [{ tick: 0, interact: true }], 5);
  assert.deepEqual(events(lines, 'deposit').map((e) => e.data), [{ lantern_id: 'L1', amount: 4, deposited: 10 }]);
  assert.equal(last(lines).player.carried, 1);
  assert.equal(events(lines, 'lantern_lit').length, 1);
  lines = run({ player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 2.1] }] }, [{ tick: 0, interact: true }], 2);
  assert.equal(events(lines, 'deposit').length, 0);
});

test('R4 nhiều đèn trong tầm: chọn đèn gần nhất, bằng nhau thì id nhỏ hơn', () => {
  const sc = { player: { carried: 3 }, lanterns: [{ id: 'L2', pos: [2, 0, 0] }, { id: 'L3', pos: [-2, 0, 0] }, { id: 'L4', pos: [0, 0, 1.9] }] };
  assert.equal(events(run(sc, [{ tick: 0, interact: true }], 1), 'deposit')[0].data.lantern_id, 'L4');
  const tie = { ...sc, lanterns: sc.lanterns.slice(0, 2) };
  assert.equal(events(run(tie, [{ tick: 0, interact: true }], 1), 'deposit')[0].data.lantern_id, 'L2');
});

test('R8 thắng khi mọi đèn sáng; đèn đặt sẵn không được điểm; thưởng giây còn lại + lửa', () => {
  const lanterns = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true }));
  lanterns.push({ id: 'L5', pos: [0, 0, 1] });
  const lines = run({ player: { carried: 10 }, lanterns, time_left_s: 100 }, [{ tick: 0, interact: true }], 10);
  assert.deepEqual(events(lines, 'game_over').map((e) => [e.tick, e.data]), [[1, { result: 'won', reason: 'all_lit' }]]);
  const score = 100 + 100 + 2 * Math.floor((6000 - 1) / 60) + 50 * 3;
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 1, state: 'won', score });
});

test('R8 thắp đèn cuối đúng tick hết giờ vẫn thắng (all_lit trước dawn)', () => {
  const lanterns = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true }));
  lanterns.push({ id: 'L5', pos: [0, 0, 1] });
  const lines = run({ player: { carried: 10 }, lanterns, time_left_s: 1 / 60 }, [{ tick: 0, interact: true }], 5);
  assert.deepEqual(events(lines, 'game_over')[0].data, { result: 'won', reason: 'all_lit' });
});

test('R6 Tỏa Sáng: tốn 3, tâm = chân + 0.8 m, chọn mục tiêu theo khoảng cách 3D <= 5, +5/Bóng Mực', () => {
  const sc = { player: { carried: 4 }, shades: [{ id: 'A', pos: [4, 1, 0] }, { id: 'B', pos: [0, 1, 4.9] }, { id: 'C', pos: [-5, 1, 0] }] };
  const lines = run(sc, [{ tick: 0, pulse: true }], 1);
  assert.deepEqual(events(lines, 'pulse').map((e) => [e.tick, e.data]), [[1, { stunned_ids: ['A', 'B'] }]]);
  const s = last(lines);
  assert.equal(s.player.carried, 1);
  assert.equal(s.score, 2 * 5);
  assert.deepEqual(s.shades.map((x) => x.state), ['stunned', 'stunned', 'chase']);
  assert.equal(s.player.pulse_cd_s, 3);
});

test('R6 choáng 120 tick; 15 tick đầu đẩy lùi tổng 4 m; rồi đuổi tiếp [P2: v1.0 đẩy tức thì, choáng 3 s]', () => {
  const ss = snaps(run({ player: { carried: 3 }, shades: [{ id: 'A', pos: [3, 1, 0] }] }, [{ tick: 0, pulse: true }], 122));
  assert.equal(ss[1].shades[0].pos[0], 3.267);
  assert.equal(ss[15].shades[0].pos[0], 7);
  assert.equal(ss[120].shades[0].pos[0], 7);
  assert.equal(ss[120].shades[0].state, 'stunned');
  assert.equal(ss[121].shades[0].state, 'chase');
  assert.ok(ss[121].shades[0].pos[0] < 7);
});

test('R6 đẩy lùi khi trùng vị trí đi theo +X; Tỏa Sáng lại làm mới choáng', () => {
  const lines = run({ player: { carried: 6 }, shades: [{ id: 'A', pos: [0, 1, 0] }] }, [{ tick: 0, pulse: true }], 16);
  assert.deepEqual(at(lines, 15).shades[0].pos, [4, 1, 0]);
});

test('R6 hồi chiêu 180 tick; không đủ 3 đom đóm thì không kích hoạt', () => {
  const sc = { player: { carried: 9 } };
  const early = run(sc, [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 179, pulse: true }], 190);
  assert.deepEqual(events(early, 'pulse').map((e) => e.tick), [1]);
  const ready = run(sc, [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 180, pulse: true }], 190);
  assert.deepEqual(events(ready, 'pulse').map((e) => e.tick), [1, 181]);
  assert.equal(events(run({ player: { carried: 2 } }, [{ tick: 0, pulse: true }], 5), 'pulse').length, 0);
});

test('R5 Bóng Mực: trong 12 m thì chase với 4.0 m/s; xa thì wander; quá 18 m thì bỏ đuổi', () => {
  let s = last(run({ shades: [{ id: 'A', pos: [10, 1, 0] }] }, [], 60));
  assert.equal(s.shades[0].pos[0], 6);
  assert.equal(s.shades[0].state, 'chase');
  s = at(run({ shades: [{ id: 'A', pos: [30, 1, 0] }] }, [], 2), 1);
  assert.equal(s.shades[0].state, 'wander');
  // người chạy 6 m/s bỏ xa bóng 4 m/s: quá 18 m thì về wander
  const lines = run({ shades: [{ id: 'A', pos: [-11, 1, 0] }] }, [{ tick: 0, move: [1, 0] }], 60 * 6);
  assert.equal(at(lines, 1).shades[0].state, 'chase');
  assert.equal(last(lines).shades[0].state, 'wander');
});

test('R5 bị chạm: −1 lửa, rơi floor(mang/2) ra vành 1.5–2.5 m (TTL 480), bất tử 90 tick, bóng lùi 2 m/60 tick', () => {
  const lines = run({ player: { carried: 4 }, shades: [{ id: 'A', pos: [0, 1, 0] }] }, [], 92);
  const hits = events(lines, 'player_hit');
  assert.deepEqual(hits.map((h) => h.tick), [1, 91]);
  assert.deepEqual(hits[0].data, { by: 'shade', flames: 2, dropped: 2 });
  const s1 = at(lines, 1);
  assert.equal(s1.player.carried, 2);
  assert.equal(s1.player.invuln, true);
  assert.equal(s1.shades[0].state, 'recoil');
  const dropped = s1.motes.filter((m) => m.kind === 'dropped');
  assert.equal(dropped.length, 2);
  for (const m of dropped) {
    const d = hd(m.pos, s1.player.pos);
    assert.ok(d >= 1.5 - 1e-3 && d <= 2.5 + 1e-3, `vành ${d}`);
    assert.equal(m.ttl_s, 8);
  }
  assert.equal(at(lines, 60).shades[0].pos[0], 2);
  assert.equal(at(lines, 60).shades[0].state, 'recoil');
  assert.equal(at(lines, 61).shades[0].state, 'chase');
});

test('R5 chạm cần chênh cao <= 1.5 m; Bóng Mực không leo được vách tầng (Đêm 3)', () => {
  // Mây ở mép tầng 1 (Y=3), bóng ở tầng 0 ngay dưới vách: XZ 0.8 m nhưng chênh cao 2 m
  const high = run({ player: { pos: [0, 3, 12.2] }, shades: [{ id: 'A', pos: [0, 1, 11.4] }] }, [], 60, { night: 3 });
  assert.equal(events(high, 'player_hit').length, 0);
  assert.ok(Math.hypot(...[0, 2].map((i) => last(high).shades[0].pos[i])) < 12, 'bóng vẫn ở tầng 0');
  // đối chứng trên mặt phẳng: cùng khoảng cách XZ thì bị đánh
  const flat = run({ player: { pos: [0, 0, -30] }, shades: [{ id: 'A', pos: [0, 1, -30.8] }] }, [], 5, { night: 3 });
  assert.equal(events(flat, 'player_hit').length, 1);
});

test('R5 vùng an toàn 6 m: bóng bên ngoài bị chặn ở mép; bóng bên trong lúc thắp bị đẩy ra trong 30 tick, không gây sát thương', () => {
  const L = [0, 0, 25];
  const sc = { player: { pos: L }, lanterns: [{ id: 'L1', pos: L, lit: true }], shades: [{ id: 'A', pos: [0, 1, 15] }, { id: 'B', pos: [3, 1, 27] }] };
  const lines = run(sc, [], 600);
  assert.equal(at(lines, 1).shades.find((s) => s.id === 'B').state, 'recoil');
  for (const s of snaps(lines).filter((x) => x.tick >= 30)) {
    for (const sh of s.shades) assert.ok(hd(sh.pos, L) >= 6 - 1e-3, `tick ${s.tick} ${sh.id} ${hd(sh.pos, L)}`);
  }
  assert.equal(events(lines, 'player_hit').length, 0);

  // thắp đèn khi bóng đang sát người: bị đẩy ra, không đánh
  const sc2 = { player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }], shades: [{ id: 'A', pos: [0.5, 1, 0] }] };
  const l2 = run(sc2, [{ tick: 0, interact: true }], 120);
  assert.equal(events(l2, 'lantern_lit').length, 1);
  assert.equal(events(l2, 'player_hit').length, 0);
  assert.ok(hd(at(l2, 30).shades[0].pos, [0, 0, 1]) >= 6 - 1e-3);
});

test('R8 thua khi hết lửa (no_flames) và khi hết giờ (dawn)', () => {
  let lines = run({ player: { flames: 1 }, shades: [{ pos: [0, 1, 0] }] }, [], 10);
  assert.deepEqual(events(lines, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 1, state: 'lost', score: 0 });
  lines = run({ time_left_s: 1 }, [], 1000);
  assert.deepEqual(events(lines, 'game_over').map((e) => [e.tick, e.data]), [[60, { result: 'lost', reason: 'dawn' }]]);
});

test('C2 snapshot v1.1: tick 0 rồi night_start; đều mỗi --snapshot-every; dòng cuối end; đủ trường mới', () => {
  const lines = runHeadless({ tuning: T, seed: 7, night: 1, ticks: 95, snapshotEvery: 10 });
  assert.equal(lines[0].type, 'snapshot');
  assert.deepEqual(lines[1], { type: 'event', tick: 0, name: 'night_start', data: { night: 1 } });
  assert.deepEqual(snaps(lines).map((s) => s.tick), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 95, state: 'playing', score: 0 });
  const s0 = lines[0];
  assert.deepEqual(Object.keys(s0), ['type', 'tick', 'sim_tick', 'state', 'night', 'time_left_s', 'score', 'wind', 'player', 'lanterns', 'shades', 'motes_active', 'motes', 'drifters', 'charms']);
  assert.deepEqual(s0.player, { pos: [0, 0, 0], vel: [0, 0, 0], grounded: true, flames: 3, carried: 0, invuln: false, dash_cd_s: 0, pulse_cd_s: 0, charm_s: 0 });
  assert.deepEqual(s0.wind, { active: false, dir_deg: null });
  assert.equal(s0.motes_active, 20);
  assert.equal(new Set(s0.motes.map((m) => m.pos.join())).size, 20);
  assert.ok(s0.motes.every((m) => m.kind === 'random' && m.ttl_s === null));
  assert.deepEqual(s0.lanterns.map((l) => l.pos), [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]);
  assert.deepEqual([s0.shades, s0.drifters, s0.charms], [[], [], []]);
});

test('R3 lịch đom đóm: 20 lúc đầu, +1 ở tick 240, 480… tại điểm trống, trần 30', () => {
  const lines = run({ random_motes: true }, [], 480, { every: 240 });
  assert.deepEqual(snaps(lines).map((s) => s.motes_active), [20, 21, 22]);
});

test('R5 lịch Bóng Mực Đêm 1: 2 con ở tick 300 (spawning), rồi mỗi 480 tick; id S1, S2…; cách người chơi >= 15 m', () => {
  const lines = run({ random_shades: true, player: { flames: 99 } }, [], 781, { every: 1 });
  assert.deepEqual(events(lines, 'shade_spawned').map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2'], [780, 'S3']]);
  const s300 = at(lines, 300);
  assert.deepEqual(s300.shades.map((s) => s.state), ['spawning', 'spawning']);
  for (const sh of s300.shades) {
    assert.ok(hd(sh.pos, s300.player.pos) >= 15);
    assert.ok(Math.abs(Math.hypot(sh.pos[0], sh.pos[2]) - 37) < 0.01);
  }
  assert.ok(at(lines, 301).shades.every((s) => s.state === 'wander' || s.state === 'chase'));
});

test('C3 tất định: cùng seed + inputs => giống từng byte; khác seed => khác (cả 3 Đêm)', () => {
  const inputs = JSON.parse(readFileSync(new URL('../scenarios/demo-inputs.json', import.meta.url), 'utf8'));
  for (const night of [1, 2, 3]) {
    const go = (seed) => toJsonl(runHeadless({ tuning: T, seed, night, inputs, ticks: 3000 }));
    assert.equal(go(42), go(42));
    assert.notEqual(go(42), go(43));
  }
});
