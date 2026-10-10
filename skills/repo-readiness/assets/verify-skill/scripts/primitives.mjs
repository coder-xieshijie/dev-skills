// Judging primitives for scenario scripts: the operations a script must not write itself, because a
// weak copy of them is how a run passes on evidence that does not prove the criterion.
//   reading  - strict: a failed read, a non-2xx status or a body that is not what was asked for
//              raises EvidenceError (UNVERIFIED); it is never read as "nothing happened";
//   waiting  - until a value reaches what is wanted, failing on a terminal value or the timeout;
//   holding  - a value staying as wanted for a window, or a plain observation window.
// While a wait, hold or observation window is open, a read the entry adapter marks as having a side
// effect is refused with WindowError: such a read could make the very state the window observes.
// Each pure function here has a counterexample test that must not pass (test/primitives.test.mjs).

import { AsyncLocalStorage } from 'node:async_hooks';

// The scenario a primitive runs for (the runner sets it around each script): every EvidenceError and
// WindowError is reported when raised, so a script that catches one still ends UNVERIFIED.
export const scenarioScope = new AsyncLocalStorage();
const report = (error) => scenarioScope.getStore()?.(error);

export class EvidenceError extends Error {
  constructor(message) {
    super(`evidence unreadable: ${message}`);
    this.name = 'EvidenceError';
    report(this);
  }
}

export class WindowError extends Error {
  constructor(message) {
    super(`read with a side effect inside an observation window: ${message}`);
    this.name = 'WindowError';
    report(this);
  }
}

const is2xx = (status) => typeof status === 'number' && status >= 200 && status < 300;

// The body of an HTTP-like response `{ status, body }`, or EvidenceError.
export function strictBody(response, what) {
  if (!response || !is2xx(response.status))
    throw new EvidenceError(
      `${what} returned ${response?.status ? `HTTP ${response.status}` : (response?.error ?? 'no response')}`,
    );
  if (response.body === undefined || response.body === null)
    throw new EvidenceError(`${what} returned no body`);
  return response.body;
}

// A field of a value by dotted path: pick({ a: { b: 1 } }, 'a.b') === 1.
export function pick(value, field) {
  return String(field)
    .split('.')
    .reduce((current, key) => (current === undefined || current === null ? undefined : current[key]), value);
}

// Items at or after a boundary time (ISO string or ms), by `time` / `at` / `ts`.
export function timeOf(item) {
  const raw = item?.time ?? item?.at ?? item?.ts;
  const ms = typeof raw === 'number' ? raw : Date.parse(raw);
  if (!Number.isFinite(ms)) throw new EvidenceError(`item has no readable time: ${JSON.stringify(item)}`);
  return ms;
}
const msOf = (boundary) => (typeof boundary === 'number' ? boundary : Date.parse(boundary));
export const after = (items, boundary) => items.filter((item) => timeOf(item) >= msOf(boundary));
export const before = (items, boundary) => items.filter((item) => timeOf(item) < msOf(boundary));
export const between = (items, from, to) =>
  items.filter((item) => timeOf(item) >= msOf(from) && timeOf(item) < msOf(to));

// Outcome of a wait from its polled values: the first wanted value wins; a terminal value that is
// not wanted ends it early; otherwise it timed out.
export function waitOutcome(polled, { wanted, terminal = () => false }) {
  for (const value of polled) {
    if (wanted(value)) return { ok: true, value };
    if (terminal(value)) return { ok: false, value, why: `reached ${JSON.stringify(value)} instead` };
  }
  return { ok: false, value: polled.at(-1), why: 'timed out' };
}

// Outcome of a hold: every polled value is wanted, and there was at least one.
export function holdOutcome(polled, { wanted }) {
  if (polled.length === 0) return { ok: false, why: 'nothing was observed' };
  const bad = polled.find((value) => !wanted(value));
  return bad === undefined
    ? { ok: true, value: polled.at(-1) }
    : { ok: false, value: bad, why: `left the wanted state: ${JSON.stringify(bad)}` };
}

const asPredicate = (wanted) => (typeof wanted === 'function' ? wanted : (value) => value === wanted);

// The waiting primitives over a read function. `sleep` is injected so tests run without real time.
export function waitersFor({ sleep, now = () => Date.now(), window }) {
  async function poll(read, { seconds, interval, stopWhen }) {
    const polled = [];
    const end = now() + seconds * 1000;
    window.open();
    try {
      for (;;) {
        const value = await read();
        polled.push(value);
        if (stopWhen?.(value) || now() >= end) return polled;
        await sleep(interval * 1000);
      }
    } finally {
      window.close();
    }
  }
  return {
    // Until read() gives a wanted value. `terminal`: values that end the wait as not ok.
    async until(read, wanted, { timeout = 60, interval = 1, terminal } = {}) {
      const isWanted = asPredicate(wanted);
      const isTerminal = terminal ? asPredicate(terminal) : () => false;
      const polled = await poll(read, {
        seconds: timeout,
        interval,
        stopWhen: (value) => isWanted(value) || isTerminal(value),
      });
      return waitOutcome(polled, { wanted: isWanted, terminal: isTerminal });
    },
    // read() keeps giving a wanted value for `seconds`.
    async hold(read, wanted, seconds, { interval = 1 } = {}) {
      const isWanted = asPredicate(wanted);
      const polled = await poll(read, { seconds, interval, stopWhen: (value) => !isWanted(value) });
      return holdOutcome(polled, { wanted: isWanted });
    },
    // A plain observation window: nothing is read, side-effect reads are refused meanwhile.
    async observe(seconds) {
      window.open();
      try {
        await sleep(seconds * 1000);
      } finally {
        window.close();
      }
    },
  };
}

// The window state a runner shares between the waiters and the adapter's reads.
export function observationWindow() {
  let depth = 0;
  return {
    open: () => {
      depth += 1;
    },
    close: () => {
      depth = Math.max(0, depth - 1);
    },
    get isOpen() {
      return depth > 0;
    },
  };
}

// Wraps an adapter read: refuses side-effect reads inside a window, and turns failures into
// EvidenceError so they can never be read as an empty state.
export function strictReader({ window, sideEffect = () => undefined }) {
  return async function read(what, fn) {
    const effect = sideEffect(what);
    if (effect && window.isOpen) throw new WindowError(`${what} (${effect})`);
    try {
      return await fn();
    } catch (error) {
      if (error instanceof EvidenceError || error instanceof WindowError) throw error;
      throw new EvidenceError(`${what}: ${error.message}`);
    }
  };
}
