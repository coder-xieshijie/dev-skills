# Entry adapters and isolation

Read this when writing an entry adapter (`scripts/entries/<slug>.mjs`) or deciding how an instance is isolated. The kit ships no adapter: how a product starts, where it records its workers and how it is driven differ per product, so each entry's adapter is written in the repository. Working examples for an HTTP service, a CLI and web pages are in [adapters/](adapters/README.md); the kit's contract test holds every adapter to the contract below.

## The adapter contract

The runner and `verify.mjs up/doctor/do/down` call these exports. `ctx` carries `runId`, `runDir` (this scenario's evidence directory), `launch` (the script's launch options merged with `run --launch`), `options` (the entry's `options` in `verify.config.json`), `root` (repository root) and, for `tools`, `read` (the strict reader). `runDir` and `root` are real paths: on macOS `/tmp` and `/var` are symlinks and products record real paths, so realpath any other path before comparing it with what the product wrote.

| Export | Returns | Must |
|---|---|---|
| `up(ctx)` | an instance object | start a new instance in its own data directory and port, wait until input is accepted, throw with the log path when it is not ready in time, and stop what it started before throwing. The object is JSON (`verify.mjs` saves it and later commands get it back) and records `dataDir` (inside `runDir`), `pid` when a process outlives `up`, `port` when the instance is reached over one, `url` when it has pages, and `env: { HOME, TMPDIR }` as its processes get them; every path in it is a real path |
| `doctor(instance, ctx)` | `{ ok, checks: [{ name, ok, fix }] }` | read back what was set: the process is alive, health proves this is the run's instance, the build is not older than its sources, the effective config matches the launch options, credentials are present, and each replaced external system is the one the product actually calls. Not ok on a stopped instance |
| `down(instance, ctx)` | `{ ok, kept: [paths], invalid? }` | stop only this instance's processes, including the background processes it left; keep logs and evidence outside the data directory; delete the data directory unless `ctx.keepData`, and only when nothing of the instance is left running; be safe to call twice. `invalid` names what voids the run (lost login, sandbox breach, a log line that says so) |
| `tools(instance, ctx)` | `{ name: async fn }` merged into `t` and callable with `verify.mjs do <name>` | actions as a user or client performs them, and strict reads that go through `ctx.read(what, fn)` |
| `sideEffect(what)` | a reason string or `undefined` | name reads that change state (reading history wakes a queue, reading a list deletes expired items), so the runner refuses them inside waits and windows |
| `capture(instance, name, ctx)` | a file path | save a screenshot or screen dump for a look criterion; only entries with look criteria |

`ok: false` from doctor, or a throw from `up`, makes the scenario UNVERIFIED and runs it once more. `invalid` from `down` does the same. A throw from `tools` makes it UNVERIFIED; the instance is stopped either way.

## The contract test

`scripts/test/contract.test.mjs` runs every entry in `verify.config.json` through `scripts/contract.mjs` (`node $V contract --entry <slug>` runs one and prints each check). It starts two instances side by side and an unrelated process, then checks:

| Rule | How it is checked |
|---|---|
| exports | `up`, `doctor`, `down` and `tools` are functions; `sideEffect` and `capture` too when exported |
| the instance | survives a JSON round trip; `dataDir` exists inside the run directory; every existing path in it is real |
| doctor | `{ ok, checks }` shape, ok on a running instance; not ok on a stopped one; not ok when the instance's port is answered by the other instance (instances with `pid` and `port`); each check `contract.doctorChecks` names is present and ok |
| do a read | the tool and arguments in `contract.read` resolve, through `ctx.read` |
| isolation | the instance's live processes (its `pid` and every process whose command line or environment names its data directory) have HOME and TMPDIR inside the data directory and do not see a variable set in the caller's environment; with no live process, the `env` the instance records. `contract.inherits: { "HOME": "<reason>" }` declares a variable the product must inherit |
| down | ok; nothing of the instance left running (after `contract.leaves`, an action that leaves processes, when given); data directory gone; `kept` non-empty, real and outside it; the other instance (still passing doctor), its processes and the unrelated process keep running; a second `down` is ok; with `keepData` the data directory stays and the instance still stops |

Per entry in `verify.config.json`: `"contract": { "read": ["<tool>", ...args], "leaves": ["<tool>", ...args], "launch": {}, "doctorChecks": ["<check name>"], "inherits": { "HOME": "<reason>" }, "skip": "<reason>" }`. Only `read` is required; `skip` is for an entry this machine or CI cannot start (a desktop app without a display), and the test shows the reason.

What the test cannot see from outside is deterministic too, so it is a doctor check the repository writes and names in `doctorChecks`: the product's effective config matches the launch options, credentials are present, and the product resolves each replaced external system (a call it made through the fake, a path it reports), not only that the replacement exists. Products that leave background processes give `contract.leaves`, so the test proves `down` finds them.

## Strict reads

Wrap every evidence read in `ctx.read(what, fn)`. Anything `fn` throws becomes `EvidenceError`: the scenario becomes UNVERIFIED even if the script catches it. So a non-2xx status, a body that is not JSON, a missing required field, a truncated JSONL line or an exited process throws inside `fn` (`strictBody(response, what)` in `primitives.mjs` does it for an HTTP response). An empty state is a successful read that returned empty (`200 []`, an element count of 0). An action failing (a click that did not land) ends the scenario rather than reading as "nothing happened".

## Isolation

Check each row before the first live run. A row that does not apply is written into the verification Skill as "not needed, because …".

| Concern | Do | Why it bit |
|---|---|---|
| Data | a fresh data directory per instance under the run directory, with HOME and TMPDIR inside it, so any default path the product falls back to (`~/.app`, `$TMPDIR/app`) stays in the instance; config generated from an allowlist, never by deleting what looks like secrets from a copy | a copied user config leaked credentials and settings into the instance; a variable the adapter forgot to set made the product fall back to the user's real `~/.app` |
| Environment | pass an allowlist of variables without HOME or TMPDIR (as the examples do); let the product see the real HOME only when it must, and declare it with the reason in `contract.inherits`; same-user processes can read each other's environment | a test token or the user's API key ends up in the product's agent context; the parent session's base URL reached the product's own model calls |
| Ports | a free port per instance, and health that proves the answer came from this run's process | a leftover instance answered health and the run drove the wrong process |
| Processes | spawn detached and record the pid or process group; when the product leaves background processes (workers, servers it starts), collect their pids from the product's own records; signal a pid only while its command line or environment names this instance's data directory; never by name | `pkill node` stopped the user's own app and other agents' instances; deleting the data directory under a live worker broke the next read |
| Build | refuse to start, or fail doctor, when the build is older than its sources | runs passed on a build without the change |
| Credentials | one test account or long-lived token per instance; share one only when you must, then coordinate refresh (one refresh before the batch, refresh logged, lost login voids the run) | a refresh invalidated the token every other parallel instance held: 401s mid-run |
| GUI focus | windows that do not steal focus (off-screen, a focus shim, headless) | the user's typing went into the instance |
| Agents inside the product | if the product runs tools or commands, sandbox the instance at the OS level (container, `sandbox-exec`, read-only mounts); a scanner that voids runs after a breach is the fallback | the product's agent read the parent session's files and wrote to `/tmp`; scanning only saw it after the fact |
| External systems | a fake, fault or reply proxy at the integration boundary, recorded in the result; never a test-only endpoint inside the product; doctor proves the product resolves the replacement (a call the product made through it, a resolved path it reports), not only that the replacement exists, because the real binary may still be on PATH | a test endpoint passed while the real path was broken; a fake was in place but the product would have found the real program first |

Health proves identity in one of three ways; use the first the product allows without changing it:

- a body field equal to something this run chose and passed in: the run ID, a data directory path;
- the pid this run spawned, echoed by health (the command must be the server itself, not a wrapper such as `npm run`);
- a secret made per run that the product requires on every request: a stale process does not know it and answers 401.

Adding a health route that echoes the run ID is the last resort; a test-only route is fine for health, never for behavior.

## Recipes by kind of entry

Code shared by two adapters goes in `scripts/entries/_<name>.mjs`; files starting with `_` are not adapters. An adapter for an entry built on another (a product CLI on a generic CLI adapter) imports it and wraps what differs: `up` calls the base `up` and then arranges what the product needs (a fake binary, a seeded workspace), `tools` spreads the base tools and adds the product's, `doctor` adds the product's checks.

**HTTP service or worker.** [adapters/http-service.mjs](adapters/http-service.mjs): `command` with placeholders (`{port}`, `{dataDir}`, `{runId}`, `{token}`, `{root}`) so the app takes its port and data directory the way it already does; `identity` and `headers` for the proof above; `builds`, `pidRecords`, `inheritEnv`, `env`, `readySeconds`, `invalidWhen`, `sideEffectReads`. The header of the file documents each option.

**CLI.** [adapters/cli.mjs](adapters/cli.mjs): no long-lived instance. `up` makes the data directory (plus `dirs`) and the environment; `t.cli(args, { input, env })` runs one command and returns `{ code, stdout, stderr, json }`; `t.query(args)` is a strict read through the CLI's own read command; `t.file(name, content)` arranges an input file; `readJson`, `readJsonl`, `readText` and `list` read what the CLI wrote inside the data directory. When a command leaves processes running after it exits, `down` stops children left in the command's process group by itself, and processes that left the group (detached workers, servers) through `pidRecords`: the directories and fields where the product records their pids. Without that record a detached worker is invisible to `down`; if the product records none, find how it tracks them (a pid file, a lock, a state record) before relying on the data directory being gone.

**TUI.** Spawn in a pseudo-terminal (`node-pty`) and render with a headless terminal (`@xterm/headless`) so `screen()` returns what a user sees, scrollback included. Ready means the first keystroke is accepted, not that the status line appeared (a TUI that shows "ready" while still starting its server drops Enter). Tools: `type`, `paste`, `keys`, `screen`, `waitText`; `capture` writes the screen text. A process that exited is unreadable, not a blank screen.

**Web app, driven by hand (L1, L2).** Start the server with its adapter and give the adapter a page tool: the HTTP example's `page` ([adapters/_page.mjs](adapters/_page.mjs), Playwright) opens a path in a headless browser with the instance's headers, waits for a text, and saves the visible text and a full-page screenshot in the instance's run directory: `verify.mjs do page --run <runId> '["/path", { "text": "<what to wait for>" }]'`. Judge against the map, and file each verdict with `verify.mjs record <evidence dir> <criterion> pass|fail|confirm --why "..." --file <screenshot>`. Without Playwright in the repository, use the host's browser tool, and keep the map's steps followable with any browser.

**Web app or desktop app, scripted (L3).** Playwright: `chromium.launch()` against the dev server, or `_electron.launch()` with a fresh user-data directory. Locate by testid or role and name; keep UI text in both languages if the app ships two. Close first-run dialogs and late pop-ups before each action (`page.addLocatorHandler`), and make a dialog that will not close end the scenario as UNVERIFIED. `count` returning 0 is a successful read. `capture` takes a screenshot (the HTTP example's `capture` is the one-shot version). Measure how many instances the machine holds before setting `max` (8 GB of swap at six Electron instances was the ceiling on one 24 GB machine).

**Mobile.** If there is no driver, name the entry in maps and put its sub-features under Not covered; do not stand in another entry.

## Parallel limits

`jobs` caps instances at once; an entry's `max` caps that entry. Measure before raising them: run one map at jobs 2, 4, 8 and compare results and wall time; stop at the first setting where results change, 401s or timeouts appear, or the machine becomes unusable. Write the measured numbers and the run that measured them next to the setting.
