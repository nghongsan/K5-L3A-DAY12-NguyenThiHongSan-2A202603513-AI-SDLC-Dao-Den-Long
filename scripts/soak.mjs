// Soak test (Ticket-04): node --expose-gc scripts/soak.mjs --seed 7 --nights 10 --out soak.json
// Chạy headless N Đêm liên tiếp trong CÙNG một tiến trình (Đêm 1 → 2 → 3 xoay vòng), Đêm thứ i (i = 0…N−1) dùng seed + i.
// Input ngẫu nhiên theo seed: mỗi 30 tick chọn lại hướng; mỗi tick 5% nhảy, 3% lướt, 2% Tỏa Sáng, 10% tương tác.
import { writeFileSync } from 'node:fs';
import { Game, mulberry32 } from '../src/core/sim.js';
import { loadContract } from '../src/headless/contract.js';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const seed = Number(arg('--seed', '7'));
const nights = Number(arg('--nights', '10'));
const out = arg('--out', 'soak.json');
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) {
  process.stderr.write('cách dùng: node --expose-gc scripts/soak.mjs --seed <int> --nights <int> --out <file.json>\n');
  process.exit(1);
}
const { tuning, contract_version } = loadContract();
const gc = globalThis.gc ?? (() => {}); // có --expose-gc thì dọn rác trước khi đo bộ nhớ
const rssMb = () => Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
const heapMb = () => Math.round((process.memoryUsage().heapUsed / 1048576) * 100) / 100;
// Ghi chú: soak_cmd chạy với --jitless. Có JIT thì RSS tăng một lần ~20 MB do mã máy được biên dịch
// (heapUsed vẫn phẳng ~4.4 MB qua 150 Đêm — không rò rỉ trạng thái game). Xem docs/notes/phase-4.md.

const t0 = performance.now();
const results = [];
const details = [];
let crashes = 0;
let memStart = null;
let heapStart = null;
for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1;
  const s = seed + i;
  try {
    let game = new Game({ tuning, seed: s, night });
    if (i === 0) {
      gc();
      memStart = rssMb(); // sau khi tải xong Đêm đầu tiên
      heapStart = heapMb();
    }
    const rng = mulberry32((s * 2654435761) ^ 0x5eed);
    const maxTicks = tuning[`night${night}_duration_s`] * 60;
    let move = [0, 0];
    let ticks = 0;
    while (ticks < maxTicks && (game.state === 'playing' || game.state === 'paused')) {
      if (ticks % 30 === 0) {
        const a = rng() * 2 * Math.PI;
        move = [Math.round(Math.cos(a) * 1000) / 1000, Math.round(Math.sin(a) * 1000) / 1000];
      }
      game.step({ move, cam_yaw_deg: 0, jump: rng() < 0.05, dash: rng() < 0.03, pulse: rng() < 0.02, interact: rng() < 0.1, pause: false });
      ticks++;
    }
    const result = game.state === 'won' ? 'won' : 'lost';
    results.push(result);
    details.push({ night, seed: s, result, reason: game.result?.reason ?? 'timeout', ticks, score: game.score });
    game = null; // reset Đêm
  } catch (e) {
    crashes++;
    results.push('crash');
    details.push({ night, seed: s, result: 'crash', error: String(e && e.stack ? e.stack.split('\n')[0] : e) });
  }
}
gc();
const memEnd = rssMb(); // sau khi reset xong Đêm cuối cùng
const report = {
  nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: memEnd,
  duration_s: Math.round((performance.now() - t0) / 100) / 10,
  contract_version,
  seed,
  heap_start_mb: heapStart,
  heap_end_mb: heapMb(),
  node: process.version,
  flags: process.execArgv.join(' '),
  pass: crashes === 0 && memEnd <= 1.2 * memStart,
  details,
};
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ nights, crashes, results, mem_start_mb: memStart, mem_end_mb: memEnd, duration_s: report.duration_s, pass: report.pass }));
