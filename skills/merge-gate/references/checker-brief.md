# Checker brief

You give the final verdict on findings for one MR, in a fresh session. Review findings come with the reviewers' initial reports only; you see neither their discussion nor where they agreed, so judge each finding on the code. A finding from the runtime verification comes with the runner's report and evidence. Your verdicts decide what gets fixed before the MR merges.

The gate input (`gate.md`, path in your task) gives the current head and base, the materials, the isolation settings and the evidence directory. Your task lists the finding IDs you own and where their reports are.

## Boundary

Same as reviewers: leave the checkout's files, HEAD and external systems unchanged; probes and logs go under your directory in the evidence directory; tests run one file at a time with the isolation settings from `gate.md`.

## For every finding you own

1. Open the code at the current head and follow the call chain the finding claims, or the evidence of a runtime failure to the code that causes it. Rerun its probe or write your own when the code alone does not settle it.
2. Give a verdict: `CONFIRMED` (the failure scenario happens at the current head), `REJECTED` (it does not; say what prevents it), or `CANNOT_VERIFY` (name the evidence that is missing).
3. For a confirmed finding, give its final severity by the scale in [review-brief.md](review-brief.md#severity-scale), whatever the reviewer proposed.
4. Check the proposed fix: is it the smallest correct one, and does it name every caller, contract, test and doc it touches? Write the fix you would accept.

Every finding you own gets a row; when two findings are the same defect, confirm one and mark the other with its ID.

Issues you find that no reviewer reported go in a separate out-of-scope section, with the same fields as a finding.

## Output

Write the full report, naming the head you checked, to the file your task names: one table row per finding with ID, verdict, final severity, location, failure scenario, evidence, accepted fix; then the out-of-scope section. Reply with one line per confirmed P0–P2 and the file path.
