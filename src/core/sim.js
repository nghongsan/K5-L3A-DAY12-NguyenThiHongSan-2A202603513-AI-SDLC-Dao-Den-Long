// Lõi game tất định của Đảo Đèn Lồng — Test Contract v1.1 (Ticket-02).
// KHÔNG dùng DOM, Math.random, Date: cùng seed + night + scenario + inputs => cùng kết quả.
// Dùng chung cho headless (src/headless) và bản có giao diện (web/).
import { NIGHTS, groundAt, inTower } from './maps.js';
import { mulberry32, round3, hdist, dist3, idCmp } from './util.js';

export { mulberry32, round3, hdist, NIGHTS, groundAt };
export const TICK_RATE = 60;
export const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];
export const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned'];
export const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];
const EPS = 1e-6;

/** Số chuẩn Ticket-02 không có khóa riêng trong game.contract.json (đơn vị tick/mét/giây). */
export const STD = Object.freeze({
  jumpSpeed: 7,
  gravity: 20,
  stepHeight: 0.5, // giả định: bậc cao nhất đi lên được (dốc 0.5 qua được, vách 3 m thì không)
  pickupHeight: 1.5,
  moteStart: 20,
  moteCap: 30,
  moteEvery: 240,
  dropTtl: 480,
  dropRing: [1.5, 2.5],
  expelTicks: 30,
  pulseCenterY: 0.8,
  pushTicks: 15,
  shadeY: 1, // tâm Bóng Mực cao hơn mặt đất 1 m
  shadeDetect: 12,
  shadeGiveUp: 18,
  shadeWanderSpeed: 2, // giả định: tốc độ lang thang
  shadeHitHeight: 1.5,
  recoilM: 2,
  recoilTicks: 60,
  shadeFirstTick: 300,
  shadeFirstCount: 2,
  shadeMinDist: 15,
  fallY: -10,
  fallWaitTicks: 60,
  respawnInvulnTicks: 90,
  charmTicks: 600,
  charmRespawnTicks: 2700,
  charmSpeed: 7.2,
  drifterSpeed: 7,
  drifterIdleSpeed: 2,
  drifterMax: 2,
  drifterEvery: 1200,
  drifterChaseCarry: 5,
  drifterRange: 15,
  drifterTouch: 1.2,
  drifterSteal: 3,
  drifterFleeTicks: 240,
  drifterDropFleeTicks: 120,
  drifterY: 1.5,
  windEvery: 1800,
  windTicks: 300,
  windWarnTicks: 120,
  windSpeed: 2,
});

const secToTicks = (s) => Math.round(s * TICK_RATE);
const unitXZ = (from, to) => {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const d = Math.hypot(dx, dz);
  return d > 1e-9 ? [dx / d, dz / d] : [1, 0]; // trùng vị trí: theo +X
};
const TIMED = new Set(['spawning', 'recoil', 'stunned']);

