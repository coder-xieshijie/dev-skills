# How far to build now

Build the lowest level that proves the next requirement, and climb when a trigger fires. Each level keeps everything below it.

| Level | What exists | Climb when |
|---|---|---|
| L0 | verification Skill with copy-paste commands, index, one to three maps with numbered criteria, results by hand in the five-result format | hand runs touch real data or default ports; two agents running at once interfere; the same start and read commands are retyped every run; a run verified an old build |
| L1 | adapters for every user-facing entry: `up`, `doctor`, `do`, `down` with isolation; strict reads; evidence per run; web pages driven by hand through the adapter's `page` tool (see the HTTP example) and verdicts filed with `record` | more than about 20 sub-features, or every MR reruns the same set; a review finds a PASS on evidence that does not prove the criterion (a failed read taken as "none"); the product has reads that change state or criteria like "X does not happen" |
| L2 | scenario scripts for the deterministic entry, primitives with counterexample tests, the runner with one instance per scenario, `check` in CI, a counterexample run per map | user-visible behavior only holds in the TUI or GUI and hand runs keep repeating the same steps; preconditions depend on a nondeterministic external system (a model, a third party); a full run takes over about 20 minutes; parallel runs collide on shared resources; the product executes commands on the developer machine |
| L3 | UI entries scripted (`ui: true`, `capture`, look criteria); a fault or reply proxy with the replaced replies recorded; measured per-entry limits; longest-first scheduling; OS-level sandbox; stored-state seeds | stop climbing when a full run finishes with `ok: true`, every map's counterexample gives FAIL, and review no longer finds criteria passing on evidence that cannot prove them |

The kit in `assets/verify-skill/scripts/` carries the L2 core: runner, primitives, structure check, `record` and the adapter contract test. Adapters for L1 come from the examples in `references/adapters/` (HTTP, CLI, `page` for web pages driven by hand) or are written to [control-contract.md](control-contract.md). At L2 an entry without scripts is still driven by hand at every run, with the map's steps; a web entry driven by hand shares the adapter of whatever starts its server (the web recipe in control-contract.md). L3 parts are written in the target repository when their trigger fires; control-contract.md has the recipes.

## Calibration from one repository

One desktop agent product (HTTP runtime, TUI, Electron) went through all four levels in twelve days:

| Day | Level | Size | What forced the next step |
|---|---|---|---|
| 1 | L1 | Skill 199 lines, CLI 748, runtime server 402, 6 maps 435 lines | the TUI and desktop app are the core entries; API-only proof missed the user's path |
| 2 | L1, three entries | +3,500 lines; 6 product bugs found on the first runs | a cold session following the Skill hit 9 doc problems |
| 9 | L1, rebuilt | 10 maps, 362 hand-run rows, about 730k tokens per row, 2 h 10 min | hand runs cost too much and each worker wrote its own throwaway harness |
| 10 | L2 | 151 API scripts; criteria IDs; primitives; per-row token cost about 280k; reviews found 10 scripts weaker than their maps | scripts judged by their own logic were written weak: moved judging into primitives with counterexample tests |
| 11 | L2, subtracted | committed run records and 20 % of the code removed; 10 maps, 163 sub-features, 781 criteria | full proof covered only the API half of the criteria |
| 11–12 | L3 | 157 UI scripts added; 268 scenarios, 723 criteria; full run 21 min at Electron 6 + others 10; 7 look criteria judged by an agent | cross-review and a code-as-truth audit settled the remaining deviations into 6 problem classes |

The product needed L3 because it runs a model inside: replies are nondeterministic, its agent executes commands, and one shared login refreshes destructively. A CRUD web app may stop at L2 for years.
