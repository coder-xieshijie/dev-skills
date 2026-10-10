#!/usr/bin/env node
// The verification CLI. Every command prints one JSON object on stdout; `ok: false` exits non-zero.
//   check                                   structural check of the feature maps (CI runs it)
//   contract [--entry <e>]                  run an entry's adapter (default: every entry) against the
//                                           adapter contract; test/contract.test.mjs runs the same
//   run [target...] [--entry <e>] [--jobs N] [--evidence-dir D] [--launch '<json>'] [--detach]
//   wait <evidence dir> [--timeout S]       blocks until a detached run ends, prints its summary
//   look <evidence dir> <criterion id> pass|fail --why "<what the capture shows>"
//   record <evidence dir> <criterion id> pass|fail|confirm --why "<what was observed>" [--file <capture>]
//                                           a criterion judged by hand, into that directory's summary
//   up --entry <e> [--launch '<json>']      start an instance by hand (for entries driven by hand)
//   doctor [--run <id>]                     is this instance worth driving?
//   do <tool> [--run <id>] ['<json args>']  call one of the entry adapter's tools on the instance;
//                                           {field} in a string argument is that field of the instance
//   down [--run <id>] [--keep-data]         stop what this run started; keeps the evidence
//   list                                    instances started by hand on this machine, by every session:
//                                           pass --run <runId> from your own up to doctor, do and down
//   --skill-dir <dir>                       any command: the verification Skill to use (default: above this script)
//   --help                                  this list

import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { entryByName, loadConfig } from './config.mjs';
import { checkContract } from './contract.mjs';
import { checkMaps } from './map-check.mjs';
import { defaultEvidenceDir, detach, loadAdapter, recordHand, recordLook, runScenarios, waitRun } from './runner.mjs';

const HELP = readFileSync(fileURLToPath(import.meta.url), 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('//   '))
  .map((line) => line.slice(5));

function parse(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) positional.push(arg);
    else if (['--detach', '--keep-data', '--help'].includes(arg)) flags[arg.slice(2)] = true;
    else flags[arg.slice(2)] = argv[(i += 1)];
  }
  return { positional, flags };
}

const json = (value) => (value === undefined ? undefined : JSON.parse(value));

// {field} in strings (deeply) becomes that field of the instance when it is a string or a number.
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

// What `up` prints: the instance without its environment (that stays in the record file).
const shown = ({ env, ...instance }) => instance;

function runsRootOf(config) {
  const root = config.runsRoot
    ? path.resolve(config.root, config.runsRoot)
    : path.join(os.tmpdir(), `verify-${path.basename(config.root)}`);
  mkdirSync(path.join(root, 'instances'), { recursive: true });
  return path.join(root, 'instances');
}

function records(config) {
  const dir = runsRootOf(config);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(path.join(dir, file), 'utf8')))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function target(config, runId) {
  const all = records(config);
  if (runId) {
    const found = all.find((record) => record.runId === runId);
    if (!found) throw new Error(`no instance ${runId}; run list`);
    return found;
  }
  const live = all.filter((record) => !record.stoppedAt);
  if (live.length === 0) throw new Error('no live instance; run up --entry <entry>');
  if (live.length > 1) throw new Error(`${live.length} live instances: pass --run <runId> (see list)`);
  return live[0];
}

