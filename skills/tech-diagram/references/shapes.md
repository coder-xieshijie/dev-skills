# Shapes and helpers

A new concept gets a new shape before it gets a new color. Every diagram in a set uses the same shape meanings. All helpers live in [`assets/diagram.html`](../assets/diagram.html); draw through them, because they record what they draw for the layout check in `scripts/render.mjs` (a line drawn with `rc.line` directly is invisible to it).

## Shapes

| Shape | Use for | Helper |
|---|---|---|
| **Box** | Entity: service, component, store, resource, person | `box(x, y, w, h, color, override?)` |
| **Channel** (flat strip, 60–90px high) | Something that flows through: queue, bus, stream, topic, message channel | `channel(x, y, w, h, color)` |
| **Task card** (folded corner) | Work that moves: job, task, message, file, version | `taskCard(x, y, w, h, color)` |
| **Bubble** | Status message or notification; the tail points at the sender | `bubble(x, y, w, h, color, tailSide)` |
| **Hexagon** | Decision, check, failure, end state; one short label | `hexagon(cx, cy, w, h, color)` |
| **Stack** (three offset boxes) | Many isolated instances of one thing: one sandbox per task, one pool per tenant | `stack(x, y, w, h, color, override?)` |
| **Frame** (dashed boundary) | Zone: trust boundary, network, VPC, process, subsystem, workspace | `frame(x, y, w, h, color, label?, { labelX }?)` |
| **Lifeline** | Participant in a sequence diagram | `lifeline(x, top, bottom, color, text, sub?, { w, h, box }?)` |
| **Timeline** | Order of phases, a long-running process | `timeline(x1, y, x2, marks)` |
| **Scale bar** | Sizes against a limit: a context budget, a quota, a time budget | `scaleBar(x, y, w, h, segments, { max, unit, rest, marks })` |
| **Fragment** (dashed gray box with a tag) | Alternative or optional messages in a sequence: `alt`, `opt` | `fragment(x1, x2, y1, y2, operator, guard, { else })` |

Every shape helper, `node()`, `bnode()`, `lifeline()` and `decision()` return the shape they drew: `{ x, y, w, h, cx, cy }` plus `top(t)`, `bottom(t)`, `left(t)` and `right(t)`, the point at fraction `t` (default 0.5) of that side. Keep them in constants and connect them with `link()`.

## Text inside shapes

- `node(x, y, w, h, color, text, sub?, { box?, size?, subSize?, pad? })` — box plus a centered title and one sub-line in the stroke color, kept `pad` (12px) from the sides. Most entities.
- `bnode(x, y, w, h, color, title, items, o)` — box plus a title and a list of detail lines (responsibilities, endpoints, properties), measured and centered. `title` and each item are a string or a `[primary, secondary]` pair; `'gap'` adds space between groups. Options: `size`, `secSize`, `itemSize`, `itemSecSize`, `itemGap`, `pad` (16px), `box`.
- `btext(...)` — the text of `bnode` without the box, for text on a `stack` or `channel`.
- `lbl({ text, sub, x, y, w, color })` and `plain({ text, x, y, w, ... })` — free labels. `w: 'fit'` shrinks the label to its text, and `cx` in place of `x` centers it on cx. A label that sits on an arrow gets `bg: LABEL_BG` so it masks only what it covers; a label never sits on a frame line, because masking it would hide where the zone ends. Put arrow labels that cross zones where the arrow runs through the corridor, and keep them narrower than the corridor (two short lines rather than one long one).
- `pair(primary, secondary)` and `pairInline(primary, secondary)` — bilingual text: the primary language first and larger, the secondary under it or after an em space.

## Layout

