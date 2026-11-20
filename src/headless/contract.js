import { readFileSync } from 'node:fs';

/** game.contract.json là nguồn số liệu DUY NHẤT: sim đọc tuning từ đây, nên số khai báo = số đang dùng. */
export function loadContract() {
  return JSON.parse(readFileSync(new URL('../../game.contract.json', import.meta.url), 'utf8'));
}
