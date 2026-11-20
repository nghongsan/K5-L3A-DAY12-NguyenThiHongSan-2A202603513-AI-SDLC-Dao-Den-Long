// Chạy mô phỏng headless và tạo các dòng JSONL theo Test Contract v1.0 (mục E).
import { Game } from './sim.js';

/**
 * @param {{tuning: object, seed: number, scenario?: object, inputs?: {frames: object[]},
 *          ticks: number, snapshotEvery?: number}} o
 * @returns {object[]} snapshot / event / end theo đúng thứ tự ghi
 */
export function runHeadless({ tuning, seed, scenario = {}, inputs = { frames: [] }, ticks, snapshotEvery = 10 }) {
  const game = new Game({ tuning, seed, scenario });
  const lines = [game.snapshot()]; // tick 0: sau khi dựng scenario, trước input
  const frames = inputs.frames;
  const cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
  let fi = 0;
  let steps = 0;
  for (let k = 0; k < ticks && game.state === 'playing'; k++) {
    while (fi < frames.length && frames[fi].tick <= k) {
      const { tick, ...fields } = frames[fi++];
      Object.assign(cur, fields); // trường vắng mặt giữ giá trị cũ
    }
    lines.push(...game.step(cur));
    steps++;
    if (game.tick % snapshotEvery === 0) lines.push(game.snapshot());
  }
  lines.push({ type: 'end', ticks: steps, state: game.state, score: game.score });
  return lines;
}

export const toJsonl = (lines) => lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
