---
name: deliver
disable-model-invocation: true
description: One owner implements a requirement and delivers a mergeable MR/PR. Use after spec.md and verify.md are confirmed and frozen.
---

# Deliver from the frozen spec and verify to a mergeable MR

You are the owner of this requirement, from reading the spec until the MR is mergeable. The user has already made their decisions in spec.md and verify.md, and both files are frozen; core-spec committed them to the feature branch and opened a Draft MR. Below, "MR" also means a GitHub PR.

Write plan.md, the decision list, the MR description and your report to the user in the language of spec.md, including the fixed phrases this Skill's files quote (such as "None"). Keep the keys that scripts read (`- owner:`, `head:`, `verifier-model:`, `verdict:`) exactly as written.

## Run until done

Keep working until every done criterion is met; do not stop midway to wait for the user. The user reviews your decision list before merging and makes corrections then, which costs less time than keeping you waiting.

Stop only before irreversible operations: merging, force-pushing a shared branch, deleting shared data, sending messages outside, changing a shared environment. Leave these to the user.

For any part you cannot do (missing permissions, credentials or environment, or no progress on the same problem after several different approaches), write down why and what you tried, finish the rest first, and put it in the decision list.

**When a decision is needed.** For a decision that affects what the user sees or how acceptance is judged (the first three kinds in the decision list in the next section), first ask a model from another family with a read-only command ("decisions during delivery" in [Cross-model calls](../core-spec/references/cross-model.md)): give the question, the relevant spec text verbatim, the options and the evidence, but not your own preference. If its view differs from yours, discuss one more round in the same session. Then you decide and carry on. Choices that affect only how it is implemented, you make yourself.

## Decision list

Put it at the top of plan.md and of the MR description, ordered from largest to smallest impact; the user reviews it closely before merging. Each entry states: the decision, the reason, the other family's opinion (if you asked), what must change if it is overturned, and which scenarios must be rerun. It includes:

- product behavior the spec leaves open, and the approach you chose;
- when a checkpoint in verify cannot be judged as written, or judging it as written would necessarily give a wrong verdict, the judging method you used instead;
- when spec or verify states an existing fact wrongly (a shortcut, UI text, an entry point name, a default value), your correction based on the code;
- parts you could not do, and why.

Do not change spec.md or verify.md during delivery.

## Done criteria

1. Every item in the "Done criteria" section of verify.md is met, by actually running on the final code; the quality commands (lint, type check, tests) pass. Checkpoints in coverage blind spots are marked UNVERIFIED and listed separately in the MR.
2. A model from another family has independently verified the final code, with the verdict PASS.
3. Run the check below against the MR's actual head on the platform, and it passes:

   ```bash
   node <this Skill's directory>/scripts/check-delivery.mjs --repo <worktree> --base <remote ref of the target branch> --head <MR head> --plan <plan.md> --report <verification report> [--report <another report>]
   ```

4. Draft status is removed; CI passes on the final head; every review comment has either a code change or a reply giving the reason.
5. plan.md reflects what actually happened, and you have reported to the user.

## Start

Use the platform CLI (`gh` for GitHub, `glab` for GitLab) to read the MR's source and target branches. Check out the source branch in your own worktree and fetch the target branch. From the handoff commit on, only you write to this branch.

Run `check-delivery.mjs --repo <worktree> --base <remote ref of the target branch> --frozen` to confirm that spec and verify are the versions the user confirmed. If it fails, restore the handoff versions as it suggests, and record this in the decision list. If you only received local paths and sha256 values for the two files, use `--spec <path>@<sha256> --verify <path>@<sha256>` instead of `--base`; whether to push and open an MR follows the spec's delivery and authorization.

Write plan.md following the [plan format](references/plan-format.md), in the same directory as the spec, and commit it with the code. After an interruption, a new session can continue from only plan.md and the git history.

Before starting the first milestone, ask a model from another family, with a read-only command, to read plan.md against verify and the [verifier brief](references/verifier-brief.md): item by item, write how the final verification will judge each done criterion and each coverage blind spot in verify, and point out where, following this plan, the result would be a fail or could not be judged. The done criteria are written in verify; knowing at the start how each will be judged lets substitute tests and missing verification capability be scheduled into milestones instead of added at the end. Save its reply in the evidence directory; where you disagree, you decide and record it in the decision list. verify does not change, and requirements beyond verify are not adopted.

