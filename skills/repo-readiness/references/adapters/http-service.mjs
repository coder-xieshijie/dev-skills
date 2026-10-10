// Example entry adapter for an app driven over HTTP: starts one isolated instance (own port, own
// data directory, its identity proven by health), checks it, gives scripts `api` (actions), `read`
// (strict evidence reads) and `page` (a page in a headless browser), and stops only the processes
// that belong to it. Copy it to scripts/entries/<slug>.mjs with _process.mjs (and _page.mjs for
// pages) and change what your product needs; the kit's contract test runs on the copy.
// Options (verify.config.json, entries.<slug>.options):
//   command        ["node", "server.js", "--port", "{port}", "--data", "{dataDir}"]
//                  how to start the app (cwd: repository root, or `cwd`). {root}, {port}, {dataDir},
//                  {home}, {tmp}, {runId} and {token} are replaced in arguments, `cwd`, `env` and `headers`.
//                  The app also gets PORT, DATA_DIR and RUN_ID in its environment.
//   health         "/health"                must answer 2xx
//   identity       { "field": "runId", "equals": "{runId}" }   (default) proof that health answered
//                  from the process this run started, not a stale one on the port: a body field equal
//                  to the run ID it was given, or { "field": "pid", "equals": "{pid}" } when the command
//                  is the server itself. null when `headers` carry {token} and the app refuses a request
//                  without it: a stale process does not know this run's token.
//   headers        { "authorization": "Bearer {token}" }   sent with every request; {token} is a secret
//                  made for this run
//   inheritEnv     ["PATH", ...]            the only variables passed on from the caller (default
//                  INHERITED_ENV in _process.mjs: no HOME or TMPDIR, the instance gets its own)
//   env            {}                       extra environment; launch.env adds more per scenario
//   builds         [["dist/server.js", "src", "npm run build"]]   up refuses a stale build, doctor reports it
//   pidRecords     [{ "dir": "{dataDir}/workers", "fields": ["pid"] }]   background processes the app
//                  records; `down` stops those that belong to this instance too
//   readySeconds   30
//   invalidWhen    "<regex>"                a line in the app log that voids the run (lost login, ...)
//   sideEffectReads ["<regex>"]             GET paths that change state: refused inside a window
// Doctor reads back what this adapter can see. Reading back the app's effective config, checking
// credentials and proving each replaced external system is the one the app calls are your product's
// own checks: add them to doctor in your copy.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  alive,
  buildChecks,
  expand,
  freePort,
  homeChecks,
  instanceDirs,
  instanceEnv,
  recordedPids,
  refuseStaleBuild,
  sleep,
  stopProcesses,
} from './_process.mjs';

const DEFAULT_IDENTITY = { field: 'runId', equals: '{runId}' };
const pick = (value, field) => String(field).split('.').reduce((current, key) => current?.[key], value);

