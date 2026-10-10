import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EvidenceError,
  WindowError,
  after,
  holdOutcome,
  observationWindow,
  pick,
  strictBody,
  strictReader,
  waitOutcome,
  waitersFor,
} from '../primitives.mjs';

test('strictBody: a non-2xx status or a missing body is unreadable, never empty', () => {
  assert.deepEqual(strictBody({ status: 200, body: { notes: [] } }, 'list'), { notes: [] });
  assert.throws(() => strictBody({ status: 404, body: { notes: [] } }, 'list'), EvidenceError);
  assert.throws(() => strictBody({ status: 0, error: 'ECONNREFUSED' }, 'list'), EvidenceError);
  assert.throws(() => strictBody({ status: 204 }, 'list'), EvidenceError);
});

test('waitOutcome: a terminal value that is not wanted ends the wait as not ok', () => {
  const wanted = (v) => v === 'done';
  const terminal = (v) => v === 'failed';
  assert.equal(waitOutcome(['running', 'done'], { wanted, terminal }).ok, true);
  // Counterexample: "failed" first, "done" later must not pass.
  assert.equal(waitOutcome(['running', 'failed', 'done'], { wanted, terminal }).ok, false);
  assert.equal(waitOutcome(['running'], { wanted, terminal }).why, 'timed out');
});

test('holdOutcome: one bad value fails the hold; nothing observed is not a pass', () => {
  const wanted = (v) => v === 0;
  assert.equal(holdOutcome([0, 0, 0], { wanted }).ok, true);
  assert.equal(holdOutcome([0, 1, 0], { wanted }).ok, false);
  assert.equal(holdOutcome([], { wanted }).ok, false);
});

test('after: an item without a readable time is unreadable, not filtered out', () => {
  const items = [{ at: '2026-10-10T00:00:01Z' }, { at: '2026-10-10T00:00:03Z' }];
  assert.equal(after(items, '2026-10-10T00:00:02Z').length, 1);
  assert.throws(() => after([{ at: 'soon' }], '2026-10-10T00:00:02Z'), EvidenceError);
});

test('pick reads dotted paths', () => {
  assert.equal(pick({ a: { b: { c: 3 } } }, 'a.b.c'), 3);
  assert.equal(pick({ a: null }, 'a.b'), undefined);
});

test('strictReader refuses a side-effect read inside a window and allows it outside', async () => {
  const window = observationWindow();
  const read = strictReader({ window, sideEffect: (what) => (what === 'queue' ? 'clears the pause' : undefined) });
  assert.equal(await read('queue', async () => 1), 1);
  window.open();
  await assert.rejects(read('queue', async () => 1), WindowError);
  assert.equal(await read('status', async () => 2), 2);
  window.close();
});

test('strictReader turns a thrown read into unreadable evidence', async () => {
  const read = strictReader({ window: observationWindow() });
  await assert.rejects(read('list', async () => { throw new Error('socket hang up'); }), EvidenceError);
});

test('until stops at the first wanted value; hold fails as soon as the value leaves', async () => {
  let clock = 0;
  const waiters = waitersFor({ sleep: async (ms) => { clock += ms; }, now: () => clock, window: observationWindow() });
  const values = ['a', 'b', 'c'];
  let i = 0;
  const reached = await waiters.until(async () => values[i++], 'b', { timeout: 10, interval: 1 });
  assert.deepEqual(reached, { ok: true, value: 'b' });
  let n = 0;
  const held = await waiters.hold(async () => (n++ < 2 ? 0 : 1), 0, 10, { interval: 1 });
  assert.equal(held.ok, false);
});
