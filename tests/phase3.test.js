// Ticket-03 "Đèn cạn dầu" (contract v1.2). Mã U*/D*/W*/K* xem docs/notes/phase-3.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScenario, FormatError } from '../src/core/io.js';
import { run, events, last, at, hd } from './helpers.js';

const L1 = [0, 0, 25];

// ---------- Nhiên liệu ----------
test('U1 Đèn đang sáng hao 1 dầu/giây; snapshot có fuel (1 chữ số), ever_lit, relit_count', () => {
  const l = run({ lanterns: [{ id: 'L1', lit: true }] }, [], 60);
  assert.deepEqual(at(l, 0).lanterns[0], { id: 'L1', pos: L1, lit: true, deposited: 10, fuel: 100, ever_lit: true, relit_count: 0 });
  assert.equal(at(l, 30).lanterns[0].fuel, 99.5);
  assert.equal(at(l, 60).lanterns[0].fuel, 99);
  assert.equal(at(l, 0).lanterns[1].fuel, 0);
});

test('U2 Hết dầu: đèn tắt, deposited = 0, lantern_out, vẫn nhớ ever_lit', () => {
  const l = run({ lanterns: [{ id: 'L1', lit: true, fuel: 1 }] }, [], 70);
  assert.deepEqual(events(l, 'lantern_out').map((e) => [e.tick, e.data]), [[60, { lantern_id: 'L1' }]]);
  assert.equal(at(l, 59).lanterns[0].lit, true);
  assert.deepEqual(at(l, 60).lanterns[0], { id: 'L1', pos: L1, lit: false, deposited: 0, fuel: 0, ever_lit: true, relit_count: 0 });
});

test('U3 Châm dầu: used = min(mang, ceil((100 − fuel)/10)), fuel = min(100, fuel + 10·used), +5/đom đóm, event refuel', () => {
  const l = run({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 55 }] }, [{ tick: 0, interact: true }], 2);
  assert.deepEqual(events(l, 'refuel').map((e) => [e.tick, e.data]), [[1, { lantern_id: 'L1', amount: 5, fuel: 100 }]]);
  assert.equal(at(l, 1).player.carried, 5);
  assert.equal(at(l, 1).score, 25);
  assert.equal(events(l, 'deposit').length, 0);
  const few = run({ player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 40 }] }, [{ tick: 0, interact: true }], 1);
  assert.deepEqual(events(few, 'refuel')[0].data, { lantern_id: 'L1', amount: 2, fuel: 60 });
});

test('U4 Chọn đèn khi tương tác: đèn nhận được gần nhất (sáng chưa đầy cũng được), bằng nhau thì id nhỏ hơn', () => {
  const sc = { player: { carried: 3 }, lanterns: [{ id: 'L2', pos: [1.5, 0, 0], lit: true, fuel: 50 }, { id: 'L3', pos: [-1, 0, 0] }] };
  assert.deepEqual(events(run(sc, [{ tick: 0, interact: true }], 1)).filter((e) => e.tick > 0).map((e) => e.name), ['deposit']);
  const tie = { player: { carried: 3 }, lanterns: [{ id: 'L2', pos: [1, 0, 0], lit: true, fuel: 50 }, { id: 'L3', pos: [-1, 0, 0] }] };
  assert.equal(events(run(tie, [{ tick: 0, interact: true }], 1), 'refuel')[0].data.lantern_id, 'L2');
});

test('U5 Thắp lại: đèn từng sáng chỉ cần 5 (relight: true, +40, relit_count); đèn chưa từng sáng vẫn cần 10', () => {
  const l = run({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], ever_lit: true }] }, [{ tick: 0, interact: true }], 1);
  assert.deepEqual(events(l, 'lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  const s = at(l, 1);
  assert.deepEqual([s.lanterns[0].lit, s.lanterns[0].fuel, s.lanterns[0].relit_count, s.score], [true, 100, 1, 5 * 5 + 40]);
  const fresh = run({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] }, [{ tick: 0, interact: true }], 1);
  assert.equal(events(fresh, 'lantern_lit').length, 0);
  assert.equal(at(fresh, 1).lanterns[0].deposited, 5);
});

