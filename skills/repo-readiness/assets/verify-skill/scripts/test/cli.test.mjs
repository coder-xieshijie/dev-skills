import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { EvidenceError, observationWindow, strictReader } from '../primitives.mjs';
import { FAIL, PASS, runScenarios } from '../runner.mjs';
import { makeRepo } from './helpers.mjs';

// The adapter's tests skip themselves when a repository deletes the adapter it does not use.
const here = path.dirname(fileURLToPath(import.meta.url));
const adapterFile = path.join(here, '..', 'entries', 'cli.mjs');
const skip = !existsSync(adapterFile) && 'entries/cli.mjs was removed';
const adapter = skip ? null : await import(pathToFileURL(adapterFile).href);
const toy = path.join(here, 'fixture', 'toy-cli.mjs');
const OPTIONS = {
  command: ['node', toy],
  pidRecords: [{ dir: '{home}/.toy-cli/workers', fields: ['worker.pid'] }],
  keep: ['home/.toy-cli/notes.json'],
  sideEffectCommands: ['^list\\b'],
  invalidWhen: '^AUTH LOST',
  probe: { args: ['list'], code: 0, stdout: '"notes"' },
};
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function start(options = OPTIONS, launch = {}) {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'verify-kit-cli-'));
  const ctx = { runId: 'cli-test', runDir, launch, options, root: here };
  const instance = await adapter.up(ctx);
  const window = observationWindow();
  const read = strictReader({ window, sideEffect: adapter.sideEffect });
  return { instance, ctx, window, t: adapter.tools(instance, { ...ctx, read, window }) };
}

test('cli: HOME and TMPDIR are the instance own, and only allowlisted variables pass', { skip }, async () => {
  process.env.VERIFY_KIT_SECRET = 'user api key';
  const { instance, ctx, t } = await start();
  try {
    const printed = await t.cli(['add', 'alpha']);
    assert.equal(printed.code, 0);
    // The toy CLI keeps its notes under ~/.toy-cli: inside the instance, never the user's HOME.
    assert.equal((await t.readJson('home/.toy-cli/notes.json'))[0].title, 'alpha');
    assert.equal(existsSync(path.join(os.homedir(), '.toy-cli')), false);
    assert.deepEqual(instance.env, { HOME: path.join(instance.dataDir, 'home'), TMPDIR: path.join(instance.dataDir, 'tmp') });
    const value = async (name) => (await t.query(['env', name])).value;
    assert.equal(await value('VERIFY_KIT_SECRET'), null);
    assert.equal(await value('PATH'), process.env.PATH);
    assert.equal(await value('TMPDIR'), path.join(instance.dataDir, 'tmp'));
    assert.equal((await t.cli(['add', '--from', await t.file('m.txt', 'from a file\n')])).code, 0);
    assert.deepEqual((await t.query(['list'])).notes.map((note) => note.title), ['alpha', 'from a file']);
    assert.equal((await adapter.doctor(instance, ctx)).ok, true);
  } finally {
    delete process.env.VERIFY_KIT_SECRET;
    await adapter.down(instance, ctx);
  }
});

test('cli: down stops a recorded background worker and a child left in the command group', { skip }, async () => {
  const { instance, ctx, t } = await start();
  const worker = (await t.cli(['serve'])).json.worker;
  const started = Date.now();
  const child = (await t.cli(['linger'])).json.child;
  // A child holding stdout open does not keep the command from returning.
  assert.ok(Date.now() - started < 5000);
  assert.equal(alive(worker), true);
  assert.equal(alive(child), true);
  const down = await adapter.down(instance, ctx);
  assert.equal(down.ok, true);
  assert.deepEqual(down.stopped.sort(), [worker, child].sort());
  assert.equal(alive(worker), false);
  assert.equal(alive(child), false);
  assert.equal(existsSync(instance.dataDir), false);
  // The command log survives the data directory.
  assert.ok(down.kept.includes(path.join(ctx.runDir, 'cli.jsonl')));
  assert.equal((await adapter.down(instance, ctx)).already, 'gone');
});

test('cli: without pidRecords a detached worker is not found, which is why the option exists', { skip }, async () => {
  // Counterexample for the option: the worker left its process group, so only the product's record names it.
  const { instance, ctx, t } = await start({ ...OPTIONS, pidRecords: [] });
  const worker = (await t.cli(['serve'])).json.worker;
  try {
    assert.deepEqual((await adapter.down(instance, ctx)).stopped, []);
    assert.equal(alive(worker), true);
  } finally {
    process.kill(worker, 'SIGKILL');
  }
});

