---
name: merge-gate
disable-model-invocation: true
description: Gates a large MR/PR before it merges. Cross-model review and runtime verification on its latest head, fixes through sub-MRs merged into the source branch, repeated until the head is clean.
---

# Gate an MR before it merges

You are the gate owner for one MR, from its latest head until it can merge. Below, "MR" also means a GitHub PR; a **sub-MR** is an MR whose target is this MR's source branch.

Three rules hold throughout:

- **Run unattended.** When a decision is needed, decide, write it in `decisions.md` in the evidence directory (decision, reason, what changes if it is overturned, what must be rerun), and carry on. The user reads the decisions before merging. Merging a sub-MR into the source branch after its CI passes is part of this Skill's authorization. Stop before merging this MR into its target, and before the other irreversible operations: force-pushing a shared branch, deleting shared data or external accounts' data, sending messages outside, changing a shared environment.
- **Parallel agents share this machine.** User config and data directories, the repository's stash list and branches, test accounts and their quotas, log directories and ports are reachable by every agent you start. Each agent works in its own worktree and branch with the isolation the gate input names; every brief points to it.
- **Counts come from the ledger script.** Every number of findings you write in a report, a decision or the MR description comes from `scripts/findings.mjs summary`.

## Where things go

The evidence directory holds the gate input, the ledger, every report, decisions and probes: the location the user names; otherwise `.merge-gate/<MR id>/` in your worktree, excluded through `.git/info/exclude`. The MR carries only product changes made through sub-MRs.

Platform operations (read the MR, open, rebase and merge sub-MRs, update the description) use the platform's CLI or API, under the host and permission rules of the environment you run in. Wait for CI in the background: on GitLab with deliver's [ci-watch.mjs](../deliver/scripts/ci-watch.mjs), on GitHub with `gh pr checks <number> --watch --fail-fast --interval 60`.

Choose subagent types by role. Reviewers, checkers and fixers need the same judgment as you: use a type that inherits your model and reasoning effort. Running scenarios and reading their evidence may go to a scenario-running type when the machine has one.

## 1. Gate input

Write `gate.md` in the evidence directory. Every brief reads it, so each run's facts live there once. It holds:

