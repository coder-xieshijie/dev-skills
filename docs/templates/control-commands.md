# Template: control commands

Control commands let an agent prepare, start, check, drive, read, snapshot, reset and stop your app on its own. This template is the body of your project's verification Skill, usually `<skills dir>/verify-<app>/SKILL.md`. Why each part exists is in [Repository readiness](../repository-readiness.md), steps 2, 3, 4 and 10. The feature map that goes with it has its own [template](feature-map.md).

How to fill it in:

- Replace every `<...>` with what your repository actually does. Leave no placeholder. If a part does not apply, keep its heading and write one line saying why.
- Write real commands that run from the repository root, not examples.
- Run every command once before you commit the file. A command nobody has run is a draft.
- Lines starting with `Guide:` are for you. Delete them when you are done.

````markdown
---
name: verify-<app>
description: Start, drive and observe <app> the way a user does, in an isolated local instance, and keep evidence. Entry points: <for example desktop app, TUI, HTTP API>. Use it to prove product behavior in the running app or to reproduce a bug. It is not a CI gate.
---

# verify-<app>

This Skill lets an agent with no background start an isolated instance of <app> in the current worktree, operate it as a user would, and keep evidence anyone can check. How to reach and judge each feature is in the feature map: the index is [features/README.md](features/README.md). Read this file first and start an instance, then read the map for the feature your scenario touches.

All commands run from the repository root. Below, `V` means:

```bash
V=<path to the control script>
```

## Output contract

Every command:

- prints one JSON object on stdout with an `ok` field; progress and streamed events go to stderr;
- exits non-zero when `ok` is false, including when the app answers 4xx or 5xx (the status and body are still printed);
- on failure, prints what went wrong and what to run next;
- acts on the latest live instance of the same entry point in this worktree. With more than one running, pass `--run <runId>` to every command.

Guide: if your commands cannot meet one of these yet, say which and how to tell success from failure instead.

## Entry points

| Entry point | Use it for | Driven with | Commands | Details |
|---|---|---|---|---|
| <Desktop app> | <everything users see and click there> | <for example Playwright> | <desktop up, click, type, wait, text, screenshot, down> | <references/desktop.md> |
| <TUI> | <everything users type and read there> | <for example a pseudo-terminal with a headless terminal renderer> | <tui up, type, keys, screen, wait, down> | <references/tui.md> |
| <HTTP API> | <runtime behavior and state; does not prove the UI is wired up> | <plain HTTP> | <up, api, poll, snapshot, down> | this file |
| <Phone app> | <...> | <none> | <none> | Blocked: <what a driver would need> |

User-visible behavior is verified at the entry point users actually use. An API check can add evidence; it cannot replace the UI entry point.

## Boundaries

- Real services this instance calls: <model provider, payment sandbox, email, ...>. They <consume quota / send real messages>. <How to avoid side effects>.
- Accounts: <test account and where its credentials come from>. Operate only the feature under test.
- Never touched by an instance: <the user's real data directory, the installed app's profile, shared environments>.
- Environment checks: <for example, proxy variables: start refuses until you pass `--no-proxy` or `--keep-proxy`>.

## Prepare

```bash
node $V prepare [<parts>]
```

Builds what a fresh worktree needs: <the steps>. Time: <for example about 10 seconds incremental>. When the build is stale or missing, start refuses and lists why; run prepare then. Prepare rewrites shared build output, so check with whoever else uses this worktree before running it while another instance is up.

## Start

```bash
node $V up [--evidence-dir <dir>] [--from-data <runId or data directory>] [<other options>]
```

- Starts <what process> with its data in `<instance root>/<runId>/data`, listening on a free port on 127.0.0.1.
- Ready when the output has `"ok": true`, `runId`, `baseUrl` and `evidenceDir`, and <the health endpoint> echoes the run ID.
- Refuses to start when sources are newer than the build. `--allow-stale` overrides this; say so in your report if you use it.
- `--evidence-dir` points evidence at the requirement's `evidence/` directory. Default: inside the instance directory, which the system cleans.
- `--from-data` starts from a copy of a saved data directory. The source is not changed.
- Configuration injected for verification: <for example permissions mode, features turned off, with reasons>.

## Doctor

```bash
node $V doctor
```

Read-only. Answers "is this instance worth driving?" All required checks must pass before you operate:

| Check | Pass when | Fix |
|---|---|---|
| Process alive | <...> | `down`, then `up` |
| Instance is this run's | <health echoes runId; response header> | <...> |
| Instance belongs to this worktree | <...> | <...> |
| Build is current | <no source newer than the build; no rebuild since start> | `prepare`, then `down`, `up` |
| Credentials | <present and valid> | <how to log in> |
| <Feature switch> | <...> | <...> |

Run doctor again after anything unexpected: a 5xx, a broken stream, a state that does not change.

## Smoke

One short journey per entry point. It passes on the base branch at all times.

```bash
<commands for entry point 1>
```

Passes when: <literal values and where to read them>. If it fails with <a known symptom>, the cause is usually <cause>.

```bash
<commands for entry point 2>
```

Passes when: <...>.

## Drive

Guide: one subsection per entry point. List the commands, the stable handles they use, and the one rule that most often goes wrong.

### <Entry point 1>

| User action | Command |
|---|---|
| <open a new conversation> | `node $V <...>` |
| <type and send> | `node $V <...>` |
| <read a value on screen> | `node $V <...>` |

Locate elements by <test ID, role and accessible name, prompt string, route>. Never by coordinates or position.

### <Entry point 2>

<...>

Do not call internal methods or test-only endpoints, and do not write to storage to produce a result. To arrange a precondition in stored state, use `<data tool>` on a stopped data directory only, and say so in the report.