- `grid(x, y, cols, rows, cellW, cellH, gapX, gapY)` returns `cell(col, row, colSpan?, rowSpan?)` → `{ x, y, w, h }`. Sketch the figure as a text grid first (one cell per box, corridors as gaps), then place every box from a cell, so columns and rows line up and arrows can run straight.
- `link(a, b, o?)` — right-angle arrow between two shapes, from the side of `a` facing `b` to the side of `b` facing `a`. Facing sides that overlap get one straight arrow through the middle of the overlap; otherwise a Z through the middle of the gap (`mid` moves that leg), an L when `from` and `to` are at right angles, or a C around the outside when both are the same side. Options: `from`, `to` (`'top' | 'bottom' | 'left' | 'right'`), `fromAt`, `toAt` (fraction along the side, to fan out several arrows), `mid`, `label`, `labelSide`, `labelAt` (fraction along the longest leg, to move the label into open space), `size`, `style` (`RED`, a dashed style). The label sits on ivory beside the longest leg. Returns the points, so a label or a note can be placed against them.
- `decision(cx, cy, text, { w, h, color, size }?)` — one check of a decision procedure: a hexagon with its question. `branch(d, target, answer, o?)` is `link()` labelled with the answer; `{ degraded: true }` draws it red.

## Lines

- `arrow(x1, y1, x2, y2, o?)` — straight arrow. `{ strokeLineDash: [10, 7] }` for a weaker relation (optional call, async, reply); `RED` for a denied or failed path.
- `route(points, o?)` — polyline with the head on the last segment; `link()` computes the points for you between two shapes. Use right angles and run routes through the gaps between zones and nodes; a long route around the outside (over the top of everything) reads better than a diagonal through a zone.
- `msg(x1, x2, y, text, o?)` — a message between lifelines: `{ reply: true }` dashed, `{ error: true }` red dashed, `x1 === x2` a self-call. Labels sit above the arrow on ivory.
- `fragment(x1, x2, y1, y2, operator, guard, { else: { y, guard } }?)` — `alt` or `opt` around messages. The tag and guard sit inside the top-left corner; leave about 40px above the first message inside and 30px around the `else` line, and put `x1` and `x2` outside the lifelines it spans.

Arrows always mean the same thing within one diagram: either "calls / sends to" (who acts on whom) or "data flows to" (where bytes go). Say which in the subtitle when it is not obvious, and never mix the two. Relations that fit neither, such as a mount, an archive job or a lease, follow the diagram's meaning: in a "calls" diagram, point the arrow from the side that acts (the sandbox mounts its directory, the job archives to storage).

Arrows cross each other as little as possible. Order the boxes in each column by the column they talk to, so arrows stay horizontal; when two flows must cross, cross them at a right angle in open space, never over a label.

## Keys and notes

- `notes(x, y, w, heading, items, cols)` — numbered points under a rule line; each item is `{ title, body }` and its circled number matches the same number on the diagram (on a zone label or an arrow label). Returns the y below the last row.
- `legend(x, y, items, cols, colW, heading)` — color key, required above 5 colors; list only the colors used.

## Which shape when

- **Entity → box.** The main subject's box is 1.3–1.5× the others with `strokeWidth: 3`; size and weight make it stand out, not a brighter color.
- **Boundary → frame.** Every trust boundary, network boundary or process boundary the text names is a frame in the color of what it contains. A grouping that is not a part of the system (a stage, a phase, a team) uses `C.external` gray. Nodes keep ≥ 28px from the frame line. Leave a corridor of at least 100px between neighbouring frames for the arrows that cross them and their labels.
- **Something that crosses a boundary → an arrow through the gap**, labelled with the interface or protocol when the text names one (`gRPC`, `POST /token`, `mounts session dir`).
- **Many instances → stack**, with the count or the isolation unit in a caption (`one per task`, `× 100k`).
- **Queue → channel**, so readers tell "flows through" from "stays".
- **Check or failure → hexagon.** Its slanted ends (`w * 0.18` each) leave little width for text: one short label, never a list.

## Do not

- Circles, clouds, 3D cubes, cylinders: they clash with the hand-drawn boxes or read as product logos.
- A different shape for the same concept in another diagram of the set.
- A frame drawn with `rc.rectangle`: with the solid default fill, rough.js can paint over the nodes inside. `frame()` draws four dashed lines for this reason.
