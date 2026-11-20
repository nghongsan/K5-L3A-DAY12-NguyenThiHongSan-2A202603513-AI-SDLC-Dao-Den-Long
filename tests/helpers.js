// Helper dùng chung cho test (không phải file test).
import { runHeadless } from '../src/core/runner.js';
import { loadContract } from '../src/headless/contract.js';

export const contract = loadContract();
export const T = contract.tuning;
export const quiet = { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false };

/** Chạy headless; mặc định tắt mọi sinh ngẫu nhiên và snapshot mỗi tick (ss[i] là tick i). */
export const run = (scenario, frames = [], ticks = 60, { night = 1, seed = 1, every = 1, noisy = false } = {}) =>
  runHeadless({ tuning: T, seed, night, scenario: noisy ? scenario : { ...quiet, ...scenario }, inputs: { frames }, ticks, snapshotEvery: every });
export const snaps = (lines) => lines.filter((l) => l.type === 'snapshot');
export const events = (lines, name) => lines.filter((l) => l.type === 'event' && (!name || l.name === name));
export const last = (lines) => snaps(lines).at(-1);
export const at = (lines, tick) => snaps(lines).find((s) => s.tick === tick);
export const ticksOf = (s) => Math.round(s * 60);
export const hd = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
