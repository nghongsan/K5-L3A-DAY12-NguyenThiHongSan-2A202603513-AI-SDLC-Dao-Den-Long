// Kiểm tra định dạng file scenario / inputs theo Test Contract v1.0.
// Sai định dạng -> ném FormatError (CLI chuyển thành mã thoát 2).
import { BUTTONS } from './sim.js';

export class FormatError extends Error {}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCount = (v) => Number.isInteger(v) && v >= 0;
function need(cond, msg) {
  if (!cond) throw new FormatError(msg);
}
function vec3(v, where) {
  need(Array.isArray(v) && v.length === 3 && v.every(isNum), `${where}: cần mảng 3 số [x, y, z]`);
  return [...v];
}

export function parseScenario(sc, lanternCount = 5) {
  need(isObj(sc), 'scenario phải là một object JSON');
  const out = {};
  if (sc.player !== undefined) {
    const p = sc.player;
    need(isObj(p), 'player phải là object');
    out.player = {};
    if (p.pos !== undefined) out.player.pos = vec3(p.pos, 'player.pos');
    for (const k of ['carried', 'flames']) {
      if (p[k] === undefined) continue;
      need(isCount(p[k]), `player.${k} phải là số nguyên ≥ 0`);
      out.player[k] = p[k];
    }
  }
  for (const k of ['random_motes', 'random_shades']) {
    if (sc[k] === undefined) continue;
    need(typeof sc[k] === 'boolean', `${k} phải là boolean`);
    out[k] = sc[k];
  }
  if (sc.motes !== undefined) {
    need(Array.isArray(sc.motes), 'motes phải là mảng');
    out.motes = sc.motes.map((m, i) => {
      if (Array.isArray(m)) return { pos: vec3(m, `motes[${i}]`) };
      need(isObj(m), `motes[${i}] phải là [x,y,z] hoặc {pos, id}`);
      if (m.id !== undefined) need(typeof m.id === 'string' && m.id, `motes[${i}].id phải là chuỗi`);
      return { pos: vec3(m.pos, `motes[${i}].pos`), id: m.id };
    });
    const ids = out.motes.filter((m) => m.id).map((m) => m.id);
    need(new Set(ids).size === ids.length, 'motes: id bị trùng');
  }
  if (sc.shades !== undefined) {
    need(Array.isArray(sc.shades), 'shades phải là mảng');
    out.shades = sc.shades.map((s, i) => {
      need(isObj(s), `shades[${i}] phải là object {pos, id?}`);
      if (s.id !== undefined) need(typeof s.id === 'string' && s.id, `shades[${i}].id phải là chuỗi`);
      return { pos: vec3(s.pos, `shades[${i}].pos`), id: s.id };
    });
    const ids = out.shades.filter((s) => s.id).map((s) => s.id);
    need(new Set(ids).size === ids.length, 'shades: id bị trùng');
  }
  if (sc.lanterns !== undefined) {
    need(Array.isArray(sc.lanterns), 'lanterns phải là mảng');
    const valid = new Set(Array.from({ length: lanternCount }, (_, i) => `L${i + 1}`));
    out.lanterns = sc.lanterns.map((l, i) => {
      need(isObj(l), `lanterns[${i}] phải là object`);
      need(valid.has(l.id), `lanterns[${i}].id phải là một trong ${[...valid].join(', ')}`);
      const o = { id: l.id };
      if (l.pos !== undefined) o.pos = vec3(l.pos, `lanterns[${i}].pos`);
      if (l.lit !== undefined) {
        need(typeof l.lit === 'boolean', `lanterns[${i}].lit phải là boolean`);
        o.lit = l.lit;
      }
      if (l.deposited !== undefined) {
        need(isCount(l.deposited), `lanterns[${i}].deposited phải là số nguyên ≥ 0`);
        o.deposited = l.deposited;
      }
      return o;
    });
  }
  if (sc.time_left_s !== undefined) {
    need(isNum(sc.time_left_s) && sc.time_left_s >= 0, 'time_left_s phải là số ≥ 0');
    out.time_left_s = sc.time_left_s;
  }
  return out;
}

export function parseInputs(inp) {
  need(isObj(inp) && Array.isArray(inp.frames), 'inputs phải là object có mảng "frames"');
  let last = -1;
  const frames = inp.frames.map((f, i) => {
    need(isObj(f), `frames[${i}] phải là object`);
    need(Number.isInteger(f.tick) && f.tick >= 0, `frames[${i}].tick phải là số nguyên ≥ 0`);
    need(f.tick > last, `frames[${i}].tick phải tăng nghiêm ngặt (${f.tick} sau ${last})`);
    last = f.tick;
    const fr = { tick: f.tick };
    if (f.move !== undefined) {
      need(
        Array.isArray(f.move) && f.move.length === 2 && f.move.every((v) => isNum(v) && v >= -1 && v <= 1),
        `frames[${i}].move phải là [x, z] với mỗi thành phần trong [-1, 1]`,
      );
      fr.move = [...f.move];
    }
    if (f.cam_yaw_deg !== undefined) {
      need(isNum(f.cam_yaw_deg), `frames[${i}].cam_yaw_deg phải là số`);
      fr.cam_yaw_deg = f.cam_yaw_deg;
    }
    for (const b of BUTTONS) {
      if (f[b] === undefined) continue;
      need(typeof f[b] === 'boolean', `frames[${i}].${b} phải là boolean`);
      fr[b] = f[b];
    }
    return fr;
  });
  return { frames };
}
