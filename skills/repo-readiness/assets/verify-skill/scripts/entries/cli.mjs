// Entry adapter for a command-line program. There is no long-lived server: `up` makes the instance's
// directories and environment, `cli` runs one command in them the way a user types it, and `down`
// stops whatever the commands left running before it deletes the data directory.
// Options (verify.config.json, entries.<slug>.options):
//   command        ["node", "{root}/bin/cli.js"]   the program as a user runs it; placeholders as in
//                  arguments ({root} is the repository root)
//   cwd            "{dataDir}"              where commands run (default: the data directory)
//   dirs           ["state", "workspace"]   more directories made in the data directory; each is a
//                  placeholder too ({state})
//   inheritEnv     ["PATH", ...]            the only variables passed on from the caller (default
//                  INHERITED_ENV in _process.mjs: no HOME or TMPDIR, the instance gets its own)
//   env            { "APP_STATE": "{state}" }   extra environment; launch.env adds more per scenario
//   builds         [["dist/cli.js", "src", "npm run build"]]   up refuses a stale build, doctor reports it
//   probe          { "args": ["--version"], "code": 0, "stdout": "<regex>" }   doctor runs it: the
//                  program starts in this instance and answers
//   timeoutSeconds 120                      per command; a command still running then is killed
//   pidRecords     [{ "dir": "{state}/workers", "fields": ["pid", "worker.pid"] }]   where the program
//                  records the background processes it leaves running (JSON files with those dotted
//                  fields, or *.pid files); `down` stops the ones that belong to this instance
//   keep           ["state"]                data paths copied to <runDir>/kept before the data goes
//   sideEffectCommands ["^sync\\b"]         read commands that change state: refused inside a window
//   invalidWhen    "<regex>"                a stderr line that voids the run (lost login, ...)
// Placeholders in `command`, arguments, `cwd`, `env` and `pidRecords`: {root}, {dataDir}, {home},
// {tmp}, {runId}, {port} (a free port reserved for this instance) and each of `dirs`.
// Every command also gets VERIFY_DATA_DIR: processes whose command line or environment names the
// data directory belong to this instance, and only those are ever signalled.
// Every command and its output goes to <runDir>/cli.jsonl; the process group of every command to
// <runDir>/cli-groups.jsonl, so `down` also finds children a command left in its group.
// Doctor reads back what this adapter can see. Reading back the program's effective config and
// checking credentials are product-specific: add them in a file that wraps this one (see
// control-contract.md, "Extending a kit adapter").

import { spawn } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { EvidenceError } from '../primitives.mjs';
import {
  buildChecks,
  expand,
  freePort,
  homeChecks,
  instanceDirs,
  instanceEnv,
  recordedPids,
  refuseStaleBuild,
  stopProcesses,
} from './_process.mjs';

export async function up({ runId, runDir, launch = {}, options = {}, root }) {
  if (!options.command?.length) throw new Error('options.command is not set for this entry');
  refuseStaleBuild(root, options.builds);
  const dirs = instanceDirs(runDir, options.dirs ?? []);
  const port = await freePort();
  const env = instanceEnv({ options, launch, dirs, fields: { ...dirs, root, runId, port } });
  return {
    kind: 'cli',
    runId,
    runDir,
    root,
    ...dirs,
    port,
    dirs: options.dirs ?? [],
    env: { HOME: env.HOME, TMPDIR: env.TMPDIR },
    log: path.join(runDir, 'cli.jsonl'),
    groups: path.join(runDir, 'cli-groups.jsonl'),
  };
}

