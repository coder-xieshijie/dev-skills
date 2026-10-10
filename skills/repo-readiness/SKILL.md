---
name: repo-readiness
disable-model-invocation: true
description: Sets up agent verification in a repository: a project-local verification Skill with isolated control commands for every entry point, feature maps with numbered criteria, scenario scripts with a runner, and a structure check in CI. Use once per repository before the first core-spec or deliver, or to bring an existing verification Skill and feature maps up to this format.
---

# Make a repository ready for agent verification

Leave the repository with a verification Skill that lets any agent, mid-task and with no memory of this session, start the app in isolation, drive it where users meet it, read evidence it cannot misread, and report one result per sub-feature and entry point. The test of every part is whether it helps an agent prove that the business code is correct and complete; what does not serve that is left out.

Write the verification Skill, maps and report in the language of the repository's documentation, or the user's language when the repository has none; rename the map headings in `verify.config.json` to match. Commands, IDs and file names stay as written.

What you leave behind:

```text
<skills dir>/verify-<app>/
  SKILL.md                  boundaries, done criteria, commands per entry, smoke, maintenance
  verify.config.json        entry points and their adapters, map roots, headings, jobs
  features/README.md        map index
  references/maps.md        how to write maps and scenario scripts
  references/<entry>.md     per entry when its section outgrows SKILL.md
  scripts/                  verify.mjs, runner.mjs, primitives.mjs, map-check.mjs, config.mjs,
                            entries/<slug>.mjs, test/
<map root>/<feature>/feature-map/<map>.md
<map root>/<feature>/feature-map/scenarios/<id>.<slug>.mjs, _<map>.mjs
```

The kit in [assets/verify-skill/](assets/verify-skill/) is this layout with an HTTP adapter and tests; copy it, then adapt. `<skills dir>` is where the repository's agents load project Skills (`.agents/skills`, `.claude/skills`, `.cursor/skills`); when several are used, keep one copy and link the others to it.

## 0. Decide the scope

Ask the user only what the repository cannot answer: which requirement comes next (its features get mapped first), which entry points users actually use, and what the agent may not touch (real accounts, paid APIs, production data). If a verification Skill or maps already exist, read them and their last runs, keep what works, and plan the changes as a migration to this format: numbered criteria, results out of the maps, scripts that cite criteria.

Choose the target level with [references/levels.md](references/levels.md). Default: every user-facing entry drivable by hand with isolation, and the cheapest deterministic entry scripted (L2), for the features the next requirement touches.

## 1. Interview the repository

Answer each from code and by running it, citing files:

| Question | What to find |
|---|---|
| Surface | every way users reach the product: HTTP API, CLI, TUI, web, desktop, mobile, and which are core |
| Run | how to build and start one instance from a worktree with its own data directory and port; how long it takes; what makes a build stale |
| Drive | how each entry is operated programmatically: HTTP client, PTY, Playwright, CDP; what has no driver |
| Observe | where truth is read: API state, event streams, logs, files, database; which reads change state |
| Isolate | what instances share (user config, credentials, ports, caches, `/tmp`); whether the product runs commands or model tools; what external systems it calls and which are nondeterministic |
| Specs | where requirements live and whether they have IDs (`## ABC-01:` headings); existing end-to-end tests and their gaps; fix commits that show where bugs cluster |
| Gates | the quality commands (lint, types, tests) and where CI runs; whether the base branch passes them |

If the base branch does not build, start or pass its own tests, stop and report that first: verification on a broken base proves nothing.

Done when every question has an answer with a file or command behind it, and the unknowns are asked in one batch.

## 2. Lay down the kit and write the adapters

Copy `assets/verify-skill/` into `<skills dir>/verify-<app>/`, fill `SKILL.md`'s placeholders, `verify.config.json` and the index. From here on, `V` is `<skills dir>/verify-<app>/scripts/verify.mjs`, as in the copied `SKILL.md`. Write one adapter per entry under `scripts/entries/`, following [references/control-contract.md](references/control-contract.md): `up`, `doctor`, `down`, `tools`, plus `sideEffect` and `capture` where they apply. Go through its isolation table row by row and write each decision into the verification Skill.

