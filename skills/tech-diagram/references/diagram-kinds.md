# Diagram kinds

How each kind of technical diagram is laid out with the helpers. Pick the kind from what the reader must understand, not from what the system has: a diagram answers one question.

| The reader must understand | Kind |
|---|---|
| What the parts are and which may talk to which; where the trust or network boundaries are | Architecture with zones |
| What happens to one request or one piece of data, step by step, across components | Request or data flow |
| Who sends what to whom, in what order, including replies and failures | Sequence |
| Which states something passes through and what moves it between them | Lifecycle or state machine |
| Which checks run in what order, and where each answer leads | Decision procedure |
| How big the parts are against a limit (a budget, a window, a quota) | Budget or proportion |
| What one thing is made of, level by level (a request, a context window, a message) | Composition tree |
| How a design carries its document's one-sentence conclusion | Overview of a design document |
| Several of the above about one system | A set: an overview plus one detail diagram per topic |

## Architecture with zones

The layout of [`examples/zones-architecture.html`](../examples/zones-architecture.html).

- Columns left to right in the direction requests travel: callers → entry → control → execution → exit → outside. Each column that is a boundary in the text is a `frame()`, labelled with its name and, when the diagram has numbered rules, the rule's circled number.
- A zone that sits beside the flow rather than on it (persistent data, shared storage, observability) goes in its own frame under or above the column that uses it most, with vertical arrows into it.
- The main subject (usually the control plane or the core service) is the tallest box, in `C.agent`, with `strokeWidth: 3`.
- Arrows between zones run through the corridors between frames; a dependency that skips zones goes around the outside with `route()` and says so in its label (`calls the gateway directly, never via a sandbox`).
- Denied paths end in a red hexagon (`Default deny`) with a red dashed arrow and a label naming what is denied.
- When the figure states rules or guarantees, put them in `notes()` under the diagram, numbered to match the circled numbers on the zones and arrows. The rules are the point of such a figure; the drawing shows where each one applies.
- Canvas around 2400–3000 × 1400–1900 for an overview with notes; it is read zoomed in or full screen. Render it with `--scale 1` while iterating; the default 2x output is 5000px or more wide.

## Request or data flow

- One main path, left to right (or top to bottom when it is long), numbered ① ② ③ on the arrow labels in the order things happen.
- Branches for failure or retry leave the main path downward in red dashed lines and come back with a `route()`; they do not cross the main path.
- Label each arrow with what moves (`order`, `INSERT`, `event`) or the call (`POST /orders`). One verb per arrow.
- Components the request never touches stay out, even if they exist.

## Sequence

The layout of [`examples/sequence.html`](../examples/sequence.html).

- One `lifeline()` per participant, in the order they first appear; the initiator on the left. The participant's color follows its role in the binding; the main subject gets a wider box with `box: { strokeWidth: 3 }`.
- Messages top to bottom with `msg()`, about 64px apart, 86px after a self-call. Calls solid, replies `{ reply: true }`, failures `{ error: true }`. Number the steps.
- Message labels name the call and its key arguments (`POST /token (code, verifier)`), not prose.
- Alternatives (a failure instead of the success reply) go right after the message they replace, in red. When a branch spans several messages, or depends on a state (`agent is mid-turn`), put each case in a `fragment()`: `alt` with an `else` line for two cases, `opt` for messages that happen only sometimes. When one message has more than two alternatives, or the failures need steps of their own, draw them as a separate sequence.
- Notes under a sequence may explain outcomes that span several steps (exit codes, cleanup); such a note names the steps in its body instead of carrying a circled number of its own.
- Width about 440px per participant; height is `top + 140 + 64 × messages + 22 × self-calls`, plus the notes under it. Tighten `H` after looking at the first render.

## Lifecycle or state machine

- States are boxes in the color of the thing whose state it is; the initial state on the left, end states as hexagons on the right (failure end states in `C.error`).
- Transitions are arrows labelled `event [guard] / action`, as short as the text allows. Self-transitions use `route()` loops above the box.
- When time matters (timeouts, idle reclaim), put a `timeline()` under the states with the durations on its ticks.

## Decision procedure

- Checks run left to right (or top to bottom) in the order the system applies them, each a `decision()`; take the order from the code or the step-by-step text, not from the order the text mentions the checks.
- The answer that continues the procedure leaves to the right; the other leaves downward, each through `branch()` labelled with the answer in the document's language.
- Outcomes are boxes; a branch that makes the user wait or lose something is red (`{ degraded: true }`) and ends in a red outcome.
- Put the procedure's trigger (`every turn`, `on each request`) as the first box, so the reader sees when it runs.

## Budget or proportion

- One `scaleBar()` per budget, segments in the order they sit (oldest to newest, first to last), each segment in the color of its concept in the binding; leave the unused part as `rest`.
- Limits (soft line, hard line, quota) are `marks`; a limit whose crossing degrades the result is `C.error`.
- Use the returned `sx(value)` for anything that points at the bar: an arrow to the soft line, a note under a segment.
- Several bars that compare the same budget at different moments (before and after compaction) share `x`, `w` and `max`, stacked with their moment as a label on the left.

## Composition tree

`kind('tree')`; join levels with `link()` so arrows stay right-angled.

- Root on the left, parts in the middle column, contents in the right column; every arrow means "contains".
- Parts follow the order they sit in the thing (first to last in a request), grouped in bands numbered like the layers the text names.
- Under each part, one line: when it changes and how big it is, for one stated deployment.
- Leaves take their parent's color at a lighter stroke, each with a short explanation after its name.
- Three levels at most; a part with more depth gets a tree of its own.
- The tree mirrors one table in the text (see figure-plan.md, step 5); its labels use that table's names.

## Overview of a design document

The layout of [`examples/design-overview/`](../examples/design-overview/diagram-binding.md). `kind('overview')`.

- It answers the document's one-sentence conclusion, not "what are the parts"; the subtitle states that conclusion.
- Expand the protagonist: draw inside its box the inner structure the mechanisms act on (layers, stages, queues), so each arrow lands on the part it changes. Every other component stays one box.
- Group arrows into loops, one per pillar of the document. Label them A1, A2, B1 … in the order things happen, and keep each loop's arrows together in one region of the canvas.
- Circled numbers mark one thing per figure, either the parts (layers) or the steps; with loop labels on the arrows, they mark the parts.
- Place each store directly under the component that writes or reads it most, so its arrows are short and vertical.
- Draw the normal path of each loop; failures, fallbacks and rare branches go to the detail figures, and the notes name the figure that has each.
- Write the notes as one group per loop: what it answers, then "Figure N, section X" for the details.

## A set: overview and details

The layout of [`examples/vertical-search/`](../examples/vertical-search/diagram-binding.md).

- Plan the set and write the binding file first ([`figure-plan.md`](figure-plan.md), [`assets/diagram-binding.md`](../assets/diagram-binding.md)): the Figures table, then every concept of the whole set → color → shape, before drawing the first diagram.
- The overview shows each subsystem as one box, except the protagonist when the document is about its inside (see the section above); each detail diagram expands one subsystem into its parts inside a frame of the subsystem's color, with the rest of the overview reduced to the few boxes it talks to.
- Keep names identical across the set: a box called `Egress proxy` in the overview is `Egress proxy` in its detail, not `Outbound gateway`.

## When Mermaid is asked for

When the user or the repository asks for Mermaid (for example, diagrams that must stay diffable text), give the block the hand-drawn look so it matches these figures:

````markdown
```mermaid
---
config:
  look: handDrawn
---
flowchart LR
  A[Client] --> B[Order service] --> C[(Orders DB)]
```
````
