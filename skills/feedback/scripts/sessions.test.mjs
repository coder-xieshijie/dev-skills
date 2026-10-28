import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { extract, stats, kindOf, ownWords } from './sessions.mjs';

const T = (m) => `2026-10-20T0${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:00.000Z`;

function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'feedback-sessions-'));
  const proj = path.join(home, '.claude', 'projects', '-repo');
  fs.mkdirSync(path.join(proj, 'subagents'), { recursive: true });
  const lines = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  // parent session: a task, an agent question, a structured answer, a reminder-wrapped reply
  fs.writeFileSync(path.join(proj, 'aaa.jsonl'), lines([
    { type: 'user', timestamp: T(0), cwd: '/repo', message: { content: 'fix the goal card, see !123' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Two options. Which one?' }, { type: 'tool_use', id: 'q1', name: 'AskUserQuestion', input: { q: 'A or B' } }] } },
    { type: 'user', timestamp: T(1), message: { content: [{ type: 'tool_result', tool_use_id: 'q1', content: 'A' }] } },
    { type: 'user', timestamp: T(2), isMeta: true, message: { content: 'meta line' } },
    { type: 'user', timestamp: T(3), message: { content: '<system-reminder>x</system-reminder>继续' } },
    { type: 'user', timestamp: T(4), isSidechain: true, message: { content: 'subagent prompt' } },
  ]));
  // a fork: copies the first message with its timestamp, then goes on
  fs.writeFileSync(path.join(proj, 'bbb.jsonl'), lines([
    { type: 'user', timestamp: T(0), cwd: '/repo', message: { content: 'fix the goal card, see !123' } },
    { type: 'user', timestamp: T(5), message: { content: '[Request interrupted by user]' } },
    { type: 'user', timestamp: T(6), message: { content: '<task-notification>done</task-notification>' } },
  ]));
  fs.writeFileSync(path.join(proj, 'subagents', 'ccc.jsonl'), lines([
    { type: 'user', timestamp: T(7), message: { content: 'should be skipped' } },
  ]));
  // Codex CLI rollout, and a programmatic `codex exec` one
  const roll = path.join(home, '.codex-cli', 'sessions', '2026', '10', '20');
  fs.mkdirSync(roll, { recursive: true });
  fs.writeFileSync(path.join(roll, 'r1.jsonl'), lines([
    { type: 'session_meta', payload: { id: 'cli-1', source: 'cli', cwd: '/other' } },
    { type: 'event_msg', timestamp: T(8), payload: { type: 'user_message', message: '看下进度' } },
    { type: 'event_msg', timestamp: T(9), payload: { type: 'agent_message', message: 'done' } },
  ]));
  fs.writeFileSync(path.join(roll, 'r2.jsonl'), lines([
    { type: 'session_meta', payload: { id: 'exec-1', source: 'exec', cwd: '/x' } },
    { type: 'event_msg', timestamp: T(10), payload: { type: 'user_message', message: 'programmatic' } },
  ]));
  // Codex app: thread history database plus thread metadata
  const dir = path.join(home, '.codex');
  fs.mkdirSync(dir, { recursive: true });
  const h = new DatabaseSync(path.join(dir, 'thread_history_1.sqlite'));
  h.exec('create table thread_items (thread_id text, item_type text, item_json text, created_at_ms integer, rollout_ordinal integer)');
  const ins = h.prepare('insert into thread_items values (?,?,?,?,?)');
  ins.run('app-1', 'userMessage', JSON.stringify({ content: [{ type: 'text', text: 'review !123' }] }), Date.parse(T(11)), 1);
  ins.run('app-1', 'agentMessage', JSON.stringify({ text: 'found 3 issues' }), Date.parse(T(12)), 2);
  ins.run('app-1', 'userMessage', JSON.stringify({ content: [{ type: 'text', text: '修吧' }] }), Date.parse(T(13)), 3);
  ins.run('sub-1', 'userMessage', JSON.stringify({ content: [{ type: 'text', text: 'subagent' }] }), Date.parse(T(14)), 1);
  h.close();
  const st = new DatabaseSync(path.join(dir, 'state_5.sqlite'));
  st.exec('create table threads (id text, source text, cwd text, title text)');
  st.prepare('insert into threads values (?,?,?,?)').run('app-1', 'vscode', '/repo', 'Review');
  st.prepare('insert into threads values (?,?,?,?)').run('sub-1', '{"subagent":{}}', '/repo', '');
  st.close();
  const md = path.join(home, '.minimax', 'v2', 'sqlite');
  fs.mkdirSync(md, { recursive: true });
  const mc = new DatabaseSync(path.join(md, 'runtime-state.sqlite'));
  mc.exec('create table local_runtime_sessions (session_id text, session_kind text, parent_session_id text, project_workspace_dir text, workspace_dir text, title text)');
  mc.exec('create table local_runtime_message_rows (id integer primary key, session_id text, role text, source text, created_at_ms integer, data_json text)');
  mc.prepare('insert into local_runtime_sessions values (?,?,?,?,?,?)').run('mvs_1', 'conversation', null, '/repo', null, 'MCode chat');
  mc.prepare('insert into local_runtime_sessions values (?,?,?,?,?,?)').run('mvs_child', 'conversation', 'mvs_1', '/repo', null, '');
  const mi = mc.prepare('insert into local_runtime_message_rows (session_id, role, source, created_at_ms, data_json) values (?,?,?,?,?)');
  mi.run('mvs_1', 'assistant', null, Date.parse(T(14)), JSON.stringify({ msg_content: 'plan ready' }));
  mi.run('mvs_1', 'user', 'user', Date.parse(T(15)), JSON.stringify({ msg_content: '好的' }));
  mi.run('mvs_1', 'user', 'cron', Date.parse(T(16)), JSON.stringify({ msg_content: 'scheduled' }));
  mi.run('mvs_child', 'user', 'user', Date.parse(T(17)), JSON.stringify({ msg_content: 'child task' }));
  mc.close();
  return home;
}

test('extract reads the three stores, skips subagents and programmatic runs, keeps kinds and the agent text before', async () => {
  const home = fakeHome();
  const rows = await extract({ home, from: '2026-10-20', to: '2026-10-21' });
  const texts = rows.map((r) => `${r.platform}:${r.sid}:${r.kind}:${r.text}`);
  assert.deepEqual(texts, [
    'claude:aaa:typed:fix the goal card, see !123',
    'claude:bbb:typed:fix the goal card, see !123',
    'claude:aaa:answer:<AskUserQuestion-result>A',
    'claude:aaa:typed:继续',
    'claude:bbb:interrupt:[Request interrupted by user]',
    'claude:bbb:automation:<task-notification>done</task-notification>',
    'codex:cli-1:typed:看下进度',
    'codex:app-1:typed:review !123',
    'codex:app-1:typed:修吧',
    'mcode:mvs_1:typed:好的',
  ]);
  assert.match(rows.find((r) => r.text === '修吧').prev, /found 3 issues/);
  assert.match(rows.find((r) => r.kind === 'answer').prev, /AskUserQuestion/);
  assert.equal(rows.at(-1).prev, 'plan ready');
});

test('extract --grep keeps whole sessions that mention the text; --session adds named ones', async () => {
  const home = fakeHome();
  const rows = await extract({ home, from: '2026-10-20', to: '2026-10-21', grep: ['!123'], session: ['cli-1'] });
  assert.deepEqual([...new Set(rows.map((r) => r.sid))], ['aaa', 'bbb', 'cli-1', 'app-1']);
});

test('extract window is half-open and dates are required', async () => {
  const home = fakeHome();
  assert.equal((await extract({ home, from: '2026-10-21', to: '2026-10-22' })).length, 0);
  await assert.rejects(extract({ home, from: 'yesterday', to: '2026-10-22' }), /must be dates/);
});

test('stats drops fork copies and computes concurrency, switching and short replies', async () => {
  const home = fakeHome();
  const s = stats(await extract({ home, from: '2026-10-20', to: '2026-10-21' }));
  assert.equal(s.fork_copies_dropped, 1);
  assert.equal(s.messages, 8); // 10 rows, minus 1 automation, minus 1 fork copy
  assert.equal(s.sessions, 5);
  assert.equal(s.interrupts, 1);
  assert.equal(s.sessions_messaged_in_past_30min_median, 3); // 1,1,1,2,3,4,4,5
  assert.equal(s.switch_rate_within_30min, 0.571); // aaa→aaa, aaa→aaa, aaa→bbb, bbb→cli-1, cli-1→app-1, app-1→app-1, app-1→mvs_1
  assert.equal(s.short_reply_share, 0.571); // 继续, 看下进度, 修吧, 好的 of the 7 typed or answer messages
});

test('kindOf and ownWords', () => {
  assert.equal(kindOf('<command-name>/x</command-name>'), 'slash');
  assert.equal(kindOf('  <heartbeat>'), 'automation');
  assert.equal(ownWords('<response-annotations>[{"text":"a b","annotation":"fix"}]</response-annotations>\n## My request for Codex:\nok'),
    '[annotation 1: «a b» → fix] ok');
});