const save = (config, record) =>
  writeFileSync(path.join(runsRootOf(config), `${record.runId}.json`), `${JSON.stringify(record, null, 2)}\n`);

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parse(rest);
  if (!command || ['--help', '-h', 'help'].includes(command) || flags.help) return { ok: true, usage: HELP };
  const config = loadConfig({ skillDir: flags['skill-dir'] ? path.resolve(flags['skill-dir']) : undefined });

  if (command === 'check') return checkMaps(config);

  if (command === 'contract') {
    const entries = flags.entry ? [entryByName(config, flags.entry)] : config.entryList;
    if (entries.includes(undefined)) throw new Error(`no entry ${flags.entry} in verify.config.json`);
    const results = [];
    for (const entry of entries) results.push(await checkContract({ config, slug: entry.slug }));
    return { ok: results.every((item) => item.ok), entries: results };
  }

  if (command === 'run') {
    const evidenceDir = path.resolve(flags['evidence-dir'] ?? defaultEvidenceDir(config));
    if (flags.detach) {
      const args = process.argv.slice(2).filter((arg) => arg !== '--detach');
      if (!flags['evidence-dir']) args.push('--evidence-dir', evidenceDir);
      return detach({ cliPath: fileURLToPath(import.meta.url), args, evidenceDir });
    }
    const entry = flags.entry && entryByName(config, flags.entry);
    if (flags.entry && !entry) throw new Error(`no entry ${flags.entry} in verify.config.json`);
    return runScenarios({
      config,
      targets: positional,
      entry: entry?.name,
      jobs: flags.jobs ? Number(flags.jobs) : undefined,
      evidenceDir,
      launchOverride: json(flags.launch),
    });
  }

  if (command === 'wait') return waitRun(path.resolve(positional[0]), Number(flags.timeout ?? 1800));

  if (command === 'look') {
    const [dir, id, verdict] = positional;
    return recordLook({ evidenceDir: path.resolve(dir), id, verdict, why: flags.why });
  }

  if (command === 'record') {
    const [dir, id, verdict] = positional;
    if (!dir) throw new Error('record <evidence dir> <criterion id> pass|fail|confirm --why "..."');
    mkdirSync(path.resolve(dir), { recursive: true });
    return recordHand({ config, evidenceDir: realpathSync(path.resolve(dir)), id, verdict, why: flags.why, file: flags.file });
  }

  if (command === 'up') {
    const entry = entryByName(config, flags.entry ?? '');
    if (!entry) throw new Error(`--entry is one of ${config.entryList.map((e) => e.slug).join(', ')}`);
    const { adapter, options } = await loadAdapter(config, entry.slug);
    const runId = `${entry.slug}-${Date.now().toString(36)}`;
    let runDir = path.join(path.dirname(runsRootOf(config)), 'manual', runId);
    mkdirSync(runDir, { recursive: true });
    runDir = realpathSync(runDir);
    const ctx = { runId, runDir, launch: json(flags.launch) ?? {}, options, root: config.root, log: () => {} };
    const instance = await adapter.up(ctx);
    const record = { runId, entry: entry.slug, runDir, launch: ctx.launch, instance, startedAt: new Date().toISOString() };
    save(config, record);
    return { ok: true, runId, runDir, instance: shown(instance) };
  }

  if (['doctor', 'do', 'down'].includes(command)) {
    const record = target(config, flags.run);
    const { adapter, options } = await loadAdapter(config, record.entry);
    const ctx = { runId: record.runId, runDir: record.runDir, launch: record.launch, options, root: config.root, log: () => {} };
    if (command === 'doctor') return { runId: record.runId, ...(await adapter.doctor(record.instance, ctx)) };
    if (command === 'down') {
      if (record.stoppedAt) return { ok: true, runId: record.runId, already: 'stopped', kept: record.kept ?? [] };
      const down = await adapter.down(record.instance, { ...ctx, keepData: flags['keep-data'] });
      Object.assign(record, { stoppedAt: new Date().toISOString(), kept: down.kept ?? [] });
      save(config, record);
      return { runId: record.runId, ...down };
    }
    const [tool, args] = positional;
    const { observationWindow, strictReader } = await import('./primitives.mjs');
    const window = observationWindow();
    const tools = adapter.tools(record.instance, { ...ctx, window, read: strictReader({ window, sideEffect: adapter.sideEffect }) });
    if (typeof tools[tool] !== 'function') throw new Error(`tools: ${Object.keys(tools).join(', ')}`);
    return { ok: true, runId: record.runId, value: await tools[tool](...expandFields(json(args) ?? [], record.instance)) };
  }

  if (command === 'list') return { ok: true, instances: records(config) };
  throw new Error(`unknown command ${command}; --help lists them`);
}

main()
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result?.ok === false) process.exitCode = 1;
  })
  .catch((error) => {
    process.stdout.write(`${JSON.stringify({ ok: false, error: error.message })}\n`);
    process.exitCode = 1;
  });
