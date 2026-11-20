// Lõi game tất định của Đảo Đèn Lồng.
// KHÔNG dùng DOM, Math.random, Date: cùng seed + scenario + inputs => cùng kết quả.
// Dùng chung cho chế độ headless (src/headless) và bản có giao diện (web/).

export const TICK_RATE = 60;
export const BUTTONS = ['jump', 'interact', 'pulse', 'dash'];
const EPS = 1e-6; // dung sai so sánh bán kính (tránh lệch 1 tick do cộng dồn số thực)

/** Hằng số thế giới không có trong game.contract.json. Giả định: docs/notes/phase-1.md */
export const WORLD = Object.freeze({
  islandRadius: 40, // đảo tròn bán kính 40 m, tâm (0,0,0)
  playerEdgeMargin: 0.5, // có lan can: người chơi bị giữ trong đảo (fall_enabled = false)
  lanternRingRadius: 25, // L1 tại (0,0,25), các đèn sau cách nhau 360°/n
  jumpSpeed: 7, // m/s
  gravity: 20, // m/s^2
  shadeHeight: 1, // độ cao tâm Bóng Mực tự sinh
  initialMotes: 30,
  maxActiveMotes: 30,
  moteRespawnS: 4,
  moteMinR: 4,
  moteMaxR: 37,
  initialShades: 3,
  maxShades: 6,
  shadeSpawnEveryS: 20,
  shadeSpawnRadius: 36,
  shadeMinSpawnDist: 15, // Bóng Mực mới không sinh sát người chơi
  safeEpsilon: 0.01, // bị đẩy ra tới safe_radius + 0.01 (ngoài bán kính, vì "trong" là ≤)
});

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const round3 = (v) => {
  const x = Math.round(v * 1000) / 1000;
  return x === 0 ? 0 : x; // bỏ -0
};
export const hdist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const within = (a, b, r) => hdist(a, b) <= r + EPS;
const secToTicks = (s) => Math.round(s * TICK_RATE);

function makeLanterns(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const R = WORLD.lanternRingRadius;
    out.push({ id: `L${i + 1}`, pos: [round3(R * Math.sin(a)), 0, round3(R * Math.cos(a))], lit: false, deposited: 0 });
  }
  return out;
}

export class Game {
  /**
   * @param {{tuning: object, seed?: number, scenario?: object}} opts
   *   tuning: game.contract.json -> tuning; scenario: đã kiểm tra bởi io.parseScenario
   */
  constructor({ tuning, seed = 0, scenario = {} }) {
    this.t = tuning;
    this.rng = mulberry32(seed);
    this.tick = 0;
    this.state = 'playing';
    this.result = null; // { result, reason } khi kết thúc
    this.score = 0;
    this.ticksLeft = secToTicks(scenario.time_left_s ?? tuning.night1_duration_s);

    const sp = scenario.player ?? {};
    this.player = {
      pos: sp.pos ? [...sp.pos] : [0, 0, 0],
      vy: 0,
      flames: sp.flames ?? tuning.flames,
      carried: sp.carried ?? 0,
      invuln: 0, // số tick bất tử còn lại
      pulseCd: 0, // số tick hồi chiêu tỏa sáng còn lại
    };
    this.prev = { jump: false, interact: false, pulse: false, dash: false };

    this.lanterns = makeLanterns(tuning.lantern_count_night1);
    for (const l of scenario.lanterns ?? []) {
      const lan = this.lanterns.find((x) => x.id === l.id);
      if (l.pos) lan.pos = [...l.pos];
      if (l.deposited !== undefined) lan.deposited = l.deposited;
      if (l.lit !== undefined) lan.lit = l.lit;
      if (lan.lit && l.deposited === undefined) lan.deposited = tuning.lantern_cost;
    }

    this.randomMotes = scenario.random_motes !== false;
    this.randomShades = scenario.random_shades !== false;
    this.motes = [];
    this.shades = [];
    this.nextMote = 1;
    this.nextShade = 1;
    this.moteTimer = 0;
    this.shadeTimer = 0;

    if (scenario.motes) for (const m of scenario.motes) this.addMote(Array.isArray(m) ? m : m.pos, m.id);
    else if (this.randomMotes) for (let i = 0; i < WORLD.initialMotes; i++) this.addMote(this.randomMotePos());

    if (scenario.shades) {
      const taken = new Set(scenario.shades.filter((s) => s.id).map((s) => s.id));
      for (const s of scenario.shades) this.addShade(s.pos, s.id ?? this.freeShadeId(taken));
    } else if (this.randomShades) {
      for (let i = 0; i < WORLD.initialShades; i++) this.addShade(this.randomShadePos());
    }
  }