Done when `node --test scripts/test/*.test.mjs` passes, and for every entry `up → doctor → do <a read> → down → down` works by hand: doctor reads back the effective config, the second `down` reports it already stopped, and the evidence survives cleanup while the data directory is gone.

## 3. Smoke per entry

Write the shortest journey per entry into the verification Skill's Smoke section: commands, and the output that proves it worked. Run each on the base branch.

Done when each smoke passes on the base branch from a clean checkout, with the commands copied from the Skill.

## 4. Map the first features

Map the features the next requirement touches, or the three to five features users depend on most when there is no next requirement. Write them with [assets/feature-map.template.md](assets/feature-map.template.md) and the copied `references/maps.md`. Sources: the spec, the code paths behind each entry, existing tests, and bug-fix history. Split a sub-feature wherever outcomes differ; give every criterion an ID and the wrong implementation it rules out; reference requirement IDs; put everything deliberately left out under Not covered with its reason.

Done when `node $V check` passes, and every map has been checked against the source it describes, criterion by criterion, by someone reading the code rather than the map.

## 5. Script the deterministic entry

Write one scenario script per sub-feature for each scripted entry, citing each criterion exactly once. Scripts arrange preconditions and call the primitives; waiting, selecting and reading strictly stay in the kit. When the same operation recurs across scripts, make it an adapter tool or a shared step with a test, not a copy.

Then prove the scripts can fail: for each map, break the product for one criterion (a fault through `run --launch`, a feature flag, a patched build on a scratch branch) and run that map.

Done when a full `run` on the base branch gives every scenario PASS, or FAIL or TO-CONFIRM with a product problem written up; and each map's counterexample run gives FAIL on the broken criterion. UNVERIFIED on a counterexample means the counterexample did not run.

## 6. Wire CI

Add a job that runs the kit's tests and `node $V check` when the verification Skill or any `feature-map/` directory changes. Live runs are not a gate.

Done when the job runs green on the branch and fails on a deliberately broken map (a criterion with no script check).

## 7. Prove it with a fresh session

Hand a sub-agent with no access to this conversation only the repository and one instruction: verify one sub-feature of a mapped feature at every entry and report results with evidence. Watch where it hesitates, guesses or runs something not written; fix the Skill, map or adapter, and repeat until a fresh session gets through without help.

Done when a fresh session produces correct results with evidence, using only what the repository says.

## 8. Hand off

Commit everything as one change. Report to the user:

- what exists per entry and level, the commands to start with, and the CI job;
- which features are mapped, how many sub-features and criteria, and what is under Not covered;
- results of the full run and the counterexample runs, with the evidence directory and product version;
- product problems found, separately from verification problems;
- what the next level would need and which trigger would justify it.

## Rules every step keeps

These come from failures; [references/lessons.md](references/lessons.md) has the evidence behind each.

- A criterion lives only in its map; the script cites its ID; judging logic lives only in the primitives; `check` links them.
- Results never go into maps or the verification Skill. They stay in the run's evidence directory and the MR description.
- Unreadable evidence is UNVERIFIED, never "nothing happened"; an empty state counts only when it was read.
- One instance per scenario; drive only instances you started; stop only recorded processes.
- Judge user-visible behavior at the entry users use. An entry you cannot drive is reported as not verified, never stood in for.
- Prove the ruler before measuring: tests, `check` and counterexamples pass before a batch run, and a change to the kit invalidates earlier results.
- Replacing an external system's reply is recorded, and the claim narrows to the product's behavior after that reply.
- Wait inside commands (`run --detach`, `wait`), never by polling from the agent.

## Where this sits in the workflow

This is stage A of the [development workflow](../../README.md#the-workflow); the [repository readiness guide](../../docs/repository-readiness.md) explains why each part exists. core-spec writes verify.md against the maps' sub-feature IDs and entries; deliver runs the verification Skill, keeps maps true in each MR, and reports results by ID.
