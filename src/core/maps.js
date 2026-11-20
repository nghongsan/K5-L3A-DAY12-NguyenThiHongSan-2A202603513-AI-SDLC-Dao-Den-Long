// Bản đồ chuẩn Ticket-02 (contract v1.1).
// Góc đo từ trục +X trên mặt phẳng XZ: x = r·cosθ, z = r·sinθ
// (kiểm chứng: tầng 1 Đêm 3 ở z > 0 chứa các điểm 20°…160°, dốc 30°/150° dẫn lên tầng 1).
import { round3 } from './util.js';

const rad = (d) => (d * Math.PI) / 180;
export const polar = (r, deg, y = 0, cx = 0, cz = 0) => [round3(cx + r * Math.cos(rad(deg))), y, round3(cz + r * Math.sin(rad(deg)))];
const ring = (r, start, step, n, y = 0, cx = 0, cz = 0) => Array.from({ length: n }, (_, i) => polar(r, start + i * step, y, cx, cz));

export const NIGHTS = {
  1: {
    name: 'Đảo Bến',
    start: [0, 0, 0],
    islands: [{ c: [0, 0], r: 40 }],
    bridges: [],
    lanterns: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motePoints: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
    shadePoints: ring(37, 15, 30, 12),
    shadeEveryS: 8,
    shadeMax: 6,
    shadeSpeed: null, // dùng tuning.shade_speed
    pads: [],
    charms: [],
    drifters: false,
    wind: false,
    tiers: false,
    tower: null,
  },
  2: {
    name: 'Đảo Cau',
    start: [0, 0, 0],
    islands: [{ c: [0, 0], r: 28 }, { c: [70, 0], r: 28 }],
    bridges: [{ x: [26, 44], z: [-2, 2], y: 0 }],
    lanterns: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motePoints: [...ring(10, 0, 90, 4), ...ring(22, 0, 45, 8), ...ring(10, 0, 90, 4, 0, 70, 0), ...ring(22, 0, 45, 8, 0, 70, 0)],
    shadePoints: [...ring(26, 22.5, 45, 8), ...ring(26, 22.5, 45, 8, 0, 70, 0)],
    shadeEveryS: 7,
    shadeMax: 8,
    shadeSpeed: null,
    pads: [
      { pos: [20, 0, 18], r: 1, vy: 14, speed: 24, toward: [70, 0] },
      { pos: [50, 0, -18], r: 1, vy: 14, speed: 24, toward: [0, 0] },
    ],
    charms: [[35, 0, 0]],
    drifters: true,
    wind: false,
    tiers: false,
    tower: null,
  },
  3: {
    name: 'Đảo Chuông',
    start: [0, 0, -30], // giả định: (0,0,0) nằm trong tháp chuông nên xuất phát ở tầng 0 phía -Z
    islands: [{ c: [0, 0], r: 45 }],
    bridges: [],
    lanterns: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motePoints: [...ring(34, 0, 20, 18), ...ring(18, 20, 20, 8, 3), ...ring(5, 45, 90, 4, 6)],
    shadePoints: ring(43, 0, 22.5, 16),
    shadeEveryS: 6,
    shadeMax: 10,
    shadeSpeed: 4.5,
    pads: [{ pos: [0, 3, 13], r: 1, vy: 12, speed: 8, dir: [0, -1] }],
    charms: [[30, 0, 25], [-30, 0, 25]],
    drifters: true,
    wind: true,
    tiers: true,
    tower: { c: [0, 0], r: 2, top: 14 }, // cao 8 m trên tầng 2 (Y=6)
    ramps: [30, 150].map((deg) => ({ deg, from: 30, to: 24, width: 3, ux: Math.cos(rad(deg)), uz: Math.sin(rad(deg)) })),
  },
};

/** Độ cao mặt đất tại (x, z) của Đêm n; null = biển mây (rơi). */
export function groundAt(n, x, z) {
  const N = NIGHTS[n];
  let g = null;
  for (const is of N.islands) if (Math.hypot(x - is.c[0], z - is.c[1]) <= is.r) g = 0;
  for (const b of N.bridges) if (x >= b.x[0] && x <= b.x[1] && z >= b.z[0] && z <= b.z[1]) g = Math.max(g ?? b.y, b.y);
  if (g === null || !N.tiers) return g;
  const r = Math.hypot(x, z);
  if (r <= 8) return 6;
  if (z > 0 && r >= 12 && r <= 24) return 3;
  for (const rp of N.ramps) {
    const along = x * rp.ux + z * rp.uz;
    const lat = Math.abs(-x * rp.uz + z * rp.ux);
    if (along >= rp.to && along <= rp.from && lat <= rp.width / 2) return (3 * (rp.from - along)) / (rp.from - rp.to);
  }
  return g;
}

/** Tháp chuông Đêm 3: hình trụ không đi xuyên/leo được. */
export function inTower(n, x, z, y) {
  const tw = NIGHTS[n].tower;
  return !!tw && Math.hypot(x - tw.c[0], z - tw.c[1]) < tw.r && y < tw.top;
}
