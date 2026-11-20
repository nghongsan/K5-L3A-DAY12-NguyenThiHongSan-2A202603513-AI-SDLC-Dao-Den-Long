// Đóng gói bản chạy được cho GitHub Release: node scripts/build-release.mjs
// => dist/dao-den-long-v<version>/ (đã kèm three.js, KHÔNG cần npm install) + dist/dao-den-long-v<version>.zip
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `dao-den-long-v${version}`;
const out = join('dist', name);
rmSync('dist', { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ['server.mjs', 'game.contract.json', 'package.json', 'README.md', 'CHANGELOG.md', 'CREDITS.md', 'LICENSE', 'bench.json', 'soak.json']) cpSync(f, join(out, f));
for (const d of ['web', 'src', 'scenarios']) cpSync(d, join(out, d), { recursive: true });
mkdirSync(join(out, 'scripts'), { recursive: true });
for (const f of ['bench.mjs', 'soak.mjs']) cpSync(join('scripts', f), join(out, 'scripts', f));
cpSync('node_modules/three/build', join(out, 'node_modules/three/build'), { recursive: true });
cpSync('node_modules/three/LICENSE', join(out, 'node_modules/three/LICENSE'));
writeFileSync(
  join(out, 'CHAY-GAME.txt'),
  `Đảo Đèn Lồng v${version} — bản phát hành (đã kèm three.js, không cần npm install)

Yêu cầu: Node.js >= 20 và một trình duyệt có WebGL (Chrome, Edge, Firefox, Safari). macOS hoặc Linux (Windows cũng chạy được).

1) Giải nén, mở terminal trong thư mục này
2) node server.mjs
3) Mở http://localhost:5173

Headless:  node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out run.jsonl
Bench:     node scripts/bench.mjs --seed 42 --duration 30 --out bench.json   (cần Chrome/Chromium/Edge)
Soak:      node --expose-gc --jitless scripts/soak.mjs --seed 7 --nights 10 --out soak.json
Xuất bảng xếp hạng: node server.mjs --export-leaderboard out.json
`,
);
execFileSync('zip', ['-qr', `${name}.zip`, name], { cwd: 'dist' });
console.log(`Đã tạo dist/${name}/ và dist/${name}.zip`);
