// A stand-in entry adapter that keeps the adapter contract, for the contract checker's own tests: it
// runs fixture/proc-app.mjs on a free port with its own data directory, HOME and TMPDIR. Each name in
// options.faults breaks one rule, so a test can show the checker catches it:
//   no-identity     doctor accepts any 2xx health, not only this run's
//   doctor-constant doctor is always ok
//   kill-by-name    down kills every process running this fixture's server, not only this instance's
//   keep-data       down leaves the data directory
//   no-kept         down reports no evidence kept
//   twice-throws    a second down throws
//   leave-children  down stops the server but not the children it started
//   real-home       the instance gets the caller's HOME
//   leak-env        the instance gets the caller's whole environment
//   symlink-paths   the instance records its data directory through a symlink
//   read-bypass     the `value` tool reads without ctx.read
//   not-serializable the instance carries a function

import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), 'proc-app.mjs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const has = (options, fault) => (options?.faults ?? []).includes(fault);
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const freePort = () =>
  new Promise((resolve) => {
    const server = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

async function get(instance, what) {
  try {
    const response = await fetch(`http://127.0.0.1:${instance.port}${what}`, { method: what === '/spawn' ? 'POST' : 'GET' });
    return { status: response.status, body: await response.json() };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

export async function up({ runId, runDir, options = {} }) {
  const real = realpathSync(runDir);
  const dataDir = path.join(real, 'data');
  for (const dir of ['home', 'tmp']) mkdirSync(path.join(dataDir, dir), { recursive: true });
  const port = await freePort();
  const own = { HOME: path.join(dataDir, 'home'), TMPDIR: path.join(dataDir, 'tmp') };
  const base = has(options, 'leak-env') ? { ...process.env } : { PATH: process.env.PATH };
  const env = { ...base, ...own, ...(has(options, 'real-home') ? { HOME: process.env.HOME } : {}), PORT: String(port), RUN_ID: runId, DATA_DIR: dataDir };
  const logFile = path.join(real, 'app.log');
  const out = openSync(logFile, 'a');
  const child = spawn(process.execPath, [APP], { env, stdio: ['ignore', out, out], detached: true });
  closeSync(out);
  child.unref();
  let shown = dataDir;
  if (has(options, 'symlink-paths')) {
    shown = path.join(real, 'data-link');
    symlinkSync(dataDir, shown);
  }
  const instance = { pid: child.pid, port, runId, dataDir: shown, logFile, env: { HOME: env.HOME, TMPDIR: env.TMPDIR } };
  if (has(options, 'not-serializable')) instance.stop = () => process.kill(child.pid);
  for (let i = 0; i < 100; i += 1) {
    const health = await get(instance, '/health');
    if (health.status === 200 && health.body.runId === runId) return instance;
    await sleep(50);
  }
  process.kill(child.pid, 'SIGKILL');
  throw new Error(`not ready; see ${logFile}`);
}

export async function doctor(instance, { options = {} } = {}) {
  if (has(options, 'doctor-constant')) return { ok: true, checks: [{ name: 'always', ok: true, fix: '' }] };
  const health = await get(instance, '/health');
  const checks = [
    { name: 'process alive', ok: alive(instance.pid), fix: 'up again' },
    {
      name: "health proves this run's instance",
      ok: health.status === 200 && (has(options, 'no-identity') || health.body.runId === instance.runId),
      fix: 'up again',
    },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

const childrenOf = (instance) =>
  existsSync(path.join(instance.dataDir, 'children'))
    ? readFileSync(path.join(instance.dataDir, 'children'), 'utf8').split('\n').filter(Boolean).map(Number)
    : [];

export async function down(instance, { options = {}, keepData = false } = {}) {
  if (!existsSync(instance.dataDir) && has(options, 'twice-throws')) throw new Error('already down');
  let pids = [instance.pid, ...(has(options, 'leave-children') ? [] : childrenOf(instance))];
  if (has(options, 'kill-by-name'))
    pids = execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' })
      .split('\n')
      .filter((line) => line.includes(`${process.execPath} ${APP}`))
      .map((line) => Number(line.trim().split(/\s+/)[0]));
  for (const pid of pids.filter(alive)) process.kill(pid, 'SIGTERM');
  for (let i = 0; i < 50 && pids.some(alive); i += 1) await sleep(50);
  if (!keepData && !has(options, 'keep-data')) rmSync(path.join(path.dirname(instance.logFile), 'data'), { recursive: true, force: true });
  return { ok: true, kept: has(options, 'no-kept') ? [] : [instance.logFile] };
}

export function tools(instance, { read, options = {} }) {
  return {
    value: () => (has(options, 'read-bypass') ? get(instance, '/value') : read('GET /value', async () => (await get(instance, '/value')).body)),
    spawn: () => get(instance, '/spawn'),
  };
}
