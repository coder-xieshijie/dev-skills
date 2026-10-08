---
name: core-grill
description: Question the user in rounds to settle the decisions that change user-visible results, record terms, and compile a decision summary for core-spec. Use at the start of a requirement.
---

# Starting a requirement: ask until a spec can be written

At the start of a requirement, you and the user work out, by asking questions, exactly what is to be done. At the end you hand over a decision summary the user has confirmed, for [core-spec](../core-spec/SKILL.md) to write spec and verify from; after that, deliver carries out the delivery fully automatically. A product decision not settled here can only be made by the agent on its own during delivery, and the user will not see it until just before merge.

Write your questions, the decision summary, `CONTEXT.md` and ADRs in the language the user writes in, unless the user or the repository's documentation rules specify another language.

## Four inputs

Collect these four first. Look up yourself anything you can find in the repository and on the platform (current branch, target MR, baseline, existing documents); do not ask the user for it.

| Item | What to write |
|---|---|
| Goal | What the user can do once it is done, and how they see it take effect; the request text or a link to it |
| Done criteria | How far the work must go to count as done; the deadline and the branch it ships on |
| Authorization | Whether the feature branch may be pushed and an MR opened. Merging and other irreversible operations (force-pushing a shared branch, deleting shared data, sending messages outside, changing a shared environment) are always left to the user |
| Scope | The range of impact that must be kept under control; what is explicitly not done |

## Asking questions

Ask in rounds. In each round, ask every question you can ask now: a question goes into this round only when its prerequisites are all settled; a question whose answer depends on another question in this round belongs to the next round. Number each question, state the options and the consequences of each, and give your recommended answer. When the user has answered, work out the next round.

Ask only about decisions that change user-visible results, for example UI and interaction, user-facing text, default values, entry points, whether data can be lost, and how the change coexists with existing features. Decide the rest yourself (interface naming, file layout, implementation approach) and record each as a default decision, with its reason and how to overturn it.

Finding facts is your job; do not ask the user for them. When you need code, documents or run results, look them up yourself; you may dispatch subagents to look them up in parallel. While you wait for results, ask the questions that do not depend on them first. When what the user says about the current state does not match the code, point it out right away and ask the user to confirm which one to go by.

## Terms and ADRs

- When a term is resolved, write it into the repository's `CONTEXT.md` right away; the format is in [Glossary format](references/context-format.md). It holds only terms, not implementation details or decisions.
- Write an ADR only when all three are true: changing your mind later is costly, it would be surprising without context, and it is the result of a real trade-off between several options. The format is in [ADR format](references/adr-format.md).

## Finishing

When every question that changes user-visible results has an answer, write a decision summary with the items below, save it in the requirement directory (the one the user named, or where the repository already keeps requirement documents), and ask the user to confirm it once:

- the four inputs;
- the decisions the user answered: the question, the options, the user's own words;
- default decisions: the decision, the reason, how to overturn it.

When the user confirms the summary, they also confirm the default decisions in it; where the user changes an item, follow the user's change. After confirmation, continue with core-spec: it takes this summary as the source agreements, writes spec and verify from it, and has a model from another family run a gap check against it.
