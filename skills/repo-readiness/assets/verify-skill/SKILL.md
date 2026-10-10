---
name: verify-<app>
description: Starts isolated <app> instances, drives them through <entry points> and reports one result per sub-feature and entry with evidence. Use when verifying a change, reproducing a bug, or running, writing or checking feature maps and their scenario scripts.
---

# Verify <app>

Prove that a change behaves correctly where users meet it, with evidence another agent can check. The feature maps say what correct is, one numbered criterion at a time; this Skill starts, drives, reads and stops the app. Which maps to run, which entries to drive by hand and how is yours to decide; the commands below are what is available.

## Boundaries

- Drive and stop only instances you started, through `run` or `up`, and pass the `--run` your own `up` printed. The user's app and other agents' instances may be running on this machine; `list` shows every session's hand instances, and `down` stops only the processes its own instance recorded.
- Judge user-visible behavior at the entry users use. An entry you cannot drive is reported as not verified, never replaced by another entry. Stored state may be arranged only on a stopped instance's data, and the report says so.
- Results go into the run's evidence directory and the MR description, never into the maps or this Skill: they describe the product, and `check` fails on a result tied to a date, a commit or a count.

## Done

- Every sub-feature × entry in scope has one result: PASS (every criterion holds), FAIL (the product breaks the map), BLOCKED (the precondition could not be built), UNVERIFIED (not run, or the run does not count) or TO-CONFIRM (a product owner must say whether it is intended). Every non-PASS has a note.
- The report gives the evidence directory, `version` from its `run-summary.json` (commit, dirty paths, kit hash), the maps, sub-features and entries selected and the change each covers, what was not verified, and product problems separately from verification problems.

## How results are judged

The runner and the adapters enforce these; they are here so you can read a result right.

- Evidence is read only through the adapter's strict reads. A failed or unreadable read makes the result UNVERIFIED, even if a script catches it; an empty state counts only when a read succeeded and returned empty.
- The order decides: an error, a timeout, unreadable evidence or a side-effect read inside a wait → UNVERIFIED; a failed precondition → BLOCKED; nothing checked → UNVERIFIED; a criterion that does not hold → FAIL; a criterion left unchecked or a look not yet judged → UNVERIFIED; something to confirm → TO-CONFIRM; otherwise PASS.
- A scenario whose instance did not start, failed doctor or was reported invalid by `down` runs once more; the first attempt stays as `<scenario>.attempt-1`. A valid FAIL is never rerun.
- Look criteria stop at UNVERIFIED with a capture path until `look` records your verdict on it. Criteria of an entry without scripts get their result from `record`, judged the same way: a criterion not yet recorded keeps the result UNVERIFIED unless a recorded one fails.
- A result counts only for the kit hash it was measured with (`version.kit.hash`): a change under `scripts/` or to `verify.config.json` starts over, except for `jobs`, `max`, `runsRoot`, `kit` and `contract`, which cannot change a result.

## Commands

```bash
# every command runs from the repository root
S=<this skill's directory, relative to the repository root>
V=$S/scripts/verify.mjs
node $V run [<map>|<sub-feature id>|<script path>...] [--entry <slug>] [--jobs N] [--evidence-dir <dir>] [--launch '<json>'] [--detach]
node $V wait <evidence dir>                  # blocks inside the command until a detached run ends
node $V up --entry <slug> [--launch '<json>']   # a hand instance: prints runId, run directory and fields
node $V doctor --run <runId>
node $V do <tool> --run <runId> '<json array>'   # spread as the arguments: '[["a"]]' passes one array; {field} is that field of the instance
node $V down --run <runId> [--keep-data]   # a second down reports it already stopped
node $V list                                 # hand instances on this machine from every session, stopped ones too: a live one has no stoppedAt
node $V record <evidence dir> <criterion id> pass|fail|confirm --why "<what was observed>" [--file <capture>]
node $V look <evidence dir> <criterion id> pass|fail --why "<what the capture shows>"
node $V check                                # structure of maps and scripts; CI runs it
node $V contract [--entry <slug>]            # an entry's adapter against the adapter contract
```

Every command prints one JSON object and exits non-zero when `ok` is false; `node $V --help` lists them. A run gives each scenario its own instance (up, doctor, script, down); `ok` is false when anything is UNVERIFIED, `allPass` is true when everything is PASS. `--launch` merges into every script's launch options: that is how a counterexample run breaks the product to show a criterion gives FAIL.

A hand-driven result goes into the evidence directory of the verification it belongs to: the `evidenceDir` its `run` printed, once that run has ended, so scripted and hand results share one summary; a new directory when nothing is scripted. `record` keeps each result, with a copy of its `--file`, in `<sub-feature>.<entry slug>/` there; copy into the same directory anything else a verdict rests on, such as the adapter's log in the run directory `up` printed.

## Entries

<One section per entry: what `up` starts, how to drive it (tools, keys, selectors), how to read its state, what its scenario directory holds after a run (`result.json` and what the adapter keeps, such as an app log or `requests.jsonl`; paths into the instance's `data/` are gone after `down`), and its gotchas. Move a long one to references/<entry>.md.>

<A table of every tool `do` and scripts can call, per entry: name and arguments, action or read, what it does. `check` warns about a tool a map or script uses that this Skill does not name.>

## Smoke

Run Smoke before the first run in a checkout, and again after a change to `scripts/`, `verify.config.json` or the app's startup.

<The shortest journey per entry that proves the instance is drivable: command, expected output.>

## Feature maps

[features/README.md](features/README.md) lists the maps and what they cover. Read [references/maps.md](references/maps.md) before writing or changing a map or a scenario script.

## Maintain

When the app's startup, its entries or a mapped behavior change, update this Skill and the affected maps and scripts in the same MR. After a change under `scripts/`, `node --test $S/scripts/test/*.test.mjs` (which runs the adapter contract on every entry) and `node $V check` pass before any run counts. Product problems are reported, not fixed here.