test('K1 Sức chứa = 10 + 2 × số lần thắp thành công (kể cả thắp lại), tối đa 20', () => {
  const l = run({ player: { carried: 5 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], ever_lit: true }] }, [{ tick: 0, interact: true }], 1);
  assert.equal(at(l, 0).player.capacity, 10);
  assert.equal(at(l, 1).player.capacity, 12);
  assert.equal(at(run({ player: { successful_lights: 6 } }, [], 1), 0).player.capacity, 20);
  const pick = last(run({ player: { successful_lights: 3 }, motes: Array.from({ length: 25 }, () => [0, 0, 0]) }, [], 1));
  assert.deepEqual([pick.player.carried, pick.player.capacity], [16, 16]);
});

// ---------- Bóng Mực hút dầu ----------
test('D1 Bóng wander tới đèn yếu (fuel < 30), cách <= 2 m thì drain: hút 5/giây (+ hao 1/giây), fuel_drain mỗi 60 tick; đèn tắt thì về wander', () => {
  const l = run({ lanterns: [{ id: 'L1', lit: true, fuel: 29 }], shades: [{ id: 'A', pos: [0, 1, 30] }] }, [], 370);
  assert.equal(at(l, 1).shades[0].state, 'wander');
  assert.equal(at(l, 89).shades[0].state, 'wander');
  assert.equal(at(l, 90).shades[0].state, 'drain');
  assert.ok(Math.abs(hd(at(l, 90).shades[0].pos, L1) - 2) < 1e-3);
  const drains = events(l, 'fuel_drain');
  assert.deepEqual(drains[0], { type: 'event', tick: 150, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'A', fuel: 21.5 } });
  assert.deepEqual(drains.map((e) => e.tick), [150, 210, 270, 330]);
  assert.deepEqual(events(l, 'lantern_out').map((e) => e.tick), [365]);
  assert.equal(at(l, 365).shades[0].state, 'wander');
});

test('D2 Đèn còn đúng >= 30 dầu vẫn có vùng an toàn; < 30 thì mất', () => {
  // bóng đuổi Mây đứng ngay cạnh đèn: fuel 31 => bị chặn ở 6 m tới khi fuel < 30 (sau ~60 tick) rồi vào được
  const l = run({ player: { pos: [0, 0, 25.5] }, lanterns: [{ id: 'L1', lit: true, fuel: 31 }], shades: [{ id: 'A', pos: [0, 1, 15] }] }, [], 200);
  for (let k = 1; k <= 60; k++) assert.ok(hd(at(l, k).shades[0].pos, L1) >= 6 - 1e-3, `tick ${k}`);
  assert.ok(events(l, 'player_hit').length >= 1, 'đèn yếu: bóng vào được và đánh trúng');
});

test('D3 Từ drain: Mây vào trong 6 m => chase; trúng Tỏa Sáng => stunned (+15 điểm)', () => {
  const chase = run({ player: { pos: [0, 0, 17.5] }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }], shades: [{ id: 'A', pos: [0, 1, 23], state: 'drain', target_lantern_id: 'L1' }] }, [], 1);
  assert.equal(at(chase, 1).shades[0].state, 'chase');
  const far = run({ player: { pos: [0, 0, 10] }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }], shades: [{ id: 'A', pos: [0, 1, 23], state: 'drain', target_lantern_id: 'L1' }] }, [], 1);
  assert.equal(at(far, 1).shades[0].state, 'drain');
  const st = run({ player: { pos: [0, 0, 19.5], carried: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }], shades: [{ id: 'A', pos: [0, 1, 23], state: 'drain', target_lantern_id: 'L1' }] }, [{ tick: 0, pulse: true }], 1);
  assert.deepEqual([at(st, 1).shades[0].state, at(st, 1).score], ['stunned', 15]);
});

