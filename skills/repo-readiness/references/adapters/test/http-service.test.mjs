// Behaviour of the HTTP example beyond the adapter contract (contract.test.mjs covers that): options,
// identity proofs, build freshness, and a full run through the kit's runner.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { observationWindow, strictReader } from '../../../assets/verify-skill/scripts/primitives.mjs';
import { FAIL, PASS, runScenarios } from '../../../assets/verify-skill/scripts/runner.mjs';
import { makeRepo } from '../../../assets/verify-skill/scripts/test/helpers.mjs';
import * as adapter from '../http-service.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const adapterFile = path.join(here, '..', 'http-service.mjs');
const toy = path.join(here, 'fixture', 'toy-app.mjs');
const runDir = () => realpathSync(mkdtempSync(path.join(os.tmpdir(), 'verify-kit-http-')));
const read = strictReader({ window: observationWindow() });

test('http-service: env and launch.env reach the instance with placeholders; HOME is inherited only when named', async () => {
  const options = { command: ['node', toy], env: { GIVEN: 'by config', DATA_COPY: '{dataDir}' } };
  const instance = await adapter.up({ runId: 'env-test', runDir: runDir(), launch: { env: { LAUNCHED: 'by launch' } }, options, root: here });
  try {
    const value = async (name) => (await (await fetch(`${instance.url}/env/${name}`)).json()).value;
    assert.equal(await value('GIVEN'), 'by config');
    assert.equal(await value('LAUNCHED'), 'by launch');
    assert.equal(await value('DATA_COPY'), instance.dataDir);
  } finally {
    await adapter.down(instance, { options });
  }
  const inherited = { command: ['node', toy], inheritEnv: ['PATH', 'HOME'] };
  const second = await adapter.up({ runId: 'env-home', runDir: runDir(), options: inherited, root: here });
  try {
    assert.equal((await (await fetch(`${second.url}/env/HOME`)).json()).value, process.env.HOME);
  } finally {
    await adapter.down(second, { options: inherited });
  }
});

test('http-service: arguments from a template, identity by the spawned pid and a per-run token', async () => {
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
    // A read that is not 2xx is unreadable evidence, never an empty answer.
    await assert.rejects(tools.read('/missing'), /evidence unreadable: GET \/missing: GET \/missing returned HTTP 404/);
  } finally {
    await adapter.down(instance, { options });
  }
  // The token alone may be the proof, but only when the headers carry it.
  await assert.rejects(adapter.up({ runId: 'x', runDir: runDir(), options: { command: ['node', toy], identity: null }, root: here }), /carry no \{token\}/);
});

test('http-service: health that does not prove this run is refused at up, and the process is stopped', async () => {
  const options = { command: ['node', toy], identity: { field: 'runId', equals: 'another-run' }, readySeconds: 1 };
  const dir = runDir();
  await assert.rejects(adapter.up({ runId: 'mine', runDir: dir, options, root: here }), /not ready within 1s/);
  assert.equal(existsSync(path.join(dir, 'data')), false);
});

test('http-service: a build older than its sources is refused at up and reported by doctor', async () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'verify-kit-build-')));
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'out.js'), '');
  writeFileSync(path.join(root, 'src', 'a.js'), '');
  const past = new Date(Date.now() - 60_000);
  utimesSync(path.join(root, 'out.js'), past, past);
  const options = { command: ['node', toy], builds: [['out.js', 'src', 'npm run build']] };
  await assert.rejects(adapter.up({ runId: 'b', runDir: runDir(), options, root }), /stale build: out.js is not older than src \(npm run build\)/);
  const rebuilt = new Date(Date.now() + 60_000);
  utimesSync(path.join(root, 'out.js'), rebuilt, rebuilt);
  const instance = await adapter.up({ runId: 'b', runDir: runDir(), options, root });
  try {
    assert.equal((await adapter.doctor(instance, { root, options })).ok, true);
    const edited = new Date(Date.now() + 120_000);
    utimesSync(path.join(root, 'src', 'a.js'), edited, edited);
    const doctor = await adapter.doctor(instance, { root, options });
    assert.equal(doctor.ok, false);
    assert.equal(doctor.checks.find((check) => !check.ok).name, 'out.js is not older than src');
  } finally {
    await adapter.down(instance, { options });
  }
});

test('http-service through the runner: PASS on the good app, FAIL on the broken one', async () => {
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
