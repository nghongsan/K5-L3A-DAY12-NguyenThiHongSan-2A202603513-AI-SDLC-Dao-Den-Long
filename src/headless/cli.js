#!/usr/bin/env node
// Chế độ headless theo Test Contract v1.0.
// node src/headless/cli.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json]
//                          --ticks <int> --out <f.jsonl> [--snapshot-every <int, mặc định 10>]
// Mã thoát: 0 = xong; 2 = file scenario/inputs sai định dạng; 1 = lỗi khác (tham số, đọc/ghi file).
import { readFileSync, writeFileSync } from 'node:fs';
import { runHeadless, toJsonl } from '../core/runner.js';
import { parseScenario, parseInputs, FormatError } from '../core/io.js';
import { loadContract } from './contract.js';

const USAGE =
  'cách dùng: node src/headless/cli.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json] ' +
  '--ticks <int> --out <f.jsonl> [--snapshot-every <int>]';

function die(code, msg) {
  process.stderr.write(`headless: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const known = new Set(['--seed', '--night', '--scenario', '--inputs', '--ticks', '--out', '--snapshot-every']);
  const a = {};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    if (!known.has(k)) die(1, `tham số không hợp lệ: ${k}\n${USAGE}`);
    if (argv[i + 1] === undefined) die(1, `thiếu giá trị cho ${k}`);
    a[k.slice(2)] = argv[i + 1];
  }
  const int = (name, min) => {
    const s = a[name];
    if (s === undefined) return undefined;
    if (!/^-?\d+$/.test(s) || Number(s) < min) die(1, `--${name} phải là số nguyên ≥ ${min}`);
    return Number(s);
  };
  const o = {
    seed: int('seed', Number.MIN_SAFE_INTEGER),
    night: int('night', 1),
    ticks: int('ticks', 0),
    every: int('snapshot-every', 1) ?? 10,
    out: a.out,
    scenario: a.scenario,
    inputs: a.inputs,
  };
  for (const req of ['seed', 'night', 'ticks', 'out']) if (o[req] === undefined) die(1, `thiếu --${req}\n${USAGE}`);
  if (o.night !== 1) die(1, 'Phase 1 chỉ có --night 1');
  return o;
}

function readJson(path, parse, label) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    die(1, `không đọc được ${label} '${path}': ${e.message}`);
  }
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    die(2, `${label} không phải JSON hợp lệ: ${e.message}`);
  }
  try {
    return parse(obj);
  } catch (e) {
    if (e instanceof FormatError) die(2, `${label} sai định dạng: ${e.message}`);
    throw e;
  }
}

const o = parseArgs(process.argv.slice(2));
const { tuning } = loadContract();
const scenario = o.scenario ? readJson(o.scenario, (x) => parseScenario(x, tuning.lantern_count_night1), 'scenario') : {};
const inputs = o.inputs ? readJson(o.inputs, parseInputs, 'inputs') : { frames: [] };
try {
  const lines = runHeadless({ tuning, seed: o.seed, scenario, inputs, ticks: o.ticks, snapshotEvery: o.every });
  writeFileSync(o.out, toJsonl(lines));
} catch (e) {
  die(1, e.stack || String(e));
}
