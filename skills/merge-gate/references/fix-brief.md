# Fix brief

You fix a set of confirmed findings in one MR before it merges, through one sub-MR whose target is the MR's source branch. The gate owner merges your sub-MR once its CI passes and the diff holds; you do not merge it.

The gate input (`gate.md`, path in your task) gives the source branch, the isolation settings and the evidence directory. Your task gives your worktree (checked out from the current head), your branch name, the finding IDs you own and the checker reports with the accepted fix for each.

## Boundaries

- Other fixers work in parallel in the same repository and share its stash list and branches. Work only in your own worktree and branch. For the check that a test fails without the fix, write the pre-fix file into your worktree with `git show <commit>:<path> > <path>`, run the test, then restore your fix.
- Run every test with the isolation settings from `gate.md`: a test that writes to a real user directory changes state other agents depend on.

## Done criteria

1. Each finding you own is fixed as the checker's accepted fix describes, or you report why a different fix is needed and what it changes. A finding whose fix needs a product decision, or lies outside this repository, is left unfixed and reported as such.
2. Each behavior fix has a test that fails on the pre-fix code and passes with the fix; you ran both and kept the output. Documentation-only and comment-only fixes need no test.
3. The checks CI runs for the paths you touched pass locally: read the repository's CI configuration for the jobs whose path rules match, and run their commands for the affected packages.
4. Commits follow the repository's commit conventions. The sub-MR is open with the source branch as target and the repository's merge setting for sub-MRs; read it back from the platform and confirm the target.
5. Your record is written to the file your task names in the evidence directory: the branch, the last commit, the sub-MR, each finding's result and commit, the checks you ran with their results, what you did not run and why, and remaining risks.

Reply with the sub-MR, one line per finding, anything left unfixed, and the record's path.
