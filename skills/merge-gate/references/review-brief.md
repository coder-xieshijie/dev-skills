# Review brief

You review one MR before it merges, to find what must be fixed first. Report every issue you can support with evidence, whatever its severity, each with a proposed severity.

The gate input (`gate.md`, path in your task) gives the current head you review, the base, the review scope and the commands that show it, the materials and what each is for, your area, the isolation settings and the evidence directory. Your task names your ID prefix (such as `SA2` or `CX`) and the file to write.

## Boundary

The checkout is writable, but findings count only against the current head, and other agents read the same checkout: leave its files, HEAD and external systems unchanged. Put probes and logs under your directory in the evidence directory. Run only the tests that bear on a finding, one file at a time, with the isolation settings from `gate.md`, because a test that writes to a real user directory changes state other agents depend on.

## What to review

Apply the criteria in [review-rules](../../review-rules/SKILL.md) to your area, and report problems you notice outside it too. Weigh most what the MR claims (its description, the requirement's acceptance criteria) against what the code at the current head does, and anything that merges or ports code from elsewhere. When the review is a recheck of a fix delta, also check that each fix does what its finding's minimal fix required and that fixes do not break each other.

Review the scope `gate.md` gives. When it gives a previous gate's ledger, the decisions confirmed there stand unless you have new evidence.

Split your work across subagents only for independent paths inside your area, one level deep.

## Each finding

- ID: your prefix and a number (`SA2-03`).
- Proposed severity, by the scale below.
- Kind: real defect, improvement, or trade-off for the user to decide.
- Location: file and line at the current head, or the scenario.
- Evidence: the code and call chain; commands you ran and their output.
- Failure scenario: the input or state that leads to the wrong result, or the maintenance consequence.
- Smallest fix, with everything it touches (callers, contracts, tests, docs).

## Severity scale

- **P0**: blocks merging. Data loss or corruption, a security hole, a crash or an unusable main path, an upgrade or migration that fails.
- **P1**: wrong user-visible behavior or a regression on a main path; a broken contract between components.
- **P2**: wrong behavior under narrower but realistic conditions; a check or criterion that would pass a broken implementation; a tooling defect that makes verification results untrustworthy.
- **P3**: documentation out of step with the code, test gaps, low-probability edge cases with minor consequences, cleanups.

## Cross-exam

When you receive the other side's report, judge each of its findings at the current head on three dimensions, each `ACCEPT`, `REJECT` or `NEEDS_EVIDENCE` with your evidence:

| Dimension | Question |
|---|---|
| fact_evidence | Is the issue real at the current head, as described? |
| severity | Is the proposed severity right by the scale? If not, which one? |
| minimal_fix | Is the smallest fix correct, and does it name everything it touches? |

Mark a finding that duplicates one of yours with both IDs. If checking theirs shows one of your own findings was wrong, withdraw or correct it here.

## Output

Write the full report, naming the head you reviewed, to the file your task names, and reply with one line per P0–P2 finding and the file path. In a read-only session that cannot write files, your final reply is the full report; the caller saves it.
