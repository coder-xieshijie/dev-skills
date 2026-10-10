# Checking a map against the code

Read this when a map is written or rewritten (step 4), or when someone asks whether a map is still true. `check` proves only the map's structure; whether each criterion says what the product does is settled by someone who reads the code instead of the map, and then by running it.

Give the audit to a sub-agent that did not write the map, with read-only access and only the inputs below; the author's reasoning stays out of its context. One sub-agent per map, or per few small maps, keeps each context on one feature.

## Prompt

```text
Audit feature maps against the source code. Read-only: change no file.

Maps: <paths to the maps>
Format of a map: <path to the verification Skill>/references/maps.md
Sources that define the behavior: <spec or design docs, code roots, existing tests>

For every criterion (`<sub-feature>#<n>`), read the code path behind it at its entry point and decide:
- agrees: the code does what the criterion says, under the stated precondition;
- disagrees: the code does something else, or only under a condition the map does not state;
- cannot tell: the behavior depends on something you cannot read (an external system, configuration at
  run time, a model's reply).

Report one table, one row per criterion:

| Criterion | Verdict | Code (file:line) | What the code does |

Then, separately:
1. Behavior a user would notice that no criterion covers, where a wrong implementation could pass every
   criterion as written. Name the sub-feature, the entry and the file:line.
2. Entries where a sub-feature's behavior is visible (another CLI command, an API, a page) that the map
   neither declares nor names under Not covered.
3. Statements anywhere in the maps (Gotchas, steps, Not covered) that the code contradicts, and any
   sentence that reports what a run returned rather than how the product behaves.
Cite file:line for every claim. Say "none" for an empty list.
```

## Acting on the report

- **Disagrees.** Fix the map to what the code does, or, when the code looks wrong, keep the criterion as the intended behavior, check it with `otherwise: 'confirm'` (TO-CONFIRM until a product owner answers), and name the question in Gotchas. Never keep a criterion that the code contradicts as a plain PASS/FAIL check without one of the two.
- **Cannot tell.** The live run settles it; make sure the scenario's evidence can show it.
- **Missing behavior or entries.** Add the criterion or sub-feature, or name it under Not covered with its reason.
- A second audit after large fixes is worth it; repeat until a round finds no disagreement you did not already decide.

Keep the report with the step 4 notes for the hand-off, not in the map.
