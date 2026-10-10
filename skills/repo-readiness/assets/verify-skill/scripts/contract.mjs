// `contract`: runs one entry's adapter (verify.config.json `entries.<slug>`) against the adapter
// contract and reports one check per rule. It starts two instances, A and B, the way the runner does,
// plus an unrelated process, and checks:
//   exports     - up, doctor, down and tools are functions; sideEffect and capture, when exported, too;
//   instance    - JSON-serializable (verify.mjs saves it and later commands get it back), with a
//                 `dataDir` inside the run directory, and every existing path in it a real path;
//   doctor      - ok on a running instance, as { ok, checks: [{ name, ok, fix }] }, including the
//                 checks `contract.doctorChecks` names; not ok on A after its down; not ok when A's
//                 port is answered by B (only for instances with a `pid` and a `port`);
//   read        - `contract.read` ([tool, ...args]) resolves and goes through ctx.read;
//   leaves      - `contract.leaves` ([tool, ...args], optional) leaves processes that name the data
//                 directory, so down has something to find;
//   isolation   - the instance's live processes (its `pid`, and every process whose command line or
//                 environment names its data directory) have HOME and TMPDIR inside the data directory
//                 unless `contract.inherits` names them with a reason, and none sees a variable set in
//                 the caller's environment while the check runs; with no live process, `env.HOME` and
//                 `env.TMPDIR` the instance reports are checked instead;
//   down        - ok; nothing of A left running; A's data directory gone; `kept` non-empty, existing,
//                 real and outside the data directory; B, its processes and the unrelated process still
//                 running; a second down ok; with keepData, B's data directory stays and B is stopped.
// Entry options under `contract`: read, leaves, launch (for up), doctorChecks, inherits, skip (a
// reason the entry cannot run here). What only the product can tell (its effective config, its
// credentials, that it resolves a replaced external system) is checked by doctor checks the
// repository adds and names in `doctorChecks`.

import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { observationWindow, strictReader } from './primitives.mjs';
import { loadAdapter } from './runner.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CANARY = 'VERIFY_CONTRACT_CANARY';

export const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const inside = (dir, file) => typeof file === 'string' && !path.relative(dir, file).startsWith('..') && path.isAbsolute(file);

// Every process this user can see: { pid, text (command line and environment), env }.
export function processList() {
  const out = [];
  if (process.platform === 'linux') {
    for (const name of readdirSync('/proc').filter((n) => /^\d+$/.test(n))) {
      try {
        const cmdline = readFileSync(`/proc/${name}/cmdline`, 'utf8').replaceAll('\0', ' ');
        const environ = readFileSync(`/proc/${name}/environ`, 'utf8').split('\0').filter(Boolean);
        out.push({ pid: Number(name), text: `${cmdline} ${environ.join(' ')}`, env: envOf(environ) });
      } catch {
        // gone, or another user's
      }
    }
    return out;
  }
  let text = '';
  try {
    text = execFileSync('ps', ['-A', '-E', '-ww', '-o', 'pid=,command='], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return out;
  }
  for (const line of text.split('\n')) {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (match) out.push({ pid: Number(match[1]), text: match[2], env: envOf(match[2].split(/\s+/)) });
  }
  return out;
}

function envOf(words) {
  const env = {};
  for (const word of words) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(word);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

// The live processes of an instance: its recorded pid and every process naming its data directory.
function processesOf(instance) {
  if (typeof instance?.dataDir !== 'string') return [];
  return processList().filter(
    (item) => item.pid !== process.pid && (item.pid === instance.pid || item.text.includes(instance.dataDir)),
  );
}

async function untilGone(instance, seconds = 5) {
  let left = processesOf(instance);
  for (let waited = 0; left.length && waited < seconds * 1000; waited += 200) {
    await sleep(200);
    left = processesOf(instance);
  }
  return left;
}

function realDir(dir) {
  mkdirSync(dir, { recursive: true });
  return realpathSync(dir);
}

// Absolute paths in a value that exist on disk.
function pathsIn(value, out = []) {
  if (typeof value === 'string') {
    if (path.isAbsolute(value) && existsSync(value)) out.push(value);
  } else if (Array.isArray(value)) value.forEach((item) => pathsIn(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => pathsIn(item, out));
  return out;
}

// {field} in strings (deeply) becomes that field of the instance, as `verify.mjs do` does.
function expandFields(value, instance) {
  if (typeof value === 'string')
    return value.replace(/\{([A-Za-z0-9_]+)\}/g, (whole, name) =>
      ['string', 'number'].includes(typeof instance[name]) ? String(instance[name]) : whole,
    );
  if (Array.isArray(value)) return value.map((item) => expandFields(item, instance));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expandFields(item, instance)]));
  return value;
}

// The instance as if another process held its port: every number equal to the port, and every
// ":<port>" in a string, point at `port`.
function onPort(value, from, to) {
  if (value === from) return to;
  if (typeof value === 'string') return value.replace(new RegExp(`:${from}(?!\\d)`, 'g'), `:${to}`);
  if (Array.isArray(value)) return value.map((item) => onPort(item, from, to));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, onPort(item, from, to)]));
  return value;
}