1. **Heads.** The gate head, where the gate starts and the fix delta is measured from; the merge-base with the target; the diff command (with rename detection for large moves) and its size. The current head, which every stage runs on: update it before each stage starts, and every report names the SHA it ran on. When a previous gate ran on this MR, its head and ledger: reviewers then focus on changes since that head, and its confirmed decisions are not raised again without new evidence.
2. **The head that will merge.** Gate the code that will actually merge. When the target branch has moved, merge it into the source branch first, through a sub-MR like any fix, and start from the result. When that merge waits on something outside this repository, such as a paired change in another repository, record the decision and the rerun it will need.
3. **CI on the gate head.** The newest full pipeline on the source branch head. Required jobs that already fail there block every sub-MR: fix them first, in their own sub-MR.
4. **Materials.** The requirement and its acceptance criteria (spec, verify, issue, the MR description), repository rules, and the user's confirmed product boundaries, each with its path and what it is for.
5. **Areas.** Three to five review areas that together cover the diff, each with one owner. A check that crosses areas, such as whether code ported from elsewhere is complete, has exactly one owner.
6. **Shared state.** How each kind of shared state is isolated: data directory overrides or a temporary `HOME` for every test and app run, one worktree, branch and runtime instance per agent. State that cannot be isolated, such as a test account's quota or settings, has its original value recorded so the agent that changes it restores it and reads it back. A test or scenario that cannot run isolated is left out and recorded as UNVERIFIED. Snapshots of the real user directories (path, mtime, hash), compared at the end of every stage, catch isolation gaps; a changed snapshot is investigated and restored before anything that ran in that window is trusted.
7. **Verification level and scenario list.** See [Runtime verification](#runtime-verification). The list names every scenario to run; scenarios with external side effects (creating data in real accounts, sending messages, spending real money) are left off it, and the list says why.
8. **Boundaries for readers.** Reviewers and checkers leave the checkout, HEAD and external systems unchanged and put probes under the evidence directory.
9. **Language** for everything people read: reports, decisions, the MR description. Default is the user's language; ledger keys and script output stay as written.

Done when `gate.md` has all nine parts and pre-existing CI failures are fixed or recorded as blocking.

## 2. Review and run on the current head

Start the review and the runtime verification together on the same head. They need each other's results only at the fix step, and a runtime failure that matches a review finding is independent evidence for it.

### Review

1. **Initial review.** One reviewer from another model family over the whole MR, started read-only as [Cross-model calls](../core-spec/references/cross-model.md) shows; its final reply is its full report, saved to the reply file. One fresh subagent per area. Each gets [review-brief.md](references/review-brief.md), `gate.md` and its area. When no other-family CLI can be used, run every reviewer in a fresh session of your model and say so in the report.
2. **Cross-exam.** Give each side the other side's report, in the same sessions, under the cross-exam part of the review brief. Put every finding into `findings.tsv` (format in the header of [findings.mjs](scripts/findings.mjs)) with verdict `PENDING`, and mark duplicates with `same_as`.
3. **Independent check.** Start one fresh subagent per area with [checker-brief.md](references/checker-brief.md), the initial reports for that area and `gate.md`. Leave out the cross-exam and the ledger. Record their verdicts and final severities in the ledger. Their verdicts settle every finding; their out-of-scope items enter the ledger as new rows with source `checker`.

When a review finding and a runtime failure point at the same defect, start its fix without waiting for the checker; if the checker then rejects it, close the sub-MR.

### Runtime verification

Use the strongest verification the repository has, and write in `gate.md` which level applies:

1. **A verification Skill or acceptance scenarios** (for example a project `verify-<app>` Skill, or the verify.md of the requirement): run them all.
2. **End-to-end or integration suites and documented start commands only**: run the parts that cover the changed areas, plus a smoke run of the main path at each entry point.
3. **Nothing runnable for the change**: derive a short list of key scenarios from the requirement, the MR description and the changed behavior, and run them at the real entry points (start the app, call the CLI, send the HTTP request). One-scenario scripts stay in the evidence directory.
4. **The app cannot be started here** (missing environment, credentials or accounts): the runtime result is UNVERIFIED, with what is missing.

A missing capability is reported as a repository gap. Building new verification capability into the repository is a separate decision for the user.

Start a runner with [runtime-brief.md](references/runtime-brief.md) and `gate.md`. Handle its non-PASS results by class:

- **Product defect, or a defect in a scenario script or the verification tooling** in the repository: a ledger row with source `runtime`. Unless it matches a review finding, a fresh checker judges it from the runner's evidence, so its fixer gets an accepted fix like any other finding. Frozen acceptance documents, such as the spec.md and verify.md of an MR delivered with deliver, stay unchanged: a different way of judging a checkpoint goes into `decisions.md`, and a changed requirement goes to the user.
- **Environment failure**: rerun after comparing the shared-state snapshots.

## 3. Fix

Fix scope: every confirmed P0, P1 and P2. Confirmed P3 findings get status `deferred` with a note and go into the MR description as follow-ups, unless the user widened the scope. A P0–P2 finding whose fix lies outside this repository or needs a product decision from the user gets status `blocked`, a decision, and a note naming what unblocks it. A `CANNOT_VERIFY` finding is `blocked` when its proposed severity is P0–P2, `deferred` when P3, with the missing evidence in its note.

1. Group the findings to fix by area. Start one fixer per group, in its own worktree from the current head, with [fix-brief.md](references/fix-brief.md), `gate.md`, the checker reports and the IDs it owns. Set the ledger status to `fixing` with the sub-MR once it exists.
2. For each sub-MR: wait for its CI, read its diff against the checker's accepted fix, and merge it into the source branch when CI passes and the diff holds. Use the repository's merge convention for sub-MRs (squash or merge commit). Set the status to `merged`.
3. After each merge, rebase the open sub-MRs on the new source head and let their CI run again.
4. A follow-up to a running fixer's work, such as a reviewer's comment on the same files, goes to that fixer in its session.

Done when every P0–P2 finding is `merged` or `blocked`.

## 4. Recheck

A recheck round runs on the new head; update the current head in `gate.md` first. In parallel:

1. Run the runtime verification at the same level. The first round reruns the whole list; a later round reruns the scenarios the previous round's fixes can affect, or the whole list when those fixes touch shared infrastructure (startup, persistence, the verification tooling).
2. Review the **fix delta** since the previous round's head and the interactions between the fixes: one other-family reviewer and one fresh subagent, with the review brief and the delta as their scope. A P0–P2 finding from this review goes to one fresh checker before it is fixed.

Fix what the round confirms as in step 3; the next round reviews those fixes. Run at most two recheck rounds. When the second round still confirms a P0–P2 finding, leave it `open` with its evidence and report the gate as FAIL.

## Done criteria

1. `node <this Skill's directory>/scripts/findings.mjs check <findings.tsv> --final` exits 0, or 3 with every blocked item recorded in `decisions.md`.
2. CI passes on the final head.
3. The runtime verification at the chosen level passes on the final head, apart from scenarios left off the list with a reason and results recorded as accepted by design in `decisions.md`; or it is UNVERIFIED, with what is missing.
4. The shared-state snapshots match, or every difference is explained and restored.
5. The final head named in your report is the source branch head on the platform.
6. The MR description has the gate section below, read back from the platform after writing.
7. Worktrees and runtime instances the gate created are removed or stopped, once their branches are merged and their status is clean; the evidence directory stays.

The gate result is **PASS** when all seven hold, the check exits 0 and the runtime verification passed. It is **BLOCKED** when everything that can be done here is done but something waits outside: blocked findings (the check exits 3), runtime verification UNVERIFIED, or CI that cannot run; each item names what unblocks it. It is **FAIL** when the round limit was reached.

## MR description and report

Add a gate section at the top of the MR description: the gate head and final head; the result; the findings table from `findings.mjs summary`; the sub-MRs; the verification level and scenario counts on the final head; decisions; blocked items and what unblocks each; deferred P3 follow-ups; what remains before merging.

Report to the user following the writing requirements of [explain-as-fool](../explain-as-fool/SKILL.md): the MR link and the gate result; the findings table; who found, who confirmed and who fixed (models and roles, in three lines); the verification level and results; the decisions the user most needs to see; blocked items; repository gaps; where the evidence directory is; what was cleaned up.
