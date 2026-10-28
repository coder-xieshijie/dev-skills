---
name: tech-diagram
description: Draws hand-drawn style technical diagrams (architecture with trust zones, request and data flows, sequences, lifecycles) as an editable HTML source and a layout-checked PNG for design docs, PR descriptions, reviews and slides. Use when asked to draw, redraw or fix an architecture, flow or sequence diagram (架构图, 流程图, 时序图), to plan the figures of a design document, or to keep several diagrams of one system consistent.
---

# Tech Diagram

Each figure is one HTML file: rough.js hand-drawn shapes with serif print text, drawn by a `main()` function on top of a fixed set of helpers. `scripts/render.mjs` turns it into a PNG and checks the layout. The look is fixed so that every figure of a system, across documents, reads as one set.

## Rules that hold throughout

1. **Draw only what the sources say.** Every node, arrow and boundary comes from the user's text, a document they gave, or code and configuration you read. Write them into the `// Sources:` comment at the top of `main()` (`file:line`, document section, or "user"). Do not complete the system: a component the sources do not mention stays out, however likely it is to exist. When the diagram describes code, read the code behind each arrow; when the text and the code disagree, draw what the code does and tell the user where they differ. Within the figure's question, draw all of what the sources say: every part of a container the figure opens, and every path the text names, or the figure or table that has it.
2. **One question per diagram.** Decide what the reader must understand, pick the kind in [references/diagram-kinds.md](references/diagram-kinds.md), and leave out what does not serve it. When a diagram gets too dense to read, split it into an overview and detail diagrams.
3. **Color follows the concept.** Nine fixed role colors on ivory ([references/palette.md](references/palette.md)); the same concept keeps its color and shape in every diagram of a set. Arrows are always warm ink; red is only for what is denied, failed or degraded. Text inside a node uses the node's stroke color. Above five colors, add a legend.
4. **Print typography, no emoji.** Times New Roman and the Songti family, never sans-serif or handwriting ([references/typography.md](references/typography.md)). Labels use the language of the document the figure goes into; a bilingual figure puts the primary language first and larger, with `pair()` and `pairInline()`.
5. **Names the readers know.** Use the names in the sources. For a figure that leaves the team (public docs, external talks, open-source READMEs), replace internal service names, hostnames, IPs and account names with role names (`Egress proxy`, `Object storage`) unless the user says otherwise.
6. **Edit only `main()`.** The helpers record what they draw for the layout check; draw through them and leave them unchanged. Change the canvas size with `main.mjs inject <figure>.html --size WxH`.

The user's explicit instructions (their own palette, a fixed size, a brand font) take precedence over these rules.

## Workflow

1. **Plan the set.** For figures that go into a document, or two or more figures of one system, follow [references/figure-plan.md](references/figure-plan.md): extend the set already next to the document, rank candidate figures by where readers get stuck, give the set an overview that answers the document's conclusion, list for each figure the parts of every container it opens and every normal and abnormal path, and write the Figures table of the binding before drawing. When the user asked which figures to draw, show the table and stop there.
2. **Inventory.** List the components and boundaries (nouns) and the calls and data movements (verbs) the sources contain, each with its source. Write a Mermaid block only when the user or the repository asks for Mermaid (for example, diagrams that must stay diffable text), with the hand-drawn look at the end of diagram-kinds.md; otherwise draw.
3. **Colors and shapes.** Map each concept to a slot with the matching domain dictionary: [cloud-architecture](references/domains/cloud-architecture.md) for services, platforms and security boundaries, [agent-team](references/domains/agent-team.md) for agents and multi-agent systems, [vertical-search](references/domains/vertical-search.md) for search. When two dictionaries apply, follow the one for the diagram's main subject and note the choice in the binding comment. Without one, use the abstract-meaning column of the palette. For two or more diagrams of one system, fill [assets/diagram-binding.md](assets/diagram-binding.md) next to the figures before drawing the first, and only append to it afterwards. Shapes and helper signatures: [references/shapes.md](references/shapes.md).
4. **Draw.** Create the figure from [assets/diagram.html](assets/diagram.html) next to the document it belongs to with `node <this-skill>/scripts/main.mjs new <figure>.html --size WxH`, and write `main()`: the sources and color-binding comments, `kind(...)`, then the title, zones, nodes, arrows, notes and legend. Copy layouts from the examples below rather than starting from a blank canvas. The HTML is the only source of a figure: to change `main()`, extract it into a directory of your own, edit it there and inject it back; keep scratch files in that directory, never under a fixed `/tmp` name, which another session may be using.

   ```bash
   dir=$(mktemp -d)
   node <this-skill>/scripts/main.mjs extract <figure>.html > "$dir/main.js"
   node <this-skill>/scripts/main.mjs inject <figure>.html "$dir/main.js"   # add --size WxH to change the canvas
   ```

   For an overview or any figure over 15 boxes, sketch the layout as a text grid first, then place it with `grid()` and join the boxes with `link()`.
