// Shared by the kit's entry adapters (files starting with `_` in entries/ are not adapters): the
// instance's directories and environment, placeholders, free ports, build freshness, and stopping
// only the processes that belong to this instance.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// What is passed on from the caller's environment by default. HOME and TMPDIR are not: every instance
// gets its own (<data>/home, <data>/tmp), so a default path the product falls back to (~/.app,
// $TMPDIR/app) stays inside the instance. Name HOME or TMPDIR in `inheritEnv` only when the product
// must see the real one, and write why in the verification Skill. Credentials go in `env`, by name.
export const INHERITED_ENV = ['PATH', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TZ', 'TERM'];

// A directory, created, by its real path: on macOS /tmp and /var are symlinks and products record
// real paths, so every path compared with what the product wrote is real.
export function realDir(dir) {
  mkdirSync(dir, { recursive: true });
  return realpathSync(dir);
}

// <runDir>/data and inside it home, tmp and the `names` given; { dataDir, home, tmp, <name>... }.
export function instanceDirs(runDir, names = []) {
  const dataDir = realDir(path.join(runDir, 'data'));
  const dirs = { dataDir };
  for (const name of ['home', 'tmp', ...names]) dirs[name] = realDir(path.join(dataDir, name));
  return dirs;
}

// Replaces {name} in strings, deeply in arrays and objects, with fields[name] when that is a string
// or a number; other text stays as written.
export function expand(value, fields) {
  if (typeof value === 'string')
    return value.replace(/\{([A-Za-z0-9_]+)\}/g, (whole, name) =>
      ['string', 'number'].includes(typeof fields[name]) ? String(fields[name]) : whole,
    );
  if (Array.isArray(value)) return value.map((item) => expand(item, fields));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expand(item, fields)]));
  return value;
}

// The instance's environment: the allowlist from the caller, HOME and TMPDIR inside the instance,
// then options.env and launch.env with placeholders expanded.
export function instanceEnv({ options = {}, launch = {}, dirs, fields }) {
  const names = options.inheritEnv ?? INHERITED_ENV;
  const env = Object.fromEntries(
    names.filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]),
  );
  if (!names.includes('HOME')) env.HOME = dirs.home;
  if (!names.includes('TMPDIR')) env.TMPDIR = dirs.tmp;
  return { ...env, ...expand(options.env ?? {}, fields), ...expand(launch.env ?? {}, fields) };
}

// Doctor rows: HOME and TMPDIR are inside the data directory unless inherited on purpose.
export function homeChecks(instance, options = {}) {
  const inherited = options.inheritEnv ?? INHERITED_ENV;
  return ['HOME', 'TMPDIR']
    .filter((name) => !inherited.includes(name))
    .map((name) => ({
      name: `${name} is inside the instance`,
      ok: Boolean(instance.env?.[name]) && !path.relative(instance.dataDir, instance.env[name]).startsWith('..'),
      fix: 'options.env or launch.env overrides it: remove that, or add it to inheritEnv on purpose',
    }));
}

export function freePort() {
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

export const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

function newest(target) {
  if (!existsSync(target)) return 0;
  const stat = statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let latest = 0;
  for (const item of readdirSync(target, { withFileTypes: true })) {
    if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
    latest = Math.max(latest, newest(path.join(target, item.name)));
  }
  return latest;
}

// options.builds: [[output, sources, fix?], ...] relative to the repository root. A build whose
// output is missing or older than any of its sources is stale: up refuses it, doctor reports it.
export function buildChecks(root, builds = []) {
  return builds.map(([output, sources, fix]) => {
    const file = path.resolve(root, output);
    return {
      name: `${output} is not older than ${sources}`,
      ok: existsSync(file) && statSync(file).mtimeMs >= newest(path.resolve(root, sources)),
      fix: fix ?? 'rebuild',
    };
  });
}

export function refuseStaleBuild(root, builds) {
  const stale = buildChecks(root, builds).filter((check) => !check.ok);
  if (stale.length) throw new Error(`stale build: ${stale.map((check) => `${check.name} (${check.fix})`).join('; ')}`);
}

// The command line and environment of a process, or '' when they cannot be read.
function processText(pid) {
  try {
    if (process.platform === 'linux')
      return `${readFileSync(`/proc/${pid}/cmdline`, 'utf8')} ${readFileSync(`/proc/${pid}/environ`, 'utf8')}`;
    return execFileSync('ps', ['-E', '-ww', '-o', 'command=', '-p', String(pid)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

// A process belongs to this instance only when its command line or environment names the instance's
// data directory (its HOME and TMPDIR are there): a recycled pid of another process never does.
export const belongs = (pid, marker) => alive(pid) && processText(pid).includes(marker);

function processTable() {
  try {
    return execFileSync('ps', ['-A', '-o', 'pid=,ppid=,pgid='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim().split(/\s+/).map(Number))
      .filter((row) => row.length === 3 && row.every(Number.isInteger));
  } catch {
    return [];
  }
}

// Integer pids at `fields` (dotted paths) of the JSON files in each spec's `dir`, and the contents of
// its *.pid files: where the product records the background processes it leaves running.
// specs: [{ dir, fields }], placeholders already expanded.
export function recordedPids(specs = []) {
  const pids = new Set();
  const add = (value) => Number.isInteger(value) && value > 1 && pids.add(value);
  const pick = (value, field) => field.split('.').reduce((current, key) => current?.[key], value);
  for (const { dir, fields = ['pid'] } of specs) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const full = path.join(dir, file);
      try {
        if (file.endsWith('.pid')) add(Number(readFileSync(full, 'utf8').trim()));
        else if (file.endsWith('.json')) {
          const record = JSON.parse(readFileSync(full, 'utf8'));
          for (const field of fields) add(pick(record, field));
        }
      } catch {
        // a torn record names no pid
      }
    }
  }
  return [...pids];
}

// Stops this instance's processes: the `pids` given, the members of the process `groups` given, and
// every process in the group or under the parent of one of those; each only if it belongs to the
// instance (`marker`: the data directory). SIGTERM, then SIGKILL after `graceMs`.
export async function stopProcesses({ pids = [], groups = [], marker, graceMs = 5000 }) {
  const table = processTable();
  const seeds = new Set(pids);
  const groupIds = new Set([...groups, ...pids]);
  for (const [pid, , pgid] of table) if (groupIds.has(pgid)) seeds.add(pid);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [pid, ppid] of table)
      if (seeds.has(ppid) && !seeds.has(pid)) {
        seeds.add(pid);
        grew = true;
      }
  }
  const targets = [...seeds].filter((pid) => pid !== process.pid && belongs(pid, marker));
  const signal = (name) => {
    for (const pid of targets.filter(alive))
      try {
        process.kill(pid, name);
      } catch {
        // already gone
      }
  };
  signal('SIGTERM');
  for (let waited = 0; waited < graceMs && targets.some(alive); waited += 100) await sleep(100);
  signal('SIGKILL');
  for (let i = 0; i < 20 && targets.some(alive); i += 1) await sleep(50);
  return { stopped: targets, left: targets.filter(alive) };
}
