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

Keep a table of every place the design changes, overrides or relies on a neighboring design's decision: the neighbor's section, what this design does, and who has to agree; the table goes in the overall design, and each row whose owner has not yet agreed is an open item. Record the commit of the code you cite. Before each delivery, re-read the neighbors' latest documents and branches; when the code has moved, read the distance from git (`git rev-list --count <cited>..<head>`) and recheck the facts the design states about it.

## 2. Settle the outline

When an outline exists or the user has confirmed one, keep it and refine it. When the user asks to see the outline first, deliver the outline first; otherwise write the full review draft directly.

When there is no set structure, use this order, and merge or trim sections according to the size of the task:

0. **Conclusion on one page**: the design in one sentence, the overview figure, a table from each problem to its solution and the batch that ships it, and the decisions the reviewers need to make.
1. **Background**: the concrete scenario, the current problem, how things run today (existing capabilities with their entry points), and the constraints that limit the choice of design.
2. **Goals, non-goals and quality targets**: what counts as done; each thing that could pass for a goal but is left out this time, listed one by one; and the targets the design is judged by (latency, cost, reliability, a model behavior), each with its definition and measurement per rule 3. A metric only recorded this time, or whose target is set later, says so and says when.
3. **Glossary**: every term the later chapters use that the code and the team do not already use (rule 1). Chapters 0 to 2 come before it, so they use words the team already uses, and a coined term that cannot be avoided there is explained in the same sentence.
4. **Overall design**: how the system sits among its neighbors and the interfaces between them, the modules and where each kind of data lives, and one complete flow through them, failure paths included. The neighbor table from step 1 and the tables of rule 10 go here; the mechanisms in chapter 5 point to their rows.
5. **Detailed design**, one section per question the requirement asks (5.1, 5.2, …), not one per mechanism. A mechanism that answers several questions lives in the section of the question it is most responsible for, and the others point to it. Each section covers the mechanisms that answer its question, with their interfaces, data, state changes and failure handling. The reason for a choice sits next to the choice, in a sentence or a short table, rather than in a chapter of alternatives; a known risk goes with the mechanism it threatens, as part of its failure handling.
6. **Delivery plan**: what is reused as it is, changed or added, with the main directories and the responsibilities of the modules; the batches, each using only mechanisms delivered in that batch or earlier; and for each part that ships on its own, the switch that turns it on, the migration of existing data, and how to roll it back, including whether an older version can still read what the new one wrote. When the batches are only the order of work inside one release, give these once for the release.
7. **How to verify**: one row for each goal and quality target in chapter 2, saying how it is verified and what result counts as met. Behaviors code decides are verified by tests and acceptance scenarios. Model behaviors are verified by an evaluation, and the chapter carries its design (what it compares, the cases and where they come from, the scorer, the passing threshold), planned with [references/verification-plan.md](references/verification-plan.md). Say whether each evaluation runs in this delivery; when it does not, name what stands in for it meanwhile and list the behavior in chapter 8 as not yet verified.
8. **Open items and dependencies**: what reviewers still need to decide, the neighbor-table rows still waiting for their owner's agreement, and the behaviors not yet verified.

Appendices hold competitor comparisons, sources, full texts and details a chapter points to, such as how an evaluation is implemented; rejected approaches go there only when the user or a reviewer asks for them. Keep the top-level chapters to about these nine; when chapters multiply, regroup by reader question rather than adding one per topic. For a small change, merge chapters 1 and 2, drop chapter 3 when nothing is coined, and keep chapter 8 to a few lines.

## 3. Write

Before writing, read and apply [the body rules of explain-as-fool](../explain-as-fool/SKILL.md), the single maintained source of the writing requirements. Read that file directly from this repository; this does not change the manual-invocation settings of either Skill. When installing, keep that neighboring directory.

Enter through a concrete scenario, and organize the body around design and behavior; use directories, classes, functions and code snippets only to explain a key mechanism or support a judgment. One complete flow connects the initiating actor, the participating modules, the changes in data and state, and the final result. The body presents one current design: when revising, rewrite the affected sections in place and keep the history of revisions out of the body.

