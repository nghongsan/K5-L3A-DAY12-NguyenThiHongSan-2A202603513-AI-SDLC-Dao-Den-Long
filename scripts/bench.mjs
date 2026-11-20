// Benchmark chuẩn Ticket-04: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless]
// Mở cửa sổ Chrome 1280×720 (không toàn màn hình, tắt vsync + giới hạn khung hình), chạy cảnh bench (?benchscene),
// 3 s khởi động rồi đo đúng --duration giây, ghi bench.json và thoát với mã 0.
// Cần Chrome/Chromium/Edge; đặt biến CHROME=<đường dẫn> nếu không tự tìm thấy.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server.mjs';
import { findChrome, noDisplay, connectCdp } from './chrome.mjs';

const T0 = performance.timeOrigin; // thời điểm tiến trình bắt đầu (epoch ms)
const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const seed = Number(arg('--seed', '42'));
const duration = Number(arg('--duration', '30'));
const out = arg('--out', 'bench.json');
// Linux không có màn hình (DISPLAY/WAYLAND_DISPLAY) thì tự chạy headless thay vì thất bại
const headless = process.argv.includes('--headless') || noDisplay();
const die = (msg) => {
  process.stderr.write(`bench: ${msg}\n`);
  process.exit(1);
};
if (!Number.isInteger(seed) || !(duration > 0)) die('cách dùng: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless]');

const chrome = findChrome();
if (!chrome) die('không tìm thấy Chrome/Chromium/Edge; đặt CHROME=<đường dẫn>');
const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));

// 1) server tĩnh trong cùng tiến trình
const server = createServer();
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

// 2) Chrome: cửa sổ 1280×720, tắt vsync và trần khung hình
const profile = mkdtempSync(join(os.tmpdir(), 'ddl-bench-'));
const cdpPort = 9400 + Math.floor(Math.random() * 400);
const flags = [
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${cdpPort}`,
  '--window-size=1280,720',
  '--window-position=40,40',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu-vsync',
  '--disable-frame-rate-limit',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--app=about:blank',
];
if (headless) flags.unshift('--headless=new');
const proc = spawn(chrome, flags, { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** RSS (MB) của cả cây tiến trình Chrome đã mở (trình duyệt + renderer + GPU). */
function treeRssMb(rootPid) {
  try {
    const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .map((l) => l.trim().split(/\s+/).map(Number));
    const kids = new Map();
    for (const [pid, ppid] of rows) kids.set(ppid, [...(kids.get(ppid) ?? []), pid]);
    const rss = new Map(rows.map(([pid, , r]) => [pid, r]));
    let total = 0;
    const stack = [rootPid];
    while (stack.length) {
      const pid = stack.pop();
      total += rss.get(pid) ?? 0;
      stack.push(...(kids.get(pid) ?? []));
    }
    return total / 1024;
  } catch {
    return null;
  }
}

let exitCode = 0;
try {
  const { ws, call, version: browserVersion } = await connectCdp(cdpPort);
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `${base}/?benchscene&seed=${seed}&duration=${duration}` });

  let peak = 0;
  let res = null;
  const deadline = Date.now() + (duration + 60) * 1000;
  while (!res && Date.now() < deadline) {
    await sleep(250);
    const mem = treeRssMb(proc.pid);
    if (mem !== null) peak = Math.max(peak, mem);
    const r = await call('Runtime.evaluate', { expression: 'window.__benchDone ? JSON.stringify(window.__benchDone) : ""', returnByValue: true });
    if (r?.result?.value) res = JSON.parse(r.result.value);
  }
  ws.close();
  if (!res) throw new Error('hết thời gian chờ cảnh bench');

  const dts = res.dts;
  const N = dts.length;
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sorted.slice(-k);
  const p95 = sorted[Math.max(0, Math.ceil(0.95 * N) - 1)];
  const r1 = (v) => Math.round(v * 10) / 10;
  const report = {
    contract_version: contract.contract_version,
    avg_fps: r1((1000 * N) / sum),
    p1_low_fps: r1(1000 / (worst.reduce((a, b) => a + b, 0) / k)),
    frame_ms_p95: Math.round(p95 * 100) / 100,
    frames: N,
    load_ms: Math.round(res.firstEpoch - T0),
    peak_mem_mb: peak ? Math.round(peak) : null,
    vsync_off: true,
    renderer: `${browserVersion} · WebGL: ${res.gl} · three.js r${res.three}`,
    os: `${os.type()} ${os.release()} ${os.arch()} · ${os.cpus()[0]?.model ?? '?'} · ${Math.round(os.totalmem() / 1073741824)} GB RAM`,
    seed,
    duration_s: duration,
    viewport: res.size,
    window: headless ? `headless 1280x720${noDisplay() ? ' (tự chọn: không có màn hình)' : ''}` : 'cửa sổ Chrome --app 1280x720',
    scene: { shades: res.shades, motes: res.motes, lit_lanterns: 3 },
    peak_mem_note: 'Tổng RSS của cây tiến trình Chrome (trình duyệt + renderer + GPU) lấy mẫu mỗi 250 ms',
    pass: undefined,
  };
  report.pass = report.avg_fps >= 60 && report.p1_low_fps >= 30 && report.load_ms <= 10000;
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ avg_fps: report.avg_fps, p1_low_fps: report.p1_low_fps, frame_ms_p95: report.frame_ms_p95, frames: N, load_ms: report.load_ms, peak_mem_mb: report.peak_mem_mb, pass: report.pass }));
} catch (e) {
  process.stderr.write(`bench: ${e.message}\n`);
  exitCode = 1;
} finally {
  proc.kill();
  server.close();
  await sleep(300);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch { /* bỏ qua */ }
  process.exit(exitCode);
}
