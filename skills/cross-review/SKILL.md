---
name: cross-review
description: Cross-reviews an existing change (MR/PR, branch or commit range) with two independent reviewers, a fresh subagent and a model from another family through its CLI, who then cross-examine each other's findings; you settle one ledger and fix the confirmed findings when asked. Use when the user asks for a cross review (交叉 review, 交叉审查) of a change.
---

# Cross-review a change

You own the review of one change: pin it, start two reviewers, run their cross-exam, settle every finding and report. The two reviewers are a fresh subagent of your model and a model from another family through its CLI. You are the arbiter: where they disagree, you read the code at the head and decide. Before merging a large MR, when the review should also run the app and fix through sub-MRs until clean, [merge-gate](../merge-gate/SKILL.md) does that.

The reviewers work from merge-gate's [review brief](../merge-gate/references/review-brief.md): what to review, the fields of each finding, the severity scale, the cross-exam and the boundary. Pass on the user's own instructions about scope and focus as written.

## 1. Pin the change

1. Resolve full SHAs for the head and the base: an MR's diff refs from the platform's CLI or API, or the merge-base of a branch with its target.
2. The evidence directory holds the input, the reports and the ledger: the location the user names; otherwise `.cross-review/<id>/` in your worktree, excluded through `.git/info/exclude`.
3. Create one worktree per reviewer, detached at the head (`git worktree add --detach <path> <head>`), so each reads the pinned source and neither touches your checkout or the other's.
4. Write `input.md` in the evidence directory, the review input the brief names:
   - head, base, the command that shows the scope (`git diff --find-renames <base> <head>`) and its size; the area is the whole scope;
   - materials, each with its path and what it is for: the requirement and acceptance criteria, the MR description, failing CI jobs, repository rules;
   - each reviewer's worktree, and the isolation settings for any test a reviewer runs (data directory overrides or a temporary `HOME`) when the repository's tests write to user directories;
   - the language for reports: the user's.

Done when `input.md` is written and both worktrees are at the head.

## 2. Initial review

Start both reviewers in the background at once; each sees only its own task.

- **Subagent**: a fresh subagent whose type inherits your model and reasoning effort, in its worktree, ID prefix `S`, report file `S-initial.md`.
- **Another family**: choose the CLI by [Cross-model calls](../core-spec/references/cross-model.md) and start it read-only in its worktree, ID prefix `C`. From Claude, for example:

  ```bash
  codex exec -C <C worktree> -s read-only -o <evidence>/C-initial.md "Review per <absolute path of review-brief.md>. Review input: <absolute path of input.md>. Your ID prefix is C." < /dev/null
  ```

  Record the session id from the start of its output. When no CLI of another family works after a retry, run a second fresh subagent as `C` and say so in the report.

Before accepting a report, check its worktree: `git rev-parse HEAD` is the head and `git status --porcelain` is empty. A report from a moved or dirty checkout is run again.

Done when both reports are saved and both worktrees check clean.

## 3. Cross-exam

Give each reviewer the other's report in its own session, under the brief's Cross-exam part: continue the subagent (SendMessage in Claude Code), and resume the CLI session from the same worktree, for example `codex exec resume <session id> -c sandbox_mode=read-only -o <evidence>/C-crossexam.md "Cross-exam per the Cross-exam part of <brief path>. The other report: <path of S-initial.md>." < /dev/null`. Save the replies as `S-crossexam.md` and `C-crossexam.md` and check both worktrees again.

Done when both cross-exams are saved.

## 4. Ledger

Write `findings.tsv` in the format of merge-gate's [findings.mjs](../merge-gate/scripts/findings.mjs) header: one row per finding, source `S` or `C`, duplicates marked with `same_as`. Settle each finding from the two cross-exams:

- **CONFIRMED** when the other side accepts its fact and the reporter stands by it. The severity is the one both sides accept; otherwise you set it by the brief's scale. Where they disagree on the minimal fix, write the fix you accept in `note`.
- **REJECTED** when the reporter withdraws it, or when you read the code at the head and find it is not real; give the reason in `note`.
- A finding one side rejects or asks evidence for, and the other still holds, is yours to settle: read the cited code and run the probe at the head, then mark it CONFIRMED or REJECTED. When the evidence cannot be obtained here, mark it CANNOT_VERIFY and name what is missing.
- A trade-off the user must decide (product scope, a migration strategy, a behavior the requirement leaves open) gets status `blocked` with the question in `note`.

Confirmed findings start as status `open`. `node <merge-gate's directory>/scripts/findings.mjs check <findings.tsv>` exits 0, and every count you report comes from its `summary`.

Done when no row is PENDING and the check exits 0.

## 5. Fix, when the user asks for it

Fix the confirmed findings the user names; by default every confirmed P0–P2, with P3 listed as follow-ups. Work on the branch the user names, otherwise a new branch from the change's source head, and deliver as the user says (a single MR with one commit per finding when nothing else is said).

For many findings, group them by area and start one fixer subagent per group, each in its own worktree and branch from the head, with `input.md`, the reports and the IDs it owns. Every fix, yours or a fixer's, meets these:

1. It does what the accepted fix in the ledger says, or the fixer reports why it differs.
2. A behavior fix has a test that fails on the code before the fix and passes after it.
3. The checks CI runs for the touched paths pass locally.
4. One commit per finding, or per group of duplicates, following the repository's commit conventions.

Bring the fixer branches together on the fix branch, rerun the checks across them, push, and follow CI in the background until it passes. Record each commit in `fix` and set its status to `merged`.

## Report

Write for the user under the writing requirements of [explain-as-fool](../explain-as-fool/SKILL.md), in the user's language:

1. The change, the head and the base; the two reviewers with the models that actually ran.
2. The counts from `findings.mjs summary`.
3. The confirmed findings in one table: ID, severity, location, issue and failure scenario, accepted fix, S verdict, C verdict, and whether both accepted it or you settled it.
4. Then, when non-empty: decisions for the user (the `blocked` rows), CANNOT_VERIFY with what is missing, and rejected findings with the reason.
5. When fixes were asked for: the branch and MR, the commits per finding, and CI on the final head.
6. Where the evidence directory is. Remove the review worktrees once the report is written.