## Milestones

Each milestone is a piece of behavior that can be verified on its own and maps to some scenarios in verify. After implementing it, run those scenarios on the running app from the entry points the scenarios name, run the quality commands, and fix failures before moving on. If a verification capability a scenario depends on is missing, add it first: prefer reusing what the project already has, add only the smallest piece needed, and leave it as a reusable entry point that follows the repository's rules. Store evidence in `evidence/` in the same directory as plan.md; plan.md holds only the path and a one-sentence conclusion.

When each milestone is done, have a fresh-context subagent check it against the spec, following the [milestone check brief](references/milestone-check.md). It only reports; you make the changes.

**When you dispatch a subagent, choose its type by role.** Writing code, integration and milestone checks need the same judgment as yours, so use a type that inherits your model and reasoning effort: `general-purpose` in Claude Code, the default agent in Codex, with no model parameter in either. Running scenarios, collecting evidence and reading logs mean executing a brief and reading results back, and a model from another family fully re-verifies at the end, so these may go to the `verify-runner` type; when this machine has no such type, use an inheriting type for them too. Which model each type uses is decided by the agent definitions on this machine.

## Independent verification

Once every milestone has been checked and the affected scenarios pass, first ask a model from another family to review the code read-only: in a dedicated directory where this head is checked out, run it as described in "read-only" in [Cross-model calls](../core-spec/references/cross-model.md), and have it do only steps 1, 4, 5 and 6 of the [verifier brief](references/verifier-brief.md), without starting the app; its report gives the results of these steps and no verdict. Check each item against the code: fix those that hold, and add tests that fail before the fix and pass after it; for those that do not hold, write down why. Fix this one round only, and save the review report in the evidence directory. Finding code problems here costs less than in independent verification: if the code changes during independent verification, the new head has to be verified again.

Then your full self-verification and the independent verification start at the same time, on the same head. Ask a model from another family to verify in a separate session: in a dedicated directory where this head is checked out, run it as described in "independent verification" in Cross-model calls, and give it the verifier brief and a verification input. You and the verifier both start the app, each with your own checkout directory and instance (profile, port, data directory).

Verification runs in 60-minute cycles. When a cycle ends, look at its output and the evidence directory: if it has not finished, have it continue in the same session; if it failed, decide the next step from the cause.

The verifier only reports; you make the changes. If you change code, verify the new head again. If, after verification, you changed only Markdown, tests, or the directory holding plan.md (plan, evidence), you do not need to verify again. The code quality comments and test coverage gaps it lists do not affect the verdict; for each one, make the change or write why you are not making it, and list them in the MR.

When waiting on long tasks such as verification, builds or CI, run them in the background and come back on the notification when they finish.

## MR

Push to the Draft MR from the handoff. Once done criteria 1–3 are met, update the description, remove Draft status, and handle CI and review comments. For CI failures, fix only problems this change introduced or problems that block delivery. When a review comment asks to change behavior the spec defines, do not make that change; put it in the decision list.

Write the MR description for the person who decides whether to merge:

- The decision list, at the top.
- What changed, and which spec decisions it corresponds to.
- Scenario results: each scenario's result and evidence path; the model used for independent verification, its verdict, and the head it verified.
- Not verified: checkpoints in coverage blind spots, UNVERIFIED scenarios, and why.
- Code quality comments and test coverage: for each, what you changed or why you did not.
- Verification capabilities you added, and repository gaps you found.

When reviewers need a reading route, write it following [mr-for-human](../mr-for-human/SKILL.md) in this repository.

Once it is mergeable, stop and tell the user it can be merged.

## Report

Write it following the writing requirements of [explain-as-fool](../explain-as-fool/SKILL.md) in this repository, without describing the process: the MR link and status; the entries in the decision list the user most needs to see; the total number of scenarios, how many passed and how many are unverified; the model used for independent verification and its verdict; repository gaps you found.
