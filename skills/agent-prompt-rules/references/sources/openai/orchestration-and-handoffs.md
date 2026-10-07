# Orchestration and handoffs

> Source: [https://developers.openai.com/api/docs/guides/agents/orchestration](https://developers.openai.com/api/docs/guides/agents/orchestration)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `f2517801bf6977152e66d8ce14ac2bb3b10fea8d6ea8e5f671953c6daf3be4fd`.

## Choose the orchestration pattern

## Use handoffs for delegated ownership

## Use agents as tools for manager-style workflows

## Add specialists only when the contract changes

Start with one agent whenever you can. Add specialists only when they materially improve capability isolation, policy isolation, prompt clarity, or trace legibility.

Splitting too early creates more prompts, more traces, and more approval surfaces without necessarily making the workflow better.

## Next steps
