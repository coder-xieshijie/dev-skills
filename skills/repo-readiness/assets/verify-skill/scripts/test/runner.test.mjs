import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { BLOCKED, FAIL, PASS, TO_CONFIRM, UNVERIFIED, judge, recordLook, runScenarios } from '../runner.mjs';
import { SCRIPTS, makeRepo } from './helpers.mjs';

const run = (repo, options = {}) =>
  runScenarios({ config: repo.config, targets: [], evidenceDir: path.join(repo.root, 'evidence'), ...options });
const resultOf = (summary, scenario) => summary.results.find((row) => row.scenario === scenario);

test('judge: the order decides, and every shortcut has a counterexample', () => {
  const ok = { id: 'a#1', ok: true };
  assert.equal(judge({ criteria: [ok] }), PASS);
  assert.equal(judge({ criteria: [ok], error: 'timed out' }), UNVERIFIED);
  assert.equal(judge({ criteria: [ok], unreadable: ['404'] }), UNVERIFIED);
  assert.equal(judge({ criteria: [], preconditions: [{ ok: false }] }), BLOCKED);
  // Nothing checked is not a pass.
  assert.equal(judge({ criteria: [] }), UNVERIFIED);
  // A FAIL is not hidden by an unchecked criterion...
  assert.equal(judge({ criteria: [{ id: 'a#1', ok: false }], missing: ['a#2'] }), FAIL);
  // ...but an unchecked criterion keeps a run from passing.
  assert.equal(judge({ criteria: [ok], missing: ['a#2'] }), UNVERIFIED);
  assert.equal(judge({ criteria: [{ id: 'a#1', ok: true, look: { file: 'x' } }] }), UNVERIFIED);
  assert.equal(judge({ criteria: [{ id: 'a#1', ok: true, confirm: true }] }), TO_CONFIRM);
});

test('a full run passes on the good app, keeps evidence and removes scratch data', async () => {
  const repo = makeRepo();
  const summary = await run(repo);
  assert.deepEqual(summary.counts, { PASS: 2, UNVERIFIED: 1 });
  assert.equal(resultOf(summary, 'notes.create.web').note.includes('awaits look'), true);
  const result = JSON.parse(readFileSync(path.join(repo.root, 'evidence', 'notes.create.api', 'result.json'), 'utf8'));
  assert.equal(existsSync(result.instance.logFile), true);
  assert.equal(existsSync(result.instance.dataDir), false);
  assert.equal(existsSync(path.join(repo.root, 'evidence', 'run-summary.json')), true);
});

test('look writes the verdict back and re-judges the scenario and the summary', async () => {
  const repo = makeRepo();
  const evidenceDir = path.join(repo.root, 'evidence');
  await run(repo, { targets: ['notes.create.web'] });
  const looked = recordLook({ evidenceDir, id: 'notes.create#4', verdict: 'pass', why: 'beta listed once' });
  assert.deepEqual(looked, { ok: true, scenario: 'notes.create.web', result: PASS });
  const summary = JSON.parse(readFileSync(path.join(evidenceDir, 'run-summary.json'), 'utf8'));
  assert.equal(summary.allPass, true);
});

test('counterexample: the broken app makes the scenario FAIL', async () => {
  const repo = makeRepo();
  const summary = await run(repo, { entry: 'API', launchOverride: { env: { BUG: '1' } } });
  assert.equal(resultOf(summary, 'notes.create.api').result, FAIL);
  assert.equal(resultOf(summary, 'notes.list-empty.api').result, PASS);
});

test('a failed precondition is BLOCKED, and nothing checked is UNVERIFIED', async () => {
  const repo = makeRepo({
    scripts: {
      'notes.create.api.mjs': `export const scenario = { id: 'notes.create', entry: 'API' };
export async function run(t) {
  t.precondition('a seeded account exists', false);
}
`,
      'notes.list-empty.api.mjs': `export const scenario = { id: 'notes.list-empty', entry: 'API' };
export async function run() {}
`,
    },
  });
  const summary = await run(repo, { entry: 'API' });
  assert.equal(resultOf(summary, 'notes.create.api').result, BLOCKED);
  assert.equal(resultOf(summary, 'notes.list-empty.api').result, UNVERIFIED);
});

test('unreadable evidence is UNVERIFIED even when the script catches it', async () => {
  const repo = makeRepo({
    scripts: {
      'notes.list-empty.api.mjs': `export const scenario = { id: 'notes.list-empty', entry: 'API' };
export async function run(t) {
  let empty = true;
  try { await t.read('/missing'); } catch { empty = true; }
  t.criterion('notes.list-empty#1', empty);
}
`,
    },
  });
  const summary = await run(repo, { targets: ['notes.list-empty'] });
  assert.equal(resultOf(summary, 'notes.list-empty.api').result, UNVERIFIED);
  assert.match(resultOf(summary, 'notes.list-empty.api').note, /evidence unreadable/);
});

test('a side-effect read inside a hold window is refused', async () => {
  const repo = makeRepo();
  repo.config.entryList[0].options.sideEffectReads = ['^/notes$'];
  const summary = await run(repo, { targets: ['notes.list-empty'] });
  assert.equal(resultOf(summary, 'notes.list-empty.api').result, UNVERIFIED);
  assert.match(resultOf(summary, 'notes.list-empty.api').note, /inside an observation window/);
});

test('an invalid run is run once more; the first attempt is kept', async () => {
  const repo = makeRepo();
  const marker = path.join(repo.root, 'login-lost');
  const summary = await run(repo, { targets: ['notes.list-empty'], launchOverride: { env: { LOGIN_LOST: marker } } });
  const row = resultOf(summary, 'notes.list-empty.api');
  assert.equal(row.result, PASS);
  assert.match(row.retriedAfter.error, /^invalid run: app log: LOGIN LOST/);
  assert.equal(row.retriedAfter.result, PASS);
  assert.equal(existsSync(path.join(repo.root, 'evidence', 'notes.list-empty.api.attempt-1')), true);
});

test('a used evidence directory is refused', async () => {
  const repo = makeRepo();
  await run(repo, { targets: ['notes.list-empty'] });
  await assert.rejects(run(repo, { targets: ['notes.list-empty'] }), /already holds a run/);
});

test('CLI: check, run --detach and wait, up / doctor / do / down twice', () => {
  const repo = makeRepo();
  const cli = (...args) => {
    try {
      return JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'verify.mjs'), ...args, '--skill-dir', repo.skillDir], { encoding: 'utf8' }));
    } catch (error) {
      return JSON.parse(error.stdout);
    }
  };
  assert.equal(cli('check').ok, true);
  const evidence = path.join(repo.root, 'detached');
  assert.equal(cli('run', 'notes.list-empty', '--evidence-dir', evidence, '--detach').detached, true);
  const waited = cli('wait', evidence, '--timeout', '60');
  assert.equal(waited.allPass, true);
  const up = cli('up', '--entry', 'api');
  assert.equal(up.ok, true);
  assert.equal(cli('doctor').ok, true);
  assert.equal(cli('do', 'api', '["POST", "/notes", {"title": "x"}]').value.status, 201);
  assert.equal(cli('do', 'read', '["/notes"]').value.notes.length, 1);
  const down = cli('down');
  assert.equal(down.ok, true);
  assert.equal(cli('down', '--run', up.runId).already, 'stopped');
  assert.match(cli('doctor').error, /no live instance/);
});
