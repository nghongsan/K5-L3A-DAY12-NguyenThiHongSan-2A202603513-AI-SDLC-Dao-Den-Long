// Bản có giao diện: Three.js chỉ VẼ trạng thái của lõi src/core/sim.js, không tự đổi luật game.
// Chuỗi: Menu → giới thiệu Đêm (lời Ông Đăng) → chơi → kết quả → Đêm kế tiếp → Bình Minh.
import * as THREE from 'three';
import { Game, TICK_RATE, NIGHTS } from '/src/core/sim.js';
import { botInput } from '/src/core/bot.js';
import { Sfx } from '/web/audio.js';

const tuning = (await (await fetch('/game.contract.json')).json()).tuning;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// Bảng màu chuẩn Ticket-02
const PAL = {
  sky: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lit: 0xffb347, core: 0xffe9b0, off: 0x5b5f6e, moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shadeBody: 0x120a1a, shadeEdge: 0x7a3cff, shadeStun: 0x3a3450, shirt: 0xe8e2d0, scarf: 0xc8102e, gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const INTRO = {
  1: ['Đêm nay sương đen nuốt mất ánh sáng Đảo Bến, cháu ạ.', 'Gom đom đóm, thắp lại năm ngọn đèn. Bóng Mực sợ ánh đèn lắm.'],
  2: ['Đảo Cau có hai hòn, nối nhau bằng cây cầu tre không lan can.', 'Coi chừng Gió Lạc — chúng thích cướp đom đóm của người mang nhiều.'],
  3: ['Đảo Chuông cao ba tầng, gió mạnh thổi từng cơn.', 'Lên dốc, nhảy bục, thắp đủ bảy đèn trước khi trời sáng nhé.'],
};

// ---------- cài đặt (lưu giữa các lần mở) ----------
const SETTINGS_KEY = 'dao-den-long-settings';
const settings = { volume: 0.7, sensitivity: 1 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* chế độ riêng tư */ }
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* bỏ qua */ } };
const sfx = new Sfx();
sfx.setVolume(settings.volume);

// ---------- cảnh ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.sky);
scene.fog = new THREE.Fog(PAL.fog, 30, 120);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
const moon = new THREE.DirectionalLight(0x9fb0ff, 0.5);
moon.position.set(-30, 60, -20);
scene.add(ambient, moon);
const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 48), lam(PAL.sea));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -12;
scene.add(sea);
let world = new THREE.Group();
scene.add(world);

function buildWorld(n) {
  scene.remove(world);
  world = new THREE.Group();
  scene.add(world);
  const N = NIGHTS[n];
  const side = lam(PAL.sand);
  const top = lam(PAL.grass);
  for (const is of N.islands) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(is.r, is.r * 0.8, 6, 72), [side, top, side]);
    m.position.set(is.c[0], -3, is.c[1]);
    world.add(m);
  }
  for (const b of N.bridges) {
    const len = b.x[1] - b.x[0];
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, b.z[1] - b.z[0]), lam(PAL.wood));
    deck.position.set((b.x[0] + b.x[1]) / 2, -0.15, (b.z[0] + b.z[1]) / 2);
    world.add(deck);
    for (let x = b.x[0]; x <= b.x[1]; x += 1.5) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.32, b.z[1] - b.z[0] + 0.2), lam(0x4e3622));
      slat.position.set(x, -0.1, 0);
      world.add(slat);
    }
  }
  for (const pad of N.pads) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r, 0.12, 32), lam(PAL.gold, { emissive: PAL.gold, emissiveIntensity: 0.6 }));
    ring.position.set(pad.pos[0], pad.pos[1] + 0.06, pad.pos[2]);
    world.add(ring);
  }
  if (N.tiers) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI;
      shape[i ? 'lineTo' : 'moveTo'](24 * Math.cos(a), -24 * Math.sin(a)); // y âm ↔ z dương sau khi xoay
    }
    for (let i = 48; i >= 0; i--) {
      const a = (i / 48) * Math.PI;
      shape.lineTo(12 * Math.cos(a), -12 * Math.sin(a));
    }
    const tier1 = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 1 }), [top, side]);
    tier1.rotation.x = -Math.PI / 2;
    world.add(tier1);
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), [side, top, side]);
    tier2.position.y = 3;
    world.add(tier2);
    for (const rp of N.ramps) {
      const g = new THREE.Group();
      const mid = (rp.from + rp.to) / 2;
      g.position.set(mid * rp.ux, 1.5, mid * rp.uz);
      g.rotation.y = -(rp.deg * Math.PI) / 180;
      const len = Math.hypot(rp.from - rp.to, 3);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, rp.width), lam(PAL.wood));
      ramp.rotation.z = -Math.atan2(3, rp.from - rp.to);
      g.add(ramp);
      world.add(g);
    }
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(N.tower.r, N.tower.r * 1.1, 8, 24), lam(0x8a7a66));
    tw.position.y = 10;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.2, 8), lam(0x5a2e22));
    roof.position.y = 15.1;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.6), lam(PAL.gold, { emissive: PAL.gold, emissiveIntensity: 0.3 }));
    bell.position.y = 13.4;
    world.add(tw, roof, bell);
  }
}