5. **Render and check.**

   ```bash
   node <this-skill>/scripts/render.mjs <figure>.html            # writes <figure>.png at 2x next to it
   node <this-skill>/scripts/render.mjs <figure>.html --scale 1  # smaller file, e.g. for a figure kept in a repository
   ```

   It needs Chrome or Chromium (`CHROME=<path>` when it is not in the usual place). It serves rough.js from `assets/vendor/` in place of the CDN URL in the HTML, so it renders without network access; without it, CJK text falls back to a local font when no Songti font is installed. Render overviews wider than about 2000px with `--scale 1` while iterating. It exits 1 and lists every text that overlaps text, line through unmasked text or label sitting on a zone boundary, text crossing a box border or running to its side, arrow through a box it does not connect, anything past the canvas, emoji, text rendered in a non-serif font, and label text parsed as an HTML tag (write a literal `<task-report>` as `&lt;task-report&gt;`; only `b`, `i`, `br`, `sub`, `sup`, `span` and `div` are allowed in labels). Fix each by moving things, widening the gap between zones, or resizing a box, and run it again until it reports no issues. Then it prints warnings, which leave the exit code alone: arrows crossing arrows (`crossing`), slanted arrow segments in a figure whose `main()` starts with `kind('architecture')`, `kind('flow')`, `kind('overview')` or `kind('tree')` (`diagonal`), arrows that run far longer than the distance between their ends (`detour`), text under 8px once the figure is shown `--display-width` wide (default 1600, `small-text`), empty margins over 120px with the size to set (`margin`), and half-width `; : ,` next to Chinese or full-width brackets (`cjk-punct`). Fix every warning; leave a crossing, diagonal or detour only where the figure's plan says why. It exits 2 when rendering itself failed, with the exception the page threw and the requests that failed; fix `main()` for an exception, and for a failed request check that the URL loads.
6. **Check against the text.** Print the figure's text with `render.mjs <figure>.html --labels`, then list every component, step, branch and threshold in the sections the figure cites, and mark each as drawn (with the label that draws it) or as not drawn with the figure or table that has it.
   - When the figure opens a container (a turn, a context window, a request), it draws all of the container's parts, not only the new one.
   - Decisions follow the order the system applies them, taken from the code or the step-by-step text rather than from the order the text mentions them.
   - When drawing shows a gap or a contradiction in the text, stop drawing that part and report it with section numbers; the text decides, and the figure follows once it is settled.
7. **Look at the PNG.** Read a copy scaled to at most 2000px on the long side; for a canvas wider than 2000px, also read a crop of each region at full size. Report each item with yes or no: everything in the inventory is drawn and nothing else; the main subject is the largest box; every arrow means the same kind of thing; no crossing, diagonal or detour the plan does not explain, and no arrow over a label; captions wrap where a reader expects; text reads at full size in the crops; no large empty margins; circled numbers match the notes; in a set, names and colors match the binding. For an overview, or a set of three or more figures, have a reviewer subagent that has not seen the drawing compare each PNG with the sections it cites and list what is missing or contradicts the text; fix each finding or report it.
8. **Deliver.** Show the PNG to the user (attach or embed it, not only its path) and keep the HTML next to it so the figure can be changed and re-rendered. When it goes into a document or PR, reference the PNG by a relative path. In a document, number the files in reading order until the set is published (`01-overview.png`; afterwards see figure-plan.md, step 1), caption each figure `Figure N <title>` (`图 N <标题>`) with one sentence before it saying which question it answers, and after adding or moving a figure run `node <this-skill>/scripts/doc-figures.mjs <doc.md>`: make the renames it lists (none once the binding records `published:`), fix the references it reports, and re-render every figure whose HTML it names. Say which parts came from which source when the user did not give them all. For a set, include its Figures table as what the set covers. End with **Text issues found while drawing**: each gap or contradiction in the text with its section numbers, or "none".

## Examples

Each is a full copy of the template with its own `main()`; render any of them to see the result.

- [examples/zones-architecture.html](examples/zones-architecture.html): architecture with trust zones, bilingual labels, a stack of isolated workers, a route around a zone, a red deny path, numbered rules under the diagram, and a legend.
- [examples/sequence.html](examples/sequence.html): OAuth authorization code with PKCE; lifelines, calls, replies, self-calls and a failure reply.
- [examples/coding_agent.html](examples/coding_agent.html): one dense flow diagram with a sandbox frame, a verify hexagon and a red retry path, in Chinese.
- [examples/vertical-search/](examples/vertical-search/diagram-binding.md): a set of three diagrams (overview, offline, online) with the binding file they share.
- [examples/design-overview/](examples/design-overview/diagram-binding.md): the overview of a design document, a protagonist with its context layers expanded and three loops, drawn with `link()`; its binding holds the Figures table of the planned set.
