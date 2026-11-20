// Tìm Chrome/Chromium/Edge cho bench và ui-smoke. Đặt CHROME=<đường dẫn> để chỉ định.
import { existsSync } from 'node:fs';

export function findChrome() {
  return [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ]
    .filter(Boolean)
    .find((p) => existsSync(p));
}

/** Không có màn hình (Linux không DISPLAY/WAYLAND_DISPLAY) => phải chạy headless. */
export const noDisplay = () => process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;

/** Kết nối DevTools tới trang đầu tiên của Chrome đã mở với --remote-debugging-port. */
export async function connectCdp(port, tries = 100) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let ws;
  let version = 'Chrome';
  for (let i = 0; i < tries && !ws; i++) {
    await sleep(150);
    try {
      version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser ?? version;
      const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((p) => p.type === 'page');
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch { /* chờ Chrome mở cổng DevTools */ }
  }
  if (!ws) throw new Error('không kết nối được Chrome DevTools');
  await new Promise((r, j) => {
    ws.addEventListener('open', r, { once: true });
    ws.addEventListener('error', j, { once: true });
  });
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
  return { ws, call, version };
}
