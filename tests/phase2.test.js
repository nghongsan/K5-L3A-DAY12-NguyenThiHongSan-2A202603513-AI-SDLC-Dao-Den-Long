// Scenario headless cho tính năng mới của Ticket-02 (mã F*/M* xem docs/notes/phase-2.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runHeadless } from '../src/core/runner.js';
import { T, run, snaps, events, last, at, hd } from './helpers.js';

// ---------- Lướt ----------
test('F1 Lướt: 14 m/s trong 12 tick (2.8 m), đứng yên thì theo hướng mặt (+Z), event dash', () => {
  const lines = run({}, [{ tick: 0, dash: true }], 20);
  assert.deepEqual(events(lines, 'dash').map((e) => e.tick), [1]);
  assert.deepEqual(at(lines, 12).player.pos, [0, 0, 2.8]);
  assert.deepEqual(at(lines, 13).player.pos, [0, 0, 2.8]);
  assert.equal(at(lines, 1).player.dash_cd_s, 1.5);
});

test('F1 Lướt theo hướng đang di chuyển; hồi chiêu 90 tick tính từ lúc bắt đầu', () => {
  const l = run({}, [{ tick: 0, move: [1, 0], dash: true }], 2);
  assert.ok(at(l, 1).player.pos[0] > 0.2);
  const early = run({}, [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 89, dash: true }], 100);
  assert.deepEqual(events(early, 'dash').map((e) => e.tick), [1]);
  const ready = run({}, [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 90, dash: true }], 100);
  assert.deepEqual(events(ready, 'dash').map((e) => e.tick), [1, 91]);
});

test('F1 Lướt trên không giữ nguyên độ cao; không bất tử khi lướt', () => {
  const lines = run({}, [{ tick: 0, jump: true }, { tick: 10, dash: true }], 30);
  const y = at(lines, 11).player.pos[1];
  assert.ok(y > 0.5);
  for (let k = 11; k <= 22; k++) assert.equal(at(lines, k).player.pos[1], y, `tick ${k}`);
  assert.ok(at(lines, 24).player.pos[1] < y);
  const hit = run({ shades: [{ id: 'A', pos: [0, 1, 1.5] }] }, [{ tick: 0, dash: true }], 3);
  assert.equal(events(hit, 'player_hit').length, 1);
});

// ---------- Rơi khỏi đảo ----------
test('F2 Rơi (Y < −10): −1 lửa, mất toàn bộ đom đóm (lost), chờ 60 tick rồi hồi sinh ở điểm xuất phát, bất tử 90 tick', () => {
  const lines = run({ player: { pos: [39.5, 0, 0], carried: 4 } }, [{ tick: 0, move: [1, 0] }, { tick: 10, move: [0, 0] }], 300);
  const hits = events(lines, 'player_hit');
  assert.equal(hits.length, 1, 'đúng 1 lần');
  const F = hits[0].tick;
  assert.deepEqual(hits[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 4 });
  assert.ok(at(lines, F).player.pos[1] < -10);
  assert.equal(at(lines, F + 59).player.pos[1] < -10, true, 'đang chờ');
  const r = at(lines, F + 60).player;
  assert.deepEqual([r.pos, r.vel, r.grounded, r.invuln, r.carried], [[0, 0, 0], [0, 0, 0], true, true, 0]);
  assert.equal(at(lines, F + 60 + 89).player.invuln, true);
  assert.equal(at(lines, F + 60 + 90).player.invuln, false);
});

