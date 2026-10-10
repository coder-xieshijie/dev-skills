# Feature maps

Each map is the only spec of one feature's sub-feature behavior: what the sub-features are, how a user reaches each at every entry point, what to do, and the numbered criteria that decide the result. Results are not kept here; they stay in each run's evidence directory.

Pick the maps a change touches, run their scenario scripts (`node $V run <map>`), drive the entries that have no scripts by hand, and report one result per sub-feature × entry. Writing or changing a map: [references/maps.md](../references/maps.md).

Every map is scripted at the entries in `verify.config.json` `scripted` (<list them, or "none yet">); the Also scripted column adds entries for one map. `node $V check` prints each map's scripted entries. The Spec column links a spec with requirement ID headings, or names the docs and source files that define the behavior as code spans when there are no IDs.

<!-- Links are relative to this file: from <skills dir>/verify-<app>/features/ the repository root is four levels up when <skills dir> is two directories deep (.agents/skills, .claude/skills). -->

| Feature | Map | Spec | Also scripted | Content |
|---|---|---|---|---|
| <Feature> | [<map>.md](../../../../<map root>/<feature>/feature-map/<map>.md) | [spec.md](../../../../<map root>/<feature>/spec.md) or `<path/to/design.md>` | <entries scripted for this map only, comma-separated> | <one-line scope> |
