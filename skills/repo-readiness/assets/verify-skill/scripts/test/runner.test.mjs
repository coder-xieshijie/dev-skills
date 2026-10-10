import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { kitFilesHash, kitHash, loadConfig } from '../config.mjs';
import { BLOCKED, FAIL, PASS, TO_CONFIRM, UNVERIFIED, judge, recordHand, recordLook, runScenarios } from '../runner.mjs';
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

test('an adapter whose tools() throws still has its instance stopped', async () => {
  const repo = makeRepo();
  const summary = await run(repo, { targets: ['notes.list-empty'], launchOverride: { failTools: true } });
  const row = resultOf(summary, 'notes.list-empty.api');
  assert.equal(row.result, UNVERIFIED);
  assert.match(row.note, /^tools failed: failTools was set/);
  const result = JSON.parse(readFileSync(path.join(repo.root, 'evidence', 'notes.list-empty.api', 'result.json'), 'utf8'));
  assert.equal(result.down.ok, true);
  assert.equal(existsSync(result.instance.dataDir), false);
});

test('paths reach adapters as real paths when the repository is reached through a symlink', async () => {
  const repo = makeRepo();
  const link = `${repo.root}-link`;
  symlinkSync(repo.root, link);
  const config = loadConfig({ skillDir: path.join(link, 'skill'), root: link });
  assert.equal(config.root, realpathSync(repo.root));
  const summary = await runScenarios({ config, targets: ['notes.list-empty'], evidenceDir: path.join(link, 'evidence') });
  assert.equal(summary.evidenceDir, path.join(realpathSync(repo.root), 'evidence'));
  const result = JSON.parse(readFileSync(path.join(repo.root, 'evidence', 'notes.list-empty.api', 'result.json'), 'utf8'));
  assert.equal(result.instance.root, realpathSync(repo.root));
  assert.equal(result.instance.runDir, path.join(realpathSync(repo.root), 'evidence', 'notes.list-empty.api'));
});

test('the summary names the dirty paths and the kit that measured the run', async () => {
  const repo = makeRepo({ config: { kit: 'dev-skills test' } });
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', ...args], { cwd: repo.root, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  writeFileSync(path.join(repo.root, 'patched.txt'), 'a counterexample patch');
  const summary = await run(repo, { targets: ['notes.list-empty'] });
  assert.equal(summary.version.dirty, true);
  assert.ok(summary.version.dirtyPaths.includes('patched.txt'), summary.version.dirtyPaths);
  assert.equal(summary.version.kit.from, 'dev-skills test');
  assert.match(summary.version.kit.hash, /^[0-9a-f]{12}$/);
  assert.equal(summary.version.kit.files, kitFilesHash());
});

test('the kit names its own version: a copy of its scripts prints the same hash, an edited copy another', () => {
  const help = (dir) => JSON.parse(execFileSync('node', [path.join(dir, 'verify.mjs'), '--help'], { encoding: 'utf8' })).kit;
  const copy = mkdtempSync(path.join(os.tmpdir(), 'verify-kit-copy-'));
  for (const name of readdirSync(SCRIPTS).filter((item) => item.endsWith('.mjs'))) copyFileSync(path.join(SCRIPTS, name), path.join(copy, name));
  mkdirSync(path.join(copy, 'entries'));
  writeFileSync(path.join(copy, 'entries', 'api.mjs'), '// an adapter is not part of the kit\n');
  assert.match(help(SCRIPTS), /^[0-9a-f]{12}$/);
  assert.equal(help(copy), help(SCRIPTS));
  writeFileSync(path.join(copy, 'primitives.mjs'), `${readFileSync(path.join(copy, 'primitives.mjs'), 'utf8')}\n`);
  assert.notEqual(help(copy), help(SCRIPTS));
});

test('the kit hash changes with what judges a result, not with jobs, limits, paths or the kit label', () => {
  const repo = makeRepo();
  const file = path.join(repo.skillDir, 'verify.config.json');
  const original = JSON.parse(readFileSync(file, 'utf8'));
  const hashWith = (change) => {
    const config = structuredClone(original);
    change(config);
    writeFileSync(file, JSON.stringify(config, null, 4));
    return kitHash(loadConfig({ skillDir: repo.skillDir, root: repo.root }));
  };
  const base = hashWith(() => {});
  assert.match(base, /^[0-9a-f]{12}$/);
  for (const change of [
    (config) => (config.jobs = 1),
    (config) => (config.runsRoot = 'elsewhere'),
    (config) => (config.kit = 'another label'),
    (config) => (config.entries.web.max = 9),
    (config) => (config.entries.api.contract = { read: ['read', '/health'], doctorChecks: ['config'] }),
  ])
    assert.equal(hashWith(change), base, change.toString());
  // Counterexamples: what the runner reads to start, drive or judge changes the hash.
  for (const change of [
    (config) => (config.entries.api.options = { invalidWhen: '^OTHER' }),
    (config) => (config.entries.web.ui = false),
    (config) => (config.scripted = ['api', 'web']),
    (config) => (config.headings = { steps: 'Steps' }),
  ])
    assert.notEqual(hashWith(change), base, change.toString());
});