const failedChecks = (doctor) => (doctor?.checks ?? []).filter((check) => !check.ok).map((check) => check.name);

export async function checkContract({ config, slug, runsRoot }) {
  const entry = config.entryList.find((item) => item.slug === slug || item.name === slug);
  if (!entry) throw new Error(`no entry ${slug} in verify.config.json`);
  const contract = entry.contract ?? {};
  if (contract.skip) return { ok: true, entry: entry.slug, skipped: contract.skip, checks: [] };
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), ...(ok || detail === undefined ? {} : { detail }) });
  const skip = (name, why) => checks.push({ name, skipped: why });
  const result = (dir) => ({ ok: checks.every((check) => check.skipped || check.ok), entry: entry.slug, ...(dir ? { runDir: dir } : {}), checks });

  let adapter;
  let options;
  try {
    ({ adapter, options } = await loadAdapter(config, entry.slug));
    const optional = ['sideEffect', 'capture'].filter((name) => name in adapter && typeof adapter[name] !== 'function');
    add('exports up, doctor, down and tools as functions (sideEffect and capture too, when exported)', optional.length === 0, optional);
  } catch (error) {
    add('exports up, doctor, down and tools as functions (sideEffect and capture too, when exported)', false, error.message);
    return result();
  }

  const base = runsRoot ?? (config.runsRoot ? path.resolve(config.root, config.runsRoot) : path.join(os.tmpdir(), `verify-${path.basename(config.root)}`));
  const dir = realDir(path.join(base, `contract-${entry.slug}-${new Date().toISOString().replace(/[:.]/g, '-')}`));
  const ctxFor = (name) => {
    const runDir = realDir(path.join(dir, name));
    const window = observationWindow();
    const strict = strictReader({ window, sideEffect: adapter.sideEffect ?? (() => undefined) });
    const ctx = {
      runId: `contract-${entry.slug}-${name}-${randomBytes(3).toString('hex')}`,
      runDir,
      launch: structuredClone(contract.launch ?? {}),
      options,
      root: config.root,
      log: (line) => appendFileSync(path.join(runDir, 'contract.log'), `${new Date().toISOString()} ${line}\n`),
      window,
      reads: 0,
    };
    ctx.read = (what, fn) => {
      ctx.reads += 1;
      return strict(what, fn);
    };
    return ctx;
  };
  const a = ctxFor('a');
  const b = ctxFor('b');
  const decoy = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    cwd: config.root,
    env: { PATH: process.env.PATH ?? '' },
    stdio: 'ignore',
    detached: true,
  });
  decoy.unref();
  let A;
  let B;
  const canary = randomBytes(8).toString('hex');
  try {
    process.env[CANARY] = canary;
    const up = async (ctx) => {
      const { read, window, reads, ...upCtx } = ctx;
      return adapter.up(upCtx);
    };
    try {
      A = await up(a);
      B = await up(b);
      add('up starts two instances of the entry side by side', true);
    } catch (error) {
      add('up starts two instances of the entry side by side', false, error.message);
      return result(dir);
    }
    const saved = JSON.parse(JSON.stringify(A));
    const savedB = JSON.parse(JSON.stringify(B));
    add('the instance is JSON-serializable', isDeepStrictEqual(saved, A));
    add(
      'the instance records its data directory (dataDir), inside the run directory',
      typeof saved.dataDir === 'string' && inside(a.runDir, saved.dataDir) && existsSync(saved.dataDir) && saved.dataDir !== a.runDir,
      saved.dataDir,
    );
    const symlinked = pathsIn(saved).filter((file) => realpathSync(file) !== file);
    add('every path in the instance is a real path', symlinked.length === 0, symlinked);

    const doctor = await adapter.doctor(saved, a).catch((error) => ({ thrown: error.message }));
    const shaped =
      typeof doctor?.ok === 'boolean' &&
      Array.isArray(doctor.checks) &&
      doctor.checks.every((check) => typeof check.name === 'string' && typeof check.ok === 'boolean' && (check.ok || check.fix));
    add('doctor answers { ok, checks: [{ name, ok, fix }] } and is ok on a running instance', shaped && doctor.ok, doctor?.thrown ?? failedChecks(doctor));
    for (const name of contract.doctorChecks ?? [])
      add(`doctor checks "${name}"`, doctor?.checks?.some((check) => check.name === name && check.ok), (doctor?.checks ?? []).map((check) => check.name));

    let tools;
    try {
      tools = adapter.tools(saved, a);
    } catch (error) {
      add('tools() gives the tools of a running instance', false, error.message);
    }
    const call = async (instance, ctx, toolset, [tool, ...args]) => {
      if (typeof toolset?.[tool] !== 'function') throw new Error(`no tool ${tool}; tools: ${Object.keys(toolset ?? {}).join(', ')}`);
      return toolset[tool](...expandFields(args, instance));
    };
    if (!contract.read) add('do <a read> goes through ctx.read', false, `name one in entries.${entry.slug}.contract.read: ["<tool>", ...args]`);
    else {
      const before = a.reads;
      try {
        await call(saved, a, tools, contract.read);
        add(`do ${contract.read[0]} goes through ctx.read`, a.reads > before, 'it resolved without calling ctx.read');
      } catch (error) {
        add(`do ${contract.read[0]} goes through ctx.read`, false, error.message);
      }
    }
    if (contract.leaves) {
      try {
        await call(saved, a, tools, contract.leaves);
        await call(savedB, b, adapter.tools(savedB, b), contract.leaves);
        const left = processesOf(saved).filter((item) => item.pid !== saved.pid);
        add(`${contract.leaves[0]} leaves processes that name the data directory`, left.length > 0, 'no process names the data directory after it');
      } catch (error) {
        add(`${contract.leaves[0]} leaves processes that name the data directory`, false, error.message);
      }
    } else skip('processes the instance leaves running are stopped by down', 'no contract.leaves');

    const live = processesOf(saved);
    if (typeof saved.pid === 'number')
      add('the recorded pid is alive and names the data directory', live.some((item) => item.pid === saved.pid && item.text.includes(saved.dataDir)), saved.pid);
    for (const name of ['HOME', 'TMPDIR']) {
      const why = contract.inherits?.[name];
      if (why !== undefined) {
        if (typeof why === 'string' && why.trim()) skip(`${name} is inside the data directory`, `inherited on purpose: ${why}`);
        else add(`${name} is inside the data directory`, false, `contract.inherits.${name} needs the reason as a string`);
      } else if (live.length) {
        const outside = live.filter((item) => !inside(saved.dataDir, item.env[name])).map((item) => ({ pid: item.pid, [name]: item.env[name] ?? null }));
        add(`${name} is inside the data directory`, outside.length === 0, outside);
      } else add(`${name} is inside the data directory (as the instance reports it)`, inside(saved.dataDir, saved.env?.[name]), saved.env ?? 'the instance reports no env and runs no process');
    }
    if (live.length) {
      const leaked = live.filter((item) => item.text.includes(canary)).map((item) => item.pid);
      add("a variable in the caller's environment does not reach the instance's processes", leaked.length === 0, leaked);
    } else skip("a variable in the caller's environment does not reach the instance's processes", 'no live process to read');

    if (typeof saved.pid === 'number' && typeof saved.port === 'number' && typeof savedB.port === 'number') {
      const other = await adapter.doctor(onPort(saved, saved.port, savedB.port), a).catch((error) => ({ ok: false, thrown: error.message }));
      add("doctor is not ok when another instance answers on the instance's port", other?.ok === false, failedChecks(other));
    } else skip("doctor is not ok when another instance answers on the instance's port", 'the instance records no pid and port');

    const othersBefore = processesOf(savedB).map((item) => item.pid);
    const down = await adapter.down(saved, a).catch((error) => ({ thrown: error.message }));
    add('down is ok', down?.ok === true, down);
    const left = await untilGone(saved);
    add('nothing of the instance is left running after down', left.length === 0, left.map((item) => item.pid));
    add('down removes the data directory', !existsSync(saved.dataDir), saved.dataDir);
    const kept = Array.isArray(down?.kept) ? down.kept : [];
    const badKept = kept.filter((file) => !existsSync(file) || inside(saved.dataDir, file) || realpathSync(file) !== file);
    add('down keeps evidence: kept names real paths that exist outside the data directory', kept.length > 0 && badKept.length === 0, kept);
    const othersAfter = othersBefore.filter(alive);
    const doctorB = await adapter.doctor(savedB, b).catch((error) => ({ thrown: error.message }));
    add(
      'down stops only its own instance: the other instance and an unrelated process keep running',
      othersAfter.length === othersBefore.length && alive(decoy.pid) && doctorB?.ok === true,
      { stopped: othersBefore.filter((pid) => !othersAfter.includes(pid)), unrelated: alive(decoy.pid), otherDoctor: doctorB?.thrown ?? failedChecks(doctorB) },
    );
    const after = await adapter.doctor(saved, a).catch((error) => ({ ok: false, thrown: error.message }));
    add('doctor is not ok on a stopped instance', after?.ok === false);
    const again = await adapter.down(saved, a).catch((error) => ({ thrown: error.message }));
    add('a second down is ok', again?.ok === true, again);

    const downB = await adapter.down(savedB, { ...b, keepData: true }).catch((error) => ({ thrown: error.message }));
    const leftB = await untilGone(savedB);
    add('down with keepData stops the instance and keeps its data directory', downB?.ok === true && leftB.length === 0 && existsSync(savedB.dataDir), {
      down: downB,
      left: leftB.map((item) => item.pid),
    });
    return result(dir);
  } finally {
    delete process.env[CANARY];
    // Whatever a failed check left running is stopped here, by the data directory it names.
    for (const instance of [A, B])
      for (const item of processesOf(instance).filter((p) => p.text.includes(instance.dataDir)))
        try {
          process.kill(item.pid, 'SIGKILL');
        } catch {
          // gone
        }
    if (B?.dataDir) rmSync(B.dataDir, { recursive: true, force: true });
    try {
      process.kill(-decoy.pid, 'SIGKILL');
    } catch {
      // gone
    }
  }
}
