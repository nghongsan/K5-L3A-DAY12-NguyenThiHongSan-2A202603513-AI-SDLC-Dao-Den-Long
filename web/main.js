// Bản có giao diện: Three.js chỉ VẼ trạng thái của lõi src/core/sim.js, không tự đổi luật game.
// Mỗi khung hình chạy lõi ở 60 tick/s cố định với input từ bàn phím (cùng định dạng input của headless).
import * as THREE from 'three';
import { Game, TICK_RATE, WORLD } from '/src/core/sim.js';
import { botInput } from '/src/core/bot.js';

const tuning = (await (await fetch('/game.contract.json')).json()).tuning;
const $ = (id) => document.getElementById(id);

// ---------- cảnh ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('view'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const NIGHT = new THREE.Color(0x140a24);
const DAWNISH = new THREE.Color(0x4a3a6e);
scene.background = NIGHT.clone();
scene.fog = new THREE.FogExp2(NIGHT.clone(), 0.04);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight(0x8877cc, 0x221133, 0.9);
const moon = new THREE.DirectionalLight(0xaab0ff, 0.5);
moon.position.set(-20, 40, -10);
scene.add(hemi, moon);

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const islandMat = std(0x26383a);
const island = new THREE.Mesh(new THREE.CylinderGeometry(WORLD.islandRadius, WORLD.islandRadius - 5, 5, 72), islandMat);
island.position.y = -2.5;
const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 48), std(0x3b2f5c));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -7;
scene.add(island, sea);
// lan can quanh mép đảo (người chơi không rơi được: fall_enabled = false)
const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 6);
const postMat = std(0x6b5440);
for (let i = 0; i < 64; i++) {
  const a = (i / 64) * Math.PI * 2;
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.set(Math.sin(a) * (WORLD.islandRadius - 0.2), 0.45, Math.cos(a) * (WORLD.islandRadius - 0.2));
  scene.add(post);
}

// ---------- Mây: người giữ đèn đội nón lá treo đèn lồng nhỏ ----------
function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 14), std(0x4f7fd0));
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), std(0xf2d2b0));
  head.position.y = 1.35;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.42, 28), std(0xd9b56a));
  hat.position.y = 1.72;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), std(0x333333));
  cord.position.set(0.62, 1.38, 0.2);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
  lamp.position.set(0.62, 1.15, 0.2);
  const glow = new THREE.PointLight(0xffaa44, 6, 9, 1.6);
  glow.position.copy(lamp.position);
  g.add(body, head, hat, cord, lamp, glow);
  scene.add(g);
  return g;
}
const may = makeMay();

// ---------- đèn lồng lớn ----------
function makeLantern(l) {
  const g = new THREE.Group();
  g.position.set(l.pos[0], 0, l.pos[2]);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3, 8), std(0x3d2b1f));
  post.position.y = 1.5;
  const lampMat = std(0x553322, { emissive: 0xff9933, emissiveIntensity: 0.05 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.95), lampMat);
  lamp.position.y = 3.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.55, 4), std(0x2b1a12));
  roof.position.y = 4.35;
  roof.rotation.y = Math.PI / 4;
  const light = new THREE.PointLight(0xffa040, 0, 26, 1.3);
  light.position.y = 3.5;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(tuning.safe_radius - 0.1, tuning.safe_radius, 72),
    new THREE.MeshBasicMaterial({ color: 0xffb050, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  g.add(post, lamp, roof, light, ring);
  scene.add(g);
  return { g, lampMat, light, ring };
}

// ---------- đom đóm & Bóng Mực (tạo/xóa theo id trong trạng thái lõi) ----------
const moteGeo = new THREE.SphereGeometry(0.14, 10, 8);
const moteMat = new THREE.MeshBasicMaterial({ color: 0xfff07a, fog: false });
const haloGeo = new THREE.SphereGeometry(0.38, 10, 8);
const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
function makeMote() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(moteGeo, moteMat), new THREE.Mesh(haloGeo, haloMat));
  g.userData.phase = Math.random() * 6.28;
  scene.add(g);
  return g;
}
const eyeGeo = new THREE.SphereGeometry(0.11, 8, 6);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe6d0ff, fog: false });
function makeShade() {
  const g = new THREE.Group();
  const mat = std(0x1a0b2e, { emissive: 0x3b0a5a, emissiveIntensity: 0.5, transparent: true, opacity: 0.92 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 14), mat);
  body.scale.y = 1.15;
  const e1 = new THREE.Mesh(eyeGeo, eyeMat);
  const e2 = new THREE.Mesh(eyeGeo, eyeMat);
  e1.position.set(-0.26, 0.22, 0.7);
  e2.position.set(0.26, 0.22, 0.7);
  g.add(body, e1, e2);
  g.userData = { mat, phase: Math.random() * 6.28 };
  scene.add(g);
  return g;
}