  // ---------- sinh thực thể ----------
  addMote(pos, id) {
    const m = { id: id ?? `M${this.nextMote++}`, pos: [...pos] };
    this.motes.push(m);
    return m;
  }

  freeShadeId(extra = new Set()) {
    let id;
    do id = `S${this.nextShade++}`;
    while (extra.has(id) || this.shades.some((s) => s.id === id));
    return id;
  }

  addShade(pos, id) {
    const s = { id: id ?? this.freeShadeId(), pos: [...pos], state: 'chase', stun: 0 };
    this.shades.push(s);
    return s;
  }

  randomMotePos() {
    const a = this.rng() * 2 * Math.PI;
    const { moteMinR: lo, moteMaxR: hi } = WORLD;
    const r = Math.sqrt(lo * lo + this.rng() * (hi * hi - lo * lo));
    return [round3(r * Math.sin(a)), 0, round3(r * Math.cos(a))];
  }

  randomShadePos() {
    let pos;
    for (let i = 0; i < 8; i++) {
      const a = this.rng() * 2 * Math.PI;
      const R = WORLD.shadeSpawnRadius;
      pos = [round3(R * Math.sin(a)), WORLD.shadeHeight, round3(R * Math.cos(a))];
      if (hdist(pos, this.player.pos) >= WORLD.shadeMinSpawnDist) break;
    }
    return pos;
  }

  // ---------- một bước mô phỏng ----------
  /**
   * Bước k: đọc input của tick k, tạo trạng thái k+1. Sự kiện ghi tick = k+1.
   * Thứ tự: hẹn giờ -> di chuyển/nhảy -> nhặt -> nạp đèn -> (thắng?) -> tỏa sáng
   *         -> Bóng Mực di chuyển -> va chạm -> sinh mới -> trừ thời gian -> (thua?)
   * @returns {object[]} các dòng event của bước này
   */
  step(input = {}) {
    if (this.state !== 'playing') return [];
    const T = this.tick + 1;
    const ev = [];
    const emit = (name, data) => ev.push({ type: 'event', tick: T, name, data });
    const pressed = (b) => !!input[b] && !this.prev[b];
    let over = null;

    const p = this.player;
    if (p.invuln > 0) p.invuln--;
    if (p.pulseCd > 0) p.pulseCd--;
    for (const s of this.shades) {
      if (s.stun > 0 && --s.stun === 0) s.state = 'chase';
    }

    this.movePlayer(input, pressed('jump'));
    this.pickup(emit);
    if (pressed('interact')) this.interact(emit);
    if (this.lanterns.every((l) => l.lit)) over = ['won', 'all_lit'];

    if (!over) {
      if (pressed('pulse')) this.pulse(emit);
      this.moveShades();
      this.checkHits(emit);
      if (p.flames <= 0) over = ['lost', 'no_flames'];
    }
    if (!over) this.spawn(emit);

    for (const b of BUTTONS) this.prev[b] = !!input[b];
    this.tick = T;
    this.ticksLeft--;
    if (!over && this.ticksLeft <= 0) over = ['lost', 'dawn'];
    if (over) this.finish(over[0], over[1], emit);
    return ev;
  }

  movePlayer(input, jumpPressed) {
    const p = this.player;
    let [mx, mz] = input.move ?? [0, 0];
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const th = ((input.cam_yaw_deg ?? 0) * Math.PI) / 180;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const v = this.t.player_speed / TICK_RATE;
    p.pos[0] += (mx * c + mz * s) * v;
    p.pos[2] += (-mx * s + mz * c) * v;

    const lim = WORLD.islandRadius - WORLD.playerEdgeMargin;
    const d = Math.hypot(p.pos[0], p.pos[2]);
    if (d > lim) {
      p.pos[0] *= lim / d;
      p.pos[2] *= lim / d;
    }

    if (jumpPressed && p.pos[1] <= 0) p.vy = WORLD.jumpSpeed;
    if (p.pos[1] > 0 || p.vy > 0) {
      p.vy -= WORLD.gravity / TICK_RATE;
      p.pos[1] += p.vy / TICK_RATE;
      if (p.pos[1] <= 0) {
        p.pos[1] = 0;
        p.vy = 0;
      }
    }
  }

  pickup(emit) {
    const p = this.player;
    for (let i = 0; i < this.motes.length && p.carried < this.t.carry_capacity; ) {
      if (within(p.pos, this.motes[i].pos, this.t.pickup_radius)) {
        this.motes.splice(i, 1);
        p.carried++;
        this.score += this.t.score.per_mote;
        emit('mote_picked', { carried: p.carried });
      } else i++;
    }
  }