// Runs one command; resolves { code, signal, stdout, stderr, json } where json is stdout parsed when it
// is one JSON value, else null. A command that does not exit in time is killed and throws.
function runner(instance, { options = {}, launch = {} }) {
  const dirs = Object.fromEntries(['dataDir', 'home', 'tmp', ...instance.dirs].map((name) => [name, instance[name]]));
  const env = instanceEnv({ options, launch, dirs, fields: instance });
  env.VERIFY_DATA_DIR = instance.dataDir;
  return function run(args, { input, timeout = options.timeoutSeconds ?? 120, cwd, command = options.command } = {}) {
    const [program, ...baseArgs] = expand(command, instance);
    const argv = expand(args.map(String), instance);
    const started = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const child = spawn(program, [...baseArgs, ...argv], {
        cwd: expand(cwd ?? options.cwd ?? '{dataDir}', instance),
        env,
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
        detached: true,
      });
      if (child.pid) appendFileSync(instance.groups, `${child.pid}\n`);
      if (input !== undefined) child.stdin.end(input);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));
      let settled = false;
      const done = (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        let json = null;
        try {
          json = stdout.trim() ? JSON.parse(stdout) : null;
        } catch {
          json = null;
        }
        appendFileSync(instance.log, `${JSON.stringify({ at: started, args: argv, code, signal, stdout, stderr })}\n`);
        resolve({ code, signal, stdout, stderr, json });
      };
      const timer = setTimeout(() => {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          child.kill('SIGKILL');
        }
        settled = true;
        reject(new Error(`${argv.join(' ')} did not exit within ${timeout}s`));
      }, timeout * 1000);
      child.on('error', (error) => {
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
      // A child the command left running may hold stdout open: once the command exits, wait briefly
      // for the rest of its output, then stop reading.
      child.on('exit', (code, signal) => {
        const late = setTimeout(() => {
          child.stdout.destroy();
          child.stderr.destroy();
          done(code, signal);
        }, 500);
        child.on('close', () => {
          clearTimeout(late);
          done(code, signal);
        });
      });
    });
  };
}

export async function doctor(instance, { root, options = {}, launch = {} }) {
  const checks = [
    { name: 'data directory exists', ok: existsSync(instance.dataDir), fix: 'down, then up again' },
    ...homeChecks(instance, options),
    ...buildChecks(root, options.builds),
  ];
  if (options.probe) {
    const { args = [], code = 0, stdout } = options.probe;
    const result = await runner(instance, { options, launch })(args, { timeout: 60 }).catch((error) => ({ code: null, stderr: error.message, stdout: '' }));
    checks.push({
      name: `${args.join(' ')} exits ${code}${stdout ? ` and prints /${stdout}/` : ''} in this instance`,
      ok: result.code === code && (!stdout || new RegExp(stdout, 'm').test(result.stdout)),
      fix: `read ${instance.log}`,
    });
  }
  return { ok: checks.every((check) => check.ok), checks };
}

export async function down(instance, { options = {}, keepData = false } = {}) {
  const kept = () => [instance.log, path.join(instance.runDir, 'kept')].filter(existsSync);
  if (!existsSync(instance.dataDir)) return { ok: true, already: 'gone', kept: kept() };
  const groups = existsSync(instance.groups)
    ? readFileSync(instance.groups, 'utf8').split('\n').filter(Boolean).map(Number)
    : [];
  const { stopped, left } = await stopProcesses({
    pids: recordedPids(expand(options.pidRecords ?? [], instance)),
    groups,
    marker: instance.dataDir,
  });
  for (const rel of options.keep ?? []) {
    const from = path.join(instance.dataDir, rel);
    if (existsSync(from)) cpSync(from, path.join(instance.runDir, 'kept', rel), { recursive: true });
  }
  let invalid;
  if (options.invalidWhen && existsSync(instance.log)) {
    const pattern = new RegExp(options.invalidWhen, 'm');
    for (const line of readFileSync(instance.log, 'utf8').split('\n').filter(Boolean)) {
      const hit = pattern.exec(JSON.parse(line).stderr ?? '');
      if (hit) {
        invalid = `stderr: ${hit[0]}`;
        break;
      }
    }
  }
  if (left.length === 0 && !keepData) rmSync(instance.dataDir, { recursive: true, force: true });
  return { ok: left.length === 0, kept: kept(), stopped, ...(left.length ? { left } : {}), ...(invalid ? { invalid } : {}) };
}

// The runner refuses a read this names while a wait, hold or observation window is open.
export function sideEffect(what) {
  return what.endsWith('(side effect)') ? 'listed in options.sideEffectCommands' : undefined;
}

