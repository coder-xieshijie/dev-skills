# Refusals and fallback

> Source: [https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-14) has sha256 `ecaea950f953b2fdb6535ce2e808b20d1f9e52a2a7916fa16a5b8e3e25bd0184`.

## What a refusal looks like

### Keep reasoning in thinking blocks

A `reasoning_extraction` refusal usually comes from a prompt that asks the model to put its thinking or reasoning in the output, either verbatim or in a fixed format. Common examples:

* A `<thinking>`, `<reasoning>`, or scratchpad section that the model fills in before it answers
* A `reasoning`, `thinking`, or `trace` field in JSON output or in a tool input
* The model's private notes, or a running log of its reasoning
* Reasoning asked for verbatim or in full

The wording can sit in a system prompt, a skill, or a tool description, so check those too.

You can still ask Claude to explain its answer. Ask for a short explanation, the evidence behind a result, or a summary of the actions it took. To see how the model reasoned, set `display: "summarized"` and read the [`thinking` blocks](https://platform.claude.com/docs/en/build-with-claude/thinking#summarized-thinking). This category has no recommended fallback model, so change the prompt rather than retry the request. If a reworded request is still declined, [contact support](https://support.claude.com/en/articles/9015913-how-to-get-support) and include the [request ID](https://platform.claude.com/docs/en/api/errors#request-id).

## How refusals are billed

## Picking a fallback approach

## Server-side fallback

### Making the request

### Naming your own fallback models

### What the response contains

### Continuing the conversation

### Streaming

### Non-streaming responses

### Billing and rate limits

### Sticky routing

## Client-side fallback with the SDK middleware

### Setting it up

### How it behaves

## Writing the retry yourself

## Refusals in Message Batches

## Common pitfalls

## Next steps
