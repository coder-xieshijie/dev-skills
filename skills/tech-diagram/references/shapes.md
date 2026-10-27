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

## Text inside shapes

- `node(x, y, w, h, color, text, sub?, { box?, size?, subSize?, pad? })` — box plus a centered title and one sub-line in the stroke color, kept `pad` (12px) from the sides. Most entities.
- `bnode(x, y, w, h, color, title, items, o)` — box plus a title and a list of detail lines (responsibilities, endpoints, properties), measured and centered. `title` and each item are a string or a `[primary, secondary]` pair; `'gap'` adds space between groups. Options: `size`, `secSize`, `itemSize`, `itemSecSize`, `itemGap`, `pad` (16px), `box`.
- `btext(...)` — the text of `bnode` without the box, for text on a `stack` or `channel`.
- `lbl({ text, sub, x, y, w, color })` and `plain({ text, x, y, w, ... })` — free labels. `w: 'fit'` shrinks the label to its text, and `cx` in place of `x` centers it on cx. A label that sits on an arrow gets `bg: LABEL_BG` so it masks only what it covers; a label never sits on a frame line, because masking it would hide where the zone ends. Put arrow labels that cross zones where the arrow runs through the corridor, and keep them narrower than the corridor (two short lines rather than one long one).
- `pair(primary, secondary)` and `pairInline(primary, secondary)` — bilingual text: the primary language first and larger, the secondary under it or after an em space.

## Lines

- `arrow(x1, y1, x2, y2, o?)` — straight arrow. `{ strokeLineDash: [10, 7] }` for a weaker relation (optional call, async, reply); `RED` for a denied or failed path.
- `route(points, o?)` — polyline with the head on the last segment. Use right angles and run routes through the gaps between zones and nodes; a long route around the outside (over the top of everything) reads better than a diagonal through a zone.
- `msg(x1, x2, y, text, o?)` — a message between lifelines: `{ reply: true }` dashed, `{ error: true }` red dashed, `x1 === x2` a self-call. Labels sit above the arrow on ivory.

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