// hiệu ứng vòng tỏa sáng
const pulseRing = new THREE.Mesh(
  new THREE.RingGeometry(0.85, 1, 64),
  new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }),
);
pulseRing.rotation.x = -Math.PI / 2;
scene.add(pulseRing);
let pulseT = 1;

// ---------- trạng thái ván chơi ----------
let game = null;
let mode = 'menu'; // menu | play | over
let lanternViews = [];
const moteViews = new Map();
const shadeViews = new Map();
let camYaw = 0; // độ; cùng nghĩa với cam_yaw_deg của contract
let acc = 0;

function clearDynamic() {
  for (const v of [...moteViews.values(), ...shadeViews.values()]) scene.remove(v);
  moteViews.clear();
  shadeViews.clear();
  for (const l of lanternViews) scene.remove(l.g);
}

const params = new URLSearchParams(location.search);
const urlSeed = params.get('seed'); // ?seed=123: vào thẳng ván với seed cố định
let botMode = params.has('bot'); // ?bot hoặc phím B: bot chơi thử (để xem/quay demo)
let botMem = {};
function newGame() {
  clearDynamic();
  const seed = urlSeed !== null && mode === 'menu' ? Number(urlSeed) : Math.floor(Math.random() * 2 ** 31);
  game = new Game({ tuning, seed });
  lanternViews = game.lanterns.map(makeLantern);
  camYaw = 0;
  acc = 0;
  mode = 'play';
  $('overlay').hidden = true;
  $('hud').hidden = false;
  $('seed').textContent = `seed ${seed}`;
}

function showEnd() {
  mode = 'over';
  const r = game.result;
  const msg = r.result === 'won'
    ? '<h1>Đảo đã sáng trở lại!</h1><p>Năm Đèn Lồng Lớn rực sáng, sương đen tan dần.</p>'
    : r.reason === 'dawn'
      ? '<h1>Bình minh đã đến…</h1><p>Đảo vẫn còn những ngọn đèn chưa thắp.</p>'
      : '<h1>Mây đã hết lửa…</h1><p>Bóng Mực đã dập tắt ngọn lửa cuối cùng.</p>';
  const lit = game.lanterns.filter((l) => l.lit).length;
  $('card').innerHTML = `${msg}<div class="big">Điểm: ${game.score}</div><p>Đèn đã thắp: ${lit}/${game.lanterns.length} · Lửa còn: ${game.player.flames}</p><div class="go">Nhấn Enter hoặc R để chơi lại</div>`;
  $('overlay').hidden = false;
  $('hint').textContent = '';
}

