// The adapter contract on this repository's own entries (verify.config.json next to scripts/): every
// entry's adapter starts, proves and stops its instances as contract.mjs checks. An entry whose
// `contract.skip` gives a reason is skipped with it. VERIFY_CONTRACT_ENTRIES=<slug>,<slug> runs only
// those. In the kit's own unfilled template (`kit` still holds a <placeholder>) there is nothing to run.

import assert from 'node:assert/strict';
import test from 'node:test';

import { SKILL_DIR, loadConfig } from '../config.mjs';
import { checkContract } from '../contract.mjs';

const config = loadConfig({ skillDir: SKILL_DIR });
const template = /<[^>]*>/.test(config.kit ?? '') && 'verify.config.json is the kit template: fill it for this repository';
const only = process.env.VERIFY_CONTRACT_ENTRIES?.split(',').map((name) => name.trim());

for (const entry of config.entryList.filter((item) => !only || only.includes(item.slug))) {
  const skip = template || entry.contract?.skip;
  test(`adapter contract: ${entry.slug}`, { skip, timeout: 300_000 }, async (t) => {
    const result = await checkContract({ config, slug: entry.slug });
    for (const check of result.checks.filter((item) => item.skipped)) t.diagnostic(`not exercised: ${check.name} (${check.skipped})`);
    const failed = result.checks.filter((item) => !item.skipped && !item.ok);
    assert.deepEqual(failed, [], `evidence in ${result.runDir}`);
  });
}