export class Game {
  /**
   * @param {{tuning: object, seed?: number, night?: number, scenario?: object}} opts
   *   scenario đã kiểm tra bởi io.parseScenario (hoặc object tương thích)
   */
  constructor({ tuning, seed = 0, night = 1, scenario = {} }) {
    this.t = tuning;
    this.night = night;
    this.map = NIGHTS[night];
    this.rng = mulberry32(seed);
    this.tick = 0;
    this.simTick = 0;
    this.state = 'playing';
    this.paused = false;
    this.result = null;
    this.score = 0;
    this.ticksLeft = secToTicks(scenario.time_left_s ?? tuning[`night${night}_duration_s`]);
    this.shadeSpeed = this.map.shadeSpeed ?? tuning.shade_speed;
    this.stunTicks = secToTicks(tuning.pulse_stun_s);

    const sp = scenario.player ?? {};
    const p = (this.player = {
      pos: sp.pos ? [...sp.pos] : [...this.map.start],
      vy: 0,
      vel: [0, 0, 0],
      grounded: false,
      facing: [0, 1], // quay mặt về +Z
      flames: sp.flames ?? tuning.flames,
      carried: sp.carried ?? 0,
      invuln: sp.invuln_ticks ?? 0,
      dashCd: sp.dash_cd_ticks ?? 0,
      pulseCd: sp.pulse_cd_ticks ?? 0,
      charm: sp.charm_ticks ?? 0,
      dashTicks: 0,
      dashDir: [0, 1],
      launch: null, // vận tốc ngang của bục nhảy, giữ tới khi chạm đất
      fallWait: 0,
      respawn: false,
    });
    const g = groundAt(night, p.pos[0], p.pos[2]);
    if (g !== null && p.pos[1] <= g + 1e-6) {
      p.pos[1] = g;
      p.grounded = true;
    }
    this.prev = Object.fromEntries(BUTTONS.map((b) => [b, false]));

    this.lanterns = this.map.lanterns.map((pos, i) => ({ id: `L${i + 1}`, pos: [...pos], lit: false, deposited: 0, justLit: false }));
    for (const l of scenario.lanterns ?? []) {
      const lan = this.lanterns.find((x) => x.id === l.id);
      if (l.pos) lan.pos = [...l.pos];
      if (l.deposited !== undefined) lan.deposited = l.deposited;
      if (l.lit !== undefined) lan.lit = l.lit;
      if (lan.lit && l.deposited === undefined) lan.deposited = tuning.lantern_cost;
      lan.justLit = lan.lit; // đèn đặt sẵn sáng: vùng an toàn có hiệu lực từ tick đầu
    }

    this.randomMotes = scenario.random_motes !== false;
    this.randomShades = scenario.random_shades !== false;
    this.randomDrifters = this.map.drifters && scenario.random_drifters !== false;
    this.windEnabled = this.map.wind && scenario.wind_enabled !== false;
    this.wind = { active: false, warn: false, dir: null, left: 0 };

    this.motes = [];
    this.nextMote = 1;
    if (scenario.motes) {
      for (const m of scenario.motes) {
        const pos = Array.isArray(m) ? m : m.pos;
        this.addMote(pos, m.kind ?? 'random', m.ttl_ticks ?? null, m.id);
      }
    } else if (this.randomMotes) {
      const pts = this.map.motePoints.map((x) => x);
      const n = Math.min(STD.moteStart, pts.length);
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(this.rng() * (pts.length - i));
        [pts[i], pts[j]] = [pts[j], pts[i]];
        this.addMote(pts[i], 'random', null);
      }
    }

    this.shades = [];
    this.nextShade = 1;
    const taken = new Set((scenario.shades ?? []).filter((s) => s.id).map((s) => s.id));
    for (const s of scenario.shades ?? []) {
      const pos = [...s.pos];
      const state = s.state ?? (hdist(pos, p.pos) <= STD.shadeDetect ? 'chase' : 'wander');
      const sh = this.addShade(pos, s.id ?? this.freeId('S', taken), state, s.state_ticks_left ?? (TIMED.has(state) ? 1 : 0));
      if (state === 'recoil') sh.move = { dir: unitXZ(p.pos, pos), step: STD.recoilM / STD.recoilTicks };
    }

    this.drifters = [];
    this.nextDrifter = 1;
    const dtaken = new Set((scenario.drifters ?? []).filter((d) => d.id).map((d) => d.id));
    for (const d of scenario.drifters ?? []) {
      this.addDrifter(d.pos, d.id ?? this.freeId('D', dtaken), d.state ?? 'idle', d.stolen ?? 0, d.state_ticks_left);
    }

