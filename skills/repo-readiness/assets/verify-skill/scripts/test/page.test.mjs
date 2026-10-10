import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { EvidenceError } from '../primitives.mjs';
import { loadPlaywright, openPage } from '../page.mjs';
import { SCRIPTS, makeRepo } from './helpers.mjs';

// Runs only where Playwright resolves: from the repository (as `verify.mjs page` uses it), or from
// VERIFY_KIT_PLAYWRIGHT_ROOT, a directory whose node_modules has it.
const root = process.env.VERIFY_KIT_PLAYWRIGHT_ROOT ?? path.resolve(SCRIPTS, '..');
let skip = false;
try {
  createRequire(path.join(root, 'package.json')).resolve('playwright');
} catch {
  skip = 'Playwright is not installed here; set VERIFY_KIT_PLAYWRIGHT_ROOT to run this test';
}

// A page whose text changes a moment after load (what a live view does), behind a token header.
function serve() {
  const server = http.createServer((req, res) => {
    if (req.headers.authorization !== 'Bearer t0k') {
      res.writeHead(401);
      return res.end('no');
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    return res.end(`<!doctype html><body><h1>Tasks</h1><p id="s">running</p>
<script>setTimeout(() => { document.getElementById('s').textContent = 'done'; }, 800);</script></body>`);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('page: waits for text that appears later, saves text and a screenshot', { skip }, async () => {
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'verify-kit-page-'));
  const headers = { authorization: 'Bearer t0k' };
  try {
    const seen = await openPage({ url, root, outDir, name: 'live', waitText: 'done', timeout: 10, headers });
    assert.equal(seen.ok, true);
    assert.match(seen.text, /Tasks\s+done/);
    assert.equal(readFileSync(seen.textFile, 'utf8'), seen.text);
    assert.equal(existsSync(seen.screenshot), true);
    // Counterexample: text that never appears is not ok, and says so.
    const missing = await openPage({ url, root, outDir, name: 'missing', waitText: 'failed', timeout: 2, headers });
    assert.equal(missing.ok, false);
    assert.match(missing.why, /"failed" did not appear within 2s/);
    // A page that does not load is unreadable, never an empty page.
    await assert.rejects(openPage({ url, root, outDir, name: 'denied' }), EvidenceError);
  } finally {
    server.close();
  }
});

test('page: a repository without Playwright gets a message that says what to do', async () => {
  const empty = mkdtempSync(path.join(os.tmpdir(), 'verify-kit-nopw-'));
  // Resolution also walks up from the directory; skip where a parent has Playwright.
  const found = ['playwright', 'playwright-core'].some((name) => {
    try {
      return Boolean(createRequire(path.join(empty, 'package.json')).resolve(name));
    } catch {
      return false;
    }
  });
  if (found) return;
  await assert.rejects(loadPlaywright(empty), /Playwright is not installed in .*host's browser tool/);
});

const httpAdapter = path.join(SCRIPTS, 'entries', 'http-service.mjs');
test('verify.mjs page drives a hand instance and record files the verdict with its capture', { skip: skip || (!existsSync(httpAdapter) && 'entries/http-service.mjs was removed') }, () => {
  const repo = makeRepo();
  // The repository's own Playwright, as a target repository would have it.
  symlinkSync(path.join(root, 'node_modules'), path.join(repo.root, 'node_modules'));
  const api = JSON.parse(readFileSync(path.join(repo.skillDir, 'verify.config.json'), 'utf8'));
  api.entries.web = { name: 'Web', ui: true, adapter: httpAdapter, options: { command: ['node', path.join(SCRIPTS, 'test', 'fixture', 'toy-app.mjs')] } };
  writeFileSync(path.join(repo.skillDir, 'verify.config.json'), JSON.stringify(api));
  const cli = (...args) => {
    try {
      return JSON.parse(execFileSync('node', [path.join(SCRIPTS, 'verify.mjs'), ...args, '--skill-dir', repo.skillDir], { encoding: 'utf8' }));
    } catch (error) {
      return JSON.parse(error.stdout);
    }
  };
  const up = cli('up', '--entry', 'web');
  try {
    assert.equal(cli('do', 'api', '--run', up.runId, '["POST", "/notes", {"title": "beta"}]').value.status, 201);
    const page = cli('page', '--run', up.runId, '/notes', '--text', 'beta', '--name', 'list');
    assert.equal(page.ok, true);
    assert.equal(page.screenshot, path.join(up.runDir, 'list.png'));
    const evidence = path.join(repo.root, 'hand');
    const recorded = cli('record', evidence, 'notes.create#3', 'pass', '--why', 'the list shows beta', '--file', page.screenshot);
    assert.deepEqual(recorded, { ok: true, scenario: 'notes.create.web', result: 'UNVERIFIED', missing: ['notes.create#4'] });
    const result = JSON.parse(readFileSync(path.join(evidence, 'notes.create.web', 'result.json'), 'utf8'));
    assert.equal(result.criteria[0].file, page.screenshot);
  } finally {
    cli('down', '--run', up.runId);
  }
});