async function request(instance, apiPath, { method = 'GET', body, headers = instance.headers } = {}) {
  try {
    const response = await fetch(`${instance.url}${apiPath}`, {
      method,
      headers: { ...(headers ?? {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { status: response.status, body: parsed };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

const is2xx = (response) => response.status >= 200 && response.status < 300;

// The body of a response, or an error: inside ctx.read, any error makes the evidence unreadable.
function bodyOf(response, what) {
  if (!is2xx(response)) throw new Error(`${what} returned ${response.status ? `HTTP ${response.status}` : (response.error ?? 'no response')}`);
  if (response.body === undefined || response.body === null) throw new Error(`${what} returned no body`);
  return response.body;
}
const usesToken = (options) => JSON.stringify(options.headers ?? {}).includes('{token}');

function identityOf(options) {
  if (options.identity === null) {
    if (!usesToken(options)) throw new Error('options.identity is null but options.headers carry no {token}');
    return null;
  }
  return options.identity ?? DEFAULT_IDENTITY;
}

// Health answered, and from this run's process.
function ours(health, instance, options) {
  const identity = identityOf(options);
  if (!is2xx(health)) return false;
  if (!identity) return true;
  return String(pick(health.body, identity.field)) === expand(identity.equals, instance);
}

export async function up({ runId, runDir, launch = {}, options = {}, root }) {
  if (!options.command?.length) throw new Error('options.command is not set for this entry');
  identityOf(options);
  refuseStaleBuild(root, options.builds);
  const dirs = instanceDirs(runDir);
  const port = await freePort();
  const token = randomBytes(16).toString('hex');
  const fields = { ...dirs, root, port, runId, token };
  const logFile = path.join(runDir, 'app.log');
  const [command, ...args] = expand(options.command, fields);
  const env = { ...instanceEnv({ options, launch, dirs, fields }), PORT: String(port), DATA_DIR: dirs.dataDir, RUN_ID: runId };
  const out = openSync(logFile, 'a');
  const child = spawn(command, args, {
    cwd: path.resolve(root, expand(options.cwd ?? '.', fields)),
    env,
    stdio: ['ignore', out, out],
    detached: true,
  });
  closeSync(out);
  child.unref();
  const instance = {
    pid: child.pid,
    port,
    runId,
    token,
    url: `http://127.0.0.1:${port}`,
    ...dirs,
    logFile,
    env: { HOME: env.HOME, TMPDIR: env.TMPDIR },
    ...(options.headers ? { headers: expand(options.headers, { ...fields, pid: child.pid }) } : {}),
  };
  const end = Date.now() + (options.readySeconds ?? 30) * 1000;
  while (Date.now() < end) {
    if (ours(await request(instance, options.health ?? '/health'), instance, options)) return instance;
    if (!alive(child.pid)) break;
    await sleep(200);
  }
  await down(instance, { options });
  throw new Error(`not ready within ${options.readySeconds ?? 30}s (or health did not prove it is this run's); see ${logFile}`);
}

export async function doctor(instance, { root, options = {} }) {
  const health = await request(instance, options.health ?? '/health');
  const checks = [
    { name: 'process alive', ok: alive(instance.pid), fix: 'down, then up again' },
    { name: 'health answers 2xx', ok: is2xx(health), fix: `read ${instance.logFile}` },
    { name: "health proves it is this run's instance", ok: ours(health, instance, options), fix: 'another process holds the port: up again' },
    ...homeChecks(instance, options),
    ...buildChecks(root, options.builds),
  ];
  if (usesToken(options)) {
    const bare = await request(instance, options.health ?? '/health', { headers: {} });
    checks.push({
      name: "a request without this run's token is refused",
      ok: bare.status === 401 || bare.status === 403,
      fix: 'the app does not require the token: identity must come from another field',
    });
  }
  return { ok: checks.every((check) => check.ok), checks };
}

export async function down(instance, { options = {}, keepData = false } = {}) {
  const { stopped, left } = await stopProcesses({
    pids: [instance.pid, ...recordedPids(expand(options.pidRecords ?? [], instance))],
    marker: instance.dataDir,
  });
  if (left.length === 0 && !keepData && existsSync(instance.dataDir)) rmSync(instance.dataDir, { recursive: true, force: true });
  const kept = [instance.logFile].filter(existsSync);
  let invalid;
  if (options.invalidWhen && existsSync(instance.logFile)) {
    const hit = new RegExp(options.invalidWhen, 'm').exec(readFileSync(instance.logFile, 'utf8'));
    if (hit) invalid = `app log: ${hit[0]}`;
  }
  return { ok: left.length === 0 && kept.length > 0, kept, stopped, ...(left.length ? { left } : {}), ...(invalid ? { invalid } : {}) };
}

// The runner refuses a read this names while a wait, hold or observation window is open.
export function sideEffect(what) {
  return what.endsWith('(side effect)') ? 'listed in options.sideEffectReads' : undefined;
}

export function tools(instance, { runDir, read, root, options = {} }) {
  const effects = (options.sideEffectReads ?? []).map((pattern) => new RegExp(pattern));
  const requests = path.join(runDir, 'requests.jsonl');
  const record = (entry) => writeFileSync(requests, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, { flag: 'a' });
  return {
    // An action, as a user or client would send it. The response is returned as is. `headers`
    // replaces the run's headers for this request ({} sends none).
    async api(method, apiPath, body, { headers } = {}) {
      const response = await request(instance, apiPath, { method, body, ...(headers ? { headers } : {}) });
      record({ method, path: apiPath, body, status: response.status, ...(headers ? { headers: Object.keys(headers) } : {}) });
      return response;
    },
    // Evidence: a strict GET. A non-2xx status or a missing body is unreadable, never "empty".
    async read(apiPath) {
      const effect = effects.find((pattern) => pattern.test(apiPath));
      return read(effect ? `GET ${apiPath} (side effect)` : `GET ${apiPath}`, async () => {
        const response = await request(instance, apiPath);
        record({ method: 'GET', path: apiPath, status: response.status, evidence: true });
        return bodyOf(response, `GET ${apiPath}`);
      });
    },
    // Evidence: a page of the instance (a path, or a full URL) opened in a headless browser with the
    // run's headers. Waits up to `timeout` seconds for `text`, then `seconds` more, and saves the
    // visible text and a full-page screenshot as <runDir>/<name>.txt and .png. Text that never
    // appears is `ok: false` with why; a page that does not load is unreadable. Needs Playwright in
    // the repository (_page.mjs).
    page: (target = '/', { text, timeout = 30, seconds = 0, name } = {}) =>
      read(`page ${target}`, async () => {
        const { openPage } = await import('./_page.mjs');
        const url = /^https?:/.test(target) ? target : new URL(target, instance.url).href;
        const file = name ?? `page-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        return openPage({ url, root, outDir: runDir, name: file, waitText: text, timeout, seconds, headers: instance.headers });
      }),
  };
}

// A screenshot for a look criterion: `name` is the page path to open ("/" when it is not a path).
export async function capture(instance, name, ctx) {
  const target = name.startsWith('/') ? name : '/';
  const shot = await tools(instance, ctx).page(target, { name: `look-${name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+/, '')}` });
  return shot.screenshot;
}