    this.charms = scenario.charms
      ? scenario.charms.map((c) => ({ id: c.id, pos: [...(c.pos ?? this.map.charms[Number(String(c.id).slice(1)) - 1])], available: c.available ?? true, respawn: c.available === false ? c.respawn_ticks ?? STD.charmRespawnTicks : 0 }))
      : this.map.charms.map((pos, i) => ({ id: `C${i + 1}`, pos: [...pos], available: true, respawn: 0 }));
  }

  // ---------- thực thể ----------
  freeId(prefix, extra = new Set()) {
    const counter = prefix === 'S' ? 'nextShade' : 'nextDrifter';
    const list = prefix === 'S' ? this.shades : this.drifters;
    let id;
    do id = `${prefix}${this[counter]++}`;
    while (extra.has(id) || list.some((x) => x.id === id));
    return id;
  }

  addMote(pos, kind, ttl, id) {
    const m = { id: id ?? `M${this.nextMote++}`, pos: [...pos], kind, ttl };
    this.motes.push(m);
    return m;
  }

  addShade(pos, id, state = 'spawning', ticks = 1) {
    const s = { id: id ?? this.freeId('S'), pos: [...pos], state, ticks, push: 0, pushDir: [1, 0], move: null, waypoint: null, harmless: false };
    this.shades.push(s);
    this.shades.sort((a, b) => idCmp(a.id, b.id));
    return s;
  }

  addDrifter(pos, id, state = 'idle', stolen = 0, ticks) {
    const d = { id: id ?? this.freeId('D'), pos: [...pos], state, stolen, ticks: ticks ?? (state === 'flee' ? STD.drifterFleeTicks : 0), waypoint: null };
    this.drifters.push(d);
    this.drifters.sort((a, b) => idCmp(a.id, b.id));
    return d;
  }

  detect(s) {
    return hdist(s.pos, this.player.pos) <= STD.shadeDetect ? 'chase' : 'wander';
  }

  // ---------- một tick ----------
  /**
   * Thứ tự (Ticket-02): 1 input/pause · 2 bộ đếm · 3 di chuyển Mây + rơi · 4 nhặt · 5 đèn · 6 vùng an toàn
   * · 7 Tỏa Sáng · 8 Bóng Mực/Gió Lạc di chuyển · 9 chạm (Gió Lạc rồi Bóng Mực) · 10 sinh · 11 thắng/thua.
   * @returns {object[]} các dòng event của tick này
   */
  step(input = {}) {
    if (this.state === 'won' || this.state === 'lost') return [];
    const T = this.tick + 1;
    const ev = [];
    const emit = (name, data) => ev.push({ type: 'event', tick: T, name, data });
    const pressed = {};
    for (const b of BUTTONS) {
      pressed[b] = !!input[b] && !this.prev[b];
      this.prev[b] = !!input[b];
    }
    this.tick = T;

    // 1. pause
    if (pressed.pause) {
      this.paused = !this.paused;
      this.state = this.paused ? 'paused' : 'playing';
      emit(this.paused ? 'paused' : 'resumed', {});
      if (this.paused) return ev;
    } else if (this.paused) return ev;
    this.simTick++;

    this.tickCounters(); // 2
    this.movePlayer(input, pressed, emit); // 3
    this.pickup(emit); // 4
    if (pressed.interact) this.interact(emit); // 5
    this.updateSafeZones(); // 6
    if (pressed.pulse) this.pulse(emit); // 7
    this.moveShades(); // 8
    this.moveDrifters();
    this.drifterTouch(emit); // 9
    this.shadeTouch(emit);
    this.spawn(emit); // 10
    this.checkEnd(emit); // 11
    return ev;
  }

  tickCounters() {
    const p = this.player;
    this.ticksLeft--;
    if (p.dashCd > 0) p.dashCd--;
    if (p.pulseCd > 0) p.pulseCd--;
    if (p.invuln > 0) p.invuln--;
    if (p.charm > 0) p.charm--;
    if (p.fallWait > 0 && --p.fallWait === 0) p.respawn = true;
    for (const s of this.shades) {
      if (TIMED.has(s.state) && s.ticks > 0 && --s.ticks === 0) {
        s.state = this.detect(s);
        s.move = null;
        s.harmless = false;
        s.push = 0;
      }
    }
    for (const d of this.drifters) {
      if (d.state === 'flee' && d.ticks > 0 && --d.ticks === 0) d.state = 'removed';
    }
    this.motes = this.motes.filter((m) => m.kind !== 'dropped' || m.ttl === null || --m.ttl > 0);
    for (const c of this.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
  }

  updateWind() {
    const w = this.wind;
    if (!this.windEnabled) return;
    const s = this.simTick;
    const E = STD.windEvery;
    if (w.active && --w.left <= 0) {
      w.active = false;
      w.dir = null;
    }
    if (s + STD.windWarnTicks >= E && (s + STD.windWarnTicks) % E === 0) {
      w.warn = true; // báo trước 2 s (lá bay + âm thanh ở giao diện)
      w.dir = Math.floor(this.rng() * 360);
    }
    if (s >= E && s % E === 0) {
      w.warn = false;
      w.active = true;
      w.left = STD.windTicks;
    }
  }

  canStand(x, z, y) {
    const g = groundAt(this.night, x, z);
    if (g !== null && g - y > STD.stepHeight) return false; // vách đứng
    return !inTower(this.night, x, z, y);
  }

  movePlayer(input, pressed, emit) {
    const p = this.player;
    const t = this.t;
    this.updateWind();
    if (p.respawn) {
      p.respawn = false;
      p.pos = [...this.map.start];
      p.pos[1] = groundAt(this.night, p.pos[0], p.pos[2]) ?? 0;
      p.vy = 0;
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.launch = null;
      p.dashTicks = 0;
      p.facing = [0, 1];
      p.invuln = STD.respawnInvulnTicks;
      return;
    }
    if (p.fallWait > 0) {
      p.vel = [0, 0, 0];
      return; // đang chờ hồi sinh
    }

    let [mx, mz] = input.move ?? [0, 0];
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    const th = ((input.cam_yaw_deg ?? 0) * Math.PI) / 180;
    const wx = mx * Math.cos(th) + mz * Math.sin(th);
    const wz = -mx * Math.sin(th) + mz * Math.cos(th);
    const wlen = Math.hypot(wx, wz);
    if (wlen > 1e-9) p.facing = [wx / wlen, wz / wlen];

    if (pressed.dash && p.dashTicks === 0 && (p.dashCd === 0 || p.charm > 0)) {
      p.dashDir = wlen > 1e-9 ? [wx / wlen, wz / wlen] : [...p.facing];
      p.dashTicks = secToTicks(t.dash_duration_s);
      p.dashCd = p.charm > 0 ? 0 : secToTicks(t.dash_cooldown_s);
      emit('dash', {});
    }
    if (pressed.jump && p.grounded && p.dashTicks === 0) {
      p.vy = STD.jumpSpeed;
      p.grounded = false;
    }

    const dashing = p.dashTicks > 0;
    let vx;
    let vz;
    if (dashing) {
      vx = p.dashDir[0] * t.dash_speed;
      vz = p.dashDir[1] * t.dash_speed;
      p.dashTicks--;
    } else if (p.launch) {
      [vx, vz] = p.launch;
    } else {
      const sp = p.charm > 0 ? STD.charmSpeed : t.player_speed;
      vx = wx * sp;
      vz = wz * sp;
    }
    if (this.wind.active) {
      vx += Math.cos((this.wind.dir * Math.PI) / 180) * STD.windSpeed;
      vz += Math.sin((this.wind.dir * Math.PI) / 180) * STD.windSpeed;
    }
    if (dashing) p.vy = 0; // lướt giữ nguyên độ cao
    else if (!p.grounded) p.vy -= STD.gravity / TICK_RATE;
    p.vel = [vx, p.vy, vz];

    // di chuyển ngang, chặn bởi vách/tháp (trượt theo từng trục)
    const dx = vx / TICK_RATE;
    const dz = vz / TICK_RATE;
    const [x0, y0, z0] = p.pos;
    if (this.canStand(x0 + dx, z0 + dz, y0)) {
      p.pos[0] += dx;
      p.pos[2] += dz;
    } else if (dx && this.canStand(x0 + dx, z0, y0)) p.pos[0] += dx;
    else if (dz && this.canStand(x0, z0 + dz, y0)) p.pos[2] += dz;

    // di chuyển dọc
    const g = groundAt(this.night, p.pos[0], p.pos[2]);
    if (p.grounded) {
      if (g !== null && Math.abs(p.pos[1] - g) <= STD.stepHeight) p.pos[1] = g;
      else p.grounded = false; // bước ra khỏi mép
    }
    if (!p.grounded && !dashing) {
      const prevY = p.pos[1];
      p.pos[1] += p.vy / TICK_RATE;
      if (g !== null && p.vy <= 0 && p.pos[1] <= g && prevY >= g - STD.stepHeight) {
        p.pos[1] = g;
        p.vy = 0;
        p.grounded = true;
        p.launch = null;
      }
    }
    if (p.grounded) p.vel[1] = 0;

    // bục nhảy
    if (p.grounded) {
      for (const pad of this.map.pads) {
        if (hdist(p.pos, pad.pos) <= pad.r + EPS && Math.abs(p.pos[1] - pad.pos[1]) < 0.1) {
          const dir = pad.dir ?? unitXZ(pad.pos, [pad.toward[0], 0, pad.toward[1]]);
          p.launch = [dir[0] * pad.speed, dir[1] * pad.speed];
          p.vy = pad.vy;
          p.grounded = false;
          break;
        }
      }
    }

    // rơi khỏi đảo
    if (p.pos[1] < STD.fallY) {
      const lost = p.carried;
      p.flames = Math.max(0, p.flames - 1);
      p.carried = 0;
      p.vy = 0;
      p.vel = [0, 0, 0];
      p.launch = null;
      p.dashTicks = 0;
      p.fallWait = STD.fallWaitTicks;
      emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }

  pickup(emit) {
    const p = this.player;
    if (p.fallWait > 0) return;
    const near = (pos) => hdist(p.pos, pos) <= this.t.pickup_radius + EPS && Math.abs(p.pos[1] - pos[1]) <= STD.pickupHeight + EPS;
    for (let i = 0; i < this.motes.length && p.carried < this.t.carry_capacity; ) {
      if (near(this.motes[i].pos)) {
        this.motes.splice(i, 1);
        p.carried++;
        emit('mote_picked', { carried: p.carried });
      } else i++;
    }
    for (const c of this.charms) {
      if (!c.available || !near(c.pos)) continue;
      c.available = false;
      c.respawn = STD.charmRespawnTicks;
      p.charm = STD.charmTicks;
      emit('charm_picked', { charm_id: c.id, charm_ticks: p.charm });
    }
  }

  /** Nạp vào đèn chưa sáng gần nhất trong interact_radius (bằng nhau: id nhỏ hơn). */
  interact(emit) {
    const p = this.player;
    if (p.fallWait > 0 || p.carried <= 0) return;
    const cost = this.t.lantern_cost;
    let best = null;
    let bestD = Infinity;
    for (const l of this.lanterns) {
      if (l.lit) continue;
      const d = hdist(p.pos, l.pos);
      if (d <= this.t.interact_radius + EPS && d < bestD - EPS) {
        best = l;
        bestD = d;
      }
    }
    if (!best) return;
    const amount = Math.min(p.carried, cost - best.deposited);
    if (amount <= 0) return;
    p.carried -= amount;
    best.deposited += amount;
    this.score += amount * this.t.score.per_mote;
    emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
    if (best.deposited >= cost) {
      best.lit = true;
      best.justLit = true;
      this.score += this.t.score.per_lantern;
      emit('lantern_lit', { lantern_id: best.id });
    }
  }

  /** Đèn vừa sáng: Bóng Mực đang ở trong bị đẩy ra mép trong 30 tick, không gây sát thương. */
  updateSafeZones() {
    const R = this.t.safe_radius;
    for (const l of this.lanterns) {
      if (!l.justLit) continue;
      l.justLit = false;
      for (const s of this.shades) {
        const d = hdist(s.pos, l.pos);
        if (d >= R - EPS) continue;
        s.state = 'recoil';
        s.ticks = STD.expelTicks;
        s.harmless = true;
        s.push = 0;
        s.move = { dir: unitXZ(l.pos, s.pos), step: (R - d) / STD.expelTicks, expel: true };
      }
    }
  }

  pulse(emit) {
    const p = this.player;
    const t = this.t;
    if (p.fallWait > 0 || p.pulseCd > 0 || p.carried < t.pulse_cost) return;
    p.carried -= t.pulse_cost;
    p.pulseCd = secToTicks(t.pulse_cooldown_s);
    const c = [p.pos[0], p.pos[1] + STD.pulseCenterY, p.pos[2]];
    const ids = [];
    for (const s of this.shades) {
      if (dist3(c, s.pos) > t.pulse_radius + EPS) continue;
      s.state = 'stunned';
      s.ticks = this.stunTicks;
      s.push = STD.pushTicks;
      s.pushDir = unitXZ(p.pos, s.pos);
      s.move = null;
      s.harmless = false;
      ids.push(s.id);
    }
    this.score += ids.length * t.score.per_stun;
    emit('pulse', { stunned_ids: ids });
    for (const d of this.drifters) {
      if (dist3(c, d.pos) > t.pulse_radius + EPS) continue;
      if (d.state === 'chase') {
        d.state = 'flee';
        d.ticks = STD.drifterFleeTicks;
      } else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen;
        for (let i = 0; i < amount; i++) {
          const gy = groundAt(this.night, d.pos[0], d.pos[2]);
          this.addMote([d.pos[0], gy ?? p.pos[1], d.pos[2]], 'dropped', STD.dropTtl);
        }
        d.stolen = 0;
        d.ticks = STD.drifterDropFleeTicks;
        emit('drifter_drop', { drifter_id: d.id, amount });
      }
    }
  }

  blockedForShade(pos) {
    const R = this.t.safe_radius;
    for (const l of this.lanterns) if (l.lit && hdist(pos, l.pos) < R - EPS) return true;
    return inTower(this.night, pos[0], pos[2], pos[1]);
  }

  /** Đưa Bóng Mực ra mép vùng an toàn / tháp nếu đang ở trong (chặn ở mép 6 m). */
  clampShade(s) {
    const R = this.t.safe_radius;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const d = hdist(s.pos, l.pos);
      if (d >= R - EPS) continue;
      const [ux, uz] = unitXZ(l.pos, s.pos);
      s.pos[0] = l.pos[0] + ux * R;
      s.pos[2] = l.pos[2] + uz * R;
    }
    const tw = this.map.tower;
    if (tw && inTower(this.night, s.pos[0], s.pos[2], s.pos[1])) {
      const [ux, uz] = unitXZ([tw.c[0], 0, tw.c[1]], s.pos);
      s.pos[0] = tw.c[0] + ux * tw.r;
      s.pos[2] = tw.c[1] + uz * tw.r;
    }
  }

  /** Bóng Mực đi trên mặt đất: không ra biển mây, không leo vách (> stepHeight), không xuyên tháp. */
  shadeCanGo(s, x, z) {
    const g = groundAt(this.night, x, z);
    if (g === null) return false;
    const cur = groundAt(this.night, s.pos[0], s.pos[2]) ?? g;
    return g - cur <= STD.stepHeight && !inTower(this.night, x, z, g + STD.shadeY);
  }

  /** Dịch Bóng Mực (trượt theo trục nếu bị chặn). Trả về false nếu không đi được. */
  shadeStep(s, dx, dz) {
    for (const [ax, az] of [[dx, dz], [dx, 0], [0, dz]]) {
      if ((ax || az) && this.shadeCanGo(s, s.pos[0] + ax, s.pos[2] + az)) {
        s.pos[0] += ax;
        s.pos[2] += az;
        return true;
      }
    }
    return false;
  }

  shadeToward(s, target, speed) {
    const d = hdist(s.pos, target);
    if (d < 1e-9) return;
    const k = Math.min(speed / TICK_RATE, d) / d;
    this.shadeStep(s, (target[0] - s.pos[0]) * k, (target[2] - s.pos[2]) * k);
  }

  moveShades() {
    const p = this.player;
    for (const s of this.shades) {
      if (s.state === 'spawning') continue;
      if (s.state === 'stunned') {
        if (s.push > 0) {
          const step = this.t.pulse_push_m / STD.pushTicks;
          const nx = s.pos[0] + s.pushDir[0] * step;
          const nz = s.pos[2] + s.pushDir[1] * step;
          if (this.shadeCanGo(s, nx, nz) && !this.blockedForShade([nx, s.pos[1], nz])) {
            s.pos[0] = nx;
            s.pos[2] = nz;
            s.push--;
          } else s.push = 0; // gặp vật cản thì dừng
        }
      } else if (s.state === 'recoil') {
        if (s.move && !this.shadeStep(s, s.move.dir[0] * s.move.step, s.move.dir[1] * s.move.step)) s.move = null;
      } else {
        const d = hdist(s.pos, p.pos);
        if (s.state === 'wander' && d <= STD.shadeDetect) s.state = 'chase';
        else if (s.state === 'chase' && d > STD.shadeGiveUp) s.state = 'wander';
        if (s.state === 'chase') this.shadeToward(s, p.pos, this.shadeSpeed);
        else {
          if (!s.waypoint || hdist(s.pos, s.waypoint) < 0.5 || --s.wpTicks <= 0) {
            const g0 = groundAt(this.night, s.pos[0], s.pos[2]) ?? 0;
            const same = this.map.motePoints.filter((pt) => Math.abs(pt[1] - g0) < 0.5);
            const pool = same.length ? same : this.map.motePoints;
            s.waypoint = pool[Math.floor(this.rng() * pool.length)];
            s.wpTicks = 600; // đổi điểm nếu kẹt quá 10 s
          }
          this.shadeToward(s, s.waypoint, STD.shadeWanderSpeed);
        }
      }
      const g = groundAt(this.night, s.pos[0], s.pos[2]);
      if (g !== null) s.pos[1] = g + STD.shadeY;
      if (!(s.move && s.move.expel)) this.clampShade(s);
    }
  }

  stepToward(pos, target, speed) {
    const d = hdist(pos, target);
    if (d < 1e-9) return;
    const k = Math.min(speed / TICK_RATE, d) / d;
    pos[0] += (target[0] - pos[0]) * k;
    pos[2] += (target[2] - pos[2]) * k;
  }

  moveDrifters() {
    const p = this.player;
    for (const d of this.drifters) {
      if (d.state === 'removed') continue;
      if (d.state === 'idle' || d.state === 'chase') {
        const want = p.fallWait === 0 && p.carried >= STD.drifterChaseCarry && hdist(d.pos, p.pos) <= STD.drifterRange;
        d.state = want ? 'chase' : 'idle';
      }
      if (d.state === 'chase') this.stepToward(d.pos, p.pos, STD.drifterSpeed);
      else if (d.state === 'flee') {
        const [ux, uz] = unitXZ(p.pos, d.pos);
        d.pos[0] += (ux * STD.drifterSpeed) / TICK_RATE;
        d.pos[2] += (uz * STD.drifterSpeed) / TICK_RATE;
      } else {
        if (!d.waypoint || hdist(d.pos, d.waypoint) < 0.5) d.waypoint = this.map.shadePoints[Math.floor(this.rng() * this.map.shadePoints.length)];
        this.stepToward(d.pos, d.waypoint, STD.drifterIdleSpeed);
      }
      d.pos[1] = (groundAt(this.night, d.pos[0], d.pos[2]) ?? 0) + STD.drifterY;
    }
  }

  drifterTouch(emit) {
    const p = this.player;
    if (p.fallWait > 0) return;
    for (const d of this.drifters) {
      if (d.state !== 'chase' || hdist(d.pos, p.pos) > STD.drifterTouch + EPS) continue;
      const amount = Math.min(STD.drifterSteal, p.carried);
      p.carried -= amount;
      d.stolen = amount;
      d.state = 'flee';
      d.ticks = STD.drifterFleeTicks;
      emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
    }
  }

  shadeTouch(emit) {
    const p = this.player;
    const t = this.t;
    if (p.fallWait > 0) return;
    for (const s of this.shades) {
      if ((s.state !== 'wander' && s.state !== 'chase') || s.harmless) continue;
      if (hdist(s.pos, p.pos) > t.shade_hit_radius + EPS || Math.abs(s.pos[1] - p.pos[1]) > STD.shadeHitHeight + EPS) continue;
      if (p.invuln > 0) continue; // chạm lúc bất tử: không làm gì
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * t.hit_drop_ratio + 1e-9);
      p.carried -= dropped;
      for (let i = 0; i < dropped; i++) this.dropMote();
      p.invuln = secToTicks(t.invuln_s);
      s.state = 'recoil';
      s.ticks = STD.recoilTicks;
      s.move = { dir: unitXZ(p.pos, s.pos), step: STD.recoilM / STD.recoilTicks };
      // bước lùi đầu tiên ngay tick gây hit => đủ 2 m sau 60 tick (tick hit … hit+59)
      this.shadeStep(s, s.move.dir[0] * s.move.step, s.move.dir[1] * s.move.step);
      this.clampShade(s);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      return; // tối đa 1 lần mất Ngọn Lửa mỗi tick
    }
  }

  /** Đom đóm rơi ra vành 1.5–2.5 m quanh Mây, tồn tại 480 tick. */
  dropMote() {
    const p = this.player;
    let pos = null;
    for (let i = 0; i < 8 && !pos; i++) {
      const a = this.rng() * 2 * Math.PI;
      const r = STD.dropRing[0] + this.rng() * (STD.dropRing[1] - STD.dropRing[0]);
      const x = p.pos[0] + r * Math.cos(a);
      const z = p.pos[2] + r * Math.sin(a);
      const g = groundAt(this.night, x, z);
      if (g !== null && !inTower(this.night, x, z, g)) pos = [round3(x), g, round3(z)];
    }
    this.addMote(pos ?? [round3(p.pos[0]), p.pos[1], round3(p.pos[2])], 'dropped', STD.dropTtl);
  }

  spawn(emit) {
    const s = this.simTick;
    const p = this.player;
    if (this.randomMotes && s % STD.moteEvery === 0 && this.motes.length < STD.moteCap) {
      const free = this.map.motePoints.filter((pt) => !this.motes.some((m) => hdist(m.pos, pt) < 0.01 && Math.abs(m.pos[1] - pt[1]) < 0.01));
      if (free.length) this.addMote(free[Math.floor(this.rng() * free.length)], 'random', null);
    }
    const every = secToTicks(this.map.shadeEveryS);
    if (this.randomShades && s >= STD.shadeFirstTick && (s - STD.shadeFirstTick) % every === 0) {
      const n = s === STD.shadeFirstTick ? STD.shadeFirstCount : 1;
      const used = [];
      for (let i = 0; i < n && this.shades.length < this.map.shadeMax; i++) {
        const valid = this.map.shadePoints.filter((pt) => hdist(pt, p.pos) >= STD.shadeMinDist && !used.includes(pt));
        if (!valid.length) break; // hết điểm hợp lệ: bỏ lượt
        const pt = valid[Math.floor(this.rng() * valid.length)];
        used.push(pt);
        const pos = [pt[0], (groundAt(this.night, pt[0], pt[2]) ?? 0) + STD.shadeY, pt[2]];
        const sh = this.addShade(pos, undefined, 'spawning', 1);
        emit('shade_spawned', { id: sh.id });
      }
    }
    if (this.randomDrifters && s % STD.drifterEvery === 0) {
      const active = this.drifters.filter((d) => d.state !== 'removed').length;
      if (active < STD.drifterMax) {
        const pt = this.map.shadePoints[Math.floor(this.rng() * this.map.shadePoints.length)];
        this.addDrifter([pt[0], (groundAt(this.night, pt[0], pt[2]) ?? 0) + STD.drifterY, pt[2]]);
      }
    }
  }

  checkEnd(emit) {
    const p = this.player;
    if (p.flames <= 0) this.finish('lost', 'no_flames', emit);
    else if (this.lanterns.every((l) => l.lit)) this.finish('won', 'all_lit', emit);
    else if (this.ticksLeft <= 0) this.finish('lost', 'dawn', emit);
  }

  finish(result, reason, emit) {
    this.state = result;
    this.result = { result, reason };
    if (result === 'won') {
      const sc = this.t.score;
      this.score += sc.per_second_left * Math.floor(Math.max(0, this.ticksLeft) / TICK_RATE) + sc.per_flame_left * this.player.flames;
    }
    emit('game_over', { result, reason });
  }

  snapshot() {
    const p = this.player;
    const sec = (ticks) => round3(ticks / TICK_RATE);
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.simTick,
      state: this.state,
      night: this.night,
      time_left_s: round3(Math.max(0, this.ticksLeft) / TICK_RATE),
      score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.active ? this.wind.dir : null },
      player: {
        pos: p.pos.map(round3),
        vel: p.vel.map(round3),
        grounded: p.grounded,
        flames: p.flames,
        carried: p.carried,
        invuln: p.invuln > 0,
        dash_cd_s: sec(p.dashCd),
        pulse_cd_s: sec(p.pulseCd),
        charm_s: sec(p.charm),
      },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: l.pos.map(round3), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: s.pos.map(round3), state: s.state, state_ticks_left: TIMED.has(s.state) ? s.ticks : null })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: m.pos.map(round3), kind: m.kind, ttl_s: m.kind === 'dropped' && m.ttl !== null ? sec(m.ttl) : null })),
      drifters: this.drifters.map((d) => ({ id: d.id, pos: d.pos.map(round3), state: d.state, stolen: d.stolen })),
      charms: this.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: sec(c.available ? 0 : c.respawn) })),
    };
  }
}
