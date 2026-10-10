# Example entry adapters

Read these when writing an entry adapter for a repository. They are working examples, not part of the kit: copy one into the repository's `scripts/entries/` (with the `_` files it imports) and change what the product needs, or write your own. Either way, the kit's contract test (`scripts/test/contract.test.mjs`) holds the adapter to [control-contract.md](../control-contract.md).

| File | What it is |
|---|---|
| [http-service.mjs](http-service.mjs) | an app driven over HTTP: one process on a free port, identity proven by health (run ID, spawned pid or a per-run token), `api`, strict `read`, a `page` tool and `capture` for web pages |
| [cli.mjs](cli.mjs) | a command-line program: no long-lived process; `cli`, strict `query`, file reads inside the instance, and `down` that stops what commands left running (process groups and the pids the product records) |
| [_process.mjs](_process.mjs) | shared by both: the instance's directories and environment allowlist (own HOME and TMPDIR), placeholders, free ports, build freshness, and stopping only processes that name the instance's data directory |
| [_page.mjs](_page.mjs) | a page opened in a headless browser with Playwright: visible text and a full-page screenshot |

The header of each adapter documents its options. They import nothing from the kit: evidence errors are plain errors thrown inside `ctx.read`, which turns them into unreadable evidence.

In this repository, `test/` runs the contract test on each example with the toy products in `test/fixture/`, plus tests of the options the contract does not cover. Those tests import the kit from `assets/verify-skill/`, so they run here, not in a copy.
