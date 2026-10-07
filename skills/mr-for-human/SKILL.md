---
name: mr-for-human
description: Turns an MR, PR or code diff into a reading guide for people, with the important decisions first and then a reading route into the source code. Use when someone needs to understand a change and know where to focus.
disable-model-invocation: true
---

# MR for Human

Help the reader understand the change, decide only on what matters most, and find the matching source code. By default, write Markdown in the user's language.

## Three core principles

1. **The pyramid runs throughout.** The whole guide, each section and each key point give the conclusion first, then the necessary explanation and evidence. The first screen holds only the items that most affect whether the requirement is met, whether the scope of the change is reasonable, and the key trade-offs; when a person needs to decide, give a recommendation, its impact and the concrete options. Facts that can be established are established by the agent, and ordinary implementation details are expanded in the lower layers; when nothing awaits a decision, say so explicitly.
2. **Changes can be checked directory by directory.** Use the tree of changed directories to build a map of responsibilities, then follow each feature to show how these directories work together, down to what changed in each specific file and why it relates to the goal of this change. Every changed file must be accounted for; directory summaries and the choice of key points must not hide additional behavior. In particular, check for cleanup, refactoring, default-value changes and shared-behavior changes mixed in; mark separately any change whose relation to the goal cannot be proven.
3. **Boundaries and failure degradation are explained all the way through.** State the conditions under which the normal behavior holds; when a boundary is crossed or something fails midway, state what has already been done, who is responsible for finishing up, how it degrades or recovers, and what the user finally sees. Describe rejection, thrown errors, retries, fallback or compensation as the actual code does them; for a degradation approach, also verify the conditions under which it applies and the guarantees that remain.

## 1. Pin down the subject and the scope of the change

From the request and confirmed materials, determine the target behavior, the comparison range and where the output goes. When the business intent is unknown, mark it as an assumption.

- MR/PR: get the project, the target branch, the base/head SHA and whether the diff is complete; distinguish the platform's diff base, the tip of the target branch and the merge-base. Prefer the authenticated platform CLI/API, and fill in context from the source at the pinned SHA.
- Local diff: state whether it is staged, unstaged, untracked or specific commits; for uncommitted content, record a snapshot identifier or a content hash. Distinguish the working tree from the remote head.
- First get all changed paths, their added/deleted/renamed status and their size, then read the semantic diff; record how the diff was taken and whether it was truncated. When the user limits the scope, state that limit, and mark necessary dependencies outside the scope as context.
- Show the levels this change touches with a tree of changed directories, annotating each directory shown with the feature it implements in this change; where the responsibility is unclear, keep reading the source or mark a gap. Expand down to the subdirectories that separate responsibilities; a path with a single branch may be collapsed, and key files are listed as needed. State the role of the production implementation, tests, generated contracts, documentation and packaging; if you give file counts, state how they were counted. A large tree may go in an appendix, with the main responsibilities and entry points kept in the body; a small change in a single directory may be expressed as a short path plus its responsibility.
- Build a file list organized by directory: **path and status / specific change / relation to the goal**. The relation is one of: within the goal, necessary supporting change, extra change, to be confirmed; for a necessary supporting change, state the dependency. When a file serves several purposes, describe each one separately.
- Files of the same kind may share one row, but the paths must be enumerable and cover every change; a large list may go in an appendix. Call out separately any semantic change to permissions, configuration and default values, migrations, protocols/IDL, or shared utility functions. Classifications such as generated, test, moved and type-only must be verified; the generation source and test assertions may also be key points.

Done criteria: the analysis snapshot and the goal are clear, the directory tree and the file list cover the same scope, the reader can tell each directory's responsibility in this change, and every known changed file is recorded. When materials are incomplete, distinguish "read but not expanded" from "not yet read / not visible"; draw conclusions only about what you have read, keep the gaps, and continue the analysis that can be completed.

## 2. Reconstruct behavior and boundaries

Compare the old and the new behavior, and trace one normal path: "who triggers → who decides → how state or external systems change → who sees the result". For a pure refactor, state the behavior that must be preserved and the responsibilities that changed. Using the input preconditions, output guarantees and state ownership, explain what decision each key abstraction hides and what callers still need to know.

Follow each feature through: starting from a user scenario or a key operation, map the path above onto the real directories and key entry points, and use a short arrow chain or prose to explain what each step is responsible for and what it passes to the next. Express several independent main lines separately, and cross-reference shared steps; keep calls, data passing, and build or generation dependencies distinct. Verify cross-directory connections, and mark unwired parts, conditional branches and unknowns at the connection where they occur; the existence of modules and local tests does not mean the production path is connected end to end. For a single file you may give the path within a function; for pure documentation or configuration, describe how it is actually used or takes effect.

