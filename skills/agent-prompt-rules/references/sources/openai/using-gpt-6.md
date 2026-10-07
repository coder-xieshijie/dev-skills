# Using GPT-6

> Source: [https://developers.openai.com/api/docs/guides/latest-model](https://developers.openai.com/api/docs/guides/latest-model)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-01) has sha256 `e7ffd1c471a1fcf30f4813279bc99a78c8634a4534228a2d747c085d253d654f`.

### GPT-6 Astra

### GPT-6.1 Sol

## What's new

## Limitations

## Prompting best practices

### GPT-6 Astra behavior

### Initiative and follow-through

```text
You should infer the user's intent and task scope from the instructions and prior conversation context. Your job is to bias towards action and carry the user's intended task to completion.

When the user expresses intent to perform new work or fix an existing issue, persist until the user's intended goal is complete. Progress autonomously towards the user's goal (e.g. creating isolated worktrees / checkouts if needed, resolving merge conflicts, read-only actions, creating draft PRs etc.) unless they are clearly destructive or irreversible.
```

[…]

Prompt the model to ask for approval only after preparing a concrete, reviewable result. This avoids blocking the task before the model has done the work it can, and often leads to quicker task completion.

```text
Before asking the user clarifying questions, you should complete the work that is already authorized from context and necessary to make the proposed action concrete and reviewable. The user should be approving a concrete, reviewable result. For example, before deploying a change, writing to an external application, merging a PR or publishing a site, do all the required work first so that user approval is the final step. You don't need user permission for reversible tasks, read-only actions, reviews or fixes, or anything for which authorization is provided earlier in the session or strongly implied from the task instruction.

[…]
```

### Instruction following

GPT-6 Astra is better able to follow longer instructions, but can also be more sensitive to information in context. For example, unclear or conflicting guidance in a skill file may cause the model to pause and block work early. Make the priority of user instructions and skills explicit.

```text
The user's instructions take precedence over guidelines provided in a skill. If explicit user instructions conflict with a skill's instructions, prioritize the user's instructions.
```

### Personality and writing style

### Subagent delegation

GPT-6 Astra is trained to be able to divide and delegate work to subagents that work in parallel. If you are implementing a multi-agent system in your harness, use the following prompt to tune how much GPT-6 Astra should delegate work:

[…]

The model tends to respond well to prompting for how and when it should delegate work to subagents, so tune this behavior to fit with your harness and multi-agent implementation.

### Testing and verification

For coding tasks, calibrate how much testing and verification a change requires. This can help avoid unnecessary tests or repeated checks for small changes.

```text
Do not write tests for reversible, low-impact changes that mirror the implementation. If you do choose to verify your work with tests, make sure that the tests are meaningful and necessary to verify implementation.

Run tests appropriate to the change and complete required checks. Once those pass, broaden or repeat testing only when new changes, failures, or unresolved concerns justify it; otherwise, continue toward completing the task.
```

## Migration quickstart

### Migrate with Codex

### Update API and model parameters