test('cli: a recorded pid that is not this instance is never signalled', { skip }, async () => {
  // Counterexample: the record names a pid that now belongs to someone else (a reused pid).
  const stranger = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const { instance, ctx, t } = await start();
  try {
    await t.cli(['add', 'x']);
    writeFileSync(path.join(instance.home, '.toy-cli', 'workers', '1.json'), JSON.stringify({ worker: { pid: stranger.pid } }));
    const down = await adapter.down(instance, ctx);
    assert.equal(down.ok, true);
    assert.deepEqual(down.stopped, []);
    assert.equal(alive(stranger.pid), true);
    // What `keep` names is copied out before the data directory goes.
    assert.equal(JSON.parse(readFileSync(path.join(ctx.runDir, 'kept', 'home', '.toy-cli', 'notes.json'), 'utf8'))[0].title, 'x');
  } finally {
    stranger.kill();
  }
});

test('cli: reads are strict and stay inside the instance', { skip }, async () => {
  const { instance, ctx, t, window } = await start();
  try {
    await assert.rejects(t.readJson('home/.toy-cli/missing.json'), EvidenceError);
    await assert.rejects(t.readText('../../etc/passwd'), /outside the instance/);
    await assert.rejects(t.query(['text']), /printed no JSON/);
    assert.equal(await t.query(['text'], { json: false }), 'plain text\n');
    await assert.rejects(t.query(['fail']), /exited 3: AUTH LOST/);
    assert.deepEqual(await t.list('home/.toy-cli/none', { absent: [] }), []);
    await assert.rejects(t.list('nowhere/none'), /no such directory/);
    // A read command listed in sideEffectCommands is refused inside a window.
    window.open();
    await assert.rejects(t.query(['list']), /inside an observation window/);
    window.close();
    // An action's non-zero exit is the product's answer, returned as is.
    assert.equal((await t.cli(['fail'])).code, 3);
    // Another program of the same product runs in the same instance.
    const other = await t.cli(['-e', 'console.log(JSON.stringify({ home: process.env.HOME }))'], { command: ['node'] });
    assert.equal(other.json.home, instance.home);
    assert.match((await adapter.down(instance, ctx)).invalid, /^stderr: AUTH LOST/);
  } finally {
    await adapter.down(instance, ctx);
  }
});

test('cli: a command that does not exit in time is killed and throws', { skip }, async () => {
  const { instance, ctx, t } = await start({ ...OPTIONS, command: ['node', '-e', 'setInterval(() => {}, 1000)'] });
  try {
    await assert.rejects(t.cli([], { timeout: 1 }), /did not exit within 1s/);
  } finally {
    const down = await adapter.down(instance, ctx);
    assert.deepEqual(down.left ?? [], []);
  }
});

test('cli through the runner: PASS on the good CLI, FAIL on the broken one', { skip }, async () => {
  const map = `# Notes

Notes from the command line.

## Sub-features

- \`notes.add\` (\`fixture/toy-cli.mjs\`; CLI): an added note is listed once.

## Entry points (user view)

| Entry | User action | Interface |
|---|---|---|
| CLI | toy add <title> | toy list |

## Drive

### CLI

- **Add** (\`notes.add\`). Add \`alpha\`, then list:
  - \`notes.add#1\` the list holds exactly one note titled \`alpha\`.

## Gotchas

- None.

## Not covered

- None.
`;
  const script = `export const scenario = { id: 'notes.add', entry: 'CLI', timeoutSeconds: 30 };
export async function run(t) {
  const added = await t.cli(['add', 'alpha']);
  t.precondition('add exits 0', added.code === 0, added);
  const notes = (await t.query(['list'])).notes.filter((note) => note.title === 'alpha');
  t.criterion('notes.add#1', notes.length === 1, notes);
}
`;
  const repo = makeRepo({
    config: { entries: { cli: { name: 'CLI', adapter: adapterFile, options: OPTIONS } }, scripted: ['cli'] },
    files: {
      'skill/features/README.md': '| Feature | Map | Spec | Also scripted | Content |\n|---|---|---|---|---|\n| Notes | [notes.md](../../docs/notes/feature-map/notes.md) | `fixture/toy-cli.mjs` | | add |\n',
      'docs/notes/feature-map/notes.md': map,
      'docs/notes/feature-map/scenarios/notes.add.cli.mjs': script,
    },
    scripts: { 'notes.create.api.mjs': null, 'notes.list-empty.api.mjs': null, 'notes.create.web.mjs': null },
  });
  const run = (dir, launchOverride) =>
    runScenarios({ config: repo.config, targets: [], evidenceDir: path.join(repo.root, dir), launchOverride });
  assert.deepEqual((await run('good')).counts, { [PASS]: 1 });
  assert.deepEqual((await run('broken', { env: { BUG: '1' } })).counts, { [FAIL]: 1 });
});