// ---------- input ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if ((e.code === 'Enter' || e.code === 'KeyR') && mode !== 'play') newGame();
  if (e.code === 'KeyB') {
    botMode = !botMode;
    botMem = {};
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
let dragging = false;
$('view').addEventListener('pointerdown', () => (dragging = true));
addEventListener('pointerup', () => (dragging = false));
addEventListener('pointermove', (e) => {
  if (dragging) camYaw -= e.movementX * 0.3;
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
    dash: false,
  };
}

function onEvents(events) {
  for (const e of events) {
    if (e.name === 'pulse') pulseT = 0;
    if (e.name === 'player_hit') flash('rgba(120, 40, 180, .45)');
    if (e.name === 'lantern_lit') flash('rgba(255, 180, 80, .35)');
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
function sync(time, dt) {
  if (!game) return;
  const p = game.player;
  const prevX = may.position.x;
  const prevZ = may.position.z;
  may.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const dx = may.position.x - prevX;
  const dz = may.position.z - prevZ;
  if (dx * dx + dz * dz > 1e-6) may.rotation.y = Math.atan2(dx, dz);
  may.visible = p.invuln > 0 ? Math.floor(time * 12) % 2 === 0 : true;

  const litCount = game.lanterns.filter((l) => l.lit).length;
  const k = litCount / game.lanterns.length;
  scene.fog.density = lerp(0.04, 0.012, k);
  scene.fog.color.copy(NIGHT).lerp(DAWNISH, k);
  scene.background.copy(scene.fog.color);
  hemi.intensity = lerp(0.9, 1.6, k);
  islandMat.color.setHex(0x26383a).lerp(new THREE.Color(0x4f6b4a), k);

  game.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    const f = l.deposited / tuning.lantern_cost;
    v.lampMat.emissiveIntensity = l.lit ? 2.6 + Math.sin(time * 3 + i) * 0.2 : 0.05 + 0.6 * f;
    v.light.intensity = l.lit ? 60 : 4 * f;
    v.ring.material.opacity = l.lit ? 0.3 : 0;
  });

  const seenM = new Set();
  for (const m of game.motes) {
    seenM.add(m.id);
    let v = moteViews.get(m.id);
    if (!v) moteViews.set(m.id, (v = makeMote()));
    v.position.set(m.pos[0], 0.7 + Math.sin(time * 3 + v.userData.phase) * 0.2, m.pos[2]);
  }
  for (const [id, v] of moteViews) if (!seenM.has(id)) (scene.remove(v), moteViews.delete(id));

  for (const s of game.shades) {
    let v = shadeViews.get(s.id);
    if (!v) shadeViews.set(s.id, (v = makeShade()));
    v.position.set(s.pos[0], s.pos[1] + Math.sin(time * 2 + v.userData.phase) * 0.15, s.pos[2]);
    v.lookAt(p.pos[0], v.position.y, p.pos[2]);
    const stunned = s.state === 'stunned';
    v.userData.mat.emissive.setHex(stunned ? 0x8a7cff : 0x3b0a5a);
    v.userData.mat.opacity = stunned ? 0.55 : 0.92;
    v.rotation.z = stunned ? Math.sin(time * 10) * 0.25 : 0;
  }

  pulseT = Math.min(1, pulseT + dt / 0.45);
  pulseRing.position.set(p.pos[0], 0.1, p.pos[2]);
  pulseRing.scale.setScalar(0.1 + pulseT * tuning.pulse_radius);
  pulseRing.material.opacity = (1 - pulseT) * 0.9;

  // camera góc nhìn thứ ba, sau lưng theo hướng nhìn cam_yaw
  const th = (camYaw * Math.PI) / 180;
  const want = new THREE.Vector3(p.pos[0] - Math.sin(th) * 9, p.pos[1] + 5.5, p.pos[2] - Math.cos(th) * 9);
  camera.position.lerp(want, 1 - Math.exp(-dt * 8));
  camera.lookAt(p.pos[0], p.pos[1] + 1.2, p.pos[2]);

  // HUD
  $('flames').textContent = '🔥'.repeat(p.flames) + '·'.repeat(Math.max(0, tuning.flames - p.flames));
  $('carried').textContent = `${p.carried}/${tuning.carry_capacity}`;
  $('lit').textContent = `${litCount}/${game.lanterns.length}`;
  const sec = Math.max(0, Math.ceil(game.ticksLeft / TICK_RATE));
  $('time').textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  $('score').textContent = game.score;
  $('pulse').textContent = p.pulseCd > 0 ? `hồi ${(p.pulseCd / TICK_RATE).toFixed(1)}s` : p.carried >= tuning.pulse_cost ? 'sẵn sàng' : `cần ${tuning.pulse_cost} đom đóm`;
  if (mode === 'play') $('hint').textContent = botMode ? 'Bot đang chơi thử (nhấn B để tự chơi)' : hintText();
}

function hintText() {
  const p = game.player;
  const near = game.lanterns.find((l) => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= tuning.interact_radius);
  if (near) return p.carried > 0 ? `Nhấn E để nạp đèn ${near.id} (${near.deposited}/${tuning.lantern_cost})` : `Đèn ${near.id} cần thêm đom đóm`;
  if (p.carried >= tuning.carry_capacity) return 'Đã mang đầy đom đóm, hãy về thắp đèn!';
  return '';
}

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// màn hình chờ: dựng sẵn một ván để có cảnh nền
game = new Game({ tuning, seed: 1 });
lanternViews = game.lanterns.map(makeLantern);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  camYaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * 120 * dt;
  if (mode === 'play') {
    acc += dt;
    let n = 0;
    while (acc >= 1 / TICK_RATE && n < 8) {
      onEvents(game.step(botMode ? botInput(game, botMem) : readInput()));
      acc -= 1 / TICK_RATE;
      n++;
    }
    if (game.state !== 'playing') showEnd();
  } else if (mode === 'menu') {
    camYaw += dt * 8; // xoay chậm cảnh nền
  }
  sync(now / 1000, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
if (urlSeed !== null) newGame();
requestAnimationFrame(frame);
window.__game = () => game; // để kiểm thử trên trình duyệt
