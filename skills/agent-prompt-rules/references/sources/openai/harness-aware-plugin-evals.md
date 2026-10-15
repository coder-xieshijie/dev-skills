# Harness-aware evaluation of plugins

> Source: [https://developers.openai.com/cookbook/examples/partners/harness_aware_plugin_evals/harness_aware_plugin_evals](https://developers.openai.com/cookbook/examples/partners/harness_aware_plugin_evals/harness_aware_plugin_evals) (dated 2026-09-23 in the Cookbook registry; published on the site 2026-10-09)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-14) has sha256 `9f054f414585524d227d950028a1766dc16212726853e1d0d1a15ac0b26052fb`.

## Overview

## Setup

### Dependencies

### The example plugin

### The example dataset

## Direct tool tests: A deterministic check with no model in the loop

## A standalone function-calling loop

### The function-calling loop

### The assertion

### Wiring the dataset to the provider

### Running the evaluation

## Product harness: Codex

### The Codex provider setup

### Running the example

### Replaying the three runs

### A spot check against the ChatGPT desktop app

## Reading the results: Model-harness compatibility

### Three models, one harness

### Observed gap changes

### Why GPT-5-mini performs worse under Codex

### Why GPT-6 Luna performs worse in the standalone loop

## Accounting for non-determinism

Runs that involve a model, however, can produce different results across runs of the same configuration:

[…]

The same Codex configuration, run three times with GPT-6 Luna over the 108 questions
from the benchmark configuration above, gives the following spread:

| Repeat                      | 1     | 2     | 3     |
| --------------------------- | ----- | ----- | ----- |
| Pass rate                   | 0.88  | 0.89  | 0.86  |
| Tool calls / question       | 5.54  | 5.70  | 5.20  |
| Reasoning tokens / question | 1,229 | 1,195 | 1,146 |

*Table 3: Three repeated runs of the production plugin under Codex.*

- The overall pass rate barely moves: a spread of 3 points across all three runs.
- Individual questions move far more than that spread suggests. 23 of the 108 (21%) flipped between
  a pass and a fail somewhere across the three runs while the aggregate stayed steady.

## Practical takeaways

[…]

Compare eval traces with production runs to catch differences the configuration misses, such as
agent instructions, tool availability, or runtime versions. A pass rate measured once can also look
far steadier than the case-by-case reality underneath it.
Repeat the same cases automatically to measure how stable they are, and treat that
stability as a metric of its own. A system whose verdict on the same question swings between runs
may be less useful than one with a slightly lower average score but more predictable behavior.

[…]

### Trying it yourself

## Further reading

## Contributors
