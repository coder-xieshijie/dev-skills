---
name: core-spec
description: Converges a conversation and its materials into spec.md, the core decisions; when delivery will be automated, also writes verify.md, the acceptance requirements. Use after discussion and clarification are finished, including when the user confirms core-grill's decision summary.
---

# Converge a discussion into a spec, and write the acceptance requirements

Deliver two self-contained Markdown files. Write spec.md in the language of the decision summary (or of the user's request when there is none), unless the user or the repository's documentation rules specify another language; write verify.md in the same language as spec.md, also when the spec was given to you:

- **spec.md** "<topic>: Core Decisions and Constraints": what has been chosen and what must be satisfied. A reader who skims it grasps the most important changes; a reader who reads it closely can judge, item by item, whether a design or an implementation matches what was agreed.
- **verify.md** "<topic>: Acceptance Requirements": what it takes for an implementation to count as meeting the spec: where to operate, what results to observe, and what evidence to keep before declaring it done.

Both are done in the same piece of work: gaps found by entry point and state while writing the acceptance requirements go back into the spec, and the spec is final only when verify is written. The two are gap-checked together, confirmed by the user together, frozen together, and then committed together to the feature branch and handed to deliver. They remain two files: the spec is for people and the implementer, verify is for the implementer and the independent verifier, and after freezing each is checked by its own sha256. Settle the spec first, then write verify.

Choose the scope by the starting point the user gives:

- **Starting from a discussion** (default): do steps 1–9.
- **Spec only** (for example for solution design, design-for-review, plan-for-agents or reporting): deliver after steps 1–4.
- **A finalized spec exists; write the acceptance requirements**: start at step 5 and treat the given spec as the only basis; do not converge it again. When steps 5–7 need to write back into the spec, change only the affected parts, following the rules of steps 1–4.

This is the converging step after a discussion ends. Build on the clarification and grilling already done (usually the decision summary from [core-grill](../core-grill/SKILL.md) that the user confirmed); only unresolved conflicts that affect the final conclusions need further questions.

## 1. Find the agreements that are finally in effect

Read the current conversation, the past conversations the user points to, and the related requirements, ADRs, terminology and design documents. Across sessions, use whatever session-reading capability is available, or locate local records by exact session ID; when a summary is missing, pagination has not been read to the end, or the continuation of a fork is not visible, keep reading the original text relevant to the decisions. State clearly which materials you could not obtain; do not fill them in with guesses.

First, while you work, build a short mapping: **issue → final agreement → basis → confirmation status → location in the spec**. It serves checking; by default, do not deliver a separate decision ledger.

- **Confirmed decisions:** find the authoritative final version that the user chose, approved or explicitly specified. Read a short "agreed" or "A" together with the question and options it answers. A later explicit revision replaces the earlier conclusion.
- **Preserved behavior and constraints:** separate facts about the current state from target requirements. Use the confirmed scope to judge which existing behavior must be kept; a description of the current state alone cannot be taken as a requirement that it stay unchanged forever.
- **Suggestions and open items:** assistant suggestions, inferences from source code, and drafts that were not adopted keep their original status. Being in a newer document, appearing repeatedly, or not being objected to by the user does not mean approved.

When you meet a conflict, first check the context and the scope in which each agreement applies. Source code can confirm the current state or a limitation; it cannot decide the target behavior for the user. When there really is an unresolved conflict that affects scope, behavior or trade-offs, state the conflict and its impact, ask the minimum necessary question, and meanwhile organize the parts it does not affect; until it is answered, keep the status "pending confirmation". Interface naming, file layout and the like are left to later design; do not reopen grilling for them.

Done criteria: for every issue that affects the goal, scope, behavior or correctness, the final agreement, superseded content and content not yet confirmed can be told apart.

## 2. Distill the decisions, keep the boundaries for judging

Select content around "what makes a future design or implementation conform to the agreements":

- The chosen behavior, ownership of responsibilities, scope of change, and the boundaries of reuse and compatibility.
- Conditions, exceptions and limits that change the judgment of correctness, and costs explicitly accepted.
- Invariants confirmed as ones that must hold; as the task requires, keep semantics such as metering, concurrency, persistence and recovery.

Turn questions and answers into direct conclusions, and turn concrete implementation suggestions back into the constraints they are meant to satisfy. Keep an interface, field or implementation mechanism as a requirement only when it has itself been explicitly chosen and forms a constraint.

Remove the investigation process, rejected options, repeated explanations, implementation steps and detailed test lists. A necessary reason may explain a trade-off in one sentence; a concrete example that removes ambiguity from a rule goes next to the decision it belongs to. Keep key conditions and numbers; do not replace an original checkable rule with "stay compatible" or "ensure reliability".

Group by question and by the agreements that need to be judged together; do not mechanically split into "development decisions" and "review principles", and do not break up one decision along code directories or work phases.

Besides the decisions themselves, the spec must state the four items below. The agent in the delivery stage judges on its own from the spec; without them it can only guess, or stop and ask a person.

| Item | What to write | What goes wrong without it |
|---|---|---|
| Purpose | One or two sentences: what the user can do after this is done that they could not do before, and how to see it working | The implementation satisfies only the letter of the clauses and builds something that runs but is of no use |
| Non-goals | What is explicitly not done this time, especially adjacent features that are easy to change in passing | Scope grows during autonomous execution, changing behavior nobody asked for |
| Hard constraints | Where they apply, check each category: performance, platform, compatibility, dependencies and security; keep the original numbers | Conditions that must be met are treated as preferences that can be traded off |
| Delivery and authorization | Which repository and base branch to deliver to; whether the agent may push its own branch and open an MR/PR. Merging and other irreversible operations are always left to the user and are not authorized here | Delivery stops halfway to wait for a person, or pushes somewhere it should not go |

For these four items, write only what has a basis; do not decide them for the user. For non-goals, write what the user has made explicit; when the discussion did not cover them, write "No separate non-goals listed", and raise one as a minimum necessary question only when a specific adjacent matter would materially change the delivery scope. Delivery and authorization are decided only by the user: ask when the spec is for automated delivery and the discussion did not settle it; when the spec is not for automated delivery, you may leave it out.

## 3. Write the spec in a pyramid structure

Open with a short statement of what the document is for and how binding it is, which may be adjusted to the topic:

> This document records the core decisions and constraints of this change. It is the common basis for design, implementation and code review, and is also used for checking decisions by hand and for explaining the change to others.
>
> The concrete implementation may vary, but it must satisfy these agreements; when an agreement needs to change, its impact should first be made clear and the change confirmed again. This document describes target requirements; it does not mean the implementation is done or verification has passed.

After this statement, write the purpose in one or two sentences, then start the body.

The body has two layers:

### Layer 1: the core decisions

Usually pick 3–5, fewer when there is less content. Prefer the decisions that most affect this work's direction, external behavior, scope and trade-offs, so that one screen gives the overall picture.

Write each point as **a conclusion sentence + the necessary explanation**, so the reader knows what exactly was chosen. The opening deliberately does not cover every detail; do not abstract conclusions into topic labels such as "migration scope" or "data consistency" in order to cover everything, and do not compress all clauses evenly and pile them up at the top.

### Layer 2: complete decisions and constraints

Expand around the core decisions; put other important agreements in the nearest group, and add separate groups when needed. Groups are a reading structure; they do not mean that the same number of modules must be implemented.

- Each heading states a decision directly, followed right below by the related rules, boundaries and trade-offs.
- The summary and the body may repeat each other where necessary; each detailed rule keeps one authoritative place in the body, and other places refer to it.
- Number items in final reading order. Do not carry old numbers used only for organizing and checking into the spec; keep stable identifiers that are already referenced from outside.
- Non-goals and hard constraints go in layer 2, as their own group or merged into the related decisions; delivery and authorization go in a separate section at the end.

When the final agreements are complete, do not add an empty "Open questions" section. When key items are still open, mark the document clearly as a draft pending confirmation, and isolate those questions at the end, keeping them out of the settled constraints. Necessary source links may stay next to the text they support; the body should be enough to understand the rules on its own, without the reader going back to the chat.

When you need to decide how to layer the summary and the full rules, or how to handle superseded conclusions, read the [convergence example](references/spec-example.md).

Write only one spec file, with no process ledger, extra summary or split versions, into the directory the user specified this time; if no directory was given, ask first, and meanwhile continue the organizing that does not need to be written to disk. For automated delivery, this directory must be in the target repository; step 9 commits both files to the feature branch. When updating an existing spec, keep the whole document consistent; keep the original discussions and source documents, and do not delete them because of the convergence.

## 4. Done criteria for the spec

Measured against the original requirements, accepted ADRs and final clarifications read in step 1, the written spec meets the conditions below. Record the scope of sources it is based on and the version of the spec; intermediate summaries serve only as an index. Identical text before and after a reordering proves only that this reordering lost no words; it does not prove that earlier compression left nothing out.

### Conditions

Judge by the mapping "issue → agreement → basis → location in the spec":

- **Source material → spec:** every confirmed key decision, limit, exception and accepted trade-off has a place in the spec. Merging clauses must not swallow conditions, and removing the process must not remove the conclusions along with it.
- **Spec → source material:** every normative statement has a basis; no suggestion has been promoted to a commitment, and no new requirement has been added under cover of tidying up the document.
- **Summary → body:** every core decision is expanded in the body; the summary does not go beyond the body, and does not make a local exception look as if it applies everywhere.
- **Self-contained reading:** a person skimming the opening grasps the main points; an agent reading the body can judge conformance or deviation. Target requirements are clearly separated from the state of implementation and verification.
- **What automated delivery needs:** the purpose and non-goals are stated; for automated delivery, delivery and authorization are stated. All four items have a basis, and none was decided for the user.
- **Lean and effective:** process, superseded options and unnecessary implementation details are not mixed into the final requirements. Existing engineering standards may be referenced explicitly, naming the applicable document and scope; the key boundaries that decide this change's behavior are still stated in the body.

For a suspected omission or ambiguity, judge its impact with a counterexample: **is there a reasonable implementation that matches the current text but violates a confirmed agreement?** If you can name the concrete scenario and the source agreement it violates, add the minimum necessary wording next to the corresponding decision. Important accepted costs should also be stated directly, not left for the reader to infer.

Suggestions from a check are not new requirements. For each issue, record "basis, location in the spec, impact, disposition": if an existing clause clearly covers it, nothing needs adding; if an existing engineering standard can carry it, a reference is enough; pure naming or the way of implementing is left to design. "The original draft was more detailed" alone is not grounds for restoring everything; handle conflicts or open choices in the sources per step 1.

When you need to judge which omissions must be filled and which need not, read the [check cases](references/spec-example.md#check-cases-and-acceptance-judgments). After a fix, the affected clauses, the adjacent boundaries and the summary must still meet these conditions.

### Pass conditions

Within the declared scope of sources, key omissions, additions without basis, substantive conflicts and ambiguities that would change the implementation are all resolved; the original key agreements can be located, the summary matches the body, and process and unnecessary details are removed. Equal item counts, complete keywords or a passing format check cannot replace this judgment.

When material that affects key agreements cannot be obtained, or key decisions are still unconfirmed, deliver a draft pending confirmation that clearly marks the gaps, stating what is missing and its impact; do not claim a full pass. Passing this check means only that the document faithfully carries the agreements; it does not mean the product implementation or tests have passed.

In the full workflow, the gap check in step 7 verifies independently against the source agreements; do not add a round of author re-review here.

**For spec only**, deliver at this point. The final reply gives the file link and a short check conclusion: which sources were checked, which substantive problems were fixed, and whether it passed or which gaps remain. By default the checking process stays in the working context; no separate long report is needed.

## 5. Find gaps in the spec by entry point and state

For each feature the spec touches, go through its user entry points (buttons, keyboard shortcuts, CLI, API, and so on) and the states that apply (default, loading, empty, error, disabled, cancelled, triggered repeatedly, concurrent, after restart), and find behavior the spec has not settled. When the project has a feature map, first bring the map for these features in line with the product (when the project's verification Skill says how to maintain it, do it that way), then go through every entry point the map lists, not only one convenient entry point. A map goes stale as the product changes, and entry points and states found from a stale map miss things too.

For a gap that would change how a scenario is judged, update the spec per steps 1–4: find the final agreement in the conversation, and if it is still undecided, ask the user the minimum necessary question. Until it is answered, mark the related content as pending confirmation and continue with the rest. A gap that affects only the way of implementing, not the judgment, is left to the implementation.

Done criteria: every relevant entry point and state is covered by an agreement in the spec, confirmed as not applicable, or raised as a question.

## 6. Write verify from the spec

Read [how to write verify](references/verify.md) and write verify.md by its rules: turn the spec's normative content into requirements that can be judged, design scenarios run from real entry points for behavioral requirements, locate the project's verification capabilities, and list verification tooling gaps and coverage blind spots. If, while writing verify, you find more behavior the spec has not settled, go back to step 5.

Done criteria: the done criteria of every section of [how to write verify](references/verify.md) are all met.

## 7. Gap check by a model from another family

An author checking their own work tends to let their own omissions pass, and models from the same family tend to make the same mistakes; the delivery stage is fully automated, so a problem missed here is carried all the way into the MR. Run the gap check in a new session, using the CLI of a model from a different family than the one that wrote spec and verify. It gets the spec, verify, the spec's clause list (generated by `node <this Skill's directory>/scripts/clauses.mjs --spec <spec.md> --out <file>`, numbered by list item, paragraph and table row), the related repository and the source agreements: the request text, accepted ADRs, and the user's final decisions in their own words together with the questions and options they answered (when there is a core-grill decision summary, use it directly; otherwise extract them from the step 1 mapping and save them as one file). It does not get the author's reasoning or drafts. What to check and how to report are written in the [gap check brief](references/gap-check.md); reference this brief in the call, and do not write another. How to start the session is in [cross-model calls](references/cross-model.md).

The gap checker only reports; this session handles the report item by item and makes the changes:

- Problems in verify (missing coverage, checkpoints that cannot fail, going beyond the spec, entry points that do not exist, over-specification): fix verify.md directly. Before adding a requirement, scenario, check or tool for a finding, look for an existing clause, test or runtime check that already covers it; add only what would otherwise let a wrong implementation pass, and give the reason in the final reply for findings you did not add.
- Problems in the spec: when the source agreements already give a basis, fix the spec directly per steps 1–4; when the spec contradicts itself, lacks a decision that would change the judging, or lacks delivery and authorization, and the source agreements give no basis, turn it into a minimum necessary question for the user; after the answer is written into the spec per steps 1–4, update the corresponding scenarios.
- Findings that do not hold: give a one-sentence reason in the final reply.

The gap check runs at most two rounds over your own revisions. Issues still unresolved after the second round stay as not passed and go into the final reply; of these, only those that need the user to choose a goal, behavior or trade-off are turned into questions. When the user's answers add or change requirements, including after the second round, run one more check limited to the changed clauses: the files sent to the user for freezing must have been checked by the other family. This check does not count toward the two rounds, and you run it without asking the user.

When the other family's model cannot be used (not installed, not logged in, or still failing after a retry), first switch to another CLI of a different family; if none can be used, record "cross-model gap check not completed": you may deliver a draft pending confirmation, but do not ask the user to freeze. Run the gap check with the same family only when the user explicitly relaxes this requirement, and say so in the final reply.

Done criteria: every issue in the report has been fixed, turned into a question and answered, kept as not passed, or given a reason why it does not hold.

## 8. Ask the user to confirm once

Run `node <this Skill's directory>/scripts/freeze.mjs --spec <spec.md> --verify <verify.md>`. It prints the sha256 of both files and checks that the spec hash recorded in verify.md's source matches the spec's current content; if it does not, update verify.md's source first, then run it again.

The final reply gives the file links and sha256 of spec and verify, the number of requirements and the number of scenarios, the smoke set, tooling gaps, coverage blind spots, the gap check result (the model used for the gap check, the number of issues and how they were handled), and the questions still pending confirmation, and asks the user to confirm once; take the sha256 from the script's output, do not copy it by hand. When the cross-model gap check was not completed, state the reason and do not ask the user to freeze. After the user confirms, both files are frozen and are not changed during the delivery stage; go on to step 9. When a change is needed, come back to this Skill, and gap-check and confirm again.

## 9. Commit to the feature branch and open a Draft MR/PR for deliver

In this step, MR also means a GitHub PR, and Draft means a draft PR on GitHub and a Draft MR on GitLab. deliver starts from the feature branch and the MR, and can check it out in any worktree or on any machine, without depending on this session's working directory. After the user confirms:

1. On the feature branch of the target repository, commit spec.md and verify.md on their own, adding only these two files; this is called the handoff commit below. End the commit message with the `Frozen-Spec` and `Frozen-Verify` lines printed by `node <this Skill's directory>/scripts/freeze.mjs --spec <spec.md> --verify <verify.md> --trailers`, exactly as printed; deliver reads the sha256 values the user confirmed from these two lines, so they must not be copied by hand or rewritten. If there is no feature branch yet, name it by the repository's rules and create it from the base given in the spec's delivery and authorization. Commit separately the other changes this session left in this repository (for example terminology or ADRs written during grilling); deliver cannot see changes left in the working tree.
2. Push the feature branch and open a Draft MR/PR, with the target branch taken from the spec's delivery and authorization; set the attributes the platform requires (for example the merge method) by the repository's rules and read them back. The description states: this is the delivery MR for this requirement; spec and verify are frozen, with the two sha256 values; deliver commits the code to this same MR.
3. If this session's worktree has the feature branch checked out, switch it to detached HEAD so that deliver can check the branch out in its own worktree.

The final reply gives the handoff information: the MR/PR link, which is the only input deliver needs to start; also list the feature branch, the handoff commit, the paths of the two files in the repository and the two sha256 values, for the user to check and keep on record.

When the spec's delivery and authorization does not allow pushing or opening an MR, or the repository's rules do not allow committing these two files, skip the three items above and hand off local paths only: the handoff information becomes the local paths of the two files and the two sha256 values; deliver starts in an environment that can read them, and whether it pushes or opens an MR still follows the spec's delivery and authorization.

During delivery, deliver does not come back to this Skill: choices the spec did not settle, checkpoints in verify that cannot be judged as written, and corrections of existing facts all go into its decision list, which the user reviews before merging. When, after reviewing the decision list, the user wants to change spec or verify, update them by this Skill, run the gap check, ask the user to confirm again, and then hand them back the same way as the original handoff: if they were handed off with the feature branch, commit the new version on top of the latest remote commit of the feature branch, end the commit message with the two lines printed by `--trailers` in the same way, push, and then update the sha256 values in the MR description; if only local paths were handed off, hand back the updated paths and the two new sha256 values. deliver continues after pulling or reading them.

Done criteria: the handoff commit is pushed, the sha256 of the two files in it match what the user confirmed, and the `Frozen-Spec` and `Frozen-Verify` lines in the commit message record these same values; the MR/PR is in Draft state and its target branch matches the spec. Or, in the case above, only local paths were handed off, and the final reply states the reason.

This Skill does not implement the product, write test code, or run verification. The only things it publishes to a remote are the commits for the step 9 handoff (spec, verify, and this session's accompanying changes in this repository) and the Draft MR. It starts no agent other than the gap check session.
