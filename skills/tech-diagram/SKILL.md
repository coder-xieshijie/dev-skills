---
name: tech-diagram
description: Draws hand-drawn style technical diagrams (architecture with trust zones, request and data flows, sequences, lifecycles) as an editable HTML source and a layout-checked PNG for design docs, PR descriptions, reviews and slides. Use when asked to draw, redraw or fix an architecture, flow or sequence diagram (架构图, 流程图, 时序图), or to keep several diagrams of one system consistent.
---

# Tech Diagram

Each figure is one HTML file: rough.js hand-drawn shapes with serif print text, drawn by a `main()` function on top of a fixed set of helpers. `scripts/render.mjs` turns it into a PNG and checks the layout. The look is fixed so that every figure of a system, across documents, reads as one set.

## Rules that hold throughout

1. **Draw only what the sources say.** Every node, arrow and boundary comes from the user's text, a document they gave, or code and configuration you read. Write them into the `// Sources:` comment at the top of `main()` (`file:line`, document section, or "user"). Do not complete the system: a component the sources do not mention stays out, however likely it is to exist. When the diagram describes code, read the code behind each arrow; when the text and the code disagree, draw what the code does and tell the user where they differ.
2. **One question per diagram.** Decide what the reader must understand, pick the kind in [references/diagram-kinds.md](references/diagram-kinds.md), and leave out what does not serve it. When a diagram gets too dense to read, split it into an overview and detail diagrams.
3. **Color follows the concept.** Nine fixed role colors on ivory ([references/palette.md](references/palette.md)); the same concept keeps its color and shape in every diagram of a set. Arrows are always warm ink; red is only for what is denied or failed. Text inside a node uses the node's stroke color. Above five colors, add a legend.
4. **Print typography, no emoji.** Times New Roman and the Songti family, never sans-serif or handwriting ([references/typography.md](references/typography.md)). Labels use the language of the document the figure goes into; a bilingual figure puts the primary language first and larger, with `pair()` and `pairInline()`.
5. **Names the readers know.** Use the names in the sources. For a figure that leaves the team (public docs, external talks, open-source READMEs), replace internal service names, hostnames, IPs and account names with role names (`Egress proxy`, `Object storage`) unless the user says otherwise.
6. **Edit only `main()`.** The helpers record what they draw for the layout check; draw through them and leave them unchanged.

The user's explicit instructions (their own palette, a fixed size, a brand font) take precedence over these rules.

## Workflow

1. **Inventory.** List the components and boundaries (nouns) and the calls and data movements (verbs) the sources contain, each with its source. When the user did not ask for an image, the figure goes into Markdown that renders Mermaid, and it needs no zones, numbered rules or bilingual labels and fits in about ten nodes, write a Mermaid block with `look: handDrawn` instead (see the end of diagram-kinds.md) and stop here.
2. **Colors and shapes.** Map each concept to a slot with the matching domain dictionary: [cloud-architecture](references/domains/cloud-architecture.md) for services, platforms and security boundaries, [agent-team](references/domains/agent-team.md) for agents and multi-agent systems, [vertical-search](references/domains/vertical-search.md) for search. When two dictionaries apply, follow the one for the diagram's main subject and note the choice in the binding comment. Without one, use the abstract-meaning column of the palette. For two or more diagrams of one system, fill [assets/diagram-binding.md](assets/diagram-binding.md) next to the figures before drawing the first, and only append to it afterwards. Shapes and helper signatures: [references/shapes.md](references/shapes.md).
3. **Draw.** Copy [assets/diagram.html](assets/diagram.html) next to the document the figure belongs to, set `W` and `H` at the top, and write `main()`: the sources and color-binding comments, then the title, zones, nodes, arrows, notes and legend. Copy layouts from the examples below rather than starting from a blank canvas.
4. **Render and check.**

   ```bash
   node <this-skill>/scripts/render.mjs <figure>.html            # writes <figure>.png at 2x next to it
   node <this-skill>/scripts/render.mjs <figure>.html --scale 1  # smaller file, e.g. for a figure kept in a repository
   ```

   It needs Chrome or Chromium (`CHROME=<path>` when it is not in the usual place) and network access to cdn.jsdelivr.net for rough.js. Render overviews wider than about 2000px with `--scale 1` while iterating. It exits 1 and lists every text that overlaps text, line through unmasked text or label sitting on a zone boundary, text crossing a box border or running to its side, arrow through a box it does not connect, anything past the canvas, emoji, and text rendered in a non-serif font. Fix each by moving things, widening the gap between zones, or resizing a box, and run it again until it reports no issues. It exits 2 when rendering itself failed; its message says why.
5. **Look at the PNG.** Read a copy scaled to at most 2000px on the long side, and crops of the dense regions of a large overview. Check what the script cannot: everything in the inventory is drawn and nothing else; the main subject is the largest box; every arrow means the same kind of thing; arrows cross as little as possible and never over a label; captions wrap where a reader expects; no large empty margins; circled numbers match the notes; in a set, names and colors match the binding.
6. **Deliver.** Show the PNG to the user (attach or embed it, not only its path) and keep the HTML next to it so the figure can be changed and re-rendered. When it goes into a document or PR, reference the PNG by a relative path. Say which parts came from which source when the user did not give them all.

## Examples

Each is a full copy of the template with its own `main()`; render any of them to see the result.

- [examples/zones-architecture.html](examples/zones-architecture.html): architecture with trust zones, bilingual labels, a stack of isolated workers, a route around a zone, a red deny path, numbered rules under the diagram, and a legend.
- [examples/sequence.html](examples/sequence.html): OAuth authorization code with PKCE; lifelines, calls, replies, self-calls and a failure reply.
- [examples/coding_agent.html](examples/coding_agent.html): one dense flow diagram with a sandbox frame, a verify hexagon and a red retry path, in Chinese.
- [examples/vertical-search/](examples/vertical-search/diagram-binding.md): a set of three diagrams (overview, offline, online) with the binding file they share.
