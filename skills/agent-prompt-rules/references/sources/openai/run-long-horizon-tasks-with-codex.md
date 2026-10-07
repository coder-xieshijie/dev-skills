# Run long horizon tasks with Codex

> Source: [https://developers.openai.com/blog/run-long-horizon-tasks-with-codex](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex) (published 2026-02-23)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `e4c3cc6f38ce156a57b97009cc739a04171e3bc7e203fe8d124ca8ade197d19e`.

## What a long-run Codex session looks like

## The real shift is time horizon

## Why Codex can stay coherent on long tasks

## My setup for the test

## The key idea: durable project memory

The most important technique was durable project memory. I wrote the spec, plan, constraints, and status in markdown files that Codex could revisit repeatedly. That prevented drift and kept a stable definition of "done."

#### [Prompt.md](https://github.com/derrickchoi-openai/design-desk/blob/main/docs/prompt.md) (spec + deliverables)

Purpose: Freeze the target so the agent doesn’t “build something impressive but wrong.”

Key sections in the file:

- Goals + non-goals
- Hard constraints (perf, determinism, UX, platform)
- Deliverables (what must exist when finished)
- “Done when” (checks + demo flow)

#### [Plan.md](https://github.com/derrickchoi-openai/design-desk/blob/main/docs/plans.md) (milestones + validations)

#### [Implement.md](https://github.com/derrickchoi-openai/design-desk/blob/main/docs/implement.md) (execution instructions referencing the plan)

#### [Documentation.md](https://github.com/derrickchoi-openai/design-desk/blob/main/docs/documentation.md) (status + decisions as it shipped)

### Verification at every milestone

Codex did not just write code and hope it worked. After milestones, it ran verification commands and repaired failures before continuing.

## What the agent built

## Takeaways for long-horizon Codex tasks

## Try Codex on your own long-running task
