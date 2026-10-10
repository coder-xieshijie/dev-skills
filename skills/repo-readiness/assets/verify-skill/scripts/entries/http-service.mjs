// Entry adapter for an app driven over HTTP: starts one isolated instance (own port, own data
// directory, run ID echoed by the health endpoint), checks it, gives scripts `api` (actions) and
// `read` (strict evidence reads), and stops only the process group it started.
// Options (verify.config.json, entries.<slug>.options):
//   command        ["node", "server.mjs"]   how to start the app (cwd: repository root, or `cwd`)
//   health         "/health"                must answer 2xx with { runId } equal to RUN_ID
//   inheritEnv     ["PATH", "HOME", ...]    the only variables passed on from the caller's environment
//                                           (default INHERITED_ENV below); secrets go in env, by name
//   env            {}                       extra environment; launch.env adds more per scenario
//   readySeconds   30
//   invalidWhen    "<regex>"                a line in the app log that voids the run (lost login, ...)
//   sideEffectReads ["<regex>"]             GET paths that change state: refused inside a window
// The app gets PORT, DATA_DIR and RUN_ID in its environment.
// Copy this file to entries/<slug>.mjs for each HTTP-like entry and adapt it; other kinds of entry
// (a TUI in a pseudo-terminal, a browser or desktop app through Playwright) implement the same five
// exports: up, doctor, down, tools, and capture when the entry has look criteria.

import { spawn } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import { strictBody } from '../primitives.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The caller's environment is an allowlist: a user's API key or another run's token in it must not
// reach the instance. Add to `inheritEnv` what the app needs to start; keep credentials out of it.
export const INHERITED_ENV = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TZ', 'TERM', 'TMPDIR'];

const inherited = (names) =>
  Object.fromEntries(names.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function request(url, method = 'GET', body) {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
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

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

export async function up({ runId, runDir, launch = {}, options = {}, root }) {
  const [command, ...args] = options.command ?? [];
  if (!command) throw new Error('options.command is not set for this entry');
  const port = await freePort();
  const dataDir = path.join(runDir, 'data');
  const logFile = path.join(runDir, 'app.log');
  const out = openSync(logFile, 'a');
  const child = spawn(command, args, {
    cwd: path.resolve(root, options.cwd ?? '.'),
    env: {
      ...inherited(options.inheritEnv ?? INHERITED_ENV),
      ...options.env,
      ...launch.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      RUN_ID: runId,
    },
    stdio: ['ignore', out, out],
    detached: true,
  });
  closeSync(out);
  child.unref();
  const instance = { pid: child.pid, port, url: `http://127.0.0.1:${port}`, dataDir, logFile };
  const end = Date.now() + (options.readySeconds ?? 30) * 1000;
  while (Date.now() < end) {
    const health = await request(`${instance.url}${options.health ?? '/health'}`);
    if (health.status >= 200 && health.status < 300 && health.body?.runId === runId) return instance;
    if (!alive(child.pid)) break;
    await sleep(200);
  }
  await down(instance, { options });
  throw new Error(`not ready within ${options.readySeconds ?? 30}s; see ${logFile}`);
}

export async function doctor(instance, { runId, options = {} }) {
  const health = await request(`${instance.url}${options.health ?? '/health'}`);
  const checks = [
    { name: 'process alive', ok: alive(instance.pid), fix: 'down, then up again' },
    { name: 'health answers 2xx', ok: health.status >= 200 && health.status < 300, fix: `read ${instance.logFile}` },
    { name: 'instance is ours', ok: health.body?.runId === runId, fix: 'another process holds the port: up again' },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

export async function down(instance, { options = {}, keepData = false } = {}) {
  if (alive(instance.pid)) {
    try {
      process.kill(-instance.pid, 'SIGTERM');
    } catch {
      process.kill(instance.pid, 'SIGTERM');
    }
    for (let i = 0; i < 50 && alive(instance.pid); i += 1) await sleep(100);
    if (alive(instance.pid)) {
      try {
        process.kill(-instance.pid, 'SIGKILL');
      } catch {
        process.kill(instance.pid, 'SIGKILL');
      }
    }
  }
  const stopped = !alive(instance.pid);
  if (stopped && !keepData && existsSync(instance.dataDir)) rmSync(instance.dataDir, { recursive: true, force: true });
  const kept = [instance.logFile].filter(existsSync);
  let invalid;
  if (options.invalidWhen && existsSync(instance.logFile)) {
    const hit = new RegExp(options.invalidWhen, 'm').exec(readFileSync(instance.logFile, 'utf8'));
    if (hit) invalid = `app log: ${hit[0]}`;
  }
  return { ok: stopped && kept.length > 0, kept, ...(invalid ? { invalid } : {}) };
}

// The runner refuses a read this names while a wait, hold or observation window is open.
export function sideEffect(what) {
  return what.endsWith('(side effect)') ? 'listed in options.sideEffectReads' : undefined;
}

export function tools(instance, { runDir, read, options = {} }) {
  const effects = (options.sideEffectReads ?? []).map((pattern) => new RegExp(pattern));
  const requests = path.join(runDir, 'requests.jsonl');
  const record = (entry) => writeFileSync(requests, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, { flag: 'a' });
  return {
    // An action, as a user or client would send it. The response is returned as is.
    async api(method, apiPath, body) {
      const response = await request(`${instance.url}${apiPath}`, method, body);
      record({ method, path: apiPath, body, status: response.status });
      return response;
    },
    // Evidence: a strict GET. A non-2xx status or a missing body is unreadable, never "empty".
    async read(apiPath) {
      const effect = effects.find((pattern) => pattern.test(apiPath));
      return read(effect ? `GET ${apiPath} (side effect)` : `GET ${apiPath}`, async () => {
        const response = await request(`${instance.url}${apiPath}`);
        record({ method: 'GET', path: apiPath, status: response.status, evidence: true });
        return strictBody(response, `GET ${apiPath}`);
      });
    },
  };
}