function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 14), lam(PAL.shirt));
  body.position.y = 0.55;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 20), lam(PAL.scarf));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.08;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), lam(0xf2d2b0));
  head.position.y = 1.36;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.42, 28), lam(0xd9b56a));
  hat.position.y = 1.72;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), basic(PAL.lit));
  lamp.position.set(0.62, 1.15, 0.2);
  const glow = new THREE.PointLight(PAL.lit, 10, 10, 1.6);
  glow.position.copy(lamp.position);
  g.add(body, scarf, head, hat, lamp, glow);
  scene.add(g);
  return g;
}
const may = makeMay();

function makeLantern(l) {
  const g = new THREE.Group();
  g.position.set(l.pos[0], l.pos[1], l.pos[2]);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3, 8), lam(PAL.wood));
  post.position.y = 1.5;
  const lampMat = lam(PAL.off, { emissive: PAL.lit, emissiveIntensity: 0 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.95), lampMat);
  lamp.position.y = 3.5;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), basic(PAL.core, { fog: false }));
  core.position.y = 3.5;
  core.visible = false;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.55, 4), lam(0x2b1a12));
  roof.position.y = 4.35;
  roof.rotation.y = Math.PI / 4;
  // ánh sáng giả (không dùng PointLight): quầng quanh đèn + vũng sáng trên mặt đất => chi phí cố định
  const glow = { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false };
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), basic(PAL.lit, { ...glow, fog: false }));
  halo.position.y = 3.5;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), basic(PAL.lit, glow));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.05;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(tuning.safe_radius - 0.12, tuning.safe_radius, 72),
    basic(PAL.lit, { transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  g.add(post, lamp, core, roof, halo, pool, ring);
  world.add(g);
  return { g, lampMat, core, halo, pool, ring };
}

const moteGeo = new THREE.SphereGeometry(0.14, 10, 8);
const moteMat = basic(PAL.moteCore, { fog: false });
const haloGeo = new THREE.SphereGeometry(0.36, 10, 8);
const haloMat = basic(PAL.moteHalo, { transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
function makeMote() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(moteGeo, moteMat), new THREE.Mesh(haloGeo, haloMat));
  g.userData.phase = Math.random() * 6.28;
  world.add(g);
  return g;
}

const eyeGeo = new THREE.SphereGeometry(0.11, 8, 6);
const eyeMat = basic(0xe6d0ff, { fog: false });
const edgeMat = basic(PAL.shadeEdge, { side: THREE.BackSide });
function makeShade() {
  const g = new THREE.Group();
  const mat = lam(PAL.shadeBody);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 14), mat);
  const edge = new THREE.Mesh(new THREE.SphereGeometry(0.88, 18, 14), edgeMat);
  body.scale.y = edge.scale.y = 1.15;
  const e1 = new THREE.Mesh(eyeGeo, eyeMat);
  const e2 = new THREE.Mesh(eyeGeo, eyeMat);
  e1.position.set(-0.26, 0.22, 0.72);
  e2.position.set(0.26, 0.22, 0.72);
  g.add(edge, body, e1, e2);
  g.userData = { mat, phase: Math.random() * 6.28 };
  world.add(g);
  return g;
}