test('D4 Châm dầu lên >= 30 khi có bóng trong vùng 6 m: đẩy ra mép trong <= 30 tick, không gây sát thương', () => {
  const sc = { player: { pos: [-1, 0, 25], carried: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }], shades: [{ id: 'A', pos: [1.5, 1, 25], state: 'drain', target_lantern_id: 'L1' }] };
  const l = run(sc, [{ tick: 0, interact: true }], 120);
  // tick 1, bước 2: 20·60 − 1 (hao) − 5 (bóng đang hút) = 1194; châm 3 => 1194 + 1800 = 2994 => 49.9
  assert.deepEqual(events(l, 'refuel')[0].data, { lantern_id: 'L1', amount: 3, fuel: 49.9 });
  assert.equal(at(l, 1).shades[0].state, 'recoil');
  assert.ok(hd(at(l, 30).shades[0].pos, L1) >= 6 - 1e-3);
  assert.equal(events(l, 'player_hit').length, 0);
});

// ---------- Luật thắng mới ----------
const litN = (n) => ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'].slice(0, n).map((id) => ({ id, lit: true }));

test('W1 Thắng khi còn sống tới bình minh và >= ceil(0.6 × tổng) đèn sáng: dawn_survived; điểm 50 + floor(fuel)/đèn + 50/lửa', () => {
  const l = run({ lanterns: litN(3), time_left_s: 2 }, [], 500);
  assert.deepEqual(events(l, 'game_over').map((e) => [e.tick, e.data]), [[120, { result: 'won', reason: 'dawn_survived' }]]);
  assert.deepEqual(l.at(-1), { type: 'end', ticks: 120, state: 'won', score: 3 * (50 + 98) + 3 * 50 });
});

test('W2 Hết giờ mà dưới ngưỡng thì thua dawn (không có thưởng); Đêm 2 cần 4/6, Đêm 3 cần 5/7', () => {
  const lose = run({ lanterns: litN(2), time_left_s: 1 }, [], 100);
  assert.deepEqual(lose.at(-1), { type: 'end', ticks: 60, state: 'lost', score: 0 });
  assert.equal(events(lose, 'game_over')[0].data.reason, 'dawn');
  const res = (night, n) => run({ lanterns: litN(n), time_left_s: 1 }, [], 100, { night }).at(-1).state;
  assert.deepEqual([res(2, 3), res(2, 4), res(3, 4), res(3, 5)], ['lost', 'won', 'lost', 'won']);
});

test('W3 Không còn thắng sớm: thắp đủ mọi đèn không kết thúc Đêm [P3: thay all_lit]', () => {
  const l = run({ lanterns: litN(5), time_left_s: 10 }, [], 700, { every: 100 });
  assert.equal(at(l, 500).state, 'playing');
  assert.deepEqual(events(l, 'game_over').map((e) => [e.tick, e.data.reason]), [[600, 'dawn_survived']]);
});

test('W4 Hết Ngọn Lửa ở đúng tick bình minh vẫn thua no_flames (xét trước)', () => {
  const l = run({ player: { flames: 1 }, lanterns: litN(3), shades: [{ id: 'A', pos: [0, 1, 0] }], time_left_s: 1 / 60 }, [], 5);
  assert.deepEqual(events(l, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('C6 Scenario v1.2: lit không có fuel => 100; trường sai định dạng => FormatError (mã 2)', () => {
  assert.equal(at(run({ lanterns: [{ id: 'L2', lit: true }] }, [], 1), 0).lanterns[1].fuel, 100);
  for (const bad of [{ lanterns: [{ id: 'L1', fuel: 150 }] }, { lanterns: [{ id: 'L1', ever_lit: 'yes' }] }, { shades: [{ pos: [1, 1, 1], target_lantern_id: 3 }] }, { player: { successful_lights: -1 } }]) {
    assert.throws(() => parseScenario(bad, 5), FormatError, JSON.stringify(bad));
  }
  assert.deepEqual(parseScenario({ shades: [{ pos: [1, 1, 1], state: 'drain', target_lantern_id: 'L2' }] }, 5).shades[0].state, 'drain');
});
