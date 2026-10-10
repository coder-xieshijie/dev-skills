// A stand-in entry adapter for the runner's and check's own tests: a notes "app" kept in a file in
// the instance's data directory, so the tests need no process and keep passing when a repository
// deletes a kit adapter it does not use. The real adapters have their own tests.
// launch.env: BUG=1 answers 201 without storing the note (the counterexample a scenario must catch);
// LOGIN_LOST=<marker file> voids the first instance's run and not later ones.
// launch: { failUp: true } makes up throw; { failTools: true } makes tools() throw; { failDown: true }
// makes down report a process it could not stop.

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { EvidenceError } from '../../primitives.mjs';

export async function up({ runId, runDir, launch = {}, root }) {
  if (launch.failUp) throw new Error('failUp was set');
  const dataDir = path.join(runDir, 'data');
  mkdirSync(dataDir, { recursive: true });
  const logFile = path.join(runDir, 'app.log');
  appendFileSync(logFile, `started ${runId}\n`);
  const marker = launch.env?.LOGIN_LOST;
  if (marker && !existsSync(marker)) {
    writeFileSync(marker, '1');
    appendFileSync(logFile, 'LOGIN LOST\n');
  }
  writeFileSync(path.join(dataDir, 'notes.json'), '[]');
  return { dataDir, logFile, runDir, root, bug: launch.env?.BUG === '1', failTools: Boolean(launch.failTools), failDown: Boolean(launch.failDown) };
}

export async function doctor(instance) {
  const checks = [{ name: 'data directory exists', ok: existsSync(instance.dataDir), fix: 'up again' }];
  return { ok: checks.every((check) => check.ok), checks };
}

export async function down(instance, { options = {}, keepData = false } = {}) {
  if (instance.failDown) return { ok: false, kept: [instance.logFile], left: ['a stand-in process'] };
  if (!keepData) rmSync(instance.dataDir, { recursive: true, force: true });
  const log = existsSync(instance.logFile) ? readFileSync(instance.logFile, 'utf8') : '';
  const hit = options.invalidWhen && new RegExp(options.invalidWhen, 'm').exec(log);
  return { ok: true, kept: [instance.logFile], ...(hit ? { invalid: `app log: ${hit[0]}` } : {}) };
}

export function sideEffect(what) {
  return what.endsWith('(side effect)') ? 'listed in options.sideEffectReads' : undefined;
}

export function tools(instance, { read, options = {} }) {
  if (instance.failTools) throw new Error('failTools was set');
  const file = path.join(instance.dataDir, 'notes.json');
  const effects = (options.sideEffectReads ?? []).map((pattern) => new RegExp(pattern));
  return {
    async api(method, apiPath, body) {
      if (method === 'POST' && apiPath === '/notes') {
        if (!body?.title) return { status: 400, body: { error: 'title_required' } };
        const id = `n${Date.now()}`;
        if (!instance.bug) writeFileSync(file, JSON.stringify([...JSON.parse(readFileSync(file, 'utf8')), { id, title: body.title }]));
        return { status: 201, body: { id } };
      }
      return { status: 404, body: { error: 'not_found' } };
    },
    async read(apiPath) {
      const effect = effects.some((pattern) => pattern.test(apiPath));
      return read(effect ? `GET ${apiPath} (side effect)` : `GET ${apiPath}`, async () => {
        if (apiPath !== '/notes') throw new EvidenceError(`GET ${apiPath} returned HTTP 404`);
        return { notes: JSON.parse(readFileSync(file, 'utf8')) };
      });
    },
    async echo(...args) {
      return args;
    },
  };
}
