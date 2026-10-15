---
name: core-grill
disable-model-invocation: true
description: Question the user in rounds to settle the decisions that change user-visible results, record terms, and compile a decision summary for core-spec, or implement a small requirement right after it is confirmed. Use at the start of a requirement.
---

# Starting a requirement: ask until a spec can be written

At the start of a requirement, you and the user work out, by asking questions, exactly what is to be done. At the end you hand over a decision summary the user has confirmed, for [core-spec](../core-spec/SKILL.md) to write spec and verify from; after that, deliver carries out the delivery fully automatically. A small requirement may instead take the quick path, implemented in this session right after the confirmation (see "Choosing the path"). A product decision not settled here can only be made by the agent on its own during delivery, and the user will not see it until just before merge.

Write your questions, the decision summary, `CONTEXT.md` and ADRs in the language the user writes in, unless the user or the repository's documentation rules specify another language.

## Four inputs

Collect these four first. Look up yourself anything you can find in the repository and on the platform (current branch, target MR, baseline, existing documents); do not ask the user for it.

| Item | What to write |
|---|---|
| Goal | What the user can do once it is done, and how they see it take effect; the request text or a link to it |
| Done criteria | How far the work must go to count as done; for optimization or cleanup work, the expected gain or when to stop; the deadline and the branch it ships on |
| Authorization | Whether the feature branch may be pushed and an MR opened. Merging and other irreversible operations (force-pushing a shared branch, deleting shared data, sending messages outside, changing a shared environment) are always left to the user |
| Scope | The range of impact that must be kept under control; what is explicitly not done |

## Asking questions

Ask in rounds. In each round, ask every question you can ask now: a question goes into this round only when its prerequisites are all settled; a question whose answer depends on another question in this round belongs to the next round. Number each question, state the options and the consequences of each, and give your recommended answer. When the user has answered, work out the next round.

Ask only about decisions that change user-visible results, for example UI and interaction, user-facing text, default values, entry points, whether data can be lost, and how the change coexists with existing features. Decide the rest yourself (interface naming, file layout, implementation approach) and record each as a default decision, with its reason and how to overturn it. A decision the questions are about is never recorded as a default decision.

When the requirement must not change user-visible results (refactoring, slimming, migration), the test above leaves nothing to ask. Ask instead about the scope, the authorization and the expected gain: how much to reduce or speed up, which areas come first, and when to stop; and, when it is unclear what counts as unchanged (internal logs, diagnostic fields, timing), about that boundary. When what you know is not enough to estimate the gain, sample one or two areas first and bring the estimate to the question; keep the sample to minutes, not a review of the whole change.

Finding facts is your job; do not ask the user for them. When you need code, documents or run results, look them up yourself; you may dispatch subagents to look them up in parallel. While you wait for results, ask the questions that do not depend on them first. When what the user says about the current state does not match the code, point it out right away and ask the user to confirm which one to go by. When your recommended answer departs from research done in this conversation or from a decision the user confirmed earlier, say so in the question and give the reason. When a decision turns on a cost, speed or reliability claim that a short trial can measure, run the trial and bring the numbers to the question.

## Terms and ADRs

- When a term is resolved, write it into the repository's `CONTEXT.md` right away; the format is in [Glossary format](references/context-format.md). It holds only terms, not implementation details or decisions.
- `CONTEXT.md` and ADRs are files in the repository: write them within its content rules, such as a sensitive-word check that CI runs (name the protocol or role instead of a vendor or model name the rule rejects).
- Write an ADR only when all three are true: changing your mind later is costly, it would be surprising without context, and it is the result of a real trade-off between several options. The format is in [ADR format](references/adr-format.md).

## Choosing the path

When every question is answered, choose how the requirement continues, and put the choice with its reason in the decision summary; the user confirms it with the summary.

- **Quick**: implement in this session right after confirmation, without spec, verify or plan.md. Only when all of these hold: the change stays inside one feature; every decision that changes user-visible results is answered; it touches none of persistence or data migration, concurrency, metering, permissions or security, or a contract shared with another repository or service; a mistake is cheap to find and to revert.
- **core-spec at verification depth light**: a small, local change that does not fit the quick path, or should be verified independently against frozen acceptance requirements, and touches none of the areas that call for `full` in [how to write verify](../core-spec/references/verify.md).
- **core-spec at verification depth full**: everything else, and whenever you are unsure.

## Finishing

When every question that changes user-visible results has an answer, write a decision summary with the items below, save it in the requirement directory (the one the user named, or where the repository already keeps requirement documents), and ask the user to confirm it once:

- the four inputs;
- the decisions the user answered: the question, the options, the user's own words;
- default decisions: the decision, the reason, how to overturn it;
- the path and its reason; for the quick path, also 3–8 acceptance checks, each an entry point, what to do there and the result to observe, together covering every decision the user answered.

When the user confirms the summary, they also confirm the default decisions in it; where the user changes an item, follow the user's change. On a core-spec path, after confirmation, continue with core-spec: it takes this summary as the source agreements, writes spec and verify from it, and has a model from another family run a gap check against it.

On the quick path, after confirmation, implement it yourself:

1. Work on a feature branch in your own worktree, following the repository's rules.
2. Run every acceptance check on the running app from its entry point, and the quality commands. Keep the evidence outside the repository, as deliver keeps its evidence directory.
3. Ask a model from another family to review the diff read-only against the summary and its acceptance checks ("read-only" in [Cross-model calls](../core-spec/references/cross-model.md)). Fix what holds, once, and rerun the acceptance checks the fixes touch.
4. Run the local gate as [deliver](../deliver/SKILL.md) describes in its "Local gate" paragraph.
5. When the authorization allows pushing, push the branch once and open an MR. Its description starts with the decision list (default decisions, and choices you made while implementing), followed by each acceptance check and its result. Wait for CI with deliver's CI watch, in the background, and fix the failures this change introduced; for each review comment, change the code or reply with the reason, and leave a comment that asks to change a decision the user made for the user. Then tell the user the MR can be merged. When the authorization does not allow pushing, stop at the local commits and report.

When, while implementing, you meet a decision that changes user-visible results and the user has not made, or find that the change reaches one of the areas the quick path excludes, stop writing code, tell the user, and continue with core-spec. The summary and what you found become its source agreements; the code written so far stays on the branch for delivery to build on.
