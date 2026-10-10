---
name: repo-readiness
disable-model-invocation: true
description: Sets up agent verification in a repository: a project-local verification Skill with isolated control commands for every entry point, feature maps with numbered criteria, scenario scripts with a runner, and a structure check in CI. Use once per repository before the first core-spec or deliver, or to bring an existing verification Skill and feature maps up to this format.
---

# Make a repository ready for agent verification

Leave the repository with a verification Skill that lets any agent, mid-task and with no memory of this session, start the app in isolation, drive it where users meet it, read evidence it cannot misread, and report one result per sub-feature and entry point. Judge every part by whether it helps an agent prove the business code correct and complete, and leave out what does not.

Default scope: the features the next requirement touches (with no next requirement, the three to five features users depend on most), every user-facing entry drivable by hand in isolation, and the cheapest deterministic entry scripted; this is L2 in [references/levels.md](references/levels.md), which says when to aim higher or lower. When a verification Skill or maps already exist, the end state is the same: keep what works and migrate the rest.

Write the verification Skill, maps and report in the language of the repository's documentation, or the user's language when it has none, and rename the map headings in `verify.config.json` to match; commands, IDs and file names stay as written.

## Boundaries

- **Build on a working base.** If the base branch does not build, start or pass its own tests, report that before building anything on it: verification on a broken base proves nothing.
- **Ask the user only what the repository cannot answer**: which requirement comes next, which entry points users actually use, and what the agent may not touch. Ask in one batch, and keep working on whatever the answers do not block.
- **Leave real systems alone unless the user allows them**: real accounts, paid APIs, production data. Drive and stop only instances you started, never the user's own app, data or ports: the user and other agents share the machine.

## Done when

Committed on a branch, as one change or squashed as the repository prefers:

```text
<skills dir>/verify-<app>/
  SKILL.md                  boundaries, done criteria, commands per entry, isolation decisions, smoke, maintenance
  verify.config.json        entry points and their adapters, map roots, headings, jobs, kit version
  features/README.md        map index
  references/maps.md        how to write maps and scenario scripts
  references/<entry>.md     per entry when its section outgrows SKILL.md
  scripts/                  the kit: verify.mjs, runner.mjs, primitives.mjs, map-check.mjs, config.mjs, contract.mjs, test/
  scripts/entries/          one adapter per entry: <slug>.mjs, shared code in _<name>.mjs
<map root>/<feature>/feature-map/<map>.md
<map root>/<feature>/feature-map/scenarios/<id>.<slug>.mjs, _<map>.mjs
```

`<skills dir>` is where the repository's agents load project Skills (`.agents/skills`, `.claude/skills`, `.cursor/skills`); keep one copy and link the others to it. With none yet, use `.agents/skills` for AGENTS.md and `.claude/skills` for CLAUDE.md. `V` below is `<skills dir>/verify-<app>/scripts/verify.mjs`.

1. **Kit in place.** The kit in [assets/verify-skill/](assets/verify-skill/) is copied with its placeholders filled and `kit` in `verify.config.json` naming the dev-skills version or commit, or the kit hash `node $V --help` prints when neither is at hand. Every adapter passes the kit's adapter contract test (`node $V contract`, also run by the kit's tests), with the checks it cannot make generically, such as effective config, credentials and that the product calls a replacement for an external system, named in the entry's `contract.doctorChecks`. The kit's tests and the repository's own gates pass with the kit in place. The copied files (`scripts/` except `entries/`, and `verify.config.json`) keep the format they were copied in and the repository's formatter skips them, because a reformatted kit changes its hash and breaks edits made by script; adapters, maps and scenario scripts follow the repository's style.
2. **Every entry drivable by hand.** For each entry, `up → doctor → do <a read> → down → down` with `--run <runId>` works: doctor reads back the product's effective config, the second `down` reports it already stopped, and the evidence survives while the data directory and every process the instance started are gone. The verification Skill records a decision for every row of the isolation table in [references/control-contract.md](references/control-contract.md), "not needed, because …" included. An entry users use that cannot be driven is named under Not covered with its reason, never stood in for by another entry.
3. **Smoke.** The verification Skill's Smoke section gives the shortest journey per entry and the output that proves it worked, and each passes on the base branch from a clean checkout with the commands copied from the Skill.
4. **Maps true to the code.** `node $V check` passes with no errors or warnings; it also keeps results out of the maps and the verification Skill, and wants AGENTS.md or CLAUDE.md to point to the verification Skill. Every criterion has been checked against the source by someone reading the code rather than the map.
5. **Scripts shown able to fail.** Every sub-feature has a scenario script at each scripted entry. A full `run` on the base branch gives every scenario PASS, or FAIL or TO-CONFIRM with the product problem written up; every hand-driven sub-feature × entry has a result filed with `record` (`node $V record`); each map has a counterexample run in which the broken criterion gives FAIL (UNVERIFIED means the counterexample did not run). Only runs made after the last change to the kit or an adapter count.
6. **CI catches a broken map.** A job runs the kit's tests and `node $V check` when the verification Skill or any `feature-map/` directory changes. It has run green on the branch and failed on a deliberately broken map, such as a criterion with no script check. Live runs are not a gate.
7. **A fresh session can use it.** A sub-agent with no access to this conversation, given only the repository and one task (verify one sub-feature of a mapped feature at every entry and report results with evidence), produces correct results from what the repository says. It hands back the documentation gaps it met: what was missing, wrong or ambiguous, with file and line. Ask for gaps in the text, not for its hesitations or reasoning; a request for its reasoning can be refused as reasoning extraction. Fix the gaps and repeat with a new sub-agent, up to three rounds; hand over what remains.
8. **Hand-off.** The report to the user gives:
   - what exists per entry and level, the commands to start with, the CI job, and the kit version (`kit` in `verify.config.json`, `version.kit.hash` in a run summary);
   - which features are mapped, how many sub-features and criteria, and what is under Not covered;
   - results of the full run and the counterexample runs, with the evidence directory and product version;
   - product problems found, separately from verification problems, and flaky tests seen on the base branch;
   - what the next level would need and which trigger would justify it.

## References

- [references/route.md](references/route.md): one route through the work, with a check after each stage. Read it before starting; follow it, reorder it or shorten it as the repository allows.
- [references/control-contract.md](references/control-contract.md): when writing or extending an adapter, or deciding how an instance is isolated.
- [references/adapters/](references/adapters/README.md): working HTTP and CLI adapters, process helpers and a `page` tool for web pages driven by hand, each passing the contract test. Start from one when an entry is that kind; copy it into `scripts/entries/`.
- [assets/feature-map.template.md](assets/feature-map.template.md) and the kit's [references/maps.md](assets/verify-skill/references/maps.md): when writing a map or a scenario script.
- [references/map-audit.md](references/map-audit.md): when a map is written or rewritten.
- [references/counterexamples.md](references/counterexamples.md): when proving a map's scripts can fail.
- [references/lessons.md](references/lessons.md): when a rule in the kit looks unnecessary, or a passing run looks doubtful.

## Where this sits in the workflow

This is stage A of the [development workflow](../../README.md#the-workflow); the [repository readiness guide](../../docs/repository-readiness.md) explains why each part exists. core-spec writes verify.md against the maps' sub-feature IDs and entries; deliver runs the verification Skill, keeps maps true in each MR, and reports results by ID.
