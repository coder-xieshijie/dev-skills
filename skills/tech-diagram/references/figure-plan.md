# Planning a set of figures

Before drawing figures for a document, or two or more figures of one system, decide which figures to draw and what each must cover. The plan is the `## Figures` table of the set's [diagram-binding.md](../assets/diagram-binding.md), written before the first figure; at delivery it is also the statement of what the set covers.

## Inputs

A design-document Skill that hands its figures over (such as design-for-review) passes these; otherwise derive them from the document and mark each as derived:

- **Conclusion**: the document's one-sentence conclusion.
- **Pillars or reader questions**: the few claims the conclusion rests on, or the questions the document answers.
- **Mechanisms**: each with its triggers and its failure handling. Every row of a trigger table or a failure table is an entry of its own.
- **Questions already asked**: what the user or reviewers asked about the design. When none are known, the document's open questions stand in for them.
- **Placement**: the section each figure goes into.

## Steps

1. **Find the existing set.** Look next to the document for figures and a `diagram-binding.md` (`diagrams/`, `figures/`, or the document's own directory). When a set exists, extend it: its binding, names, colors and numbering stand, and new figures append rows. Start a set only where none exists, in `<document directory>/diagrams/`.
2. **List candidates.** Every mechanism with a trigger, a flow or a state change is a candidate. Lists of numbers, comparisons, option lists and plans stay tables.
3. **Rank by where readers get stuck.** Questions already asked come first, then mechanisms whose order or ownership the text spreads over several sections, then the rest. The set takes a figure for each question asked and the top-ranked candidate of each pillar not yet covered; another candidate joins only when an abnormal path from step 5 has no other place. The others go to the "Not drawn" line with the table or section that covers them.
4. **Give the set a shape.** One overview that answers the conclusion (see "Overview of a design document" in [diagram-kinds.md](diagram-kinds.md)), then one figure per pillar or question, numbered in reading order.
5. **List parts and paths per figure.**
   - Each container the figure opens (a turn, a context window, a request, a queue) with all of its parts: the parts the system already had as well as the ones the design adds.
   - For each mechanism the figure covers, the normal path and every abnormal path the text names: failure, timeout, retry, fallback, hard limit, a concurrent or discarded run. Each is drawn in this figure, or the row names the figure or table that has it.
   - An abnormal path that no figure or table covers gets a figure or a place in one. When the text names it without saying what happens, it is a text issue: list it under `## Text issues` in the binding, and report the list at delivery.
6. **Write the table** before drawing the first figure. When the user asked which figures to draw, show the table and stop there.

## The Figures table

| Column | Holds |
|---|---|
| # | Number in reading order |
| File | File name without extension, numbered the same: `03-turn-start` |
| Question it answers | One question, naming the pillar or reader question it serves |
| Kind | A kind from diagram-kinds.md |
| Sections | Sections of the document it draws from |
| Parts and paths covered | `Parts:` each container and its parts; `Normal:` the path; `Abnormal:` each abnormal path drawn |
| Not drawn → where | What the cited sections hold that this figure leaves out, and the figure or table that has it |

## Example: context compaction for a long-conversation assistant

A fictional design document. Inputs:

- Conclusion: the assistant keeps one conversation going indefinitely by compacting older turns in the background and committing the result at the start of a turn, so replies never wait and open work survives compaction.
- Pillars: A, replies never wait; B, the conversation never breaks; C, open work survives.
- Mechanisms: the turn loop (§3); triggers (§4.1 table: soft line, idle, return to page, new conversation, hard line); the background job (§4.2); the commit point at the start of a turn (§4.3); failures (§4.4 table: job fails, the turns a job covered changed, hard line with no ready result); the work-state ledger (§5).
- Questions already asked: Q1, what does the model see in a turn? Q2, who hands the compacted result back, and when? Q3, what happens when the window fills before compaction finishes?
- Sections: §1 summary, §3 one turn, §4 compaction, §5 ledger, §6 budget numbers, §7 alternatives.

The resulting table is in [examples/design-overview/diagram-binding.md](../examples/design-overview/diagram-binding.md), and figure 1 is drawn there. What the steps decided:

- Q1 asks what the model sees, so figure 2 opens the turn container and draws all of it (user message, assembled context, model call, tool calls, reply), not only the summary segment the design adds.
- The §4.4 failure table has three rows. The hard line goes to figure 3, a decision procedure in the order the system applies it at the start of a turn (commit a ready result first, then check the lines); the two job failures go to figure 4 as an `alt` fragment. The overview names both figures in its notes instead of drawing them.
- The §4.1 trigger table stays a table; figure 3 draws only the soft and hard lines, and its row says where the other triggers are.
- Budget numbers and alternatives are tables, so they appear only on the "Not drawn" line.

## Working with a design-document Skill

- **Receives** the inputs above, the section each figure goes into, and the document's commit.
- **Returns**:
  - the Figures table in `<document directory>/diagrams/diagram-binding.md`, one binding per document;
  - each figure as PNG and HTML in the same directory, numbered in reading order, embedded under a caption `Figure N <title>` with one sentence before it saying which question it answers;
  - "Text issues found while drawing": each gap or contradiction in the text, with section numbers, for the document Skill to settle in the text.
- Tables stay tables. The document's final check runs `scripts/doc-figures.mjs`.
- On revision: when a section a figure cites changes, run "Check against the text" for that figure again. Each figure's `// Sources:` comment names the document's commit, so a figure older than its sections can be found.
