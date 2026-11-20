// Tổng hợp token Claude Code của repo này từ transcript cục bộ: ~/.claude/projects/<repo>/*.jsonl
// npm run tokens                      -> mọi phiên
// npm run tokens -- --since 2026-11-20T16:00   -> chỉ các lượt từ thời điểm đó (ví dụ đầu một phase)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = join(homedir(), '.claude', 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'));
if (!existsSync(dir)) {
  console.error(`Không thấy transcript: ${dir}`);
  process.exit(1);
}
const si = process.argv.indexOf('--since');
const since = si > 0 ? new Date(process.argv[si + 1]) : null;

const rows = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl'))) {
  const seen = new Map(); // message.id -> usage (một message có thể ghi nhiều dòng)
  let from = null;
  let to = null;
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const m = d.message;
    if (!m?.usage || !m.id) continue;
    const ts = d.timestamp ? new Date(d.timestamp) : null;
    if (since && ts && ts < since) continue;
    seen.set(m.id, { u: m.usage, model: m.model });
    from ??= ts;
    to = ts ?? to;
  }
  if (!seen.size) continue;
  const r = { session: f.slice(0, 8), from: from?.toISOString().slice(0, 16), to: to?.toISOString().slice(0, 16), calls: seen.size, input: 0, cache_write: 0, cache_read: 0, output: 0 };
  const models = new Set();
  for (const { u, model } of seen.values()) {
    r.input += u.input_tokens ?? 0;
    r.cache_write += u.cache_creation_input_tokens ?? 0;
    r.cache_read += u.cache_read_input_tokens ?? 0;
    r.output += u.output_tokens ?? 0;
    models.add(model);
  }
  r.models = [...models].join(',');
  rows.push(r);
}
rows.sort((a, b) => String(a.from).localeCompare(String(b.from)));
console.table(rows);
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
console.log(`Tổng: ${sum('calls')} lượt gọi · input ${sum('input')} · ghi cache ${sum('cache_write')} · đọc cache ${sum('cache_read')} · output ${sum('output')}`);
