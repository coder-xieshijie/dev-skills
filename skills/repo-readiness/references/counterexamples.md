# Counterexample runs

Read this when proving a map's scripts can fail, or whenever a check needs that proof. A counterexample breaks the product for one criterion and runs that criterion's map; it counts only when the broken criterion gives FAIL. UNVERIFIED means the break never reached the product.

## Choosing the lever

Use the cheapest lever that changes the product's behavior, not the scenario's input:

1. **A launch option the adapter passes on**: an environment variable, flag or config value the product reads (`run --launch '{"env":{...}}'`). Nothing is rebuilt; the run is one command.
2. **A fault at the integration boundary**: a fake or proxy reply that makes the product take its error path. This proves the product's handling of that reply; record it in the result.
3. **A patched build**, when the product has no switch that breaks the behavior under test. This is the usual case for a product without fault hooks.

A lever that only changes a fake's reply proves the check of the fake, not of the product. Pick the criterion to break where the product's own code decides the result.

## A patched build, safely

Patching and rebuilding in the working checkout changes the build every other instance from that checkout uses, and a forgotten revert leaves later runs measuring a broken product. Do it in a separate worktree instead:

1. Commit the verification Skill and the maps first (the hand-off may squash it): a worktree only sees committed files.
2. `git worktree add --detach <scratch dir> HEAD`: a detached worktree at that commit, since the branch is checked out here and git refuses a second checkout of it. Install and build there as the repository's README says.
3. Make the smallest source change that breaks one criterion; save it with `git -C <scratch dir> diff > <evidence dir>/counterexample.patch`.
4. Rebuild, then run the map with the worktree's own copy of the verification Skill: `node <scratch dir>/<skills dir>/verify-<app>/scripts/verify.mjs run <map> --evidence-dir <evidence dir>`. Its root is the worktree, so it drives the patched build. `run-summary.json` lists the patched files under `version.dirtyPaths`.
5. Confirm the broken criterion is FAIL, then `git worktree remove --force <scratch dir>`.

If the patch must happen in the working checkout, revert it, rebuild, and confirm `doctor` is green afterwards: the adapter's build-freshness check is what refuses a reverted source with a stale patched build.

## Reporting

For each map: the criterion broken, the lever (option, fault or patch file), the result of the broken criterion and the evidence directory. A map with no counterexample yet is reported as such, with what would be needed.
