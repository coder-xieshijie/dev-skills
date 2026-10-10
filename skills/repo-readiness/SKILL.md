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
  scripts/                  verify.mjs, runner.mjs, primitives.mjs, map-check.mjs, config.mjs, page.mjs,
                            entries/<slug>.mjs, entries/_<shared>.mjs, test/
<map root>/<feature>/feature-map/<map>.md
<map root>/<feature>/feature-map/scenarios/<id>.<slug>.mjs, _<map>.mjs
```

The kit in [assets/verify-skill/](assets/verify-skill/) is this layout with HTTP and CLI adapters, a page tool for web entries driven by hand, and tests; copy it, then adapt. `<skills dir>` is where the repository's agents load project Skills (`.agents/skills`, `.claude/skills`, `.cursor/skills`); when several are used, keep one copy and link the others to it. When none exists, pick from the agent files the repository has (AGENTS.md: `.agents/skills`; CLAUDE.md: `.claude/skills`).

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

If the base branch does not build, start or pass its own tests, stop and report that first: verification on a broken base proves nothing. A test that fails once and passes on a rerun is a flake, not a broken base: record its name and log under Gates and continue.

Done when every question has an answer with a file or command behind it, and the unknowns are asked in one batch. The answers go into the verification Skill (entry sections, isolation decisions) and the hand-off report (specs, gates).

## 2. Lay down the kit and write the adapters

Copy `assets/verify-skill/` into `<skills dir>/verify-<app>/`, fill `SKILL.md`'s placeholders, `verify.config.json` (`kit`: the dev-skills version or commit you copied; `scripted` stays empty until step 5) and the index. From here on, `V` is `<skills dir>/verify-<app>/scripts/verify.mjs`, as in the copied `SKILL.md`. Configure or extend the kit's adapters, or write your own, one per entry under `scripts/entries/`, following [references/control-contract.md](references/control-contract.md). The kit's doctor covers process, identity, HOME and build freshness; reading back the effective config, credentials and that the product uses each replacement are yours to add. Go through the isolation table row by row and write each decision into the verification Skill. The copied files follow the repository's own formatter and linter like any other code.

Done when `node --test scripts/test/*.test.mjs` and the repository's own gates pass with the kit in place, and for every entry `up → doctor → do <a read> → down → down`, with `--run <runId>`, works by hand: doctor reads back the effective config, the second `down` reports it already stopped, and the evidence survives cleanup while the data directory and every process the instance started are gone.

## 3. Smoke per entry

Write the shortest journey per entry into the verification Skill's Smoke section: commands, and the output that proves it worked. Run each on the base branch.

Done when each smoke passes on the base branch from a clean checkout, with the commands copied from the Skill.

## 4. Map the first features

Map the features the next requirement touches, or the three to five features users depend on most when there is no next requirement. Write them with [assets/feature-map.template.md](assets/feature-map.template.md) and the copied `references/maps.md`. Sources: the spec, the code paths behind each entry, existing tests, and bug-fix history. Split a sub-feature wherever outcomes differ; give every criterion an ID and the wrong implementation it rules out; reference requirement IDs, or name the defining source files when the repository has none; put everything deliberately left out under Not covered with its reason.

Done when `node $V check` passes, and every map has been checked against the source it describes, criterion by criterion, by someone reading the code rather than the map ([references/map-audit.md](references/map-audit.md) has the prompt and what to do with each finding). Commit the verification Skill and maps on a branch now; step 8 may squash.

## 5. Script the deterministic entry

Write one scenario script per sub-feature for each scripted entry, citing each criterion exactly once. Scripts arrange preconditions and call the primitives; waiting, selecting and reading strictly stay in the kit. When the same operation recurs across scripts, make it an adapter tool or a shared step with a test, not a copy.

Add the entry to `scripted` in `verify.config.json`. Entries without scripts are driven by hand as the maps say, with `page` for web pages, and each verdict filed with `record` into the same evidence directory.

Then prove the scripts can fail: for each map, break the product for one criterion and run that map. [references/counterexamples.md](references/counterexamples.md) covers choosing the lever and doing a patched build in a separate worktree when the product has no switch to break it.

Done when a full `run` on the base branch gives every scenario PASS, or FAIL or TO-CONFIRM with a product problem written up; every hand-driven sub-feature × entry has a recorded result; and each map's counterexample run gives FAIL on the broken criterion. UNVERIFIED on a counterexample means the counterexample did not run.

## 6. Wire CI

Add a job that runs the kit's tests and `node $V check` when the verification Skill or any `feature-map/` directory changes. Live runs are not a gate.

Done when the job runs green on the branch and fails on a deliberately broken map (a criterion with no script check). When pushing is not allowed, run the job's steps from a fresh clone of the commit instead, and say so in the hand-off.

## 7. Prove it with a fresh session

Hand a sub-agent with no access to this conversation only the repository and one instruction: verify one sub-feature of a mapped feature at every entry and report results with evidence. Watch where it hesitates, guesses or runs something not written; fix the Skill, map or adapter, and repeat until a fresh session gets through without help.

Done when a fresh session produces correct results with evidence, using only what the repository says.

## 8. Hand off

Link the verification Skill from the repository's agent instructions or development docs (AGENTS.md, CLAUDE.md, CONTRIBUTING), one line saying when to use it. Commit everything as one change, squashing the branch if the repository prefers. Report to the user:

- what exists per entry and level, the commands to start with, the CI job, and the kit version (`kit` in `verify.config.json`, `version.kit.hash` in a run summary);
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
