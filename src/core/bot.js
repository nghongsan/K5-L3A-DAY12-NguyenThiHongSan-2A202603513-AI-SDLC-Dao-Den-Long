// Bot chơi thử: chỉ đọc trạng thái và tạo input như người chơi (move/interact/pulse/dash, yaw 0).
// Dùng để chứng minh các Đêm chơi được tới thắng/thua, cân chỉnh số liệu và chế độ demo (phím B).
import { Game, hdist } from './sim.js';
import { polar } from './maps.js';

const level = (y) => (y > 4.5 ? 2 : y > 1.5 ? 1 : 0);

/** Điểm trung gian để đi tới target (qua cầu Đêm 2, lên dốc/bục Đêm 3). */
export function navPoint(g, target) {
  const p = g.player.pos;
  if (g.night === 2) {
    const WA = [24, 0, 0];
    const WB = [46, 0, 0];
    const pSide = p[0] < 35 ? 'A' : 'B';
    const tSide = target[0] < 35 ? 'A' : 'B';
    const onBridge = p[0] > 25 && p[0] < 45 && Math.abs(p[2]) < 2;
    if (pSide !== tSide) {
      const [near, far] = pSide === 'A' ? [WA, WB] : [WB, WA];
      return onBridge || hdist(p, near) < 1 ? far : near;
    }
    if (onBridge) return pSide === 'A' ? WA : WB;
    return target;
  }
  if (g.night === 3) {
    const pl = level(p[1]);
    const tl = level(target[1]);
    if (tl > pl) {
      if (pl === 1) return [0, 3, 13]; // bục nhảy lên tầng 2
      const ramps = [30, 150].map((deg) => ({ foot: polar(31, deg), top: polar(22.5, deg, 3), ux: Math.cos((deg * Math.PI) / 180), uz: Math.sin((deg * Math.PI) / 180) }));
      for (const r of ramps) {
        const along = p[0] * r.ux + p[2] * r.uz;
        const lat = Math.abs(-p[0] * r.uz + p[2] * r.ux);
        if (along > 22 && along < 31.5 && lat < 1) return r.top;
      }
      const best = ramps.reduce((a, b) => (hdist(p, a.foot) < hdist(p, b.foot) ? a : b));
      return best.foot;
    }
  }
  return target;
}

export function botInput(g, mem) {
  const p = g.player;
  const t = g.t;
  const inp = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
  const threat = g.shades.find((s) => (s.state === 'chase' || s.state === 'wander') && hdist(s.pos, p.pos) < 3 && Math.abs(s.pos[1] - p.pos[1]) < 1.5);
  if (threat && p.carried >= t.pulse_cost && p.pulseCd === 0 && !mem.pulse) inp.pulse = true;

  const hunters = g.shades.filter((s) => s.state === 'chase' || s.state === 'wander' || s.state === 'spawning');
  const danger = (pos) => hunters.reduce((a, s) => a + 40 / (1 + hdist(s.pos, pos)), 0);
  const cost = (x) => hdist(x.pos, p.pos) + 8 * Math.abs(x.pos[1] - p.pos[1]) + danger(x.pos);
  const nearest = (list) => list.reduce((b, x) => (!b || cost(x) < cost(b) ? x : b), null);
  const lantern = nearest(g.lanterns.filter((l) => !l.lit));
  const need = lantern ? t.lantern_cost - lantern.deposited : Infinity;
  const goDeposit = lantern && p.carried > 0 && (p.carried >= t.carry_capacity || p.carried >= need || (g.motes.length === 0 && p.carried > 0));
  let target = goDeposit ? lantern : nearest(g.motes) ?? lantern;

  // kẹt quá lâu thì đổi mục tiêu tạm thời
  mem.t = (mem.t ?? 0) + 1;
  if (mem.t % 120 === 0) {
    mem.stuck = mem.last && hdist(mem.last, p.pos) < 1 && !goDeposit ? 90 : 0;
    mem.last = [...p.pos];
    mem.seed = ((mem.seed ?? 12345) * 1103515245 + 12345) % 2147483648;
  }
  if (mem.stuck > 0) {
    mem.stuck--;
    const others = g.motes.filter((m) => m !== target);
    if (others.length) target = others[mem.seed % others.length];
  }

  if (target) {
    const wp = navPoint(g, target.pos);
    let dx = wp[0] - p.pos[0];
    let dz = wp[2] - p.pos[2];
    if (goDeposit && wp === target.pos && Math.hypot(dx, dz) <= t.interact_radius - 0.3) {
      dx = dz = 0;
      if (!mem.interact) inp.interact = true;
    }
    const tl = Math.hypot(dx, dz);
    if (tl > 1e-6) {
      dx /= tl;
      dz /= tl;
    }
    let close = Infinity;
    for (const s of hunters) {
      const d = hdist(s.pos, p.pos);
      close = Math.min(close, d);
      if (d > 6 || d < 1e-6) continue;
      dx += ((p.pos[0] - s.pos[0]) / d) * ((6 - d) / 6) * 2.5;
      dz += ((p.pos[2] - s.pos[2]) / d) * ((6 - d) / 6) * 2.5;
    }
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) inp.move = [dx / len, dz / len];
    if (close < 2 && !inp.pulse && p.invuln === 0 && p.dashCd === 0 && !mem.dash && g.night === 1) inp.dash = true; // né bằng lướt (chỉ Đêm 1: Đêm 2/3 dễ lướt rơi khỏi đảo)
  }
  mem.pulse = inp.pulse;
  mem.interact = inp.interact;
  mem.dash = inp.dash;
  return inp;
}

/** Chơi một Đêm với seed; trả về kết quả và các frame input (để phát lại qua CLI). */
export function playBot(tuning, seed, night = 1) {
  const g = new Game({ tuning, seed, night });
  const mem = {};
  const frames = [];
  let prev = '';
  while (g.state === 'playing') {
    const inp = botInput(g, mem);
    inp.move = inp.move.map((v) => Math.round(v * 1000) / 1000); // ghi ra JSON gọn, phát lại y hệt
    const key = JSON.stringify(inp);
    if (key !== prev) frames.push({ tick: g.tick, ...inp });
    prev = key;
    g.step(inp);
  }
  return { result: g.state, reason: g.result?.reason ?? null, ticks: g.tick, score: g.score, lit: g.lanterns.filter((l) => l.lit).length, total: g.lanterns.length, flames: g.player.flames, frames };
}
