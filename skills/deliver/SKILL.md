---
name: deliver
disable-model-invocation: true
description: One owner implements a requirement and delivers a mergeable MR/PR. Use after spec.md and verify.md are confirmed and frozen.
---

# Deliver from the frozen spec and verify to a mergeable MR

You are the owner of this requirement, from reading the spec until the MR is mergeable. The user has already made their decisions in spec.md and verify.md, and both files are frozen; core-spec committed them to the feature branch and opened a Draft MR. Below, "MR" also means a GitHub PR.

Write plan.md (at full depth), the decision list, the MR description and your report to the user in the language of spec.md, including the fixed phrases this Skill's files quote (such as "None"). Keep the keys that scripts read (`head:`, `verifier-model:`, `verdict:`) exactly as written.

## Run until done

Keep working until every done criterion is met; do not stop midway to wait for the user. The user reviews your decision list before merging and makes corrections then, which costs less time than keeping you waiting.

Stop only before irreversible operations: merging, force-pushing a shared branch, deleting shared data, sending messages outside, changing a shared environment. Leave these to the user.

For any part you cannot do (missing permissions, credentials or environment, or no progress on the same problem after several different approaches), write down why and what you tried, finish the rest first, and put it in the decision list.

**Find at the start what could stop you at the end.** Before the first milestone, look for anything that would keep a done criterion from being met: check that spec.md and verify.md themselves pass the repository checks the delivery must pass; while reading the code, check that each scenario's preconditions can be reached from the entry points it names; at full depth, read the up-front review for checkpoints it says cannot pass as written. Handle right away what "Changing spec or verify" below covers. Anything else goes into the decision list when you find it, as above; it is not a reason to stop and ask.

**When a decision is needed.** For a decision that affects what the user sees or how acceptance is judged (open product behavior, a substitute judging method or a corrected fact, in the decision list in the next section), first ask a model from another family with a read-only command ("decisions during delivery" in [Cross-model calls](../core-spec/references/cross-model.md)): give the question, the relevant spec text verbatim, the options and the evidence, but not your own preference. If its view differs from yours, discuss one more round in the same session. Then you decide and carry on. Choices that affect only how it is implemented, you make yourself.

## Decision list

Put it at the top of plan.md (at full depth) and of the MR description, ordered from largest to smallest impact; the user reviews it closely before merging. Each entry states: the decision, the reason, the other family's opinion (if you asked), what must change if it is overturned, and which scenarios must be rerun. It includes:

- refreezes of spec or verify (next section);
- product behavior the spec leaves open, and the approach you chose;
- when a checkpoint in verify cannot be judged as written, or judging it as written would necessarily give a wrong verdict, the judging method you used instead, unless the cause is a precondition the product cannot construct (next section);
- when spec or verify states an existing fact wrongly (a shortcut, UI text, an entry point name, a default value), your correction based on the code;
- parts you could not do, and why.

## Changing spec or verify

Do not change spec.md or verify.md during delivery, except for the two kinds of change below, which the user authorizes in advance; neither changes a decision or a value to judge by. The independent verifier judges each refreeze against the handoff version, and records one that goes beyond them as relaxing acceptance.

- **A precondition the product cannot construct.** A scenario step needs a state that no entry point can reach, neither on the baseline nor once what the spec requires is implemented, and the spec does not ask to change the code that blocks it: a guard in the code, a disabled path, a state the product never enters. Move every checkpoint of that scenario that depends on the step into coverage blind spots, in the format verify uses for them, each with a substitute test or check that asserts what the checkpoint asserts. Other checkpoints and values stay as they are. First ask another family ("decisions during delivery"), giving it the code that blocks the step. Using this Skill authorizes this kind.
- **A change the user's agent instructions authorize.** The user's instructions for agents (such as AGENTS.md or CLAUDE.md) may authorize other kinds of change to frozen files in advance, with their conditions. Make them only within those conditions, and quote the instruction in the verification input.

Make each as a refreeze, as soon as you find the need and before the head the independent verification judges: one commit that changes only those lines (plus the spec sha256 that verify records, when spec.md changes), ending with the lines `node <this Skill's directory>/../core-spec/scripts/freeze.mjs --spec <spec.md> --verify <verify.md> --trailers` prints; then run `check-delivery.mjs --frozen`. When the two files were handed over as local paths, change the files, use their new sha256 values with `--spec` and `--verify` from then on, and give them in your report. In the decision list, give each refreeze the old and the new text, as a change for the user to review before merging.

Any other change to spec or verify is not yours to make; put it in the decision list. When a done criterion cannot be met without such a change, finish everything else, keep the MR in Draft and say so in your report.

## Done criteria