function makeDrifter() {
  const g = new THREE.Group();
  const mat = basic(PAL.drifter, { transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const segs = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.32), mat);
    s.position.x = (i - 2.5) * 0.4;
    g.add(s);
    segs.push(s);
  }
  const loot = new THREE.Mesh(moteGeo, moteMat);
  loot.position.y = -0.4;
  g.add(loot);
  g.userData = { segs, loot };
  world.add(g);
  return g;
}

function makeCharm(c) {
  const g = new THREE.Group();
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.05), basic(PAL.gold));
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.96, 0.07), basic(PAL.scarf));
  g.add(trim, paper);
  g.position.set(c.pos[0], c.pos[1] + 1.1, c.pos[2]);
  world.add(g);
  return g;
}

const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), basic(PAL.core, { transparent: true, opacity: 0, side: THREE.DoubleSide }));
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseT = 1;

const LEAVES = 80;
const leafGeo = new THREE.BufferGeometry();
leafGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LEAVES * 3), 3));
const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({ color: 0xc9a35a, size: 0.25 }));
leaves.visible = false;
scene.add(leaves);

// ---------- trạng thái ----------
let game = null;
let night = 1;
let totalScore = 0;
let mode = 'menu'; // menu | intro | play | paused | settings | result | dawn
let settingsBack = 'menu';
let views = null;
let camYaw = 0;
let acc = 0;
let botMode = params.has('bot');
let botMem = {};
let lastCountdown = null;
let prevGrounded = true;

function newNight(n, seed = Math.floor(Math.random() * 2 ** 31)) {
  night = n;
  game = new Game({ tuning, seed, night: n });
  buildWorld(n);
  views = { lanterns: game.lanterns.map(makeLantern), motes: new Map(), shades: new Map(), drifters: new Map(), charms: game.charms.map(makeCharm) };
  camYaw = 0;
  sync.snap = true;
  acc = 0;
  botMem = {};
  lastCountdown = null;
  $('fps').dataset.seed = seed;
}

// ---------- màn hình ----------
function show(html) {
  $('card').innerHTML = html;
  $('overlay').hidden = !html;
  $('hud').hidden = !(mode === 'play' || mode === 'paused' || mode === 'result');
  $('card').querySelector('button')?.focus();
}

const controls = `<table>
  <tr><td><kbd>W A S D</kbd> / <kbd>↑ ↓</kbd></td><td>Di chuyển</td></tr>
  <tr><td><kbd>← →</kbd> / kéo chuột</td><td>Xoay camera</td></tr>
  <tr><td><kbd>Space</kbd></td><td>Nhảy</td></tr><tr><td><kbd>Shift</kbd></td><td>Lướt</td></tr>
  <tr><td><kbd>E</kbd></td><td>Nạp ánh sáng vào đèn</td></tr><tr><td><kbd>F</kbd></td><td>Tỏa Sáng (3 đom đóm)</td></tr>
  <tr><td><kbd>Esc</kbd> / <kbd>P</kbd></td><td>Tạm dừng</td></tr><tr><td><kbd>B</kbd></td><td>Bot chơi thử</td></tr></table>`;

function toMenu() {
  mode = 'menu';
  sfx.stopMusic();
  totalScore = 0;
  show(`<h1>Đảo Đèn Lồng</h1><p>Giúp <b>Mây</b>, người giữ đèn nhỏ tuổi, thắp lại ánh sáng cho ba hòn đảo trước bình minh.</p>
    ${controls}<button data-act="start">Chơi (Enter)</button><button data-act="settings">Cài đặt</button>`);
}

function toIntro(n) {
  mode = 'intro';
  newNight(n);
  const [a, b] = INTRO[n];
  show(`<h2>Đêm ${n}</h2><h1>${NIGHTS[n].name}</h1><p class="quote">Ông Đăng: “${a}”</p><p class="quote">“${b}”</p>
    <p>${game.lanterns.length} đèn · ${Math.round(game.ticksLeft / 60)} giây tới bình minh</p><button data-act="play">Bắt đầu (Enter)</button>`);
}

function toPlay() {
  mode = 'play';
  sfx.ensure();
  sfx.startMusic();
  show('');
}

function toPause() {
  mode = 'paused';
  show(`<h1>Tạm dừng</h1><button data-act="resume">Tiếp tục (Esc)</button><button data-act="restart">Chơi lại Đêm</button>
    <button data-act="settings">Cài đặt</button><button data-act="menu">Về menu</button>`);
}

