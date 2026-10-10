// `run`: executes the scenario scripts of the feature maps, one instance per script, and turns each
// into one result. A scenario script is <map dir>/scenarios/<id>.<entry slug>.mjs and exports
//   scenario = { id, entry, launch?, timeoutSeconds? }
//   async run(t)
// `t` has the entry adapter's tools (entries/<adapter>.mjs `tools`), the waiting primitives
// (t.until, t.hold, t.observe, t.select) and what the result is judged on:
//   t.precondition(name, ok, detail) - the premise; false stops the script as BLOCKED;
//   t.criterion(id, ok, detail, { otherwise: 'confirm' }?) - map criterion `<sub-feature>#<n>`;
//   t.confirm(id, detail)            - observed, but a product owner must confirm it (TO-CONFIRM);
//   t.look(id, name, standard)       - a look criterion: saves a capture for an agent to judge;
//                                      UNVERIFIED until `look` writes the verdict;
//   t.unreadable(message)            - evidence a shared step found unusable (UNVERIFIED).
// A run the adapter's `down` reports invalid, or whose instance did not start or pass doctor, runs
// once more; a valid FAIL, BLOCKED or timeout never does.

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { kitFilesHash, kitHash } from './config.mjs';
import { criteriaOf, listMaps, looksOf, mapScenarios, parseMap } from './map-check.mjs';
import {
  EvidenceError,
  WindowError,
  after,
  before,
  between,
  observationWindow,
  scenarioScope,
  strictReader,
  waitersFor,
} from './primitives.mjs';

export const PASS = 'PASS';
export const FAIL = 'FAIL';
export const BLOCKED = 'BLOCKED';
export const UNVERIFIED = 'UNVERIFIED';
export const TO_CONFIRM = 'TO-CONFIRM';
const DEFAULT_TIMEOUT = 300;
const RETRY_WHEN = /^(instance did not start|doctor failed|invalid run)/;

class Stop extends Error {}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The product version a result was measured on: the commit, and which paths differ from it (an
// uncommitted verification Skill and a patched product both make a tree dirty; the paths tell them apart).
export function versionOf(root) {
  try {
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const head = git(['rev-parse', 'HEAD']).trim();
    const changed = git(['status', '--porcelain', '--untracked-files=normal'])
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3));
    return {
      head,
      dirty: changed.length > 0,
      ...(changed.length ? { dirtyPaths: changed.slice(0, 20), ...(changed.length > 20 ? { dirtyCount: changed.length } : {}) } : {}),
    };
  } catch {
    return { head: null, dirty: null };
  }
}

// The version of the product and of the ruler: results with another kit hash do not count for this one.
export const runVersion = (config) => ({
  ...versionOf(config.root),
  kit: { from: config.kit ?? null, files: kitFilesHash(), hash: kitHash(config) },
});

// The result, in this order: an error or unreadable evidence -> UNVERIFIED; a failed precondition ->
// BLOCKED; nothing checked -> UNVERIFIED; a criterion that does not hold -> FAIL; a criterion left
// unchecked -> UNVERIFIED; an unjudged capture -> UNVERIFIED; something to confirm -> TO-CONFIRM; PASS.
export function judge({ error, unreadable = [], preconditions = [], criteria = [], missing = [] }) {
  if (error || unreadable.length) return UNVERIFIED;
  if (preconditions.some((item) => !item.ok)) return BLOCKED;
  if (criteria.length === 0) return UNVERIFIED;
  if (criteria.some((item) => !item.ok)) return FAIL;
  if (missing.length) return UNVERIFIED;
  if (criteria.some((item) => item.look && !item.look.verdict)) return UNVERIFIED;
  if (criteria.some((item) => item.confirm)) return TO_CONFIRM;
  return PASS;
}