1. Every item in the "Done criteria" section of verify.md is met, by actually running on the final code, except the wrap-up items in criterion 4; the independent verification's report is the record of this run; the quality commands (lint, type check, tests) pass. Checkpoints in coverage blind spots are marked UNVERIFIED and listed separately in the MR.
2. A model from another family has independently verified the final code, with the verdict PASS.
3. Run the check below against the MR's actual head on the platform, and it passes:

   ```bash
   node <this Skill's directory>/scripts/check-delivery.mjs --repo <worktree> --base <remote ref of the target branch> --head <MR head> [--plan <plan.md>] --owner <your model ID> --report <verification report> [--report <another report>]
   ```

   Give `--plan` at full depth; at light depth there is no plan.md.

4. Draft status is removed; CI passes on the final head; every review comment has either a code change or a reply giving the reason. The wrap-up items, done criteria in verify about the MR or the platform rather than the product (Draft status, the MR description, CI, review comments), are met, checked on the platform.
5. At full depth, plan.md reflects what happened up to the last push. The MR description carries what happened after the last push (verification results, CI, review handling), and at light depth also what plan.md would have recorded.
6. You have reported to the user.

## Start

Use the platform CLI (`gh` for GitHub, `glab` for GitLab) to read the MR's source and target branches. Check out the source branch in your own worktree and fetch the target branch. From the handoff commit on, only you write to this branch.

Run `check-delivery.mjs --repo <worktree> --base <remote ref of the target branch> --frozen` to confirm that spec and verify are the versions the user confirmed. If it fails, restore the handoff versions as it suggests, and record this in the decision list. If you only received local paths and sha256 values for the two files, use `--spec <path>@<sha256> --verify <path>@<sha256>` instead of `--base`; whether to push and open an MR follows the spec's delivery and authorization.

Read the verification depth in verify's key points (`Verification depth: light` or `full`; when verify has no such line, use full). At light, skip the up-front review below, the milestone checks and the code review before independent verification, and do not write plan.md: the decision list, and what plan.md would record (progress, surprises and the reasons for decisions), go into the MR description when you push, and a session that takes over after an interruption continues from the git history, the MR description and the evidence directory. Everything else is the same. At light depth you may also continue in the session that ran core-spec, when the user asks you to there; still work in your own worktree. The user confirmed the depth with the freeze, so it decides how much intermediate checking this delivery needs. When the work turns out riskier than the depth assumed, you may still run a skipped check; record why in Surprises & Discoveries (at light depth, in the MR description).

At full depth, write plan.md following the [plan format](references/plan-format.md), in the same directory as the spec, and commit it with the code. After an interruption, a new session can continue from only plan.md and the git history.

## What the MR carries

