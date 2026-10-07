# Reading guide skeleton

Merge sections according to size; put complex lists in an appendix and link to it. Each section gives its conclusion first; [SKILL.md](../SKILL.md) governs the rules.

## Conclusions first

In one sentence, state the triggering scenario and the old behavior → new behavior; briefly note the subject of analysis, the snapshot and the scope.

List the most important decisions, problems or scope deviations; for each, state its impact and link to the evidence or to the section below. When the user needs to decide, give the concrete options, a recommendation and the cost; when nothing awaits a decision, say so. There is no need to turn every technical unknown into a question for the user.

## Changed directory tree and responsibilities

First summarize which features the change is about, then show the tree of changed directories annotated with responsibilities. Expand down to responsibility boundaries, with key files as reading entry points; a small change in a single directory may be written briefly. When a large tree goes in an appendix, the body still lets the reader see what each main directory implements.

The tree answers "where the features live"; the list below answers "what exactly changed, and does it belong to the goal". The two correspond by path. The relation is one of: within the goal, necessary supporting change, extra change, to be confirmed.

| Directory / file and its added, deleted, modified or renamed status | Specific change | Relation to the goal and its basis |
|---|---|---|

Every changed file is accounted for; call out extra behavior within the same file separately. When merging files of the same kind, list all their paths. A large list may go in an appendix, with the directory summary, important extra changes and gaps kept in the body. Write "not yet analyzed" for files you have not read; do not write them as minor or unrelated.

## Main flow, boundaries and failure degradation

### Follow each feature through

For each scenario or key operation, give a reading route "entry directory/symbol → what each step is responsible for and passes on → result", connected to the directory map in the previous section. Keep independent main lines apart, and mark real branches, unwired parts and unknowns; for pure documentation or configuration, express how it is actually used or takes effect.

Along the route, expand the key decisions, state changes and visible results, placing abstractions and runtime constraints at the step they belong to. Attach faithful core pseudocode for complex logic; for simple logic, link the source directly. The reading entry points and the failure analysis later refer to this route, to avoid retelling the same flow.

Key failures may be written as short paragraphs or in the table below; write an explanation shared by the normal and failure cases only once:

| Boundary / failure condition | State or side effects already done | Actual handling, guarantees after degradation | User-visible result / recovery entry point | Evidence or gap |
|---|---|---|---|---|

If the implementation only propagates the error, state that result; when a degradation is a proposal, mark it clearly. Express consequences whose preconditions are unproven as conditional.

## Reading route and verification boundaries

List a few source entry points and what to look at in each step; evidence links match the analysis snapshot. For a troubleshooting request, add the concrete values to observe and the debugging entry points.

State what you have read, which materials were unread/not visible, the static conclusions and the actual test results, and whether the latest state could be re-read. If tests were not run, say so. When important decisions and gaps are already explained above, refer to them here.
