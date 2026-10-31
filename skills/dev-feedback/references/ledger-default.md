# Default ledger format

Use this only when the user's ledger has no conventions of its own. Two files, both Markdown.

## The index

One row per phenomenon, not per event. A recurrence reopens its row.

```text
| ID | Phenomenon | Seen in | Times | Destination | State | How closing is confirmed |
|---|---|---|---|---|---|---|
| FB-007 | Local quality commands miss a check CI runs, so it fails only after the push | !7595, !7721 | 2 | Repository: mechanism (product repo) | MR opened !7730 | The next requirement's first pipeline has no failure the local commands cover |
```

- **Phenomenon**: written as it would happen again, not as the story of one run.
- **Seen in**: the requirements or windows, each linked to its run file.
- **Destination**: one of the rows in routing.md, with the concrete place after a colon.
- **State**: not yet landed; MR or PR opened (with its number); changed (with its commit); no change (with the reason); recurred; closed.
- **How closing is confirmed**: a condition someone can observe in a later requirement.

## One file per run

```text
# Feedback: <requirement or window>

| Index ID | Phenomenon | Evidence in this run | Destination | State | New / recurrence |
|---|---|---|---|---|---|

Run: dev-feedback session <id>; mining model <model>; confirmed by the user at <time>.
```

For a time window, add the numbers from `sessions.mjs stats` under the table, next to the previous window's.
