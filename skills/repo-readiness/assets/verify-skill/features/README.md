# Feature maps

Each map is the only spec of one feature's sub-feature behavior: what the sub-features are, how a user reaches each at every entry point, what to do, and the numbered criteria that decide the result. Results are not kept here; they stay in each run's evidence directory.

Pick the maps a change touches, run their scenario scripts (`node $V run <map>`), drive the entries that have no scripts by hand, and report one result per sub-feature × entry. Writing or changing a map: [references/maps.md](../references/maps.md).

| Feature | Map | Spec | Scripted | Content |
|---|---|---|---|---|
| <Feature> | [<map>.md](../../../<map root>/<feature>/feature-map/<map>.md) | [spec.md](../../../<map root>/<feature>/spec.md) | <entries scripted besides the config's default, comma-separated> | <one-line scope> |