function toSettings(back) {
  settingsBack = back;
  mode = 'settings';
  show(`<h1>Cài đặt</h1>
    <label>Âm lượng: <b id="vol-v">${Math.round(settings.volume * 100)}</b>%</label><input id="vol" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}">
    <label>Độ nhạy chuột: <b id="sen-v">${settings.sensitivity.toFixed(1)}</b></label><input id="sen" type="range" min="2" max="30" value="${Math.round(settings.sensitivity * 10)}">
    <p style="opacity:.7">Cài đặt được lưu cho lần mở sau.</p><button data-act="back">Xong</button>`);
  $('vol').oninput = (e) => {
    settings.volume = e.target.value / 100;
    $('vol-v').textContent = e.target.value;
    sfx.setVolume(settings.volume);
    saveSettings();
  };
  $('sen').oninput = (e) => {
    settings.sensitivity = e.target.value / 10;
    $('sen-v').textContent = settings.sensitivity.toFixed(1);
    saveSettings();
  };
}

function toResult() {
  const r = game.result;
  const lit = game.lanterns.filter((l) => l.lit).length;
  sfx.play(r.result === 'won' ? 'win' : 'lose');
  if (r.result === 'won') {
    totalScore += game.score;
    if (night === 3) {
      mode = 'dawn';
      sfx.stopMusic();
      show(`<h1>Bình Minh</h1><p>Ba hòn đảo đã sáng trở lại. Ông Đăng mỉm cười: “Cháu giỏi lắm, Mây.”</p>
        <div class="big">Tổng điểm: ${totalScore}</div><button data-act="menu">Về menu (Enter)</button>`);
      return;
    }
    mode = 'result';
    show(`<h2>Đêm ${night} hoàn thành!</h2><h1>${NIGHTS[night].name} đã sáng</h1><div class="big">Điểm Đêm: ${game.score}</div>
      <p>Tổng điểm: ${totalScore} · Lửa còn: ${game.player.flames}</p><button data-act="next">Đêm tiếp theo (Enter)</button><button data-act="menu">Về menu</button>`);
  } else {
    mode = 'result';
    const why = r.reason === 'dawn' ? 'Bình minh đến khi đảo còn tối…' : 'Mây đã hết Ngọn Lửa…';
    show(`<h2>Đêm ${night} thất bại</h2><h1>${why}</h1><p>Đèn đã thắp: ${lit}/${game.lanterns.length} · Điểm Đêm: ${game.score}</p>
      <button data-act="retry">Chơi lại Đêm ${night} (Enter)</button><button data-act="menu">Về menu</button>`);
  }
}

const actions = {
  start: () => toIntro(1),
  play: toPlay,
  resume: toPlay,
  restart: () => { toIntro(night); },
  settings: () => toSettings(mode),
  back: () => (settingsBack === 'paused' ? toPause() : toMenu()),
  menu: toMenu,
  next: () => toIntro(night + 1),
  retry: () => toIntro(night),
};
$('card').addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act;
  if (act) {
    sfx.ensure();
    actions[act]();
  }
});

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  sfx.ensure();
  if (e.code === 'F3') { $('fps').hidden = !$('fps').hidden; e.preventDefault(); }
  if (e.code === 'KeyB') { botMode = !botMode; botMem = {}; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'play') toPause();
    else if (mode === 'paused') toPlay();
    else if (mode === 'settings') actions.back();
    return;
  }
  if (e.code === 'Enter' && !e.repeat) {
    const primary = { menu: 'start', intro: 'play', result: game?.result?.result === 'won' ? 'next' : 'retry', dawn: 'menu' }[mode];
    if (primary) {
      e.preventDefault();
      actions[primary]();
    }
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => {
  keys.clear();
  if (mode === 'play' && !params.has('bench')) toPause();
});
let dragging = false;
$('view').addEventListener('pointerdown', () => (dragging = true));
addEventListener('pointerup', () => (dragging = false));
addEventListener('pointermove', (e) => {
  if (dragging) camYaw -= e.movementX * 0.3 * settings.sensitivity;
});