export function noteOf(result) {
  const parts = [];
  if (result.error) parts.push(result.error);
  for (const message of result.unreadable ?? []) parts.push(message);
  for (const item of result.preconditions ?? []) if (!item.ok) parts.push(`precondition failed: ${item.name}`);
  for (const item of result.criteria ?? []) {
    if (!item.ok) parts.push(`${item.id} does not hold: ${brief(item.detail)}`);
    else if (item.look && !item.look.verdict) parts.push(`${item.id} awaits look: ${item.look.file}`);
    else if (item.confirm) parts.push(`${item.id} to confirm: ${brief(item.detail)}`);
  }
  if (result.missing?.length) parts.push(`unchecked: ${result.missing.join(', ')}`);
  return parts.join('; ');
}

const brief = (value) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text && text.length > 160 ? `${text.slice(0, 160)}…` : text;
};

// Scenarios to run: [{ file, id, entry, slug, expected, looks }], filtered by targets (map name,
// sub-feature id, `<id>.<slug>` or script path) and entry.
export function findScenarios(config, { targets = [], entry } = {}) {
  const { linked, scriptedOf } = listMaps(config);
  const found = [];
  for (const file of [...linked.keys()].filter(existsSync)) {
    const map = parseMap(file, config);
    const scripted = scriptedOf.get(file) ?? [];
    for (const item of mapScenarios(file, config)) {
      if (!item.id || !scripted.includes(item.entry)) continue;
      const slug = config.entryList.find((e) => e.name === item.entry).slug;
      found.push({
        ...item,
        map: map.name,
        slug,
        key: `${item.id}.${slug}`,
        expected: criteriaOf(map, item.id, item.entry),
        looks: looksOf(map, item.id, item.entry),
      });
    }
  }
  const wanted = (item) =>
    targets.length === 0 ||
    targets.some(
      (target) =>
        target === item.map ||
        target === item.id ||
        target === item.key ||
        path.resolve(target) === item.file,
    );
  const byEntry = (item) => !entry || item.entry === entry || item.slug === entry;
  return found.filter((item) => wanted(item) && byEntry(item));
}

export async function loadAdapter(config, slug) {
  const entry = config.entryList.find((item) => item.slug === slug);
  const file = path.resolve(config.skillDir, entry.adapter ?? `scripts/entries/${slug}.mjs`);
  const adapter = await import(pathToFileURL(file).href);
  for (const name of ['up', 'doctor', 'down', 'tools'])
    if (typeof adapter[name] !== 'function') throw new Error(`${file} does not export ${name}()`);
  return { adapter, options: entry.options ?? {}, entry };
}

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return extra ?? base;
  const out = { ...(base ?? {}) };
  for (const [key, value] of Object.entries(extra)) out[key] = deepMerge(out[key], value);
  return out;
}

