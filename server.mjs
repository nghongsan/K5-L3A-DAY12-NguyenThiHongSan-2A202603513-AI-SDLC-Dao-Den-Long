// Static server tối giản (không phụ thuộc thư viện) cho bản có giao diện: npm start
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const ALLOWED = ['/web/', '/src/core/', '/node_modules/three/build/', '/game.contract.json'];
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

http
  .createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/') path = '/web/index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT) || !ALLOWED.some((p) => path.startsWith(p))) {
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
  })
  .listen(PORT, '127.0.0.1', () => console.log(`Đảo Đèn Lồng đang chạy: http://localhost:${PORT}  (Ctrl+C để dừng)`));