Along the path, check the boundaries relevant to this change: null/missing and extreme values, permissions and tenants, duplicates/concurrency, timeout/cancellation, version compatibility. For each key failure point, trace it to the visible result:

- The trigger condition; which writes or side effects were already done before the failure.
- The actual handling: reject, propagate the error, retry, degrade, compensate or clean up; who does it and when it ends.
- The guarantees kept and lost after degrading; whether stale or partial results are used, whether permission isolation is kept, whether side effects may be repeated.
- The state the caller or user sees, the entry point for recovery, and the matching evidence. When there is no degradation, state the actual failure behavior; whether degradation needs to be added is judged from the contract.

Check six runtime dimensions internally: resource lifecycle, scale and capacity, concurrency consistency, partial failure, trust boundaries, observability and recovery. Expand only the results that affect understanding or judgment; keep key guarantees that apply but have not been established as gaps. When a specific mechanism is involved, read the relevant entries in [design-lenses.md](references/design-lenses.md).

When a dependency's internals are not visible, state the guarantees you need it to provide. A fixed number of calls only proves that the number of calls from the entry point is bounded; a constraint, cleanup or log that does not appear in the entry point is no ground for concluding that the whole system lacks it.

Done criteria: each main feature can be traced along the directory responsibilities to its entry point and result, and key connections, behaviors and failure consequences are backed by source code or a contract; a chain that cannot be completed stops explicitly at the evidence boundary, and you can go on to produce a guide of limited scope.

## 3. Explain in order of importance

First select the decisions that carry the core behavior, draw responsibility boundaries or change shared semantics; then bring out the defects, risks and extra changes that would change the user's judgment. Rank by combining the impact on the goal, the breadth of impact, the likelihood of being triggered and recoverability; express reading order and defect severity separately.

- The first screen usually holds 3–5 items, or fewer when there are fewer. Each item gives the conclusion, its important impact and an entry point to the evidence; ask for a decision only on real business trade-offs, scope choices and the like. Major defects and important scope deviations are visible on the first screen; other findings are drilled into by topic, and related issues may be collected and linked.
- Explain each key point once, in one place: the implementation choice, the relevant preconditions, the normal/failure results and the evidence. Features, abstractions and runtime constraints are explained around the same behavior; compare alternatives only when there is a substantive trade-off, and prefer verifying existing capabilities first.
- Give core pseudocode or a diagram only for complex logic. Keep the real identifiers, conditions, order, transaction scope, waits, cancellation, cleanup, permissions, and return/throw behavior; show partial-success windows. For an unknown callee, note the guarantees it must provide; keep proposed approaches separate from the current implementation.
- For important claims, distinguish code fact, confirmed requirement, inference and unknown; write the verification status separately: statically verified, test exists but not run, run with its result, or unverified. A proven problem needs a concrete trigger condition, the contract it violates and the consequence; for a potential risk, state the unproven condition it depends on.
- Attach files, symbols and links to the exact location to key points and pseudocode, pinned to a consistent snapshot; additions cite head, deletions cite base, renames keep both paths, and unchanged callers are marked as context. Use numbering and a mapping table only when a long document needs cross-references. Fill in the introducing commit only when you have checked the history.

Done criteria: the reader gets the important conclusions first, only necessary matters need their decision, and the rest can be drilled into through the explanations and links.

## 4. Deliver and check

Use the lightweight skeleton in [output-template.md](references/output-template.md), merging sections according to size. When you need to see how to keep a failure window faithful, or how to write a short guide for a sound implementation, read the matching example in [worked-example.md](references/worked-example.md).

Before delivering, check:

- Reconcile file by file against the list of known changes, and confirm that the directory tree, the responsibility notes and the feature routes correspond to each other; extra changes and items to be confirmed are not hidden under "necessary supporting change".
- The explanations of the normal path, key boundaries and failure degradation match the source; source files, links and pseudocode belong to the same snapshot.
- Internal self-check: the reader can explain the key trade-offs, predict one relevant failure, and find the corresponding code; missing support is supplied in the body or marked as unknown.
- Give a short reading route through the source; for a troubleshooting request, add the fields to observe, logs, breakpoints and verified commands. State separately whether tests exist, whether their assertions are relevant, and whether they ran and passed.
- Before calling an MR/PR guide current, re-read the head; if it has changed, mark the guide as an old snapshot, and call it current only after the analysis is updated. When you received only offline materials, note that re-reading was not possible.

By default, do the reading and generate the document. Actions such as running tests, changing the implementation, posting comments, approving or merging follow the user's current authorization. Deliver the guide and its verification boundaries.