// One attempt: up, doctor, script, down. Returns the result record (also written to result.json).
async function attempt({ config, item, runDir, launchOverride, sleepFn = sleep }) {
  mkdirSync(runDir, { recursive: true });
  const module = await import(pathToFileURL(item.file).href);
  const meta = module.scenario ?? {};
  const { adapter, options } = await loadAdapter(config, item.slug);
  const launch = deepMerge(meta.launch ?? {}, launchOverride);
  const runId = `${item.key}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const log = (line) => writeFileSync(path.join(runDir, 'runner.log'), `${new Date().toISOString()} ${line}\n`, { flag: 'a' });
  const record = {
    scenario: item.key,
    id: item.id,
    entry: item.entry,
    runId,
    launch,
    version: versionOf(config.root),
    startedAt: new Date().toISOString(),
    expected: item.expected,
    preconditions: [],
    criteria: [],
    unreadable: [],
    notes: [],
  };
  const started = Date.now();
  const ctxBase = { runId, runDir, launch, options, root: config.root, log };
  let instance;
  try {
    instance = await adapter.up(ctxBase);
  } catch (error) {
    return finish(record, runDir, started, { error: `instance did not start: ${error.message}` });
  }
  record.instance = instance;
  try {
    const doctor = await adapter.doctor(instance, ctxBase);
    if (!doctor?.ok) {
      record.doctor = doctor;
      const down = await adapter.down(instance, ctxBase).catch((error) => ({ ok: false, error: error.message }));
      record.down = down;
      return finish(record, runDir, started, { error: `doctor failed: ${JSON.stringify(doctor?.checks ?? doctor)}` });
    }
  } catch (error) {
    await adapter.down(instance, ctxBase).catch(() => {});
    return finish(record, runDir, started, { error: `doctor failed: ${error.message}` });
  }

  const window = observationWindow();
  const read = strictReader({ window, sideEffect: adapter.sideEffect ?? (() => undefined) });
  const ctx = { ...ctxBase, read, window };
  const criteria = new Map();
  const cleanups = [];
  const check = (id, ok, detail, confirm = false) => {
    if (!item.expected.includes(id)) throw new Error(`${id} is not a ${item.entry} criterion of ${item.id} in the map`);
    if (criteria.has(id)) throw new Error(`${id} is checked twice`);
    criteria.set(id, { id, ok: Boolean(ok), confirm, ...(detail !== undefined ? { detail } : {}) });
    return Boolean(ok);
  };
  let tools;
  try {
    tools = adapter.tools(instance, ctx);
  } catch (error) {
    record.down = await adapter.down(instance, ctx).catch((e) => ({ ok: false, error: e.message }));
    return finish(record, runDir, started, { error: `tools failed: ${error.message}` });
  }
  const t = {
    id: item.id,
    entry: item.entry,
    runDir,
    instance,
    ...tools,
    ...waitersFor({ sleep: sleepFn, window }),
    select: { after, before, between },
    precondition(name, ok, detail) {
      record.preconditions.push({ name, ok: Boolean(ok), ...(detail !== undefined ? { detail } : {}) });
      if (!ok) throw new Stop(name);
      return true;
    },
    criterion(id, ok, detail, { otherwise } = {}) {
      if (!ok && otherwise === 'confirm') return check(id, true, detail, true) && false;
      return check(id, ok, detail);
    },
    confirm: (id, detail) => check(id, true, detail, true),
    async look(id, name, standard) {
      if (!item.looks.includes(id)) throw new Error(`${id} is not a look criterion of ${item.id} in the map`);
      if (typeof adapter.capture !== 'function') throw new Error(`the ${item.entry} adapter has no capture()`);
      const file = await adapter.capture(instance, name, ctx);
      if (!file) throw new EvidenceError(`look ${id}: nothing was captured for ${name}`);
      criteria.set(id, { id, ok: true, confirm: false, look: { file, standard } });
      return file;
    },
    unreadable(message) {
      throw new EvidenceError(message);
    },
    note: (text) => record.notes.push(text),
    defer: (fn) => cleanups.push(fn),
  };

  let error;
  const timeout = (meta.timeoutSeconds ?? DEFAULT_TIMEOUT) * 1000;
  let timer;
  try {
    await scenarioScope.run(
      (raised) => record.unreadable.push(raised.message),
      () =>
        Promise.race([
          module.run(t),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`timed out after ${timeout / 1000}s`)), timeout);
          }),
        ]),
    );
  } catch (raised) {
    if (!(raised instanceof Stop) && !(raised instanceof EvidenceError) && !(raised instanceof WindowError))
      error = raised.message;
  } finally {
    clearTimeout(timer);
  }
  for (const fn of cleanups.reverse()) await Promise.resolve().then(fn).catch((e) => record.notes.push(`cleanup: ${e.message}`));
  record.criteria = [...criteria.values()];
  record.missing = item.expected.filter((id) => !criteria.has(id));
  let down;
  try {
    down = await adapter.down(instance, ctx);
  } catch (raised) {
    down = { ok: false, error: raised.message };
  }
  if (!down?.ok) down = (await adapter.down(instance, ctx).catch((e) => ({ ok: false, error: e.message }))) ?? down;
  record.down = down;
  if (down?.invalid) return finish(record, runDir, started, { error: `invalid run: ${down.invalid}`, keepJudged: true });
  return finish(record, runDir, started, { error });
}

function finish(record, runDir, started, { error, keepJudged = false }) {
  if (error) record.error = error;
  if (keepJudged) record.judgedBeforeInvalid = judge({ ...record, error: undefined });
  record.result = judge(record);
  record.note = noteOf(record);
  record.seconds = Math.round((Date.now() - started) / 1000);
  record.leaked = record.down && !record.down.ok ? record.instance : undefined;
  writeFileSync(path.join(runDir, 'result.json'), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export async function runOne({ config, item, evidenceDir, launchOverride, sleepFn }) {
  const runDir = path.join(evidenceDir, item.key);
  const first = await attempt({ config, item, runDir, launchOverride, sleepFn });
  if (!(first.result === UNVERIFIED && RETRY_WHEN.test(first.error ?? ''))) return first;
  renameSync(runDir, `${runDir}.attempt-1`);
  const second = await attempt({ config, item, runDir, launchOverride, sleepFn });
  second.retriedAfter = { error: first.error, result: first.judgedBeforeInvalid ?? first.result };
  writeFileSync(path.join(runDir, 'result.json'), `${JSON.stringify(second, null, 2)}\n`);
  return second;
}

// Runs tasks at most `limit` at once and at most `perEntry[slug]` per entry, longest timeout first.
export async function pool(items, limit, perEntry, task) {
  const queue = [...items];
  const running = new Map();
  const counts = {};
  const results = [];
  const canStart = (item) => (counts[item.slug] ?? 0) < (perEntry[item.slug] ?? Infinity);
  while (queue.length || running.size) {
    let index;
    while (running.size < limit && (index = queue.findIndex(canStart)) >= 0) {
      const [item] = queue.splice(index, 1);
      counts[item.slug] = (counts[item.slug] ?? 0) + 1;
      const promise = task(item).then((result) => {
        results.push(result);
        counts[item.slug] -= 1;
        running.delete(item.key);
      });
      running.set(item.key, promise);
    }
    if (running.size) await Promise.race(running.values());
  }
  return results;
}

function summarize(config, results, startedAt) {
  const counts = {};
  for (const result of results) counts[result.result] = (counts[result.result] ?? 0) + 1;
  const rows = results
    .sort((a, b) => a.scenario.localeCompare(b.scenario))
    .map((result) => ({
      scenario: result.scenario,
      result: result.result,
      note: result.note,
      seconds: result.seconds,
      ...(result.retriedAfter ? { retriedAfter: result.retriedAfter } : {}),
    }));
  return {
    ok: results.every((result) => result.result !== UNVERIFIED),
    allPass: results.length > 0 && results.every((result) => result.result === PASS),
    counts,
    version: runVersion(config),
    startedAt,
    seconds: Math.round((Date.now() - Date.parse(startedAt)) / 1000),
    results: rows,
    firstAttemptFail: results.filter((r) => r.retriedAfter?.result === FAIL).map((r) => r.scenario),
    leaked: results.filter((r) => r.leaked).map((r) => ({ scenario: r.scenario, instance: r.leaked })),
  };
}

export async function runScenarios({ config, targets, entry, jobs, evidenceDir, launchOverride, sleepFn }) {
  const items = findScenarios(config, { targets, entry });
  if (items.length === 0) throw new Error(`no scenario script matches ${targets.join(' ') || 'the maps'}`);
  if (existsSync(path.join(evidenceDir, 'run-summary.json')))
    throw new Error(`${evidenceDir} already holds a run; use a new --evidence-dir`);
  mkdirSync(evidenceDir, { recursive: true });
  evidenceDir = realpathSync(evidenceDir);
  const timeoutOf = async (item) => (await import(pathToFileURL(item.file).href)).scenario?.timeoutSeconds ?? DEFAULT_TIMEOUT;
  const withTimeouts = await Promise.all(items.map(async (item) => ({ ...item, timeout: await timeoutOf(item) })));
  withTimeouts.sort((a, b) => b.timeout - a.timeout);
  const startedAt = new Date().toISOString();
  const progress = path.join(evidenceDir, 'run-progress.json');
  let done = 0;
  const perEntry = Object.fromEntries(config.entryList.filter((e) => e.max).map((e) => [e.slug, e.max]));
  writeFileSync(progress, JSON.stringify({ total: items.length, done, startedAt }));
  const results = await pool(withTimeouts, jobs ?? config.jobs, perEntry, async (item) => {
    const result = await runOne({ config, item, evidenceDir, launchOverride, sleepFn });
    done += 1;
    writeFileSync(progress, JSON.stringify({ total: items.length, done, startedAt }));
    return result;
  });
  const summary = summarize(config, results, startedAt);
  writeFileSync(path.join(evidenceDir, 'run-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return { evidenceDir, ...summary };
}

// Writes one scenario's result into the run summary, adding the row when the scenario is new.
function updateSummary(evidenceDir, result, version) {
  const file = path.join(evidenceDir, 'run-summary.json');
  const summary = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : { version, startedAt: new Date().toISOString(), results: [], firstAttemptFail: [], leaked: [] };
  const row = { scenario: result.scenario, result: result.result, note: result.note, ...(result.hand ? { hand: true } : {}) };
  const index = summary.results.findIndex((r) => r.scenario === result.scenario);
  if (index >= 0) summary.results[index] = { ...summary.results[index], ...row };
  else summary.results.push(row);
  summary.results.sort((a, b) => a.scenario.localeCompare(b.scenario));
  summary.counts = {};
  for (const r of summary.results) summary.counts[r.result] = (summary.counts[r.result] ?? 0) + 1;
  summary.ok = summary.results.every((r) => r.result !== UNVERIFIED);
  summary.allPass = summary.results.every((r) => r.result === PASS);
  writeFileSync(file, `${JSON.stringify(summary, null, 2)}\n`);
}

// `look`: records an agent's verdict on a look criterion and re-judges that scenario and the summary.
export function recordLook({ evidenceDir, id, verdict, why }) {
  if (!['pass', 'fail'].includes(verdict)) throw new Error('verdict is pass or fail');
  if (!why) throw new Error('--why says what the capture shows');
  const dirs = readdirSync(evidenceDir, { withFileTypes: true }).filter(
    (d) => d.isDirectory() && !d.name.includes('.attempt-') && existsSync(path.join(evidenceDir, d.name, 'result.json')),
  );
  for (const dir of dirs) {
    const file = path.join(evidenceDir, dir.name, 'result.json');
    const result = JSON.parse(readFileSync(file, 'utf8'));
    const item = result.criteria.find((c) => c.id === id && c.look);
    if (!item) continue;
    item.look.verdict = verdict;
    item.look.why = why;
    item.ok = verdict === 'pass';
    if (!/^invalid run/.test(result.error ?? '')) {
      result.result = judge(result);
      result.note = noteOf(result);
    }
    writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
    if (existsSync(path.join(evidenceDir, 'run-summary.json'))) updateSummary(evidenceDir, result);
    return { ok: true, scenario: result.scenario, result: result.result };
  }
  throw new Error(`no look criterion ${id} in ${evidenceDir}`);
}

// `record`: a criterion judged by hand (an entry without scripts), written into an evidence
// directory as `<sub-feature>.<entry slug>/result.json` and the run summary, judged like a script's
// result: criteria of that sub-feature and entry not recorded yet keep it UNVERIFIED. A look
// criterion a script already captured in this directory is recorded as by `look`.
export function recordHand({ config, evidenceDir, id, verdict, why, file }) {
  if (!['pass', 'fail', 'confirm'].includes(verdict)) throw new Error('verdict is pass, fail or confirm');
  if (!why) throw new Error('--why says what was observed');
  let found;
  for (const mapFile of listMaps(config).linked.keys()) {
    if (!existsSync(mapFile)) continue;
    const map = parseMap(mapFile, config);
    const criterion = map.criteria.find((c) => c.id === id);
    if (criterion) found = { map, criterion };
  }
  if (!found) throw new Error(`no criterion ${id} in the maps`);
  const { map, criterion } = found;
  const slug = config.entryList.find((e) => e.name === criterion.entry).slug;
  const scenario = `${criterion.subfeature}.${slug}`;
  const dir = path.join(evidenceDir, scenario);
  const resultFile = path.join(dir, 'result.json');
  const existing = existsSync(resultFile) ? JSON.parse(readFileSync(resultFile, 'utf8')) : null;
  if (existing && !existing.hand) {
    if (criterion.look && verdict !== 'confirm') return recordLook({ evidenceDir, id, verdict, why });
    throw new Error(`${scenario} was run by a script in ${evidenceDir}; record hand results in another directory`);
  }
  if (file && !existsSync(file)) throw new Error(`${file} does not exist`);
  mkdirSync(dir, { recursive: true });
  const version = runVersion(config);
  const result = existing ?? {
    scenario,
    id: criterion.subfeature,
    entry: criterion.entry,
    hand: true,
    version,
    expected: criteriaOf(map, criterion.subfeature, criterion.entry),
    preconditions: [],
    criteria: [],
    unreadable: [],
    notes: [],
  };
  result.criteria = result.criteria.filter((c) => c.id !== id);
  result.criteria.push({
    id,
    ok: verdict !== 'fail',
    confirm: verdict === 'confirm',
    detail: why,
    recordedAt: new Date().toISOString(),
    ...(file ? { file: path.resolve(file) } : {}),
  });
  result.missing = result.expected.filter((cid) => !result.criteria.some((c) => c.id === cid));
  result.result = judge(result);
  result.note = noteOf(result);
  writeFileSync(resultFile, `${JSON.stringify(result, null, 2)}\n`);
  updateSummary(evidenceDir, result, version);
  return { ok: true, scenario, result: result.result, missing: result.missing };
}

export function defaultEvidenceDir(config) {
  const root = config.runsRoot ? path.resolve(config.root, config.runsRoot) : path.join(os.tmpdir(), `verify-${path.basename(config.root)}`);
  return path.join(root, `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
}

