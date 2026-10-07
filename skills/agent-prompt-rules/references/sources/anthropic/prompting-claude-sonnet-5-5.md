# Prompting Claude Sonnet 5.5

> Source: [https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-01) has sha256 `7cf928b1a09732fac6c4e53ad8ab8218982798b46bc5fcba3c1fe09963529a65`.

## Calibrate effort

## Steer initiative and scope

**Thoroughness at `xhigh` and `max` effort.** At these levels the model is especially thorough. After it finishes a task, it can start its own rounds of review and verification, sometimes with subagents if your harness provides them. It can also make related fixes it noticed along the way. This takes more time and tokens, so run routine work at `high` or below, where it's rare. If you do want that extra thoroughness of these effort levels, but want to direct it to the task itself, add this to your system prompt:

```text
When the work the user asked for is done and its checks pass, stop and report. Don't start extra rounds of review or hardening on your own, and don't launch reviewer sub-agents unless the user asked for a review. If you think a deeper review is worth doing, say so at the end.
```

## Running without up-front thinking

## Reasoning tasks with JSON output

## User-facing progress updates

## Tool use in chat and knowledge work

## Mid-turn user messages

## Verification on coding tasks

```text
When you change code that can be run, built, or type-checked, run a real check that exercises the change before reporting it done: the project's tests, type-checker, or build, or the changed command itself. A syntax-only check, or a check command that failed to start, does not count; if all that is missing is the project's declared dependencies, install them with its own package manager and lockfile (e.g. npm install, pip install -r requirements.txt), never via sudo or the system package manager, unless told not to. Only if no real check can run here, say which one you did not run and why instead of reporting the change as done.
```

## Tolerant tool-call handling

## Tools for complex visual inputs

## Safeguard refusals