## Read state

```bash
node $V poll <path> --until <field>=<value1|value2> [--hold <seconds>] [--timeout <seconds>] [--save <name>]
```

- Wait for a state change, or confirm a state holds for a while (`--hold`), with `poll`. Never a fixed sleep.
- A timeout prints `poll timeout`; a broken hold prints `poll hold-broken`. With `--save`, the trajectory is saved too.
- Other read-only views: <request inspector, event log, logs, a query on a stopped data directory>.

Reading never changes state. If a query changes state, it is a drive action and must be something a user does.

## Snapshot and screenshots

```bash
node $V snapshot [--session <id>] --save <name>
node $V <entry point> screenshot --save <name>
```

Saves: <API responses, workspace files with sha256, events, requests sent out, screenshot, accessibility tree, video>. Take the snapshot before `down`, or side effects in the workspace are deleted with it.

## Reset

| To get | Do |
|---|---|
| A clean instance | `down`, then `up`: every `up` creates a new instance with an empty data directory |
| A known saved state | `down --keep-data` on a prepared instance, then `up --from-data <runId>` |
| A clean state for one scenario | <for example a new conversation; remove what the scenario created with `<command>`> |
| The same data after a restart | `node $V restart [--force]` |

## Stop and clean up

```bash
node $V down [--run <runId>] [--keep-data]
```

- Stops only the processes this instance recorded. Never stops anything by process name.
- Copies <runtime logs> into the evidence directory, then deletes scratch data. Keeps the evidence, the server log and the instance metadata.
- Lists the evidence it kept. An empty list counts as a failed cleanup.
- Running `down` again on a stopped instance succeeds; it does only cleanup still owed, such as data kept earlier with `--keep-data`.
- Run `down` after failed attempts too.
- To delete data you kept with `--keep-data`, run `down --run <runId>`. Do not delete instance directories by hand.

`node $V list` shows all instances, including stopped ones.

## Isolation and parallel instances

The owner and the verifier run instances at the same time from two checkouts.

| Resource | Per instance | Shared, and how it is handled |
|---|---|---|
| Data directory | `<instance root>/<runId>/data` | |
| Port | free port on 127.0.0.1 | |
| App profile | <temporary user-data directory> | |
| Credentials | | <for example a lease rule, refresh only when nothing holds the token, every refresh logged> |
| The user's screen and keyboard | <window does not take focus; how it is checked> | |
| The user's real files | <guard that stops the instance on paths outside the instance directory> | |
| Accounts with shared state | | <scenarios that change it run alone> |

If something cannot be isolated, the commands refuse to start a second instance and say why.

## Evidence

- Location: `--evidence-dir` when given; otherwise `<default>`.
- Every saved file records the run ID, the time, the commit and whether the working tree had uncommitted changes.
- Name each file `NNN-<name>` and record the feature map sub-feature ID and the entry point it belongs to.
- Report each scenario with: scenario ID, sub-feature ID, entry point, commands, what you saw, evidence paths, commit.
- Judge by state, events and files, not by wording that can vary.
- An entry point you could not drive: report the command you tried and the missing precondition. It is not a pass, and another entry point's result does not stand in for it.
- Kept out of version control: <videos, raw logs, anything with tokens>.

## Scripts

| File | What it does |
|---|---|
| `scripts/<control script>` | The control commands: <list> |
| `scripts/<server or helper>` | <started by `up`; do not run by hand> |
| `scripts/*.test.<ext>` | Tests for these scripts: `<command>` |

Environment variables: <name, default, what it changes>.

## Maintenance

The feature map must match what the product does now; later agents rely on it to reach and judge features. When a change alters a feature's user-visible behavior or entry points, update its map and run record in the same MR.

A full maintenance pass is done when `<structure check command>` passes and every sub-feature has been run at every entry point on this version, or its run record says why not. Edit only the maps and this Skill's directory. Report product problems separately.
````

## Command reference

Use this table to check your commands against the contract before you commit them. It can also go at the end of SKILL.md.

| Command | Arguments | What it does | Success output | Safe to repeat? |
|---|---|---|---|---|
| `prepare` | `[<parts>]` | Builds what a fresh worktree needs | `ok`, what was built | Yes, incremental |
| `up` | `[--evidence-dir] [--from-data] [--allow-stale] [...]` | Starts a new instance | `ok`, `runId`, `baseUrl`, `evidenceDir` | Each call starts a new instance |
| `doctor` | `[--run]` | Read-only health check | `ok`, one entry per check with `fix` | Yes |
| `<drive commands>` | `[--run] [--save <name>]` | One user action | `ok`, what changed | Same as the user action |
| `poll` | `--until [--hold] [--timeout] [--save]` | Waits for, or holds, a state | `ok`, `final`, `trajectory` | Yes |
| `snapshot` | `[--session] --save <name>` | Saves evidence | `ok`, file paths | Yes |
| `restart` | `[--force]` | Restarts on the same data | `ok` | Yes |
| `down` | `[--run] [--keep-data]` | Stops and cleans up, keeps evidence | `ok`, `evidence` list | Yes; when stopped, only cleanup still owed |
| `list` | | Lists instances | `ok`, instances | Yes |

## Before you commit

- [ ] A new session, reading only this file and the map, runs prepare, up, doctor, smoke, one mapped feature, snapshot and down, and the evidence still exists afterwards.
- [ ] Two instances started from two checkouts run at the same time and do not interfere.
- [ ] Every command prints JSON and exits non-zero on failure; `down` twice is safe.
- [ ] The scripts' own tests pass.
- [ ] No personal paths, tokens or account secrets appear in the file.
