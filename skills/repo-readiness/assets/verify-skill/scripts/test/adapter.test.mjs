import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { down, up } from '../entries/http-service.mjs';

const toy = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixture', 'toy-app.mjs');

test('http-service: only allowlisted variables of the caller reach the instance', async () => {
  process.env.VERIFY_KIT_SECRET = 'user api key';
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'verify-kit-adapter-'));
  const options = { command: ['node', toy], env: { GIVEN: 'by config' } };
  const instance = await up({ runId: 'env-test', runDir, launch: { env: { LAUNCHED: 'by launch' } }, options, root: runDir });
  try {
    const value = async (name) => (await (await fetch(`${instance.url}/env/${name}`)).json()).value;
    assert.equal(await value('VERIFY_KIT_SECRET'), null);
    assert.equal(await value('PATH'), process.env.PATH);
    assert.equal(await value('GIVEN'), 'by config');
    assert.equal(await value('LAUNCHED'), 'by launch');
  } finally {
    delete process.env.VERIFY_KIT_SECRET;
    await down(instance, { options });
  }
});