test('record: hand results are judged like a script result and land in the summary', async () => {
  const repo = makeRepo();
  const evidenceDir = path.join(repo.root, 'hand');
  const record = (id, verdict) => recordHand({ config: repo.config, evidenceDir, id, verdict, why: `${id} seen` });
  // One of two Web criteria recorded: the other keeps the result UNVERIFIED.
  assert.deepEqual(record('notes.create#3', 'pass'), { ok: true, scenario: 'notes.create.web', result: UNVERIFIED, missing: ['notes.create#4'] });
  assert.equal(record('notes.create#4', 'pass').result, PASS);
  // A later verdict on the same criterion replaces the earlier one.
  assert.equal(record('notes.create#3', 'fail').result, FAIL);
  const summary = JSON.parse(readFileSync(path.join(evidenceDir, 'run-summary.json'), 'utf8'));
  assert.deepEqual(summary.counts, { FAIL: 1 });
  assert.equal(summary.results[0].hand, true);
  assert.throws(() => record('notes.create#9', 'pass'), /no criterion notes.create#9/);
});

test('record: a criterion a script judged in that run is not overwritten by hand', async () => {
  const repo = makeRepo();
  const evidenceDir = path.join(repo.root, 'evidence');
  await run(repo, { targets: ['notes.create'] });
  assert.throws(
    () => recordHand({ config: repo.config, evidenceDir, id: 'notes.create#1', verdict: 'fail', why: 'x' }),
    /was run by a script/,
  );
  // A look criterion the script captured is recorded as `look` does.
  assert.equal(recordHand({ config: repo.config, evidenceDir, id: 'notes.create#4', verdict: 'pass', why: 'beta once' }).result, PASS);
});

test('CLI: check, run --detach and wait, up / doctor / do / down twice, help', () => {
  const repo = makeRepo();
  const cli = (...args) => {
    try {
      return JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'verify.mjs'), ...args, '--skill-dir', repo.skillDir], { encoding: 'utf8' }));
    } catch (error) {
      return JSON.parse(error.stdout);
    }
  };
  const help = cli('--help');
  assert.equal(help.ok, true);
  assert.ok(help.usage.some((line) => line.startsWith('--skill-dir')));
  assert.equal(cli('check').ok, true);
  const evidence = path.join(repo.root, 'detached');
  assert.equal(cli('run', 'notes.list-empty', '--evidence-dir', evidence, '--detach').detached, true);
  const waited = cli('wait', evidence, '--timeout', '60');
  assert.equal(waited.allPass, true);
  const up = cli('up', '--entry', 'api');
  assert.equal(up.ok, true);
  assert.equal(up.runDir, realpathSync(up.runDir));
  assert.equal(cli('doctor', '--run', up.runId).ok, true);
  assert.equal(cli('do', 'api', '--run', up.runId, '["POST", "/notes", {"title": "x"}]').value.status, 201);
  assert.equal(cli('do', 'read', '["/notes"]').value.notes.length, 1);
  // {field} in an argument is that field of the instance; unknown fields stay as written.
  assert.deepEqual(cli('do', 'echo', '["{dataDir}/x", "{nope}"]').value, [`${up.instance.dataDir}/x`, '{nope}']);
  const down = cli('down', '--run', up.runId);
  assert.equal(down.ok, true);
  assert.equal(cli('down', '--run', up.runId).already, 'stopped');
  assert.match(cli('doctor').error, /no live instance/);
  assert.match(cli('bogus').error, /unknown command bogus; --help lists them/);
  const hand = cli('record', path.join(repo.root, 'hand'), 'notes.create#3', 'pass', '--why', 'beta is listed');
  assert.deepEqual(hand, { ok: true, scenario: 'notes.create.web', result: UNVERIFIED, missing: ['notes.create#4'] });
});

test('CLI: a down that left processes keeps the instance live, and the next down tries again', () => {
  const repo = makeRepo();
  const cli = (...args) => {
    try {
      return JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'verify.mjs'), ...args, '--skill-dir', repo.skillDir], { encoding: 'utf8' }));
    } catch (error) {
      return JSON.parse(error.stdout);
    }
  };
  const up = cli('up', '--entry', 'api', '--launch', '{"failDown": true}');
  assert.equal(cli('down', '--run', up.runId).ok, false);
  const again = cli('down', '--run', up.runId);
  assert.equal(again.already, undefined);
  assert.equal(again.ok, false);
  assert.equal(cli('list').instances.find((item) => item.runId === up.runId).stoppedAt, undefined);
});

test('CLI: wait reports a detached run that ended without a summary, with its output', () => {
  const repo = makeRepo();
  const cli = (...args) => {
    try {
      return JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'verify.mjs'), ...args, '--skill-dir', repo.skillDir], { encoding: 'utf8' }));
    } catch (error) {
      return JSON.parse(error.stdout);
    }
  };
  const evidence = path.join(repo.root, 'detached');
  assert.equal(cli('run', 'no-such-map', '--evidence-dir', evidence, '--detach').detached, true);
  const started = Date.now();
  const waited = cli('wait', evidence, '--timeout', '60');
  assert.ok(Date.now() - started < 30_000);
  assert.equal(waited.ok, false);
  assert.match(waited.error, /ended without run-summary.json/);
  assert.match(waited.output, /no scenario script matches no-such-map/);
});
