---
name: design-for-review
description: Turns existing requirements, design discussions and technical materials into a self-contained technical review document. Use when a technical design goes to people for review.
disable-model-invocation: true
---

Turn existing requirements, design discussions and technical materials into a technical design for people to review.

Goal: by reading only this one document, a reviewer can understand why the work is needed, how the design works, what needs to change, and which trade-offs need a decision. The author knows everything the document leaves out, so the author's own reading cannot find where a reviewer gets stuck; step 5 puts fresh readers in front of the draft before the user reads it.

## 1. Gather the basis

Prefer the authoritative sources the user specifies, and keep the requirements, boundaries and design decisions already confirmed.

- Design review: base the document on the confirmed requirements and design discussions, and verify current capabilities and constraints against the code.
- Explaining an implementation: when the user explicitly asks you to present a design that is already implemented, base it on the actual code at the specified version.
- When materials conflict, separate current facts, confirmed decisions and proposals still under discussion, and state the conflict and its impact.
- Fill in directly whatever can be determined from existing materials and code; list explicitly the unknowns that affect the choice of design.

When the sources are many, read them through parallel read-only subagents, one per source type (code, internal documents, each competitor's source). Ask each to return:

- facts apart from inferences, each fact with `file:line` or its place in the document;
- every number the material contains (threshold, budget, interval, timeout, target) with where it comes from, ready to cite next to the numbers in your design;
- every product, competitor and neighboring design the material names.

Before comparing alternatives, list every product, competitor and neighboring design named in the request or the materials, confirm the list with the user, and mark the ones you could not read. Where a neighboring module owns a decision (another team's design for dispatch, memory, permissions), cite their document and design up to the boundary.

## 2. Settle the outline

When an outline exists or the user has confirmed one, keep it and refine it. When the user asks to see the outline first, deliver the outline first; otherwise write the full review draft directly.

When there is no set structure, use this order, and merge or trim sections according to the size of the task:

0. **Conclusion on one page**: the design in one sentence, the overview figure, a table from each problem to its solution and the batch that ships it, and the decisions the reviewers need to make.
1. **Problem, goal and scope**: the concrete scenario, the current problem, the expected result, and how far this work goes in solving it.
2. **Current state and constraints**: existing capabilities, how things currently run, and the conditions that limit the choice of design.
3. **Glossary**: every term the design chapters use that the code and team do not already use (see rule 1 below).
4. **Design**, one chapter per question the requirement asks, not one per mechanism. Each chapter covers the mechanisms that answer its question, with their interfaces, data, state changes and failure handling.
5. **Changes and reuse**: what is reused as it is, what is changed, what is added; the main directories and the responsibilities of the modules.
6. **Trade-offs and open items**: why this design, what it costs, what reviewers still need to decide. Compare only alternatives relevant to the current decision.
7. **How to verify**: how to verify the key behaviors, and what results prove the goal is met.

Appendices hold competitor comparisons, sources and full texts. Keep about eight top-level chapters; when chapters multiply, regroup by reader question rather than adding one per topic.

## 3. Write

Before writing, read and apply [the body rules of explain-as-fool](../explain-as-fool/SKILL.md), the single maintained source of the writing requirements. Read that file directly from this repository; this does not change the manual-invocation settings of either Skill. When installing, keep that neighboring directory.

Enter through a concrete scenario, and organize the body around design and behavior; use directories, classes, functions and code snippets only to explain a key mechanism or support a judgment. One complete flow connects the initiating actor, the participating modules, the changes in data and state, and the final result. The body presents one current design: when revising, rewrite the affected sections in place and keep the history of revisions out of the body.

Each rule below names a question reviewers ask when it is missing.

1. **Glossary.** Use the names the code and the team already use. Coin a term only when nothing existing fits, and keep coined terms to a handful. Every coined term gets a glossary row before the first section that uses it: what it is, who writes it, where it lives, when it changes, and one filled-in example. Where two concepts could be confused (a store and the channel that carries it; a metric and its target), state their relationship in one sentence where the second is introduced. *"What is this term? Give me an example."*
2. **Basis of every number.** Tag every threshold, budget, interval, timeout and target with its basis, in the body next to the number: measured, read from code (`file:line`), taken from a named product (`file:line` or URL), judgment, or estimate. Write budgets as formulas over the parameters they depend on, such as the model's context window, and show the values for each deployment that matters. *"Where does this number come from? What happens on a smaller model?"*
3. **Metrics.** For every metric, give its definition, why it matters, how it is measured and how the measurement is implemented, then its target. *"What is this metric for, and how would we measure it?"*
4. **Mechanism checklist.** For every mechanism, state: what triggers it and how often, which process runs it, what it reads, where it writes (file, table, field), when the result takes effect, what happens when it fails, and what the user sees if they keep working meanwhile. *"Who starts this, and what happens if it fails while the user keeps talking?"*
5. **Interleaving.** For every mechanism that changes stored state, walk one concrete interleaving step by step (it starts in turn n, the user sends turn n+1, the result arrives during n+1, it is committed at the start of n+2) and check each validation rule and each write time against it. Write the walk-through into the document when it decides a rule. *"Where is this committed, and what if the state moved in between?"*
6. **Existing, changed, new.** Mark every feature you mention as existing (with its entry point and code location, and whether it is visible to users or hidden behind a debug menu or flag), changed, or new. For every change, name which agents, sessions and users it affects and which it leaves alone. *"Is this a new feature? I don't see it in the product."*
7. **Reviewable depth.** For each item the requirement names, give the artifact a reviewer can judge: the prompt text, the interface and its fields, the stored format, the limits, the performance target. A principle alone leaves the reviewer nothing to approve. *"How exactly is this done?"*
8. **Cost of every addition.** For each mechanism you add, state what it saves in the same unit as what it costs. When you cannot show the saving, leave the mechanism out. *"Is this worth the redundancy?"*
9. **Review material by behavior.** When the design ships prompt drafts, configurations or other material for review, organize it by behavior, not by file: for each theme, current and proposed text side by side with the reason and the design section each change comes from; one fully assembled real request; the per-file full text as an appendix. Mark which reviewer or neighboring design owns each change.

## 4. Figures

Draw figures with [tech-diagram](../tech-diagram/SKILL.md) and reference the PNG by a relative path; when revising a document, redraw its Mermaid blocks too. Use a Mermaid block only when the user or the repository asks for one.

Plan the whole set before drawing the first figure, following [tech-diagram's figure plan](../tech-diagram/references/figure-plan.md). Give it:

- the one-sentence conclusion and the chapters' questions;
- the mechanisms, each with the trigger, failure and fallback rows from rule 4;
- the questions the user or reviewers have already asked;
- the section each figure goes into.

Draw where readers get stuck on where something lives and how it moves: one overview for the conclusion, then one main figure per design chapter. Comparisons, budgets and batch plans stay tables. A structural figure shows the parts that stay the same as well as the new ones; a flow figure shows the fallback path next to the normal one.

Drawing is a consistency check of the text: when a figure shows a gap or a contradiction, fix the text, then the figure, and list the fix in the delivery.

## 5. Rehearse the review

Before each delivery to the user, give the draft to fresh readers; [references/reader-rehearsal.md](references/reader-rehearsal.md) has the roles, the brief and how to sort their questions.

- **Reader rehearsal** catches what the text fails to explain. Two or three fresh subagents, each given only the document, in the roles of the requester, a neighboring module's owner and the implementer.
- **Design check** catches state that goes wrong. When the design changes stored state or runs work concurrently, one reviewer reads the draft and the code and walks rule 5 for every such mechanism; a model from another family through [cross-review](../cross-review/SKILL.md)'s reviewer setup is the strongest choice.

Revise from the sorted questions, and rehearse again until a round raises no new question about terms, numbers, mechanisms, existing-versus-new or depth (rules 1–7).

## 6. Revise after review

When a reviewer sends several questions at once:

1. Sort each question by the rule it falls under, and merge questions with the same fix.
2. Decide where each answer goes. It goes into the document when other reviewers need it to judge the design: a basis, a trigger, a failure, a scope. An explanation of existing machinery that one reader happened to lack stays in the reply or an appendix.
3. Rewrite the affected sections as a whole rather than adding a paragraph per question. When the questions show that the structure no longer fits, propose the new outline in the reply first and wait for the user to confirm it before moving content.

## Check before delivery

Read the finished draft and the rehearsal results, and confirm:

- The problem, goal, design and scope of change can be explained from the document alone.
- Every coined term has a glossary row before its first use; every number has its basis; every mechanism answers the checklist of rule 4.
- The complete flow can be followed to understand how the modules work together, including the failure paths.
- Existing capabilities, changes and new mechanisms are marked, with the scope each change affects.
- Figures and text, interfaces, data models and state descriptions are consistent with one another.
- Confirmed decisions are clearly separated from open questions; key trade-offs have reasons; key behaviors have a way to be verified.

Deliver one technical review document, written in Markdown in the user's language, with its figures beside it. In the reply, list what the rehearsal raised and how each item was handled, what was found and fixed while drawing, and what remains unverified.
