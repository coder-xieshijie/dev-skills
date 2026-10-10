// The contract checker's own tests: a stand-in adapter that keeps the contract passes, and each fault
// in fixture/proc-entry.mjs fails the one check meant to catch it.

import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkContract } from '../contract.mjs';
import { makeRepo } from './helpers.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(here, 'fixture', 'proc-entry.mjs');

async function contractOf({ faults = [], contract = { read: ['value'], leaves: ['spawn'] }, adapter = ENTRY } = {}) {
  const repo = makeRepo({ config: { entries: { proc: { name: 'Proc', adapter, options: { faults }, contract } } } });
  const result = await checkContract({ config: repo.config, slug: 'proc' });
  return { result, failed: result.checks.filter((check) => !check.skipped && !check.ok).map((check) => check.name) };
}

test('an adapter that keeps the contract passes every check', async () => {
  const { result, failed } = await contractOf();
  assert.deepEqual(failed, []);
  assert.equal(result.ok, true);
  assert.deepEqual(result.checks.filter((check) => check.skipped), []);
});

const caught = {
  'no-identity': "doctor is not ok when another instance answers on the instance's port",
  'doctor-constant': 'doctor is not ok on a stopped instance',
  'kill-by-name': 'down stops only its own instance: the other instance and an unrelated process keep running',
  'keep-data': 'down removes the data directory',
  'no-kept': 'down keeps evidence: kept names real paths that exist outside the data directory',
  'twice-throws': 'a second down is ok',
  'leave-children': 'nothing of the instance is left running after down',
  'real-home': 'HOME is inside the data directory',
  'leak-env': "a variable in the caller's environment does not reach the instance's processes",
  'symlink-paths': 'every path in the instance is a real path',
  'read-bypass': 'do value goes through ctx.read',
  'not-serializable': 'the instance is JSON-serializable',
};

for (const [fault, check] of Object.entries(caught))
  test(`counterexample ${fault}: "${check}" fails`, async () => {
    const { result, failed } = await contractOf({ faults: [fault] });
    assert.equal(result.ok, false);
    assert.ok(failed.includes(check), JSON.stringify(failed));
  });

test('HOME inherited on purpose passes only with a reason', async () => {
  const declared = await contractOf({ faults: ['real-home'], contract: { read: ['value'], leaves: ['spawn'], inherits: { HOME: 'the product reads ~/.ssh' } } });
  assert.deepEqual(declared.failed, []);
  assert.ok(declared.result.checks.some((check) => check.skipped?.startsWith('inherited on purpose')));
  const bare = await contractOf({ faults: ['real-home'], contract: { read: ['value'], inherits: { HOME: '' } } });
  assert.ok(bare.failed.includes('HOME is inside the data directory'));
});

test('a missing read, a missing doctor check, a broken adapter and a skipped entry', async () => {
  assert.ok((await contractOf({ contract: {} })).failed.includes('do <a read> goes through ctx.read'));
  const named = await contractOf({ contract: { read: ['value'], doctorChecks: ['effective config matches'] } });
  assert.deepEqual(named.failed, ['doctor checks "effective config matches"']);
  const broken = await contractOf({ adapter: path.join(here, 'helpers.mjs') });
  assert.deepEqual(broken.failed, ['exports up, doctor, down and tools as functions (sideEffect and capture too, when exported)']);
  const skipped = await contractOf({ contract: { skip: 'needs a display' } });
  assert.deepEqual(skipped.result, { ok: true, entry: 'proc', skipped: 'needs a display', checks: [] });
});
