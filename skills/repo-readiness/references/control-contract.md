# Entry adapters and isolation

Read this when writing an entry adapter (`scripts/entries/<slug>.mjs`) or deciding how an instance is isolated.

## The adapter contract

The runner and `verify.mjs up/doctor/do/down` call five exports. `ctx` carries `runId`, `runDir` (this scenario's evidence directory), `launch` (the script's launch options merged with `run --launch`), `options` (the entry's `options` in `verify.config.json`) and `root` (repository root).

| Export | Returns | Must |
|---|---|---|
| `up(ctx)` | an instance object (JSON-serializable: pids, ports, paths) | start a new instance in its own data directory and port, wait until input is accepted, throw with the log path when it is not ready in time, and stop what it started before throwing |
| `doctor(instance, ctx)` | `{ ok, checks: [{ name, ok, fix }] }` | read back what was set: the process is alive, health answers with this `runId`, the build is not older than its sources, the effective config matches the launch options, credentials are present |
| `down(instance, ctx)` | `{ ok, kept: [paths], invalid? }` | stop only the recorded pids or process group, keep logs and evidence, delete the data directory unless `ctx.keepData`, be safe to call twice; `invalid` names what voids the run (lost login, sandbox breach, a log line from `invalidWhen`) |
| `tools(instance, ctx)` | `{ name: async fn }` merged into `t` and callable with `verify.mjs do <name>` | actions as a user or client performs them, and strict reads that go through `ctx.read(what, fn)` |
| `sideEffect(what)` | a reason string or `undefined` | name reads that change state (reading history wakes a queue, reading a list deletes expired items), so the runner refuses them inside waits and windows |
| `capture(instance, name, ctx)` | a file path | save a screenshot or screen dump for a look criterion; only entries with look criteria |

`ok: false` from doctor, or a throw from `up`, makes the scenario UNVERIFIED and runs it once more. `invalid` from `down` does the same.

## Strict reads

Wrap every evidence read in `ctx.read(what, fn)` and use `strictBody(response, what)` from `primitives.mjs` for HTTP. A non-2xx status, a body that is not JSON, a missing required field, a truncated JSONL line or an exited process throws `EvidenceError`: the scenario becomes UNVERIFIED even if the script catches it. An empty state is a successful read that returned empty (`200 []`, an element count of 0). An action failing (a click that did not land) ends the scenario rather than reading as "nothing happened".

## Isolation

Check each row before the first live run. A row that does not apply is written into the verification Skill as "not needed, because …".

| Concern | Do | Why it bit |
|---|---|---|
| Data | a fresh data directory per instance under the run directory; config generated from an allowlist, never by deleting what looks like secrets from a copy | a copied user config leaked credentials and settings into the instance |
| Environment | pass an allowlist of variables; same-user processes can read each other's environment | a test token or the user's API key ends up in the product's agent context |
| Ports | a free port per instance; health echoes the `runId`, so a stale process on the port is detected | a leftover instance answered health and the run drove the wrong process |
| Processes | spawn detached, record the pid or process group, kill only that; never by name | `pkill node` stopped the user's own app and other agents' instances |
| Build | refuse to start, or fail doctor, when the build is older than its sources | runs passed on a build without the change |
| Credentials | one test account or long-lived token per instance; share one only when you must, then coordinate refresh (one refresh before the batch, refresh logged, lost login voids the run) | a refresh invalidated the token every other parallel instance held: 401s mid-run |
| GUI focus | windows that do not steal focus (off-screen, a focus shim, headless) | the user's typing went into the instance |
| Agents inside the product | if the product runs tools or commands, sandbox the instance at the OS level (container, `sandbox-exec`, read-only mounts); a scanner that voids runs after a breach is the fallback | the product's agent read the parent session's files and wrote to `/tmp`; scanning only saw it after the fact |
| External systems | a fault or reply proxy at the integration boundary, recorded in the result; never a test-only endpoint inside the product | a test endpoint passed while the real path was broken |

## Recipes by kind of entry

**HTTP service or worker.** Start from `entries/http-service.mjs`: `command`, `health`, `inheritEnv`, `env`, `readySeconds`, `invalidWhen`, `sideEffectReads`. The app reads `PORT`, `DATA_DIR`, `RUN_ID`; add a health route that echoes `RUN_ID` if there is none (a test-only route is fine for health, not for behavior).

**CLI.** No long-lived instance: `up` creates the data directory and environment, `tools.cli(args, { input })` spawns the binary with them and returns `{ code, stdout, stderr }`, `down` deletes the data directory. Reads are files under the data directory or the CLI's own read commands.

**TUI.** Spawn in a pseudo-terminal (`node-pty`) and render with a headless terminal (`@xterm/headless`) so `screen()` returns what a user sees, scrollback included. Ready means the first keystroke is accepted, not that the status line appeared (a TUI that shows "ready" while still starting its server drops Enter). Tools: `type`, `paste`, `keys`, `screen`, `waitText`; `capture` writes the screen text. A process that exited is unreadable, not a blank screen.

**Web app or desktop app.** Playwright: `chromium.launch()` against the dev server, or `_electron.launch()` with a fresh user-data directory. Locate by testid or role and name; keep UI text in both languages if the app ships two. Close first-run dialogs and late pop-ups before each action (`page.addLocatorHandler`), and make a dialog that will not close end the scenario as UNVERIFIED. `count` returning 0 is a successful read. `capture` takes a screenshot. Measure how many instances the machine holds before setting `max` (8 GB of swap at six Electron instances was the ceiling on one 24 GB machine).

**Mobile.** If there is no driver, name the entry in maps and put its sub-features under Not covered; do not stand in another entry.

## Parallel limits

`jobs` caps instances at once; an entry's `max` caps that entry. Measure before raising them: run one map at jobs 2, 4, 8 and compare results and wall time; stop at the first setting where results change, 401s or timeouts appear, or the machine becomes unusable. Write the measured numbers and the run that measured them next to the setting.