  /** Nạp vào đèn CHƯA thắp gần nhất trong interact_radius. */
  interact(emit) {
    const p = this.player;
    const cost = this.t.lantern_cost;
    let best = null;
    let bestD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit) continue;
      const d = hdist(p.pos, l.pos);
      if (d <= this.t.interact_radius + EPS && d < bestD) {
        best = l;
        bestD = d;
      }
    }
    if (!best || p.carried <= 0) return;
    const amount = Math.max(0, Math.min(p.carried, cost - best.deposited));
    if (amount > 0) {
      p.carried -= amount;
      best.deposited += amount;
      emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
    }
    if (best.deposited >= cost) {
      best.lit = true;
      this.score += this.t.score.per_lantern;
      emit('lantern_lit', { lantern_id: best.id });
    }
  }

  pulse(emit) {
    const p = this.player;
    const t = this.t;
    if (p.pulseCd > 0 || p.carried < t.pulse_cost) return;
    p.carried -= t.pulse_cost;
    p.pulseCd = secToTicks(t.pulse_cooldown_s);
    const ids = [];
    for (const s of this.shades) {
      const d = hdist(p.pos, s.pos);
      if (d > t.pulse_radius + EPS) continue;
      const ux = d > 1e-9 ? (s.pos[0] - p.pos[0]) / d : 1;
      const uz = d > 1e-9 ? (s.pos[2] - p.pos[2]) / d : 0;
      s.pos[0] += ux * t.pulse_push_m;
      s.pos[2] += uz * t.pulse_push_m;
      s.state = 'stunned';
      s.stun = secToTicks(t.pulse_stun_s);
      ids.push(s.id);
    }
    this.score += ids.length * t.score.per_stun;
    emit('pulse', { stunned_ids: ids });
  }

  moveShades() {
    const p = this.player;
    const v = this.t.shade_speed / TICK_RATE;
    for (const s of this.shades) {
      if (s.state === 'stunned') continue;
      const d = hdist(s.pos, p.pos);
      if (d > 1e-9) {
        const k = Math.min(v, d) / d;
        s.pos[0] += (p.pos[0] - s.pos[0]) * k;
        s.pos[2] += (p.pos[2] - s.pos[2]) * k;
      }
    }
    // Bóng Mực sợ đèn: không vào được safe_radius quanh đèn ĐÃ thắp.
    const R = this.t.safe_radius;
    if (!(R > 0)) return;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      for (const s of this.shades) {
        const d = hdist(s.pos, l.pos);
        if (d >= R + WORLD.safeEpsilon) continue;
        const ux = d > 1e-9 ? (s.pos[0] - l.pos[0]) / d : 1;
        const uz = d > 1e-9 ? (s.pos[2] - l.pos[2]) / d : 0;
        s.pos[0] = l.pos[0] + ux * (R + WORLD.safeEpsilon);
        s.pos[2] = l.pos[2] + uz * (R + WORLD.safeEpsilon);
      }
    }
  }

  checkHits(emit) {
    const p = this.player;
    const t = this.t;
    if (p.invuln > 0) return;
    for (const s of this.shades) {
      if (s.state === 'stunned' || !within(s.pos, p.pos, t.shade_hit_radius)) continue;
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * t.hit_drop_ratio + 1e-9);
      p.carried -= dropped; // đom đóm rơi bay mất (không rơi lại xuống đất)
      p.invuln = secToTicks(t.invuln_s);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      return; // tối đa 1 lần chạm mỗi tick
    }
  }

  spawn(emit) {
    if (this.randomMotes && ++this.moteTimer >= secToTicks(WORLD.moteRespawnS)) {
      this.moteTimer = 0;
      if (this.motes.length < WORLD.maxActiveMotes) this.addMote(this.randomMotePos());
    }
    if (this.randomShades && ++this.shadeTimer >= secToTicks(WORLD.shadeSpawnEveryS)) {
      this.shadeTimer = 0;
      if (this.shades.length < WORLD.maxShades) {
        const s = this.addShade(this.randomShadePos());
        emit('shade_spawned', { id: s.id });
      }
    }
  }

  finish(result, reason, emit) {
    this.state = result;
    this.result = { result, reason };
    if (result === 'won') {
      const t = this.t.score;
      this.score += t.per_second_left * Math.floor(Math.max(0, this.ticksLeft) / TICK_RATE);
      this.score += t.per_flame_left * this.player.flames;
    }
    emit('game_over', { result, reason });
  }

  snapshot() {
    const p = this.player;
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.tick,
      state: this.state,
      time_left_s: round3(Math.max(0, this.ticksLeft) / TICK_RATE),
      score: this.score,
      player: { pos: p.pos.map(round3), flames: p.flames, carried: p.carried },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: l.pos.map(round3), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: s.pos.map(round3), state: s.state })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: m.pos.map(round3) })),
    };
  }
}
