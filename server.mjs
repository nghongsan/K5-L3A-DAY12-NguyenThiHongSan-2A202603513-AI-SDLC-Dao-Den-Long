// Server cho bản có giao diện (không phụ thuộc thư viện) + bảng xếp hạng lưu trên đĩa.
//   node server.mjs [--no-open]                     chơi: http://localhost:5173 (tự mở trình duyệt)
//   node server.mjs --export-leaderboard out.json   xuất {"entries": [...]} đúng thứ tự rồi thoát
// Bảng xếp hạng: ~/.dao-den-long/leaderboard.json (đổi bằng biến DDL_LEADERBOARD).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
export const LB_FILE = process.env.DDL_LEADERBOARD ?? join(homedir(), '.dao-den-long', 'leaderboard.json');
const ALLOWED = ['/web/', '/src/core/', '/node_modules/three/build/', '/game.contract.json'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// ---------- bảng xếp hạng ----------
export const NAME_RE = /^[\p{L}\p{N}_]{3,12}$/u; // [A-Za-z0-9_] + chữ tiếng Việt có dấu
const ISO_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function validateEntry(e) {
  if (!e || typeof e !== 'object') return 'entry phải là object';
  const name = typeof e.name === 'string' ? e.name.normalize('NFC') : '';
  if (!NAME_RE.test(name)) return 'Tên 3–12 ký tự: chữ (có dấu được), số hoặc _';
  if (!Number.isInteger(e.score) || e.score < 0) return 'score phải là số nguyên >= 0';
  if (!Number.isInteger(e.nights_won) || e.nights_won < 0 || e.nights_won > 3) return 'nights_won phải trong 0–3';
  if (typeof e.achieved_at !== 'string' || !ISO_TZ.test(e.achieved_at) || Number.isNaN(Date.parse(e.achieved_at))) return 'achieved_at phải là ISO 8601 có múi giờ';
  if (!Number.isInteger(e.seed)) return 'seed phải là số nguyên';
  return null;
}

/** score giảm dần; bằng điểm thì ai đạt trước đứng trên. */
export const sortEntries = (list) => [...list].sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at));

export function readBoard(file = LB_FILE) {
  try {
    const d = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(d.entries) ? sortEntries(d.entries.filter((e) => !validateEntry(e))).slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function addEntry(e, file = LB_FILE) {
  const err = validateEntry(e);
  if (err) throw new Error(err);
  const entry = { name: e.name.normalize('NFC'), score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed };
  const entries = sortEntries([...readBoard(file), entry]).slice(0, 10);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({ entries }, null, 2) + '\n');
  return { entries, rank: entries.indexOf(entries.find((x) => x === entry || (x.name === entry.name && x.achieved_at === entry.achieved_at && x.score === entry.score))) + 1 };
}

// ---------- HTTP ----------
const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

export function createServer() {
  return http.createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/api/leaderboard') {
      if (req.method === 'GET') return json(res, 200, { entries: readBoard() });
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 10000) return json(res, 413, { error: 'quá lớn' });
        }
        try {
          return json(res, 200, addEntry(JSON.parse(body)));
        } catch (e) {
          return json(res, 400, { error: e.message });
        }
      }
      return json(res, 405, { error: 'method' });
    }
    const p = path === '/' ? '/web/index.html' : path;
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT) || !ALLOWED.some((a) => p.startsWith(a))) {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
}

// ---------- chạy trực tiếp ----------
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--export-leaderboard');
  if (i > 0) {
    const out = process.argv[i + 1];
    if (!out) {
      process.stderr.write('cách dùng: node server.mjs --export-leaderboard out.json\n');
      process.exit(1);
    }
    writeFileSync(out, JSON.stringify({ entries: readBoard() }, null, 2) + '\n');
    console.log(`Đã xuất ${readBoard().length} mục bảng xếp hạng → ${out}`);
  } else {
    const port = Number(process.env.PORT) || 5173;
    createServer().listen(port, '127.0.0.1', () => {
      const url = `http://localhost:${port}`;
      console.log(`Đảo Đèn Lồng đang chạy: ${url}  (Ctrl+C để dừng)`);
      // run_cmd = "lệnh mở game có giao diện": tự mở trình duyệt (tắt bằng --no-open hoặc DDL_NO_OPEN=1)
      if (!process.argv.includes('--no-open') && !process.env.DDL_NO_OPEN && !process.env.CI) {
        const [cmd, args] = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
        try {
          spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => console.log(`Mở trình duyệt tại ${url}`)).unref();
        } catch {
          console.log(`Mở trình duyệt tại ${url}`);
        }
      }
    });
  }
}
