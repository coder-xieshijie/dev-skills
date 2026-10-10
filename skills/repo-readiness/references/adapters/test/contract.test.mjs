// The kit's adapter contract (assets/verify-skill/scripts/contract.mjs) on each example adapter here,
// configured the way a repository would configure it, with the toy products in fixture/.

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkContract } from '../../../assets/verify-skill/scripts/contract.mjs';
import { makeRepo } from '../../../assets/verify-skill/scripts/test/helpers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const toyApp = path.join(here, 'fixture', 'toy-app.mjs');
const toyCli = path.join(here, 'fixture', 'toy-cli.mjs');

const ENTRIES = {
  http: {
    name: 'HTTP',
    adapter: path.join(here, '..', 'http-service.mjs'),
    options: { command: ['node', toyApp] },
    contract: { read: ['read', '/notes'], doctorChecks: ["health proves it is this run's instance"] },
  },
  'http-token': {
    name: 'HTTP with a token',
    adapter: path.join(here, '..', 'http-service.mjs'),
    options: {
      command: ['node', toyApp, '--port', '{port}', '--data', '{dataDir}', '--token', '{token}'],
      headers: { authorization: 'Bearer {token}' },
      identity: { field: 'pid', equals: '{pid}' },
    },
    contract: { read: ['read', '/notes'], doctorChecks: ["a request without this run's token is refused"] },
  },
  cli: {
    name: 'CLI',
    adapter: path.join(here, '..', 'cli.mjs'),
    options: {
      command: ['node', toyCli],
      pidRecords: [{ dir: '{home}/.toy-cli/workers', fields: ['worker.pid'] }],
      keep: ['home/.toy-cli'],
      probe: { args: ['list'], code: 0, stdout: '"notes"' },
    },
    contract: { read: ['query', ['list']], leaves: ['cli', ['serve']] },
  },
};

for (const slug of Object.keys(ENTRIES))
  test(`the ${slug} example keeps the adapter contract`, { timeout: 120_000 }, async (t) => {
    const repo = makeRepo({ config: { entries: { [slug]: ENTRIES[slug] } } });
    const result = await checkContract({ config: repo.config, slug });
    for (const check of result.checks.filter((item) => item.skipped)) t.diagnostic(`not exercised: ${check.name} (${check.skipped})`);
    assert.deepEqual(result.checks.filter((item) => !item.skipped && !item.ok), []);
  });
