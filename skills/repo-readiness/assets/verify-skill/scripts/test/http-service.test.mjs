import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { FAIL, PASS, runScenarios } from '../runner.mjs';
import { makeRepo } from './helpers.mjs';

// The adapter's tests skip themselves when a repository deletes the adapter it does not use.
const here = path.dirname(fileURLToPath(import.meta.url));
const adapterFile = path.join(here, '..', 'entries', 'http-service.mjs');
const skip = !existsSync(adapterFile) && 'entries/http-service.mjs was removed';
const adapter = skip ? null : await import(pathToFileURL(adapterFile).href);
const toy = path.join(here, 'fixture', 'toy-app.mjs');
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const runDir = () => mkdtempSync(path.join(os.tmpdir(), 'verify-kit-http-'));
const read = (what, fn) => fn();

test('http-service: only allowlisted variables reach the instance; HOME and TMPDIR are its own', { skip }, async () => {
  process.env.VERIFY_KIT_SECRET = 'user api key';
  const options = { command: ['node', toy], env: { GIVEN: 'by config', DATA_COPY: '{dataDir}' } };
  const instance = await adapter.up({ runId: 'env-test', runDir: runDir(), launch: { env: { LAUNCHED: 'by launch' } }, options, root: here });
  try {
    const value = async (name) => (await (await fetch(`${instance.url}/env/${name}`)).json()).value;
    assert.equal(await value('VERIFY_KIT_SECRET'), null);
    assert.equal(await value('PATH'), process.env.PATH);
    assert.equal(await value('GIVEN'), 'by config');
    assert.equal(await value('LAUNCHED'), 'by launch');
    assert.equal(await value('DATA_COPY'), instance.dataDir);
    // A default path the product falls back to (~/.app, $TMPDIR/app) stays inside the instance.
    assert.equal(await value('HOME'), path.join(instance.dataDir, 'home'));
    assert.equal(await value('TMPDIR'), path.join(instance.dataDir, 'tmp'));
    assert.equal((await adapter.doctor(instance, { root: here, options })).ok, true);
  } finally {
    delete process.env.VERIFY_KIT_SECRET;
    await adapter.down(instance, { options });
  }
  // Naming HOME in inheritEnv passes the caller's on purpose.
  const inherited = { command: ['node', toy], inheritEnv: ['PATH', 'HOME'] };
  const second = await adapter.up({ runId: 'env-home', runDir: runDir(), options: inherited, root: here });
  try {
    assert.equal((await (await fetch(`${second.url}/env/HOME`)).json()).value, process.env.HOME);
  } finally {
    await adapter.down(second, { options: inherited });
  }
});

test('http-service: arguments from a template, identity by the spawned pid and a per-run token', { skip }, async () => {
  const options = {
    command: ['node', toy, '--port', '{port}', '--data', '{dataDir}', '--token', '{token}'],
    headers: { authorization: 'Bearer {token}' },
    identity: { field: 'pid', equals: '{pid}' },
  };
  const dir = runDir();
  const instance = await adapter.up({ runId: 'pid-test', runDir: dir, options, root: here });
  try {
    assert.equal(instance.headers.authorization, `Bearer ${instance.token}`);
    const doctor = await adapter.doctor(instance, { root: here, options });
    assert.deepEqual(doctor.checks.filter((check) => !check.ok), []);
    assert.ok(doctor.checks.some((check) => check.name === "a request without this run's token is refused"));
    const tools = adapter.tools(instance, { runDir: dir, read, options });
    assert.equal((await tools.api('POST', '/notes', { title: 'a' })).status, 201);
    assert.equal((await tools.read('/notes')).notes.length, 1);
    assert.equal((await tools.api('GET', '/notes', undefined, { headers: {} })).status, 401);
  } finally {
    await adapter.down(instance, { options });
  }
  // The token alone may be the proof, but only when the headers carry it.
  await assert.rejects(adapter.up({ runId: 'x', runDir: runDir(), options: { command: ['node', toy], identity: null }, root: here }), /carry no \{token\}/);
});

test('http-service: health that does not prove this run is refused, and the process is stopped', { skip }, async () => {
  // Counterexample: a process answering health for another run must not be driven.
  const options = { command: ['node', toy], identity: { field: 'runId', equals: 'another-run' }, readySeconds: 1 };
  const dir = runDir();
  await assert.rejects(adapter.up({ runId: 'mine', runDir: dir, options, root: here }), /not ready within 1s/);
  assert.equal(existsSync(path.join(dir, 'data')), false);
});

test('http-service: a build older than its sources is refused at up and reported by doctor', { skip }, async () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'verify-kit-build-')));
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'out.js'), '');
  writeFileSync(path.join(root, 'src', 'a.js'), '');
  const past = new Date(Date.now() - 60_000);
  utimesSync(path.join(root, 'out.js'), past, past);
  const options = { command: ['node', toy], builds: [['out.js', 'src', 'npm run build']] };
  await assert.rejects(adapter.up({ runId: 'b', runDir: runDir(), options, root }), /stale build: out.js is not older than src \(npm run build\)/);
  // Rebuilt: the output is newer than every source.
  const rebuilt = new Date(Date.now() + 60_000);
  utimesSync(path.join(root, 'out.js'), rebuilt, rebuilt);
  const instance = await adapter.up({ runId: 'b', runDir: runDir(), options, root });
  try {
    assert.equal((await adapter.doctor(instance, { root, options })).ok, true);
    // A source changed after the build.
    const edited = new Date(Date.now() + 120_000);
    utimesSync(path.join(root, 'src', 'a.js'), edited, edited);
    const doctor = await adapter.doctor(instance, { root, options });
    assert.equal(doctor.ok, false);
    assert.equal(doctor.checks.find((check) => !check.ok).name, 'out.js is not older than src');
  } finally {
    await adapter.down(instance, { options });
  }
});

test('http-service: down stops the process, keeps the log, deletes the data and is safe twice', { skip }, async () => {
  const options = { command: ['node', toy] };
  const instance = await adapter.up({ runId: 'down-test', runDir: runDir(), options, root: here });
  const first = await adapter.down(instance, { options });
  assert.equal(first.ok, true);
  assert.deepEqual(first.stopped, [instance.pid]);
  assert.equal(alive(instance.pid), false);
  assert.equal(existsSync(instance.dataDir), false);
  assert.equal(existsSync(instance.logFile), true);
  assert.equal((await adapter.down(instance, { options })).ok, true);
});

test('http-service through the runner: PASS on the good app, FAIL on the broken one', { skip }, async () => {
  const repo = makeRepo();
  const api = repo.config.entryList.find((entry) => entry.slug === 'api');
  Object.assign(api, { adapter: adapterFile, options: { command: ['node', toy] } });
  const run = (dir, launchOverride) =>
    runScenarios({ config: repo.config, targets: [], entry: 'API', evidenceDir: path.join(repo.root, dir), launchOverride });
  const good = await run('good');
  assert.deepEqual(good.counts, { [PASS]: 2 });
  const broken = await run('broken', { env: { BUG: '1' } });
  assert.equal(broken.results.find((row) => row.scenario === 'notes.create.api').result, FAIL);
});
