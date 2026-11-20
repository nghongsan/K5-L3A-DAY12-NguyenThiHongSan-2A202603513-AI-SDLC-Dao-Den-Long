// Đo FPS trung bình của bản có giao diện ở 1280×720 bằng Chrome (giao thức DevTools, không cần thư viện).
// Yêu cầu: server đang chạy (npm start) — mặc định http://127.0.0.1:5173
// node scripts/bench-fps.mjs [--night 1] [--secs 10] [--url http://127.0.0.1:5173] [--software]
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const night = arg('--night', '1');
const secs = Number(arg('--secs', '10'));
const base = arg('--url', 'http://127.0.0.1:5173');
const software = process.argv.includes('--software');
const chrome = process.env.CHROME ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!chrome) {
  console.error('Không tìm thấy Chrome; đặt biến CHROME=<đường dẫn>');
  process.exit(1);
}
const port = 9333 + Math.floor(Math.random() * 500);
const flags = ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ddl-bench-'))}`, '--window-size=1280,720', '--hide-scrollbars', '--no-first-run'];
if (software) flags.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
if (process.argv.includes('--uncapped')) flags.push('--disable-frame-rate-limit', '--disable-gpu-vsync'); // bỏ trần ~30 FPS của headless
const target = process.argv.includes('--blank')
  ? 'data:text/html,<script>let f=0,t0;function r(t){t0??=t;f++;if(t-t0>=SECS*1000&&!window.__bench)window.__bench={avgFps:Math.round(f/((t-t0)/1000)*10)/10,frames:f,seconds:SECS,size:innerWidth+"x"+innerHeight,night:"blank"};requestAnimationFrame(r)}requestAnimationFrame(r)</script>'.replace(/SECS/g, secs)
  : 'about:blank';
const proc = spawn(chrome, [...flags, target], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    await sleep(200);
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch { /* chờ Chrome mở cổng */ }
  }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const call = (method, params = {}) =>
    new Promise((resolve) => {
      const my = ++id;
      const on = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === my) {
          ws.removeEventListener('message', on);
          resolve(m.result);
        }
      };
      ws.addEventListener('message', on);
      ws.send(JSON.stringify({ id: my, method, params }));
    });
  // khung nhìn đúng 1280×720 rồi mới mở game (cửa sổ headless có thanh công cụ ẩn làm hụt chiều cao)
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  if (!process.argv.includes('--blank')) await call('Page.navigate', { url: `${base}/?night=${night}&seed=1&bot&bench=${secs}` });
  let result = null;
  const deadline = Date.now() + (secs + 30) * 1000;
  while (!result && Date.now() < deadline) {
    await sleep(500);
    const r = await call('Runtime.evaluate', { expression: 'JSON.stringify({b: window.__bench || null, gl: (()=>{const c=document.createElement("canvas").getContext("webgl2");const e=c&&c.getExtension("WEBGL_debug_renderer_info");return e?c.getParameter(e.UNMASKED_RENDERER_WEBGL):"?"})()})', returnByValue: true });
    const v = JSON.parse(r?.result?.value ?? '{}');
    if (v.b) result = { ...v.b, renderer: v.gl, mode: software ? 'software (SwiftShader)' : 'default GPU' };
  }
  console.log(JSON.stringify(result));
  ws.close();
  process.exitCode = result && result.avgFps >= 30 ? 0 : 1;
} finally {
  proc.kill();
}
