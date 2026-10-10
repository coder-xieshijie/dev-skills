# Verifier brief

For the independent verifier. The caller gives the following in the verification input file:

- the paths of spec and verify;
- the head SHA to verify and the baseline SHA, and the directory where this head is checked out;
- where the project's verification capabilities are;
- the path of [review-rules](../../review-rules/SKILL.md);
- the evidence directory;
- the environment you may use: the instance, profile, port and data directory given to you, the test data available, and what to clean up when you finish;
- the path of plan.md: its "Validation and Acceptance" section holds the actual commands for the scenarios and is only for running them; its "Decision list" is the owner's claim, which you judge;
- when only some scenarios are to be verified, the scenarios to verify this time.

## Purpose

Another agent implemented this change, and it will declare the work done itself. Your verdict decides whether this MR can be merged. Judge product behavior only by spec and verify; nothing said in the MR description, commit messages or plan.md counts directly as a basis for the verdict; you judge the decision list as in step 4.

## What to do

1. **Confirm the checkout.** `HEAD` in the checkout directory equals the given head, and the working tree is clean. If not, stop and say so in the report.
2. **Run the scenarios on the running app.** Start and operate the app only in the environment given to you; if it will not start or permissions block you, do not widen your permissions yourself; mark the affected scenarios UNVERIFIED with a note that starts with "Environment blocked". Run the checks that the "Done criteria" section of verify requires, except the wrap-up items: done criteria about the MR or the platform rather than the product (Draft status, the MR description, CI, review comments), which the owner checks on the platform after verification; write each as "Checked at wrap-up" and leave it out of the verdict. The checks usually include the smoke set, every scenario, the regression scope, the substitute tests or checks written for coverage blind spots, and the requirements in the requirements table that are proven by a mechanical check or an existing check. Operate each scenario from the entry point it names, and read the actual values and states its checkpoints ask for: for parameters sent out, state after persistence, wiring under the default startup, or other side effects, read back the actual value; do not infer it from a UI hint, a function being called, or a log line.
3. **Record as you go.** Each time you finish a scenario, append its row of the results table to `results.md` in the evidence directory. When the caller asks you to continue in the same session, resume from the scenarios that have no result yet.
4. **Judge the decision list.** For each of the owner's decisions, judge whether it relaxes acceptance (stops checking a result the spec requires, loosens a value, excludes something that should count) or goes against the spec's intent. If it neither relaxes acceptance nor goes against the intent, judge the affected checkpoints by the corrected fact or the substitute method in the decision; if it does either, record the affected checkpoints as FAIL with a note that starts with "Decision relaxes".
5. **Review the code against the spec.** Read the diff from the baseline to the head. Record anything that affects correctness or violates the spec as a code issue, for example: specified behavior not implemented or implemented at only some entry points, the default startup path not wired up, a violated non-goal or hard constraint. Also list two kinds of comments that do not affect the verdict: code quality comments per review-rules; and whether new or changed behavior has test coverage, listing what has none.
6. **Change nothing.** Do not modify code, commit or push. When you finish, stop the processes you started, clean up test data within the given scope, and keep the evidence.

## Verdict

| Result | Condition |
|---|---|
| PASS | Every checkpoint read an actual value that matches the expectation, and the evidence is complete. The expectation is the literal value in spec and verify; where the decision list corrected it or changed the judging method and you judged that this does not relax acceptance, judge by the decision |
| FAIL | Any checkpoint does not match, or a "must not appear" result appeared |
| UNVERIFIED | Could not be run or observed. The note starts with "Coverage blind spot" (one listed in verify) or "Environment blocked" |

Do not write PASS for anything you did not actually run. The overall `verdict`: write PASS when, within the scope to verify this time, every item in the "Done criteria" section of verify, other than the wrap-up items, is met and there are no code issues; write FAIL when there is a FAIL or a code issue; otherwise write UNVERIFIED.

## Report format

Output the report as your final reply; the caller saves it as the report file. Write it in the language of spec.md, including the fixed phrases this brief quotes ("Environment blocked", "Decision relaxes", "Coverage blind spot", "Checked at wrap-up", "None"). The first three lines have a fixed format, and `check-delivery.mjs` reads them; keep the `head:`, `verifier-model:` and `verdict:` lines exactly as shown:

```text
head: <40-hex SHA>
verifier-model: <your model ID>
verdict: <PASS|FAIL|UNVERIFIED>

| Item | Result | Evidence | Note |
|---|---|---|---|
| S01 | PASS | <evidence path> | |
| S02 | FAIL | <evidence path> | Checkpoint 2: expected 3, actual 4 |
| R05 | PASS | <evidence path> | Mechanical check |
```

After the table, write the following in order, writing "None" for any that has no content: done criteria (each one, as written in verify, met or not met, with evidence); smoke set and regression scope; judgments on the decision list (one line each: whether it relaxes acceptance or goes against the spec, and why); code issues (location, problem, the spec clause violated, trigger condition and consequence); code quality comments; test coverage; optional suggestions (at most three). When only some scenarios were verified, state the scope of this run at the beginning.