export function tools(instance, ctx) {
  const { read, options = {} } = ctx;
  if (!existsSync(instance.dataDir)) throw new Error(`instance data ${instance.dataDir} is gone; up again`);
  const run = runner(instance, ctx);
  const effects = (options.sideEffectCommands ?? []).map((pattern) => new RegExp(pattern));
  // A path inside the data directory, or EvidenceError: a read never leaves the instance.
  const inside = (rel, what) => {
    const full = path.resolve(instance.dataDir, expand(rel, instance));
    if (path.relative(instance.dataDir, full).startsWith('..')) throw new EvidenceError(`${what}: ${rel} is outside the instance`);
    if (!existsSync(instance.dataDir)) throw new EvidenceError(`${what}: the instance's data directory is gone`);
    return full;
  };
  let files = 0;
  return {
    // One command as a user types it, returned as is: { code, signal, stdout, stderr, json }. An
    // action: a non-zero exit is the product's answer, not unreadable evidence. Options: `input`
    // (stdin), `timeout` (seconds), `cwd`, and `command` for another program of the same product
    // (placeholders as in options.command); it runs in the same instance and is stopped the same way.
    cli: (args, options) => run(args, options),
    // Evidence: one of the program's own read commands. Its exit code must be one of `codes` and,
    // unless `json: false`, its stdout one JSON value (returned parsed); otherwise unreadable.
    query: (args, { codes = [0], json = true, ...rest } = {}) => {
      const what = `cli ${args.join(' ')}`;
      const effect = effects.some((pattern) => pattern.test(args.join(' ')));
      return read(effect ? `${what} (side effect)` : what, async () => {
        const result = await run(args, rest);
        if (!codes.includes(result.code))
          throw new EvidenceError(`${what} exited ${result.code ?? result.signal}${result.stderr ? `: ${result.stderr.trim().slice(0, 200)}` : ''}`);
        if (!json) return result.stdout;
        if (result.json === null) throw new EvidenceError(`${what} printed no JSON`);
        return result.json;
      });
    },
    // Arranges an input file (a message, a config to import) in the instance; returns its path.
    async file(name, content) {
      files += 1;
      const full = path.join(instance.dataDir, 'files', `${files}-${path.basename(name)}`);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, content);
      return full;
    },
    // Evidence: files the program wrote, relative to the data directory (placeholders allowed).
    readText: (rel) =>
      read(`file ${rel}`, () => {
        const full = inside(rel, `file ${rel}`);
        if (!existsSync(full)) throw new EvidenceError(`file ${rel} does not exist`);
        return readFileSync(full, 'utf8');
      }),
    readJson: (rel) =>
      read(`json ${rel}`, () => {
        const full = inside(rel, `json ${rel}`);
        if (!existsSync(full)) throw new EvidenceError(`json ${rel} does not exist`);
        try {
          return JSON.parse(readFileSync(full, 'utf8'));
        } catch (error) {
          throw new EvidenceError(`json ${rel}: ${error.message}`);
        }
      }),
    readJsonl: (rel) =>
      read(`jsonl ${rel}`, () => {
        const full = inside(rel, `jsonl ${rel}`);
        if (!existsSync(full)) throw new EvidenceError(`jsonl ${rel} does not exist`);
        const text = readFileSync(full, 'utf8');
        if (text && !text.endsWith('\n')) throw new EvidenceError(`jsonl ${rel}: the last line is cut off`);
        return text
          .split('\n')
          .filter(Boolean)
          .map((line, i) => {
            try {
              return JSON.parse(line);
            } catch {
              throw new EvidenceError(`jsonl ${rel}: line ${i + 1} is not JSON`);
            }
          });
      }),
    // Names in a directory; a directory that does not exist yet is an empty read only when `absent:
    // []` says so (its parent must exist), otherwise unreadable.
    list: (rel, { absent } = {}) =>
      read(`list ${rel}`, () => {
        const full = inside(rel, `list ${rel}`);
        if (existsSync(full)) return readdirSync(full).sort();
        if (absent !== undefined && existsSync(path.dirname(full))) return absent;
        throw new EvidenceError(`list ${rel}: no such directory`);
      }),
  };
}
