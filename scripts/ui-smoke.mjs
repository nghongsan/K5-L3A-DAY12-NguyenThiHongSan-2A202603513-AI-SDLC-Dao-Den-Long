// Kiểm thử giao diện thật qua Chrome DevTools (headless, không cần GPU): node scripts/ui-smoke.mjs
// menu → giới thiệu Đêm → chơi → tạm dừng → cài đặt (đổi phím trùng/hợp lệ/mặc định, chữ lớn) → tiếp tục
// → cỡ chữ HUD >= 18 px → thua → nhập tên (sai/đúng, tiếng Việt) → bảng xếp hạng → ghi đĩa → về menu; không lỗi JS.
// Thoát 0 nếu mọi bước PASS. Bảng xếp hạng ghi vào file tạm (không đụng ~/.dao-den-long).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findChrome, connectCdp } from './chrome.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'ddl-ui-'));
process.env.DDL_LEADERBOARD = join(tmp, 'leaderboard.json');
const { createServer } = await import('../server.mjs');
const chrome = findChrome();
if (!chrome) {
  console.error('ui-smoke: không tìm thấy Chrome/Chromium/Edge (đặt CHROME=<đường dẫn>)');
  process.exit(1);
}
const srv = createServer();
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const port = 9800 + Math.floor(Math.random() * 150);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmp, 'profile')}`, '--window-size=1280,720', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
const ok = (name, cond, info = '') => out.push(`${cond ? 'PASS' : 'FAIL'} ${name}${info ? ' — ' + info : ''}`);
try {
  const { ws, call } = await connectCdp(port);
  const ev = async (expr) => (await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  const key = async (code, k = code) => {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k, windowsVirtualKeyCode: { Enter: 13, Escape: 27 }[code] ?? 0 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k });
    await sleep(250);
  };
  const card = () => ev("document.getElementById('overlay').hidden ? '(ẩn)' : document.getElementById('card').innerText");
  const keyOf = (a) => ev(`JSON.parse(localStorage.getItem('dao-den-long-settings')).keys.${a}`);

  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await call('Page.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: "window.__errs=[];addEventListener('error',e=>__errs.push('error: '+e.message));addEventListener('unhandledrejection',e=>__errs.push('reject: '+e.reason))" });
  await call('Page.navigate', { url: base + '/?' + 'no-open' });
  await sleep(2500);

  ok('Menu chính có Chơi, Bảng xếp hạng, Cài đặt', /Chơi[\s\S]*Bảng xếp hạng[\s\S]*Cài đặt/.test(await card()));
  await key('Enter');
  ok('Enter → giới thiệu Đêm 1 (Ông Đăng)', /Đêm 1[\s\S]*Ông Đăng/.test(await card()));
  await key('Enter');
  await sleep(1200);
  ok('Enter → đang chơi (overlay ẩn, HUD hiện)', (await card()) === '(ẩn)' && (await ev("!document.getElementById('hud').hidden")));
  const t0 = await ev('window.__game().simTick');
  await sleep(600);
  ok('Logic chạy khi đang chơi', (await ev('window.__game().simTick')) > t0);
  await key('Escape');
  const paused = await ev('window.__game().simTick');
  await sleep(600);
  ok('Esc → Tạm dừng, logic dừng hoàn toàn', (await card()).includes('Tạm dừng') && (await ev('window.__game().simTick')) === paused);
  await ev("document.querySelector('[data-act=settings]').click()");
  await sleep(200);
  const st = await card();
  ok('Cài đặt có Đổi phím, Giảm chuyển động, Chữ lớn, Bảng màu dễ phân biệt', /Phím điều khiển/.test(st) && /Giảm chuyển động/.test(st) && /Chữ lớn/.test(st) && /dễ phân biệt/.test(st));
  await ev("document.querySelector('[data-act=bind][data-key=up]').click()");
  await sleep(150);
  await key('KeyS', 's');
  ok('Đổi phím trùng bị từ chối và báo', /đang dùng cho/.test(await card()), await ev("document.getElementById('bind-msg').innerText"));
  await ev("document.querySelector('[data-act=bind][data-key=up]').click()");
  await sleep(150);
  await key('KeyI', 'i');
  ok('Đổi phím hợp lệ được lưu', (await keyOf('up')) === 'KeyI');
  await ev("document.querySelector('[data-act=resetkeys]').click()");
  await sleep(150);
  ok('Khôi phục phím mặc định', (await keyOf('up')) === 'KeyW');
  await ev("document.getElementById('lt').click()");
  await sleep(100);
  ok('Chữ lớn ×1.25 (font gốc 22.5px)', (await ev('getComputedStyle(document.documentElement).fontSize')) === '22.5px');
  await ev("document.getElementById('lt').click()");
  await ev("document.querySelector('[data-act=back]').click()");
  await sleep(150);
  await key('Escape');
  await sleep(300);
  ok('Esc lần nữa → tiếp tục chơi', (await card()) === '(ẩn)');
  const minFont = await ev(
    "Math.min(...[...document.querySelectorAll('#hud *')].filter(e=>e.offsetParent&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>parseFloat(getComputedStyle(e).fontSize)))",
  );
  ok('Chữ HUD nhỏ nhất >= 18px ở 1280×720', minFont >= 18, `${minFont}px`);
  await ev('window.__game().player.flames = 0');
  await sleep(700);
  ok('Thua → màn kết quả có ô nhập tên', /Lưu điểm/.test(await card()) && (await ev("!!document.getElementById('lbname')")));
  await ev("document.getElementById('lbname').value='ab'; document.querySelector('[data-act=save]').click()");
  await sleep(300);
  ok('Tên 2 ký tự bị từ chối', /3–12/.test(await ev("document.getElementById('lb-msg').innerText")));
  await ev("document.getElementById('lbname').value='Mây_Thử'; document.querySelector('[data-act=save]').click()");
  await sleep(600);
  ok('Lưu tên tiếng Việt → màn Bảng xếp hạng có tên', /Bảng xếp hạng[\s\S]*Mây_Thử/.test(await card()));
  const api = await (await fetch(base + '/api/leaderboard')).json();
  ok('Đã ghi xuống đĩa, achieved_at có múi giờ', api.entries.some((e) => e.name === 'Mây_Thử' && /[+-]\d\d:\d\d$|Z$/.test(e.achieved_at)), JSON.stringify(api.entries[0]));
  await key('Enter');
  ok('Enter → về menu', (await card()).includes('Chơi (Enter)'));
  const errs = await ev("JSON.stringify(window.__errs ?? 'NO-COLLECTOR')");
  ok('Không có lỗi JS', errs === '[]', errs);
  ws.close();
} catch (e) {
  out.push(`CRASH ${e.stack}`);
} finally {
  proc.kill();
  srv.close();
  await sleep(300);
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* bỏ qua */ }
  console.log(out.join('\n'));
  process.exit(out.some((l) => !l.startsWith('PASS')) ? 1 : 0);
}
