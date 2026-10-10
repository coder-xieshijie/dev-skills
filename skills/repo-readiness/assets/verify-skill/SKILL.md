---
name: verify-<app>
description: Starts an isolated <app> instance, drives it through <entry points> and collects evidence to prove a change works the way a user meets it. Use when verifying a change, reproducing a bug, running a feature map or its scenario scripts, or writing and checking feature maps.
---

# Verify <app>

Prove that a change behaves correctly where users meet it, with evidence another agent can check. Feature maps say what correct is; this Skill starts, drives, reads and stops the app.

```bash
V=<path to this skill>/scripts/verify.mjs
```

Every command prints one JSON object and exits non-zero when `ok` is false. `node $V --help` lists them.

## Boundaries

- Drive only instances you started, through `up` or `run`. Never touch the user's own data, ports or running app. `down` stops only the processes it recorded.
- Use the product's user-facing paths. Arranging stored state is allowed only on a stopped instance's data, and the report says it was arranged.
- Judge user-visible behavior at the entry users use; the API entry only adds checks. An entry you cannot drive is reported as not verified, never replaced by another entry.
- Results stay in the run's evidence directory and go into the MR description; they never go into maps or this Skill.
- Live runs are not a CI gate. CI runs the script tests and `node $V check`.

## Done

Every sub-feature × entry in scope has one result (PASS, FAIL, BLOCKED, UNVERIFIED, TO-CONFIRM); every non-PASS has a note; the report lists the evidence directory, the product version from `run-summary.json`, the selection and why, and what was not verified.

## Run scenario scripts

```bash
node $V run [<map>|<sub-feature id>|<script path>...] [--entry <slug>] [--jobs N] [--evidence-dir <dir>] [--launch '<json>']
node $V run ... --detach      # returns at once with the evidence directory
node $V wait <evidence dir>   # blocks until that run ends
```

Each scenario gets its own instance (up, doctor, script, down). A run whose instance did not start, failed doctor or was reported invalid runs once more; the first attempt stays as `<scenario>.attempt-1`. `ok` means nothing is UNVERIFIED (FAILs may exist); `allPass` means every result is PASS.

- Wait with `--detach` then `wait`, or your host's background job; do not sleep-poll files, each wake-up is a model call with the whole context.
- Look criteria stop at UNVERIFIED with a capture path. Open the capture, judge it against the map's standard, then `node $V look <evidence dir> <criterion id> pass|fail --why "<what the capture shows>"`.
- Counterexample: `--launch '<json>'` merges into every script's launch options; use it to make the product break a criterion and confirm the result is FAIL.

## Drive by hand

```bash
node $V up --entry <slug>          # isolated instance; prints runId and its directories
node $V doctor
node $V do <tool> '<json args>'    # e.g. do api '["POST","/notes",{"title":"a"}]'
node $V down [--keep-data]         # safe to repeat
```

<One section per entry: what `up` starts, how to drive it (keys, selectors), how to read state, gotchas. Move long ones to references/<entry>.md.>

## Smoke

<The shortest journey per entry that proves the instance is drivable: command, expected output. Run it first when the Skill or the app's startup changed.>

## Feature maps

[features/README.md](features/README.md) lists the maps and what they cover. Before writing or changing a map or scenario script, read [references/maps.md](references/maps.md).

## Maintain

When the app's startup, entry points or a mapped behavior change, update this Skill and the affected maps and scripts in the same MR. After changing anything under `scripts/`, run `node --test scripts/test/*.test.mjs` and `node $V check`; earlier runs do not count for the new version. Report product problems separately; edit only maps and this Skill.
