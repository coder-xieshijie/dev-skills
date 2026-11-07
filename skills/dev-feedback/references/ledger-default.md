# Default ledger format

Use this only when the user's ledger has no conventions of its own. Two files, both Markdown.

## The index

One row per phenomenon, not per event. A recurrence reopens its row. A topic the user brought is a row like any gap, marked as the user's in its source.

```text
| ID | Phenomenon | Source | Seen in | Times | Destination | State | How closing is confirmed |
|---|---|---|---|---|---|---|---|
| FB-007 | Local quality commands miss a check CI runs, so it fails only after the push | mined | !7595, !7721 | 2 | Repository: mechanism (product repo) | MR opened !7730 | The next requirement's first pipeline has no failure the local commands cover |
```

- **Phenomenon**: written as it would happen again, not as the story of one run.
- **Source**: `mined`, or `user topic`.
- **Seen in**: the requirements, sessions or windows, each linked to its run file.
- **Destination**: one of the rows in routing.md, with the concrete place after a colon.
- **State**: not yet landed; MR or PR opened (with its number); changed (with its commit); no change (with the reason); recurred; closed.
- **How closing is confirmed**: a condition someone can observe in a later delivery. The next run judges it.

## One file per run

```text
# Feedback: <requirement, sessions or window>

## Topics
| Index ID | Topic | Verdict | Evidence | Destination | State |
|---|---|---|---|---|---|

## Most worth changing
| Index ID | Phenomenon | Evidence | Destination | State | New / recurrence |
|---|---|---|---|---|---|

## Last fixes
| Index ID | Held / did not hold / not observable | Evidence |
|---|---|---|

## Other gaps
| Index ID | Phenomenon | Evidence | Destination | State | New / recurrence |
|---|---|---|---|---|---|

## Found in passing
- <product defect, one line>

Run: dev-feedback session <id>; mining model <model>; confirmed by the user at <time>.
```

For a time window, add the numbers from `sessions.mjs stats` under the tables, next to the previous window's.