Each rule below names a question reviewers ask when it is missing.

1. **Glossary.** Use the names the code and the team already use. Coin a term only when nothing existing fits, and keep coined terms to a handful. Every coined term gets a glossary row before the first section that uses it (chapters 0 to 2 explain it in the sentence instead, see step 2): what it is, who writes it, where it lives, when it changes, and one filled-in example. Where two concepts could be confused (a store and the channel that carries it; a metric and its target), state their relationship in one sentence where the second is introduced. *"What is this term? Give me an example."*
2. **Basis of every number.** Next to every threshold, budget, interval, timeout and target, tag its basis in a few words: measured, read from code (`file:line`), taken from a named product (`file:line` or URL), judgment, or estimate. Long evidence (quotes, file lists, comparison tables) goes in an appendix table the tag points to. Write budgets as formulas over the parameters they depend on, such as the model's context window, and show the values for each deployment that matters. *"Where does this number come from? What happens on a smaller model?"*
3. **Metrics.** For every metric, give its definition, why it matters, how it is measured and how the measurement is implemented, then its target. *"What is this metric for, and how would we measure it?"*
4. **Mechanism checklist.** For every mechanism, state: what triggers it and how often, which process runs it, what it reads, where it writes (file, table, field), when the result takes effect, what happens when it fails, and what the user sees if they keep working meanwhile. *"Who starts this, and what happens if it fails while the user keeps talking?"*
5. **Interleaving.** For every mechanism that changes stored state, walk one concrete interleaving step by step (it starts in turn n, the user sends turn n+1, the result arrives during n+1, it is committed at the start of n+2) and check each validation rule and each write time against it. Write the walk-through into the document when it decides a rule. *"Where is this committed, and what if the state moved in between?"*
6. **Existing, changed, new.** Mark every feature you mention as existing (with its entry point and code location, and whether it is visible to users or hidden behind a debug menu or flag), changed, or new. For every change, name which agents, sessions and users it affects and which it leaves alone. *"Is this a new feature? I don't see it in the product."*
7. **Reviewable depth.** For each item the requirement names, give the artifact a reviewer can judge: the prompt text, the interface and its fields, the stored format, the limits, the performance target. A principle alone leaves the reviewer nothing to approve. For each kind of data the feature carries (text, images, video, files, tool output), say where it is stored, what the design does to it (compaction, truncation, description) and whether retrieval can reach it again. *"How exactly is this done? Where do images go, and can they be recalled?"*
8. **Cost of every addition.** For each mechanism you add, state what it saves in the same unit as what it costs. When you cannot show the saving, leave the mechanism out. Before adding a store or concept, search the code and the neighboring designs for every place that already holds similar data, show them in one table with each kind of information in its single home, and cut the new store down to what no existing home can hold. *"Is this worth the redundancy? Isn't this the same as memory?"*
9. **Review material by behavior.** When the design ships prompt drafts, configurations or other material for review, organize it by behavior, not by file: for each theme, current and proposed text side by side with the reason and the design section each change comes from; one fully assembled real request; the per-file full text as an appendix. Mark which reviewer or neighboring design owns each change.
10. **Cross-cutting properties.** For each property several mechanisms rely on (the prompt cache, the cost of a turn, ordering), give one table: what keeps it, each event that breaks it, how often that happens, and what it costs when it breaks, per deployment route when routes differ. *"What is the caching strategy overall? When does it break?"*
11. **Derived copies.** For every copy derived from a source of truth (an index, a rendered prompt section, a snapshot, a baseline), list each change the source can undergo (insert, edit, rollback, delete, an edit by the user) and say how the copy follows it. When the same fact can reach the model through two channels, say which one carries it and drop it from the other. *"Does this get repeated every turn?"*
12. **One home per statement.** State each decision, number, rule and interface in full in one section, and refer to it by section number elsewhere. When a table or list would appear a second time, keep one and point to it. *"Which of these four descriptions is the real one?"*

## 4. Figures

Draw figures with [tech-diagram](../tech-diagram/SKILL.md) and reference the PNG by a relative path; when revising a document, redraw its Mermaid blocks too. Use a Mermaid block only when the user or the repository asks for one.

