#!/usr/bin/env node
// Read-only extraction of the user's side of agent sessions, and the collaboration numbers feedback reports.
//
//   node sessions.mjs extract --from <date> --to <date> [--grep <text>]... [--session <id>]... [--home <dir>] --out <file.jsonl>
//   node sessions.mjs stats --in <file.jsonl> [--short <chars>]
//
// extract reads Claude Code (~/.claude/projects), Codex rollouts (~/.codex*/sessions), the Codex app's thread
// history database (~/.codex/thread_history_*.sqlite) and MCode's runtime database, never writes to them, and prints one JSON line
// per user-side message: platform, sid, ts, ms, kind, text, prev (the tail of the agent message before it),
// cwd, title. kind is typed, answer (a reply to the agent's question), slash, interrupt, automation (machine
// text arriving as a user message) or programmatic (an SDK or `-p` run). --grep keeps sessions where any
// message, or the agent text right before one, contains the text; --session keeps the named sessions.
// stats prints one JSON object; references/session-sources.md says what each number means.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PREV_TAIL = 900;
const TEXT_MAX = 6000;
const AUTOMATION = ['<heartbeat>', '<task-notification', '<local-command-stdout', '<local-command-caveat',
  '<local-command-stderr', '<codex_delegation>', '<ci-monitor-event', '<cross-session-message', '<scheduled-task',
  'Caveat: The messages below', '<user-prompt-submit-hook>'];
const ANSWERS = ['<send_user_message_question_reply>', '<questionnaire-response>'];

export function kindOf(text) {
  const s = text.trimStart();
  if (s.startsWith('[Request interrupted')) return 'interrupt';
  if (AUTOMATION.some((p) => s.startsWith(p))) return 'automation';
  if (ANSWERS.some((p) => s.startsWith(p))) return 'answer';
  if (s.startsWith('<command-name>') || s.startsWith('<command-message>')) return 'slash';
  return 'typed';
}

// The part the user wrote, without context the client attached around it.
export function ownWords(text) {
  let t = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, '');
  t = t.replace(/<in-app-browser-context[\s\S]*?<\/in-app-browser-context>\s*/g, '');
  t = t.replace(/<user-provided-context>[\s\S]*?<\/user-provided-context>\s*/g, '[attached context] ');
  const notes = [];
  const a = t.match(/<response-annotations>\s*([\s\S]*?)\s*<\/response-annotations>/);
  if (a) {
    try {
      JSON.parse(a[1]).forEach((it, i) => notes.push(`[annotation ${i + 1}: «${String(it.text ?? '').slice(0, 120)}» → ${it.annotation || '(no comment)'}]`));
    } catch { notes.push('[annotation]'); }
  }
  const m = t.match(/## My request(?: for Codex)?:\s*([\s\S]*)$/);
  if (m) t = (notes.length ? notes.join(' ') + ' ' : (t.trimStart().startsWith('#') ? '[attached file] ' : '')) + m[1];
  return t.trim();
}

const toMs = (iso) => Date.parse(iso);

function* jsonLines(file) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { yield JSON.parse(line); } catch { /* a partly written line */ }
  }
}

