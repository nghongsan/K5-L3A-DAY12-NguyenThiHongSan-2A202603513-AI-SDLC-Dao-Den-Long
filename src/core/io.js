// Kiểm tra định dạng file scenario / inputs theo Test Contract v1.0.
// Sai định dạng -> ném FormatError (CLI chuyển thành mã thoát 2).
import { BUTTONS, SHADE_STATES, DRIFTER_STATES } from './sim.js';

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

/**
 * @param {object} sc JSON scenario
 * @param {number} lanternCount số đèn của Đêm (L1…Ln)
 * @param {number[][]} defaultCharms vị trí bùa mặc định của Đêm (C1…)
 */
export function parseScenario(sc, lanternCount = 5, defaultCharms = []) {
  need(isObj(sc), 'scenario phải là một object JSON');
  const out = {};
  if (sc.player !== undefined) {
    const p = sc.player;
    need(isObj(p), 'player phải là object');
    out.player = {};
    if (p.pos !== undefined) out.player.pos = vec3(p.pos, 'player.pos');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) {
      if (p[k] === undefined) continue;
      need(isCount(p[k]), `player.${k} phải là số nguyên ≥ 0`);
      out.player[k] = p[k];
    }
  }
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
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
      const o = { pos: vec3(m.pos, `motes[${i}].pos`), id: m.id };
      if (m.kind !== undefined) {
        need(m.kind === 'random' || m.kind === 'dropped', `motes[${i}].kind phải là "random" hoặc "dropped"`);
        o.kind = m.kind;
      }
      if (m.ttl_ticks !== undefined) {
        need(isCount(m.ttl_ticks), `motes[${i}].ttl_ticks phải là số nguyên ≥ 0`);
        o.ttl_ticks = m.ttl_ticks;
      }
      return o;
    });
    const ids = out.motes.filter((m) => m.id).map((m) => m.id);
    need(new Set(ids).size === ids.length, 'motes: id bị trùng');
  }
  if (sc.shades !== undefined) {
    need(Array.isArray(sc.shades), 'shades phải là mảng');
    out.shades = sc.shades.map((s, i) => {
      need(isObj(s), `shades[${i}] phải là object {pos, id?}`);
      if (s.id !== undefined) need(typeof s.id === 'string' && s.id, `shades[${i}].id phải là chuỗi`);
      const o = { pos: vec3(s.pos, `shades[${i}].pos`), id: s.id };
      if (s.state !== undefined) {
        need(SHADE_STATES.includes(s.state), `shades[${i}].state phải là một trong ${SHADE_STATES.join(', ')}`);
        o.state = s.state;
      }
      if (s.state_ticks_left !== undefined) {
        need(isCount(s.state_ticks_left), `shades[${i}].state_ticks_left phải là số nguyên ≥ 0`);
        o.state_ticks_left = s.state_ticks_left;
      }
      return o;
    });
    const ids = out.shades.filter((s) => s.id).map((s) => s.id);
    need(new Set(ids).size === ids.length, 'shades: id bị trùng');
  }
  if (sc.drifters !== undefined) {
    need(Array.isArray(sc.drifters), 'drifters phải là mảng');
    out.drifters = sc.drifters.map((d, i) => {
      need(isObj(d), `drifters[${i}] phải là object {pos, id?, state?, stolen?}`);
      if (d.id !== undefined) need(typeof d.id === 'string' && d.id, `drifters[${i}].id phải là chuỗi`);
      const o = { pos: vec3(d.pos, `drifters[${i}].pos`), id: d.id };
      if (d.state !== undefined) {
        need(DRIFTER_STATES.includes(d.state), `drifters[${i}].state phải là một trong ${DRIFTER_STATES.join(', ')}`);
        o.state = d.state;
      }
      for (const k of ['stolen', 'state_ticks_left']) {
        if (d[k] === undefined) continue;
        need(isCount(d[k]), `drifters[${i}].${k} phải là số nguyên ≥ 0`);
        o[k] = d[k];
      }
      return o;
    });
    const ids = out.drifters.filter((d) => d.id).map((d) => d.id);
    need(new Set(ids).size === ids.length, 'drifters: id bị trùng');
  }
  if (sc.charms !== undefined) {
    need(Array.isArray(sc.charms), 'charms phải là mảng');
    out.charms = sc.charms.map((c, i) => {
      need(isObj(c), `charms[${i}] phải là object {id, pos, available?, respawn_ticks?}`);
      const id = c.id ?? `C${i + 1}`;
      need(typeof id === 'string' && id, `charms[${i}].id phải là chuỗi`);
      const pos = c.pos ?? defaultCharms[Number(/^C(\d+)$/.exec(id)?.[1]) - 1];
      need(pos !== undefined, `charms[${i}].pos bắt buộc khi id không phải bùa mặc định của Đêm`);
      const o = { id, pos: vec3(pos, `charms[${i}].pos`) };
      if (c.available !== undefined) {
        need(typeof c.available === 'boolean', `charms[${i}].available phải là boolean`);
        o.available = c.available;
      }
      if (c.respawn_ticks !== undefined) {
        need(isCount(c.respawn_ticks), `charms[${i}].respawn_ticks phải là số nguyên ≥ 0`);
        o.respawn_ticks = c.respawn_ticks;
      }
      return o;
    });
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
