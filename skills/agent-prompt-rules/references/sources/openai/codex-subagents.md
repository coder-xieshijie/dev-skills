# Subagents

> Source: [https://learn.chatgpt.com/docs/agent-configuration/subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-01) has sha256 `dcf6371e3d921f2ba3721dcbd90a8e0aa7c83b028e8f91023f01b066ab19b8d2`.

## Availability

## Why subagent workflows help

## Core terms

## Triggering subagent workflows

## Choosing models and reasoning

_Applies to: ChatGPT desktop app, Codex CLI, IDE extension._

If you don't configure a subagent model or `model_reasoning_effort`, the
subagent inherits the parent agent's model and reasoning effort. If an explicit
spawn request or an `[agents]` default selects a model without an
explicit or configured reasoning effort, the subagent uses that model's default
reasoning effort. To balance intelligence, speed, and price for each task,
request a specific model or reasoning effort in your prompt,
configure `[agents]` defaults in `config.toml`, or set `model` and
`model_reasoning_effort` directly in the custom agent file.
For example, use `gpt-6-luna` for fast scans or a higher-effort `gpt-6.1-sol` configuration for more demanding reasoning.

### Model choice

- **`gpt-6-luna`**: Use for fast, narrowly scoped agents handling clear, repeatable, or high-volume work.

### Reasoning effort (`model_reasoning_effort`)

## Orchestration and thread controls

_Applies to: ChatGPT desktop app, Codex CLI, IDE extension._

Current local Codex releases spawn agents after a direct request or applicable
project or skill instruction.

## Managing subagents

## Approvals and sandbox controls

## Custom agents

### Global settings

### Custom agent file schema

### Example custom agents

#### Example 1: PR review

#### Example 2: Frontend integration debugging