function walk(dir, ext, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

function claudeCode(home, add, fromMs) {
  const root = path.join(home, '.claude', 'projects');
  for (const file of walk(root, '.jsonl')) {
    if (path.basename(path.dirname(file)) === 'subagents' || fs.statSync(file).mtimeMs < fromMs) continue;
    const sid = path.basename(file, '.jsonl');
    let prev = '', cwd = '', title = '';
    const asks = new Map();
    for (const o of jsonLines(file)) {
      if (o.type === 'summary' || o.type === 'ai-title') title = o.summary || o.aiTitle || title;
      if (o.isSidechain) continue;
      cwd = o.cwd || cwd;
      if (o.type === 'assistant') {
        for (const b of o.message?.content ?? []) {
          if (b?.type === 'text' && b.text?.trim()) prev = b.text;
          if (b?.type === 'tool_use' && (b.name === 'AskUserQuestion' || b.name === 'ExitPlanMode')) {
            asks.set(b.id, b.name);
            prev = `[${b.name}] ${JSON.stringify(b.input)}`;
          }
        }
        continue;
      }
      if (o.type !== 'user' || o.isMeta || o.isCompactSummary || !o.timestamp) continue;
      const ms = toMs(o.timestamp);
      const programmatic = o.entrypoint === 'sdk-cli';
      const c = o.message?.content;
      if (Array.isArray(c)) {
        for (const b of c) {
          if (b?.type === 'tool_result' && asks.has(b.tool_use_id)) {
            const txt = typeof b.content === 'string' ? b.content : JSON.stringify(b.content);
            add({ platform: 'claude', sid, ms, text: `<${asks.get(b.tool_use_id)}-result>${txt}`, prev, cwd, title, kind: 'answer' });
          }
        }
        if (c.some((b) => b?.type === 'tool_result')) continue;
        const text = c.filter((b) => b?.type === 'text').map((b) => b.text).join('\n');
        add({ platform: 'claude', sid, ms, text, prev, cwd, title, kind: programmatic ? 'programmatic' : undefined });
      } else {
        add({ platform: 'claude', sid, ms, text: c ?? '', prev, cwd, title, kind: programmatic ? 'programmatic' : undefined });
      }
      prev = '';
    }
  }
}

function codexRollouts(home, add, fromMs, seen) {
  const roots = ['.codex', '.codex-cli', '.codex-api'].flatMap((h) => ['sessions', 'archived_sessions'].map((s) => path.join(home, h, s)));
  for (const root of roots) {
    for (const file of walk(root, '.jsonl')) {
      if (fs.statSync(file).mtimeMs < fromMs) continue;
      let sid = null, cwd = '', prev = '';
      for (const o of jsonLines(file)) {
        const p = o.payload ?? {};
        if (o.type === 'session_meta' && sid === null) {
          sid = p.id; cwd = p.cwd ?? '';
          // already read from the app's database, a subagent, or a programmatic `codex exec`
          if (seen.has(sid) || (p.source && typeof p.source === 'object') || p.source === 'exec') break;
        } else if (o.type === 'event_msg' && p.type === 'agent_message') {
          prev = p.message || prev;
        } else if (o.type === 'event_msg' && p.type === 'user_message' && sid) {
          add({ platform: 'codex', sid, ms: toMs(o.timestamp), text: (p.message ?? '').trim(), prev, cwd, title: '' });
          prev = '';
        }
      }
    }
  }
}

async function codexApp(home, add, fromMs, toMs_) {
  const seen = new Set();
  const dir = path.join(home, '.codex');
  const pick = (re) => { try { return fs.readdirSync(dir).filter((f) => re.test(f)).sort().at(-1); } catch { return undefined; } };
  const historyFile = pick(/^thread_history_\d+\.sqlite$/);
  if (!historyFile) return seen;
  const { DatabaseSync } = await import('node:sqlite');
  const open = (f) => new DatabaseSync(new URL(`file://${path.join(dir, f)}?mode=ro&immutable=1`), { readOnly: true });
  const imported = new Set();
  try {
    const imp = JSON.parse(fs.readFileSync(path.join(dir, 'external_agent_session_imports.json'), 'utf8'));
    for (const r of imp.records ?? []) imported.add(r.imported_thread_id);
  } catch { /* no imports */ }
  const meta = new Map();
  const stateFile = pick(/^state_\d+\.sqlite$/);
  if (stateFile) {
    const st = open(stateFile);
    for (const r of st.prepare('select id, source, cwd, title from threads').all()) meta.set(r.id, r);
    st.close();
  }
  const h = open(historyFile);
  const tids = h.prepare("select distinct thread_id from thread_items where item_type='userMessage' and created_at_ms between ? and ?")
    .all(fromMs, toMs_).map((r) => r.thread_id);
  const items = h.prepare("select item_type, item_json, created_at_ms from thread_items where thread_id=? and item_type in ('userMessage','agentMessage') order by rollout_ordinal");
  for (const tid of tids) {
    const m = meta.get(tid);
    if (imported.has(tid) || String(m?.source ?? '').startsWith('{"subagent')) continue;
    let prev = '';
    for (const r of items.all(tid)) {
      const o = JSON.parse(r.item_json);
      if (r.item_type === 'agentMessage') { prev = o.text || prev; continue; }
      const text = (o.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      add({ platform: 'codex', sid: tid, ms: r.created_at_ms, text, prev, cwd: m?.cwd ?? '', title: m?.title ?? '' });
      prev = '';
    }
    seen.add(tid);
  }
  h.close();
  return seen;
}

// MCode keeps its sessions in one SQLite database; only conversation sessions without a parent are the user's.
const MCODE_MACHINE = new Set(['cron', 'task', 'background-task', 'thread-goal', 'turn-continuation', 'conversation-mutation', 'greeting', 'cron-report', 'agent']);
async function mcode(home, add, fromMs, toMs_) {
  const file = path.join(home, '.minimax', 'v2', 'sqlite', 'runtime-state.sqlite');
  if (!fs.existsSync(file)) return;
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(new URL(`file://${file}?mode=ro`), { readOnly: true });
  const meta = new Map();
  for (const r of db.prepare("select session_id, session_kind, parent_session_id, coalesce(project_workspace_dir, workspace_dir, '') as cwd, coalesce(title, '') as title from local_runtime_sessions").all()) meta.set(r.session_id, r);
  const prev = new Map();
  for (const r of db.prepare('select session_id, role, source, created_at_ms, data_json from local_runtime_message_rows where created_at_ms between ? and ? order by session_id, id').all(fromMs, toMs_)) {
    const m = meta.get(r.session_id);
    if (!m || m.session_kind !== 'conversation' || m.parent_session_id) continue;
    let o;
    try { o = JSON.parse(r.data_json); } catch { continue; }
    const c = o.msg_content;
    const text = typeof c === 'string' ? c : c ? JSON.stringify(c) : '';
    if (r.role === 'assistant') { if (text.trim()) prev.set(r.session_id, text); continue; }
    if (r.role !== 'user' || MCODE_MACHINE.has(r.source)) continue;
    add({ platform: 'mcode', sid: r.session_id, ms: r.created_at_ms, text: text.trim(), prev: prev.get(r.session_id) ?? '', cwd: m.cwd, title: m.title });
    prev.set(r.session_id, '');
  }
  db.close();
}

export async function extract({ home = os.homedir(), from, to, grep = [], session = [] }) {
  const fromMs = toMs(from), toMs_ = toMs(to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs_)) throw new Error('--from and --to must be dates, e.g. 2026-10-12 or 2026-10-12T00:00+08:00');
  const rows = [];
  const add = ({ platform, sid, ms, text, prev, cwd, title, kind }) => {
    if (!(ms >= fromMs && ms < toMs_) || !text?.trim()) return;
    rows.push({ platform, sid, ts: new Date(ms).toISOString(), ms, kind: kind ?? kindOf(text),
      text: ownWords(text).slice(0, TEXT_MAX), prev: (prev ?? '').slice(-PREV_TAIL), cwd, title });
  };
  const seen = await codexApp(home, add, fromMs, toMs_);
  codexRollouts(home, add, fromMs, seen);
  claudeCode(home, add, fromMs);
  await mcode(home, add, fromMs, toMs_);
  let keep = null;
  if (grep.length || session.length) {
    keep = new Set(session);
    for (const r of rows) if (grep.some((g) => r.text.includes(g) || r.prev.includes(g) || r.cwd.includes(g))) keep.add(r.sid);
  }
  return rows.filter((r) => !keep || keep.has(r.sid)).sort((a, b) => a.ms - b.ms);
}

const HUMAN = new Set(['typed', 'answer', 'slash', 'interrupt']);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const round = (x) => Math.round(x * 1000) / 1000;

export function stats(rows, { short = 8 } = {}) {
  const human = rows.filter((r) => HUMAN.has(r.kind)).sort((a, b) => a.ms - b.ms);
  // A fork copies the parent's messages into the new session with their original timestamps: count each once.
  const copies = new Map();
  for (const r of human) {
    const k = `${r.ms}\u0000${r.text.slice(0, 300)}`;
    copies.set(k, (copies.get(k) ?? 0) + 1);
  }
  const seen = new Set();
  const unique = human.filter((r) => { const k = `${r.ms}\u0000${r.text.slice(0, 300)}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const key = (r) => `${r.platform}:${r.sid}`;
  const conc = [];
  let lo = 0;
  for (let i = 0; i < unique.length; i++) {
    while (unique[lo].ms < unique[i].ms - 30 * 60000) lo++;
    conc.push(new Set(unique.slice(lo, i + 1).map(key)).size);
  }
  let near = 0, switched = 0;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i].ms - unique[i - 1].ms >= 30 * 60000) continue;
    near++;
    if (key(unique[i]) !== key(unique[i - 1])) switched++;
  }
  const words = unique.filter((r) => r.kind === 'typed' || r.kind === 'answer');
  const byKind = {};
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  return {
    messages: unique.length,
    fork_copies_dropped: human.length - unique.length,
    sessions: new Set(unique.map(key)).size,
    by_kind: byKind,
    sessions_messaged_in_past_30min_median: median(conc),
    switch_rate_within_30min: near ? round(switched / near) : null,
    short_reply_share: words.length ? round(words.filter((r) => [...r.text].length <= short).length / words.length) : null,
    interrupts: unique.filter((r) => r.kind === 'interrupt').length,
  };
}

function args(argv) {
  const o = { grep: [], session: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { (o._ ??= []).push(a); continue; }
    const k = a.slice(2), v = argv[++i];
    if (k === 'grep' || k === 'session') o[k].push(v); else o[k] = v;
  }
  return o;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const o = args(rest);
  if (cmd === 'extract') {
    if (!o.from || !o.to || !o.out) throw new Error('usage: sessions.mjs extract --from <date> --to <date> [--grep <text>]... [--session <id>]... [--home <dir>] --out <file.jsonl>');
    const rows = await extract({ home: o.home, from: o.from, to: o.to, grep: o.grep, session: o.session });
    fs.writeFileSync(o.out, rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''));
    console.log(JSON.stringify({ ok: true, out: o.out, rows: rows.length, sessions: new Set(rows.map((r) => `${r.platform}:${r.sid}`)).size }));
  } else if (cmd === 'stats') {
    if (!o.in) throw new Error('usage: sessions.mjs stats --in <file.jsonl> [--short <chars>]');
    const rows = [...jsonLines(o.in)];
    console.log(JSON.stringify({ ok: true, ...stats(rows, { short: Number(o.short ?? 8) }) }, null, 2));
  } else {
    throw new Error('usage: sessions.mjs extract|stats ... (see the header of this file)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.log(JSON.stringify({ ok: false, error: e.message })); process.exit(1); });
}
