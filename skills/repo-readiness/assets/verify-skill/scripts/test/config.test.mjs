import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { SKILL_DIR, loadConfig } from '../config.mjs';

// This repository's own verify.config.json: every entry names an adapter that exists and exports
// the contract, so `up` and `run` can load it.
test('every entry in verify.config.json names an adapter that loads', async () => {
  const config = loadConfig({ skillDir: SKILL_DIR, root: SKILL_DIR });
  for (const entry of config.entryList) {
    const file = path.resolve(config.skillDir, entry.adapter ?? `scripts/entries/${entry.slug}.mjs`);
    assert.ok(existsSync(file), `${entry.slug}: ${file} does not exist`);
    const adapter = await import(pathToFileURL(file).href);
    for (const name of ['up', 'doctor', 'down', 'tools'])
      assert.equal(typeof adapter[name], 'function', `${entry.slug}: ${file} does not export ${name}()`);
  }
});