Plan the whole set before drawing the first figure, following [tech-diagram's figure plan](../tech-diagram/references/figure-plan.md). Give it:

- the one-sentence conclusion and the chapters' questions;
- the mechanisms, each with the trigger, failure and fallback rows from rule 4;
- the questions the user or reviewers have already asked;
- the section each figure goes into.

Draw where readers get stuck on where something lives and how it moves: one overview for the conclusion, then one main figure per design chapter. Comparisons, budgets and batch plans stay tables. A structural figure shows the parts that stay the same as well as the new ones; a flow figure shows the fallback path next to the normal one.

Drawing is a consistency check of the text: when a figure shows a gap or a contradiction, fix the text, then the figure, and list the fix in the delivery. A revision that changes a section a figure cites redraws that figure in the same revision.

## 5. Rehearse the review

Before each delivery to the user, give the draft to fresh readers; [references/reader-rehearsal.md](references/reader-rehearsal.md) has the roles, the brief and how to sort their questions.

- **Reader rehearsal** catches what the text fails to explain. Two or three fresh subagents, each given only the document, in the roles of the requester, a neighboring module's owner and the implementer.
- **Answerability probe** catches what readers cannot find and what contradicts itself. After each revision, one fresh subagent answers every question reviewers have asked so far, plus questions about the mechanisms the revision touched, from the document alone, citing sections or writing "the document cannot answer", and lists contradictions between sections.
- **Design check** catches state that goes wrong. When the design changes stored state or runs work concurrently, one reviewer reads the draft and the code and walks rule 5 for every such mechanism; a model from another family through [cross-review](../cross-review/SKILL.md)'s reviewer setup is the strongest choice.

Revise from the sorted questions, and rehearse again until a round raises no new question about terms, numbers, mechanisms, existing-versus-new or depth (rules 1–7).

## 6. Revise after review

When a reviewer sends several questions at once:

1. Sort each question by the rule it falls under, and merge questions with the same fix.
2. Decide where each answer goes. It goes into the document when other reviewers need it to judge the design: a basis, a trigger, a failure, a scope. An explanation of existing machinery that one reader happened to lack stays in the reply or an appendix.
3. Rewrite the affected sections as a whole rather than adding a paragraph per question. When the questions show that the structure no longer fits, propose the new outline in the reply first and wait for the user to confirm it before moving content.
4. After fixing a mechanism that writes stored state, run the design check again on that mechanism: a fix brings interleavings of its own.
5. Compare the length with the previous version; when it grew by more than a fifth, look for statements that now live in two places (rule 12).

To slim or regroup the whole document without losing anything, follow [references/restructure.md](references/restructure.md).

## Check before delivery

Read the finished draft and the rehearsal results, and confirm:

- The problem, goal, design and scope of change can be explained from the document alone.
- Every coined term has a glossary row before its first use; every number has its basis; every mechanism answers the checklist of rule 4.
- The complete flow can be followed to understand how the modules work together, including the failure paths.
- Existing capabilities, changes and new mechanisms are marked, with the scope each change affects.
- Each statement lives in one section; every derived copy says how it follows its source; every neighbor-agreement row is an open item.
- Figures and text, interfaces, data models and state descriptions are consistent with one another.
- Non-goals are listed; every goal and quality target in chapter 2 has a row in "How to verify", with an evaluation for each model behavior; every part that ships on its own has its switch and its rollback.
- Confirmed decisions are clearly separated from open questions; each key choice has its reason next to it.

Deliver one technical review document, written in Markdown in the user's language, with its figures beside it. The Markdown file is the only source. When it is published elsewhere (a document platform, a generated page, a review site), list every copy next to the source with how each is regenerated; regenerate copies from the source by script, anchor inserted media by figure file name or heading text rather than by figure or section number, replace local links with ones that work where the copy lives, and update a copy that holds content added outside the source section by section instead of overwriting it. In the reply, list what the rehearsal raised and how each item was handled, what was found and fixed while drawing, and what remains unverified.