function readInput() {
  const k = (...codes) => (codes.some((c) => keys.has(c)) ? 1 : 0);
  // Contract: x = +1 là trục +X khi yaw 0. Camera nhìn theo +Z nên +X nằm BÊN TRÁI màn hình -> A là x dương.
  return {
    move: [k('KeyA') - k('KeyD'), k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown')],
    cam_yaw_deg: camYaw,
    jump: !!k('Space'),
    interact: !!k('KeyE'),
    pulse: !!k('KeyF'),
    dash: !!k('ShiftLeft', 'ShiftRight'),
    pause: false, // tạm dừng do giao diện xử lý: logic không được gọi khi đang dừng
  };
}

const SOUND = { mote_picked: 'pickup', charm_picked: 'charm', lantern_lit: 'lit', pulse: 'pulse', player_hit: 'hit', dash: 'dash', shade_spawned: 'shade', drifter_steal: 'steal', drifter_drop: 'pickup' };
function onEvents(events) {
  for (const e of events) {
    if (SOUND[e.name]) sfx.play(SOUND[e.name]);
    if (e.name === 'pulse') pulseT = 0;
    if (e.name === 'player_hit') flash('rgba(255, 90, 95, .35)');
    if (e.name === 'lantern_lit') flash('rgba(255, 179, 71, .3)');
    if (e.name === 'drifter_steal') flash('rgba(143, 163, 184, .35)');
  }
}
function flash(color) {
  const f = $('flash');
  f.style.transition = 'none';
  f.style.background = color;
  f.style.opacity = 1;
  requestAnimationFrame(() => {
    f.style.transition = 'opacity .5s';
    f.style.opacity = 0;
  });
}

// ---------- vẽ ----------
const lerp = (a, b, k) => a + (b - a) * k;
function syncMap(list, map, make, update) {
  const seen = new Set();
  for (const e of list) {
    seen.add(e.id);
    let v = map.get(e.id);
    if (!v) map.set(e.id, (v = make(e)));
    update(v, e);
  }
  for (const [id, v] of map) if (!seen.has(id)) (world.remove(v), map.delete(id));
}

const tmpV = new THREE.Vector3();
function sync(time, dt) {
  if (!game) return;
  const p = game.player;
  const prev = may.position.clone();
  may.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const d = may.position.clone().sub(prev);
  if (d.x * d.x + d.z * d.z > 1e-6) may.rotation.y = Math.atan2(d.x, d.z);
  may.visible = p.invuln > 0 ? Math.floor(time * 12) % 2 === 0 : p.fallWait === 0 || p.pos[1] > -9;
  if (prevGrounded && !p.grounded && p.vy > 6.5) sfx.play(p.vy > 10 ? 'pad' : 'jump');
  prevGrounded = p.grounded;

  const litCount = game.lanterns.filter((l) => l.lit).length;
  const k = litCount / game.lanterns.length;
  ambient.intensity = 0.15 + 0.55 * k; // chuẩn Ticket-02
  scene.fog.far = lerp(120, 200, k);

  game.lanterns.forEach((l, i) => {
    const v = views.lanterns[i];
    const f = l.deposited / tuning.lantern_cost;
    v.lampMat.color.setHex(l.lit ? PAL.lit : PAL.off);
    v.lampMat.emissiveIntensity = l.lit ? 0.9 + Math.sin(time * 3 + i) * 0.1 : 0.35 * f;
    v.core.visible = l.lit;
    v.halo.material.opacity = l.lit ? 0.32 : 0.12 * f;
    v.pool.material.opacity = l.lit ? 0.16 : 0.04 * f;
    v.ring.material.opacity = l.lit ? 0.35 : 0;
  });

  syncMap(game.motes, views.motes, makeMote, (v, m) => {
    v.position.set(m.pos[0], m.pos[1] + 0.7 + Math.sin(time * 3 + v.userData.phase) * 0.2, m.pos[2]);
    v.visible = m.kind !== 'dropped' || m.ttl > 120 || Math.floor(time * 8) % 2 === 0;
  });
  syncMap(game.shades, views.shades, makeShade, (v, s) => {
    v.position.set(s.pos[0], s.pos[1] + Math.sin(time * 2 + v.userData.phase) * 0.12, s.pos[2]);
    v.lookAt(p.pos[0], v.position.y, p.pos[2]);
    const stunned = s.state === 'stunned';
    v.userData.mat.color.setHex(stunned ? PAL.shadeStun : PAL.shadeBody);
    v.rotation.z = stunned ? Math.sin(time * 10) * 0.25 : 0;
    v.scale.setScalar(s.state === 'spawning' ? 0.4 : Math.min(1, v.scale.x + dt * 3));
  });
  syncMap(game.drifters, views.drifters, makeDrifter, (v, dr) => {
    v.visible = dr.state !== 'removed';
    v.position.set(dr.pos[0], dr.pos[1], dr.pos[2]);
    v.rotation.y = time * (dr.state === 'idle' ? 0.8 : 3);
    v.userData.segs.forEach((s, i) => (s.position.y = Math.sin(time * 6 + i) * 0.18));
    v.userData.loot.visible = dr.stolen > 0;
  });
  game.charms.forEach((c, i) => {
    const v = views.charms[i];
    v.visible = c.available;
    v.rotation.y = time * 1.5;
    v.position.y = c.pos[1] + 1.1 + Math.sin(time * 2) * 0.15;
  });

  pulseT = Math.min(1, pulseT + dt / 0.45);
  pulseRing.position.set(p.pos[0], p.pos[1] + 0.1, p.pos[2]);
  pulseRing.scale.setScalar(0.1 + pulseT * tuning.pulse_radius);
  pulseRing.material.opacity = (1 - pulseT) * 0.9;

  // gió + lá bay báo trước
  const w = game.wind;
  leaves.visible = w.warn || w.active;
  if (leaves.visible && w.dir !== null) {
    const a = (w.dir * Math.PI) / 180;
    const pos = leafGeo.attributes.position.array;
    for (let i = 0; i < LEAVES; i++) {
      const s = (time * (w.active ? 6 : 3) + i * 1.37) % 16;
      pos[i * 3] = p.pos[0] + Math.cos(a) * (s - 8) + Math.sin(i * 12.9) * 6;
      pos[i * 3 + 1] = p.pos[1] + 0.5 + ((i * 7) % 5) * 0.6 + Math.sin(time * 4 + i) * 0.2;
      pos[i * 3 + 2] = p.pos[2] + Math.sin(a) * (s - 8) + Math.cos(i * 7.3) * 6;
    }
    leafGeo.attributes.position.needsUpdate = true;
  }
  $('windwarn').textContent = w.warn ? '🍃 Gió sắp nổi!' : w.active ? '🍃 Gió mạnh!' : '';
  if (w.warn && !sync.warned) sfx.play('wind');
  sync.warned = w.warn;

  // camera góc nhìn thứ ba
  const th = (camYaw * Math.PI) / 180;
  const fy = Math.max(p.pos[1], -6);
  tmpV.set(p.pos[0] - Math.sin(th) * 9, fy + 5.5, p.pos[2] - Math.cos(th) * 9);
  if (sync.snap) camera.position.copy(tmpV); // vào Đêm mới: đặt camera ngay sau lưng Mây
  else camera.position.lerp(tmpV, 1 - Math.exp(-dt * 8));
  sync.snap = false;
  camera.lookAt(p.pos[0], fy + 1.2, p.pos[2]);
  hud(time, litCount);
}

function hud(time, litCount) {
  const p = game.player;
  $('hud-flames').innerHTML = Array.from({ length: tuning.flames }, (_, i) => `<span class="${i < p.flames ? '' : 'off'}">🔥</span>`).join('');
  const sec = Math.max(0, Math.ceil(game.ticksLeft / TICK_RATE));
  const clock = $('hud-clock');
  clock.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  clock.classList.toggle('danger', sec <= 30);
  if (mode === 'play' && sec <= 10 && sec !== lastCountdown) {
    if (lastCountdown !== null) sfx.play('tick');
    lastCountdown = sec;
  }
  $('hud-night').textContent = `Đêm ${night} · ${NIGHTS[night].name}`;
  $('hud-lit').textContent = `${litCount}/${game.lanterns.length}`;
  $('hud-score').textContent = totalScore + game.score;
  $('hud-motes').innerHTML = Array.from({ length: tuning.carry_capacity }, (_, i) => `<i class="${i < p.carried ? 'on' : ''}"></i>`).join('');
  const cd = (el, left, total, ok) => {
    el.style.setProperty('--p', `${Math.round((left / total) * 100)}%`);
    el.classList.toggle('wait', left > 0 || !ok);
  };
  cd($('cd-dash'), p.charm > 0 ? 0 : p.dashCd, tuning.dash_cooldown_s * 60, true);
  cd($('cd-pulse'), p.pulseCd, tuning.pulse_cooldown_s * 60, p.carried >= tuning.pulse_cost);
  $('hud-charm').innerHTML = p.charm > 0 ? `<span>Bùa Gió</span> ${(p.charm / 60).toFixed(1)}s` : '';

  // nhắc nạp đèn
  const near = game.lanterns.find((l) => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= tuning.interact_radius);
  $('prompt').textContent = botMode ? 'Bot đang chơi thử (B để tự chơi)' : near ? `E — Nạp ánh sáng (${near.deposited}/${tuning.lantern_cost})` : '';

  // mũi tên tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình
  const arrow = $('arrow');
  const target = game.lanterns.filter((l) => !l.lit).sort((a, b) => Math.hypot(a.pos[0] - p.pos[0], a.pos[2] - p.pos[2]) - Math.hypot(b.pos[0] - p.pos[0], b.pos[2] - p.pos[2]))[0];
  arrow.style.display = 'none';
  if (target && mode === 'play') {
    tmpV.set(target.pos[0], target.pos[1] + 3.5, target.pos[2]).project(camera);
    const behind = tmpV.z > 1;
    if (behind || Math.abs(tmpV.x) > 0.95 || Math.abs(tmpV.y) > 0.95) {
      let x = behind ? -tmpV.x : tmpV.x;
      let y = behind ? -tmpV.y : tmpV.y;
      const m = Math.max(Math.abs(x), Math.abs(y), 1e-6);
      x /= m;
      y /= m;
      const cx = innerWidth / 2 + x * (innerWidth / 2 - 40);
      const cy = innerHeight / 2 - y * (innerHeight / 2 - 40);
      arrow.style.display = 'block';
      arrow.style.left = `${cx - 14}px`;
      arrow.style.top = `${cy - 13}px`;
      arrow.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
    }
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- vòng lặp ----------
const bench = params.has('bench') ? { secs: Number(params.get('bench')) || 10, frames: 0, t0: null } : null;
let fpsFrames = 0;
let fpsT = performance.now();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  camYaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * 120 * dt * settings.sensitivity;
  if (mode === 'play') {
    acc += dt;
    let n = 0;
    while (acc >= 1 / TICK_RATE && n < 8) {
      onEvents(game.step(botMode ? botInput(game, botMem) : readInput()));
      acc -= 1 / TICK_RATE;
      n++;
      if (game.state === 'won' || game.state === 'lost') break;
    }
    if (game.state === 'won' || game.state === 'lost') toResult();
  } else if (mode === 'menu' || mode === 'intro') {
    camYaw += dt * 8;
  }
  sync(now / 1000, dt);
  renderer.render(scene, camera);

  fpsFrames++;
  if (now - fpsT >= 500) {
    $('fps').textContent = `${Math.round((fpsFrames * 1000) / (now - fpsT))} FPS · ${innerWidth}×${innerHeight} · seed ${$('fps').dataset.seed}`;
    fpsFrames = 0;
    fpsT = now;
  }
  if (bench && mode === 'play') {
    bench.warm ??= now + 1000; // bỏ 1 s đầu (biên dịch shader)
    if (now < bench.warm) return requestAnimationFrame(frame);
    bench.t0 ??= now;
    bench.frames++;
    const el = (now - bench.t0) / 1000;
    if (el >= bench.secs && !window.__bench) {
      window.__bench = { avgFps: Math.round((bench.frames / el) * 10) / 10, frames: bench.frames, seconds: Math.round(el * 10) / 10, size: `${innerWidth}x${innerHeight}`, night };
      $('fps').hidden = false;
      $('fps').textContent = `BENCH ${JSON.stringify(window.__bench)}`;
    }
  }
  requestAnimationFrame(frame);
}

// khởi động: menu, hoặc vào thẳng Đêm (?night=N&seed=S) để kiểm thử/đo
newNight(1, 1);
if (params.has('fps')) $('fps').hidden = false;
if (params.has('night') || params.has('seed') || bench) {
  const n = Math.min(3, Math.max(1, Number(params.get('night')) || 1));
  newNight(n, Number(params.get('seed')) || 1);
  mode = 'play';
  show('');
} else toMenu();
requestAnimationFrame(frame);
window.__game = () => game;