The MR carries the product change, spec.md, verify.md, plan.md (at full depth), and verification capabilities that later work reuses (scenarios, fixtures, entry points that follow the repository's rules). When the change alters a feature's user-visible behavior or entry points, the MR also updates that feature's map and scenario scripts to describe the new behavior, whether or not the spec lists them: later requirements walk their entry points from that map. Everything else delivery produces stays outside the repository: evidence, verification inputs and reports, replies from other families, and scripts written for one scenario. They go in the evidence directory: the location the spec's delivery and authorization names, otherwise `.deliver/<topic>/` in your worktree, excluded through `.git/info/exclude`. plan.md and the MR description state conclusions and do not link into it; your report tells the user where it is.

plan.md is read in the repository, so write it within the repository's content rules: relative paths only, and the owner model goes to `check-delivery.mjs` as `--owner`, not into plan.md.

At full depth, before starting the first milestone, ask a model from another family, with a read-only command, to read plan.md against verify and the [verifier brief](references/verifier-brief.md): item by item, write how the final verification will judge each done criterion and each coverage blind spot in verify, and point out where, following this plan, the result would be a fail or could not be judged. The done criteria are written in verify; knowing at the start how each will be judged lets substitute tests and missing verification capability be scheduled into milestones instead of added at the end. Save its reply in the evidence directory; where you disagree, you decide and record it in the decision list. When it says a checkpoint cannot pass as written for one of the two reasons in "Changing spec or verify", refreeze now; otherwise do not change verify, and do not adopt requirements beyond verify.

## Milestones

Each milestone is a piece of behavior that can be verified on its own and maps to some scenarios in verify. After implementing it, run those scenarios on the running app from the entry points the scenarios name, run the quality commands, and fix failures before moving on. If a verification capability a scenario depends on is missing, add it first: prefer reusing what the project already has, add only the smallest piece needed, and leave it as a reusable entry point that follows the repository's rules. Keep the evidence in the evidence directory; plan.md, or at light depth the MR description, holds a one-sentence conclusion.

At full depth, when a later milestone builds on a finished one (uses the interfaces, tools or data it adds), have a fresh-context subagent check the finished one against the spec before you start the later one, following the [milestone check brief](references/milestone-check.md). A problem there would otherwise be built on and found only at the end. A milestone nothing else builds on is left to the code review before independent verification. The check only reports; you make the changes.

**When you dispatch a subagent, choose its type by role.** Writing code, integration and milestone checks need the same judgment as yours, so use a type that inherits your model and reasoning effort: `general-purpose` in Claude Code, the default agent in Codex, with no model parameter in either. Running scenarios, collecting evidence and reading logs mean executing a brief and reading results back, and a model from another family fully re-verifies at the end, so these may go to the `verify-runner` type; when this machine has no such type, use an inheriting type for them too. Reading code to find where something happens is also executing a brief and reading results back: give it to a read-only exploring type (`Explore` in Claude Code) and keep only its conclusion. Your context stays small, and every turn you take costs less. Which model each type uses is decided by the agent definitions on this machine.

## Independent verification

Once every milestone is done and its scenarios pass, at full depth first ask a model from another family to review the code read-only: in a dedicated directory where this head is checked out, run it as described in "read-only" in [Cross-model calls](../core-spec/references/cross-model.md), and have it do only steps 1, 4, 5 and 6 of the [verifier brief](references/verifier-brief.md), without starting the app; its report gives the results of these steps and no verdict. Check each item against the code: fix those that hold, and add tests that fail before the fix and pass after it; for those that do not hold, write down why. Fix this one round only, and save the review report in the evidence directory. Finding code problems here costs less than in independent verification: if the code changes during independent verification, the new head has to be verified again.

**Local gate.** Before you push this head and start the independent verification on it, run the local gate: the checks CI runs for the paths this change touches. Read the repository's CI configuration for the jobs whose path rules match, and run their commands for the affected packages, including cheap static checks; when the repository provides one entry point for this, use it. A focused test selection misses tests elsewhere that use the changed code, and a failure CI finds after verification means a code change and a second verification. Leave to CI only what needs CI itself, such as the merged result or credentials.

Then push and start the independent verification on this head. Ask a model from another family to verify in a separate session: in a dedicated directory where this head is checked out, run it as described in "independent verification" in Cross-model calls, and give it the verifier brief and a verification input; at light depth, the input itself carries the decision list and the commands for the scenarios. The verifier runs every check that verify's done criteria require, on the running app; do not run them all again yourself, unless verify asks for something produced by your own run. Each scenario has already passed at its milestone, and in past deliveries the author's second full run found nothing the verifier missed. While it runs, on the same head and with your own checkout directory and instance (profile, port, data directory), run only the quality commands and the scenarios the project's verification capability runs and judges by script. A failure there means a code change: fix it, and verify the new head.

Verification runs under the [stall guard](scripts/stall-guard.mjs), as Cross-model calls shows: it runs as long as it keeps producing output or results, and is stopped only after 60 minutes with neither. When it ends, look at its output and the evidence directory: if it stalled before finishing, have it continue in the same session; if it failed, decide the next step from the cause.

The verifier only reports; you make the changes. If you change code, run the scenarios the change affects, then verify the new head again. If, after verification, you changed only Markdown, tests or plan.md, you do not need to verify again. The code quality comments and test coverage gaps it lists do not affect the verdict; for each one, make the change or write why you are not making it, and list them in the MR.

Wait on long tasks such as verification, builds or CI as background tasks and come back on their notifications; the time in between goes to work that does not depend on them.

## MR

Push to the Draft MR from the handoff only when you want CI to run: once when the local gate passes, right before independent verification starts, and again only with a code change. Every push starts a pipeline, and delivery ends on the pipeline of the final head, so a push of plan.md or other text alone costs a full CI run. plan.md updates go out with the next code push; what happens after the last push goes into the MR description. CI and independent verification run in parallel, while the MR is still Draft.

Wait for CI with the CI watch, in the background. On GitLab, `node <this Skill's directory>/scripts/ci-watch.mjs --repo <worktree> --mr <iid> --head <MR head>` follows the pipeline of that head, including a merged-result pipeline, and returns at the first failed job; on GitHub, `gh pr checks <number> --watch --fail-fast --interval 60`. Once done criteria 1–3 are met, update the description, remove Draft status, and handle CI and review comments; then check verify's wrap-up items on the platform and list each, with what you read, in the MR description. For CI failures, fix only problems this change introduced or problems that block delivery. When a review comment asks to change behavior the spec defines, do not make that change; put it in the decision list.

Write the MR description for the person who decides whether to merge:

- The decision list, at the top.
- What changed, and which spec decisions it corresponds to.
- Scenario results: each scenario's result; the model used for independent verification, its verdict, and the head it verified; the verification depth, and any skipped check you ran anyway.
- Not verified: checkpoints in coverage blind spots, UNVERIFIED scenarios, and why.
- Code quality comments and test coverage: for each, what you changed or why you did not.
- Verification capabilities you added, and repository gaps you found.

When reviewers need a reading route, write it following [mr-for-human](../mr-for-human/SKILL.md) in this repository.

Once it is mergeable, stop and tell the user it can be merged.

## Report

Write it following the writing requirements of [explain-as-fool](../explain-as-fool/SKILL.md) in this repository, without describing the process: the MR link and status; the entries in the decision list the user most needs to see; the verification depth; the total number of scenarios, how many passed and how many are unverified; the model used for independent verification and its verdict; repository gaps you found; where the evidence directory is.