// `run --detach`: the same run in a background process; `wait` blocks inside the command until it ends.
export function detach({ cliPath, args, evidenceDir }) {
  mkdirSync(evidenceDir, { recursive: true });
  const out = openSync(path.join(evidenceDir, 'run.out'), 'a');
  const child = spawn(process.execPath, [cliPath, ...args], { detached: true, stdio: ['ignore', out, out] });
  child.unref();
  writeFileSync(path.join(evidenceDir, 'run.pid'), `${child.pid}\n`);
  return { ok: true, detached: true, pid: child.pid, evidenceDir };
}

const running = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// Blocks until the run writes its summary; a detached run whose process ended without one is
// reported with the end of its output instead of being waited for until the timeout.
export async function waitRun(evidenceDir, timeoutSeconds = 1800) {
  const file = path.join(evidenceDir, 'run-summary.json');
  const pidFile = path.join(evidenceDir, 'run.pid');
  const end = Date.now() + timeoutSeconds * 1000;
  while (!existsSync(file)) {
    const pid = existsSync(pidFile) ? Number(readFileSync(pidFile, 'utf8')) : null;
    if (pid && !running(pid) && !existsSync(file)) {
      const out = path.join(evidenceDir, 'run.out');
      const tail = existsSync(out) ? readFileSync(out, 'utf8').slice(-2000) : '';
      return { ok: false, error: `the run (pid ${pid}) ended without run-summary.json`, output: tail, evidenceDir };
    }
    if (Date.now() > end) return { ok: false, error: `no run-summary.json after ${timeoutSeconds}s`, evidenceDir };
    await sleep(1000);
  }
  return { evidenceDir, ...JSON.parse(readFileSync(file, 'utf8')) };
}