test('F2 Rơi bỏ qua bất tử; hết lửa khi rơi thì thua ngay (no_flames), không hồi sinh', () => {
  const l = run({ player: { pos: [39.9, 0, 0], flames: 1, invuln_ticks: 600 } }, [{ tick: 0, move: [1, 0] }], 300);
  assert.deepEqual(events(l, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.equal(events(l, 'game_over')[0].tick, events(l, 'player_hit')[0].tick);
});

// ---------- Bản đồ ----------
test('M1 Đêm 1: không còn lan can — bước ra ngoài bán kính 40 m là rơi [P2: thay luật Phase 1]', () => {
  const l = run({ player: { pos: [39.5, 0, 0] } }, [{ tick: 0, move: [1, 0] }], 120);
  assert.equal(events(l, 'player_hit')[0].data.by, 'fall');
});

test('M2 Đêm 2: 6 đèn; cầu tre x∈[26,44], z∈[−2,2] đi qua được; lệch khỏi cầu thì rơi', () => {
  let l = run({ charms: [] }, [{ tick: 0, move: [1, 0] }], 600, { night: 2 }); // bỏ bùa (35,0,0) để tốc độ chuẩn 6 m/s
  assert.equal(at(l, 0).lanterns.length, 6);
  assert.deepEqual(last(l).player.pos, [60, 0, 0]);
  assert.equal(events(l, 'player_hit').length, 0);
  l = run({ player: { pos: [24, 0, 5] } }, [{ tick: 0, move: [1, 0] }], 300, { night: 2 });
  assert.equal(events(l, 'player_hit')[0].data.by, 'fall');
});

test('M2 Bục nhảy Đêm 2: bắn lên 14 m/s + 24 m/s ngang về tâm đảo kia, bay ~1.4 s, đáp trong đảo B', () => {
  const l = run({ player: { pos: [20, 0, 18] } }, [{ tick: 0, move: [-1, 0] }], 120, { night: 2 });
  const s2 = at(l, 2).player;
  assert.equal(s2.grounded, false);
  assert.ok(s2.vel[1] > 13);
  const landed = snaps(l).find((s) => s.tick > 2 && s.player.grounded);
  assert.ok(landed.tick >= 80 && landed.tick <= 90, `đáp ở tick ${landed.tick}`);
  assert.ok(hd(landed.player.pos, [70, 0, 0]) <= 28, 'trong đảo B');
  assert.equal(events(l, 'player_hit').length, 0);
});

test('M3 Đêm 3: vách tầng 1 chặn đi lên; dốc 30° đưa lên Y=3; bục (0,3,13) đưa lên tầng 2; tháp chặn', () => {
  const wall = last(run({ player: { pos: [0, 0, 26] } }, [{ tick: 0, move: [0, -1] }], 60, { night: 3 }));
  assert.ok(wall.player.pos[2] >= 24 && wall.player.pos[1] === 0, JSON.stringify(wall.player.pos));
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const ramp = last(run({ player: { pos: [30.5 * c, 0, 30.5 * s] } }, [{ tick: 0, move: [-c, -s] }], 150, { night: 3 }));
  assert.equal(ramp.player.pos[1], 3);
  const pad = run({ player: { pos: [0, 3, 13] } }, [], 90, { night: 3 });
  const lp = last(pad).player;
  assert.equal(lp.pos[1], 6);
  assert.ok(Math.hypot(lp.pos[0], lp.pos[2]) < 8);
  const tower = last(run({ player: { pos: [0, 6, 6] } }, [{ tick: 0, move: [0, -1] }], 60, { night: 3 })).player;
  assert.ok(Math.hypot(tower.pos[0], tower.pos[2]) >= 2 - 1e-3 && tower.pos[1] === 6);
});

test('M3 Gió mạnh Đêm 3: mỗi 30 s một cơn 5 s, đẩy 2 m/s theo dir_deg; wind_enabled=false thì không có', () => {
  const l = run({ wind_enabled: true }, [], 2160, { night: 3, every: 60 });
  assert.equal(at(l, 1740).wind.active, false);
  const w = at(l, 1800).wind;
  assert.equal(w.active, true);
  assert.ok(Number.isInteger(w.dir_deg) && w.dir_deg >= 0 && w.dir_deg < 360);
  const a = at(l, 1800).player.pos;
  const b = at(l, 1860).player.pos;
  const rad = (w.dir_deg * Math.PI) / 180;
  assert.ok(Math.abs(b[0] - a[0] - 2 * Math.cos(rad)) < 0.05 && Math.abs(b[2] - a[2] - 2 * Math.sin(rad)) < 0.05);
  assert.equal(at(l, 2100).wind.active, false);
  const off = run({ wind_enabled: false }, [], 1900, { night: 3, every: 100 });
  assert.ok(snaps(off).every((s) => !s.wind.active));
});

test('M3 Lịch sinh: Đêm 2 mỗi 7 s, Đêm 3 mỗi 6 s (sau 2 con ở tick 300); Đêm 3 Bóng Mực 4.5 m/s', () => {
  const sp = (night) => events(run({ random_shades: true, player: { flames: 99 } }, [], 721, { night, every: 721 }), 'shade_spawned').map((e) => e.tick);
  assert.deepEqual(sp(2), [300, 300, 720]);
  assert.deepEqual(sp(3), [300, 300, 660]);
  const l = run({ player: { pos: [0, 0, -30] }, shades: [{ id: 'A', pos: [10, 1, -30] }] }, [], 60, { night: 3 });
  assert.equal(last(l).shades[0].pos[0], 5.5);
});

// ---------- Gió Lạc ----------
test('F3 Gió Lạc: chase khi Mây mang >= 5 và cách <= 15 m; chạm (<= 1.2 m) cướp min(3, mang), flee 240 tick rồi removed; bất tử không chặn', () => {
  const sc = { player: { carried: 6, invuln_ticks: 600 }, drifters: [{ id: 'D1', pos: [5, 1.5, 0] }] };
  const l = run(sc, [], 400, { night: 2 });
  assert.equal(at(l, 1).drifters[0].state, 'chase');
  const st = events(l, 'drifter_steal');
  assert.equal(st.length, 1);
  assert.deepEqual(st[0].data, { drifter_id: 'D1', amount: 3, carried: 3 });
  const S = st[0].tick;
  assert.equal(at(l, S).drifters[0].state, 'flee');
  assert.equal(at(l, S + 239).drifters[0].state, 'flee');
  assert.deepEqual(at(l, S + 240).drifters[0], { ...at(l, S + 240).drifters[0], state: 'removed', stolen: 3 });
  assert.equal(at(l, S + 240).player.flames, 3);
});

test('F3 Gió Lạc idle khi Mây mang < 5 hoặc ở xa; vùng an toàn không chặn', () => {
  const l = run({ player: { carried: 4 }, drifters: [{ id: 'D1', pos: [5, 1.5, 0] }] }, [], 60, { night: 2 });
  assert.ok(snaps(l).slice(1).every((s) => s.drifters[0].state === 'idle'));
  const far = run({ player: { carried: 9 }, drifters: [{ id: 'D1', pos: [16, 1.5, 0] }] }, [], 2, { night: 2 });
  assert.equal(at(far, 1).drifters[0].state, 'idle');
  const safe = run({ player: { carried: 9 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true }], drifters: [{ id: 'D1', pos: [5, 1.5, 0] }] }, [], 120, { night: 2 });
  assert.equal(events(safe, 'drifter_steal').length, 1);
});

test('F3 Tỏa Sáng trúng Gió Lạc chase -> flee không cướp; trúng lúc flee có đồ -> thả lại thành đom đóm rơi, biến mất sau 120 tick', () => {
  const a = run({ player: { carried: 9 }, drifters: [{ id: 'D1', pos: [3, 1.5, 0], state: 'chase' }] }, [{ tick: 0, pulse: true }], 300, { night: 2 });
  assert.equal(at(a, 1).drifters[0].state, 'flee');
  assert.equal(events(a, 'drifter_steal').length, 0);
  const b = run({ player: { carried: 3 }, drifters: [{ id: 'D1', pos: [2, 1.5, 0], state: 'flee', stolen: 3, state_ticks_left: 200 }] }, [{ tick: 0, pulse: true }], 130, { night: 2 });
  assert.deepEqual(events(b, 'drifter_drop').map((e) => [e.tick, e.data]), [[1, { drifter_id: 'D1', amount: 3 }]]);
  assert.equal(at(b, 1).motes.filter((m) => m.kind === 'dropped').length, 3);
  assert.equal(at(b, 1).drifters[0].stolen, 0);
  assert.equal(at(b, 120).drifters[0].state, 'flee');
  assert.equal(at(b, 121).drifters[0].state, 'removed');
});

test('F3 Gió Lạc sinh ở tick 1200, 2400… (Đêm 2, 3), tối đa 2, id D1, D2; Đêm 1 không có', () => {
  const l = runHeadless({ tuning: T, seed: 4, night: 2, scenario: { random_motes: false, random_shades: false }, ticks: 2400, snapshotEvery: 1200 });
  assert.deepEqual(snaps(l).map((s) => s.drifters.map((d) => d.id)), [[], ['D1'], ['D1', 'D2']]);
  assert.equal(at(l, 1200).drifters[0].state, 'idle');
  const n1 = runHeadless({ tuning: T, seed: 4, night: 1, scenario: { random_motes: false, random_shades: false }, ticks: 1200, snapshotEvery: 1200 });
  assert.deepEqual(last(n1).drifters, []);
});

// ---------- Bùa Gió ----------
test('F4 Bùa Gió: nhặt như đom đóm, charm_picked, 600 tick chạy 7.2 m/s, lướt không hồi chiêu, xuất hiện lại sau 2700 tick', () => {
  const l = run({ player: { pos: [35, 0, 0] } }, [{ tick: 0, move: [1, 0] }, { tick: 5, dash: true }, { tick: 6, dash: false }, { tick: 8, dash: true }, { tick: 9, dash: false }, { tick: 20, dash: true }], 60, { night: 2 });
  assert.deepEqual(events(l, 'charm_picked').map((e) => [e.tick, e.data]), [[1, { charm_id: 'C1', charm_ticks: 600 }]]);
  const s1 = at(l, 1);
  assert.equal(s1.player.charm_s, 10);
  assert.deepEqual(s1.charms, [{ id: 'C1', available: false, respawn_s: 45 }]);
  assert.deepEqual(events(l, 'dash').map((e) => e.tick), [6, 21], 'nhấn lúc đang lướt bị bỏ qua, không hồi chiêu');
  assert.equal(at(l, 6).player.dash_cd_s, 0);
  const walk = run({ player: { pos: [35, 0, 0] } }, [{ tick: 0, move: [1, 0] }], 61, { night: 2 });
  assert.equal(Math.round((at(walk, 61).player.pos[0] - at(walk, 1).player.pos[0]) * 1000) / 1000, 7.2);
  const back = run({ charms: [{ id: 'C1', available: false, respawn_ticks: 3 }], player: { pos: [35, 0, 0] } }, [], 5, { night: 2 });
  assert.deepEqual(events(back, 'charm_picked').map((e) => e.tick), [3]);
});

test('F4 Bùa Đêm 3 ở (30,0,25) và (−30,0,25); Đêm 1 không có bùa', () => {
  assert.deepEqual(at(run({}, [], 1, { night: 3 }), 0).charms.map((c) => c.id), ['C1', 'C2']);
  assert.deepEqual(at(run({}, [], 1), 0).charms, []);
});

// ---------- Tạm dừng ----------
test('F5 Tạm dừng: tick vẫn tăng nhưng sim_tick, thời gian, hồi chiêu đứng yên; state paused; paused/resumed', () => {
  const frames = [{ tick: 0, move: [0, 1], pause: true, pulse: true }, { tick: 1, pause: false }, { tick: 30, pause: true }, { tick: 31, pause: false }];
  const l = run({ player: { carried: 3 } }, frames, 40);
  assert.deepEqual(events(l).filter((e) => e.tick > 0).map((e) => [e.tick, e.name]), [[1, 'paused'], [31, 'resumed']]);
  const p = at(l, 30);
  // [P3] Đêm 1 còn 240 s
  assert.deepEqual([p.state, p.sim_tick, p.time_left_s, p.player.pos], ['paused', 0, 240, [0, 0, 0]]);
  const r = at(l, 40);
  assert.deepEqual([r.state, r.sim_tick, r.time_left_s], ['playing', 10, 239.833]);
  assert.deepEqual(r.player.pos, [0, 0, 1]);
  assert.deepEqual(last(l), at(l, 40));
  assert.equal(l.at(-1).ticks, 40);
});

// ---------- Hiệu năng ----------
test('C5 Một Đêm đầy đủ (Đêm 3 = 300 s = 18000 tick) chạy headless < 30 s [P3: Đêm 3 rút còn 300 s]', () => {
  const t0 = performance.now();
  const l = runHeadless({ tuning: T, seed: 9, night: 3, scenario: { player: { flames: 1000 } }, ticks: 21600, snapshotEvery: 10 });
  const ms = performance.now() - t0;
  assert.equal(l.at(-1).ticks, 18000);
  assert.ok(ms < 30000, `${ms} ms`);
});
