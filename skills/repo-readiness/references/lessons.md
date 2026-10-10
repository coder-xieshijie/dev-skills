# Lessons the kit encodes

Read this when a rule in the kit looks unnecessary, before removing it, or when a run passes and you doubt it. Each lesson is a failure that happened while building one repository's verification, and the mechanism that now stops it.

## Judging

1. **Unreadable is not empty.** Reading a snapshot that 404'd, a JSON file that was cut off or a log that was missing silently became `[]`, and "no second start happened" passed. Mechanism: `EvidenceError` from every strict read, reported to the scenario through `AsyncLocalStorage`, so catching it in the script does not hide it; UNVERIFIED ranks first in the judge order.
2. **Scripts that judge for themselves get written weak.** Two independent reviews of 151 scripts found 10 checks weaker than the map, and most of 12 new problems were the same: each script re-implemented waiting, selecting and reading. Mechanism: waiting, holding, observing and boundary selection live in `primitives.mjs`, each with a counterexample test; `check` rejects timers, `fs` and `child_process` in scripts.
3. **A wait has three ways to fail.** Reaching a terminal state, timing out and a hold breaking are different results; mixing terminal states into a hold missed an active → paused → active flicker. Mechanism: `until` and `hold` return `{ ok, why }` and `hold` takes no terminal states.
4. **Some reads change what they read.** Reading message history woke the queue; reading the queue deleted expired items and cleared a pause. A criterion "the queue stays paused" passed because the check unpaused it, or failed because it did. Mechanism: the adapter's `sideEffect` list, refused while `until`, `hold` or `observe` runs, including reads still in flight when the window opened.
5. **Bind to the right one.** After a restart, an old turn's late `start` event counted as a new dispatch; under load the event arrived after the abort. Mechanism: criteria name the request or turn and the boundary; scripts select with `after`/`between` and identify the precondition's own event before counting.
6. **TO-CONFIRM is not PASS.** Thirteen results that needed a product owner's answer had been recorded as PASS. Mechanism: five results, TO-CONFIRM ranked below FAIL, `allPass` false while any remain.
7. **A replaced reply proves only what comes after it.** Scripted model replies and injected faults prove the product's handling of that reply, not that the real system replies that way. Mechanism: the result records what was replaced; keep real dependencies where the map relied on them.

## The map and its scripts

8. **One fact, one place, machine-linked.** A criterion written in both the map and a script drifted within a day. Mechanism: criteria text only in the map with an ID; the script cites the ID as a literal exactly once; `check` in CI compares the two both ways.
9. **Results do not belong in the spec.** Run records committed beside the maps went stale on every tool change (the hash covered the whole tool), needed a separate commit per run, and answered only "which version was checked once", not "is the code right". About 1,200 lines of code and tests and 373 lines of records were deleted. Mechanism: `check` rejects a run-record heading; results live in the evidence directory and the MR description.
10. **Write what each criterion catches.** "Status is active after resume" passed on an implementation that showed running and never started. Mechanism: `maps.md` asks every criterion to name the wrong implementation it rules out.
11. **Add, then subtract.** Gap checks only ever added clauses; the spec grew from 69 to 78 clauses before the user stopped it, and the verification code later lost 20 % with no loss of coverage. Four adjacent maps had been built for completeness and were cut from 74 to 19 sub-features to what the requirement touched. Mechanism: map what the next requirement touches; every part must help prove the business code correct and complete.

## Running

12. **One instance per scenario.** Global permission rules, leftover queue items and a sandbox stop leaked from one scenario into the next on a shared instance. Mechanism: `up → doctor → script → down` per scenario; a scenario never drives an instance it did not start.
13. **Doctor reads back what was set.** A launch option that did not take effect showed up as a precondition silently false, which looked like a product bug. Mechanism: doctor compares the effective config with the launch options.
14. **Prove the ruler before measuring.** About 330 results were thrown away because they were recorded on a tool version that was then changed, and two of three final runs were voided by evidence bugs found mid-run. Mechanism: tests and `check` pass, and each map's counterexample gives FAIL, before a batch run; results from an older tool version do not count.
15. **A counterexample must fail, not just not pass.** A counterexample rule that was never installed on the relaunched instance produced UNVERIFIED, which was read as "the check caught it". Mechanism: a counterexample run is accepted only with FAIL; UNVERIFIED means the counterexample did not run.
16. **Invalid runs rerun once; the first FAIL stays visible.** Manual reruns of voided scenarios stretched one full run from 47 to 69 minutes; an automatic rerun that passed once hid the first attempt's FAIL. Mechanism: only "did not start / doctor failed / invalid" reruns, once; the first attempt is kept as `.attempt-1` and listed in `firstAttemptFail`.
17. **Do not sleep-poll.** Sub-agents waited for runs with `sleep` loops; each wake-up was a model call with the whole context. Mechanism: `run --detach` and `wait` block inside the command.
18. **Longest first, limits measured.** The longest scenario (626 s) started at second 210 and decided the wall time; jobs 16 with longest-first cut the first pass from 840 to 742 s. Twenty desktop instances froze the machine; 12 + 8 lost evidence; 10 + 6 did not. Mechanism: the pool starts the longest timeout first; limits are per entry and written with the run that measured them.
19. **An evidence directory is used once.** `look` on a reused directory rewrote the previous run's result and could turn this run's FAIL into a PASS in the summary. Mechanism: the runner refuses a directory that already has a summary.
20. **The product's own agent will wander.** Seven of seven voided results in one run were the product's agent reading parent directories or writing a hard-coded `/tmp`; a private `TMPDIR` did not help. Mechanism: OS-level sandbox where possible; otherwise a scanner that voids the run only when the breach happened before the scenario ended.

## Process

21. **Map what the next requirement touches first.** The first six maps covered the requirement being delivered and found 6 product bugs on their second day; four maps added later for completeness were cut back to what the requirement touched.
22. **A cold session is the test of the Skill.** The first fresh session that followed the new verification Skill found 9 problems the author could not see. Mechanism: step 7 of `repo-readiness`.
23. **Live runs find what review cannot, and the reverse.** A full run found a home-page slash-command error that cleared the input box (the unit test stubbed the component); a code-as-truth audit found 8 criteria that disagreed with the code, one of them in a scenario that passed. Both are needed: the map is checked against the code when it is written or audited, and the code against the map on every run.
