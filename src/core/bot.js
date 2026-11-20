// Bot chơi thử: chỉ đọc trạng thái và tạo input như người chơi (move/interact/pulse, yaw 0).
// Dùng để chứng minh Đêm 1 chơi được từ đầu tới thắng/thua và để cân chỉnh số liệu.
import { Game, hdist } from './sim.js';

export function botInput(g, mem) {
  const p = g.player;
  const t = g.t;
  const inp = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
  const threat = g.shades.find((s) => s.state !== 'stunned' && hdist(s.pos, p.pos) < 3);
  if (threat && p.carried >= t.pulse_cost && p.pulseCd === 0 && !mem.pulse) inp.pulse = true;

  const unlit = g.lanterns.filter((l) => !l.lit);
  const nearest = (list) => list.reduce((b, x) => (!b || hdist(x.pos, p.pos) < hdist(b.pos, p.pos) ? x : b), null);
  const lantern = nearest(unlit);
  const goDeposit = lantern && (p.carried >= t.carry_capacity || p.carried >= t.lantern_cost - lantern.deposited);
  const target = goDeposit ? lantern : nearest(g.motes) ?? lantern;

  if (target) {
    let dx = target.pos[0] - p.pos[0];
    let dz = target.pos[2] - p.pos[2];
    if (goDeposit && Math.hypot(dx, dz) <= t.interact_radius - 0.3) {
      dx = dz = 0;
      if (!mem.interact) inp.interact = true;
    }
    for (const s of g.shades) {
      // né Bóng Mực đang đuổi trong bán kính 3.5 m
      const d = hdist(s.pos, p.pos);
      if (s.state === 'stunned' || d > 3.5 || d < 1e-6) continue;
      dx += ((p.pos[0] - s.pos[0]) / d) * (3.5 - d) * 1.5;
      dz += ((p.pos[2] - s.pos[2]) / d) * (3.5 - d) * 1.5;
    }
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) inp.move = [dx / len, dz / len];
  }
  mem.pulse = inp.pulse;
  mem.interact = inp.interact;
  return inp;
}

/** Chơi một ván với seed; trả về kết quả và các frame input (để phát lại qua CLI). */
export function playBot(tuning, seed, maxTicks = tuning.night1_duration_s * 60) {
  const g = new Game({ tuning, seed });
  const mem = {};
  const frames = [];
  let prev = '';
  while (g.state === 'playing' && g.tick < maxTicks) {
    const inp = botInput(g, mem);
    inp.move = inp.move.map((v) => Math.round(v * 1000) / 1000); // ghi ra JSON gọn, phát lại y hệt
    const key = JSON.stringify(inp);
    if (key !== prev) frames.push({ tick: g.tick, ...inp });
    prev = key;
    g.step(inp);
  }
  return { result: g.state, reason: g.result?.reason ?? null, ticks: g.tick, score: g.score, lit: g.lanterns.filter((l) => l.lit).length, flames: g.player.flames, frames };
}
