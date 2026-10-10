# One route through the work

Read this before starting. It is one route that has worked, with a check after each stage; the done criteria in [SKILL.md](../SKILL.md#done-when) are what must hold. Reorder, merge or skip stages when the repository makes another route shorter.

## 1. Scope and interview the repository

Settle the scope with the user's answers and [levels.md](levels.md). When a verification Skill or maps already exist, read them and their last runs, keep what works, and plan the rest as a migration: numbered criteria, results out of the maps, scripts that cite criteria.

Answer each question from the code and by running it, citing files:

| Question | What to find |
|---|---|
| Surface | every way users reach the product: HTTP API, CLI, TUI, web, desktop, mobile, and which are core |
| Run | how to build and start one instance from a worktree with its own data directory and port; how long it takes; what makes a build stale |
| Drive | how each entry is operated programmatically: HTTP client, PTY, Playwright, CDP; what has no driver |
| Observe | where truth is read: API state, event streams, logs, files, database; which reads change state |
| Isolate | what instances share (user config, credentials, ports, caches, `/tmp`); whether the product runs commands or model tools; what external systems it calls and which are nondeterministic |
| Specs | where requirements live and whether they have IDs (`## ABC-01:` headings); existing end-to-end tests and their gaps; fix commits that show where bugs cluster |
| Gates | the quality commands (lint, types, tests) and where CI runs; whether the base branch passes them |

Check: every question has an answer with a file or command behind it, and the unknowns went to the user in one batch. The answers feed the verification Skill (entry sections, isolation decisions) and the hand-off (specs, gates).

## 2. Lay down the kit and the adapters

Copy [assets/verify-skill/](../assets/verify-skill/) into `<skills dir>/verify-<app>/`; fill `SKILL.md`'s placeholders, `verify.config.json` and the index. Leave `scripted` empty until an entry has scripts. For each entry, start from the example in `references/adapters/` that matches its kind, or write an adapter to [control-contract.md](control-contract.md); run it against the kit's adapter contract test, then through the cycle by hand. Go through the isolation table and write each decision into the verification Skill.

Check: done criteria 1 and 2.

## 3. Smoke per entry

Write the shortest journey per entry into the verification Skill's Smoke section, and run each on the base branch.

Check: done criterion 3.

## 4. Map the first features

Write the maps with [the template](../assets/feature-map.template.md) and the kit's [maps.md](../assets/verify-skill/references/maps.md). Draw on the spec, the code path behind each entry, existing tests and bug-fix history. Then have each map audited against the code with [map-audit.md](map-audit.md).

Check: done criterion 4.

## 5. Script the deterministic entry

Write the scenario scripts for each scripted entry and add the entry to `scripted`. Drive the other entries by hand as the maps say, with `page` for web pages, and file each verdict with `record` into the same evidence directory. Run everything on the base branch, then a counterexample per map with [counterexamples.md](counterexamples.md).

Check: done criterion 5.

## 6. Wire CI

Add the job that runs the kit's tests and `check`, and break a map once to see it fail.

Check: done criterion 6.

## 7. Prove it with a fresh session

Start a sub-agent that has not seen this conversation, with read access to the repository and permission to start instances:

```text
In <repository>, verify sub-feature <id> of the <feature> map at every entry it declares, using only
what the repository documents. Report one result per entry with its evidence directory.

Then list the documentation gaps you met: each place where the repository's text was missing, wrong or
ambiguous, so that you had to look elsewhere or try more than one command. Give the file and line, what
the text says, and what it should say. Write "none" when there were none.
```

Fix each gap in the Skill, map or adapter, and start a new sub-agent for the next round.

Check: done criterion 7.

## 8. Hand off

Clear the warnings `check` still prints, commit, and report as done criterion 8 lists.

## Gotchas

- A test on the base branch that fails once and passes on a rerun is a flake, not a broken base: note its name and log for the hand-off and continue.
- Wait for runs inside commands (`run --detach`, then `wait`), not by polling from the agent: each wake-up is a model call that carries the whole context.
- When pushing is not allowed, prove the CI job by running its steps from a fresh clone of the commit, and say so in the hand-off.
