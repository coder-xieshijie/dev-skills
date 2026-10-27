# Palette: 9 fixed role colors (muted warm tones on off-white)

Every diagram in a document or series shares this one palette. **A role always has the same color in every diagram.**

## Design principles

The palette is "**muted warm tones on an off-white ground**", taken from paper reading and the warm Solarized Light theme:

1. **Background `#fdfdfa`** (warm off-white, 253/253/250): not pure white, easy on the eyes, reads as paper.
2. **Each role's fill is a very pale tint of its hue** that blends with the background; filled solid, it looks like a lightly tinted sticky note.
3. **Each role's stroke is a deep, desaturated shade of the same hue, and is also the text color inside the node**. Every stroke has contrast ≥ 4.5:1 against its own fill (WCAG AA), most between 5 and 7:1.
4. **Everything leans slightly warm** (blue → steel blue, cyan → ink teal, green → moss green, and so on) so nothing clashes with the warm background.
5. **Text color = node stroke color**: a dark and a light version of one hue looks most professional. Do not put neutral gray text on an orange node.

## Role colors

Slot names come from the agent domain (`C.user` / `C.agent` …), but each slot stands for an **abstract meaning**. In other domains, map by the abstract meaning column, not by the literal slot name.

| Slot | Stroke (= text color in the node) | Fill (background) | WCAG contrast | Abstract meaning (any domain) | Use in the agent domain |
|---|---|---|---|---|---|
| **`C.user`** | `#1f5582` steel blue | `#e3ebf2` mist blue | 6.5:1 | Person / initiator / system entry | User, human input, human approval |
| **`C.im`** | `#106668` ink teal | `#dde8e7` mist teal | 5.4:1 | Channel / transport / gateway / queue / message | WeChat / Telegram / any message channel, bus, queue |
| **`C.agent`** | `#a04a1f` brick orange | `#f3e2cf` cream orange | 4.7:1 | The diagram's protagonist / core subsystem / control plane | Main agent / orchestrator / orchestration core |
| **`C.subagent`** | `#7d4f0a` caramel | `#f4eacd` wheat | 5.8:1 | Executor / secondary subsystem / processing pipeline | Sub-agent / worker / verifier |
| **`C.llm`** | `#4a3f8c` indigo | `#e6e2ef` mist violet | 6.9:1 | Model / algorithm / inference | LLM, reasoning model, reasoner |
| **`C.tools`** | `#2f6b3c` moss green | `#dfead9` mist green | 5.1:1 | Capability / tool / isolated environment | Tool calls, MCP server, sandbox |
| **`C.memory`** | `#6e554a` chestnut | `#ede2d5` kraft | 5.4:1 | Storage / persistence / data | Memory, KV / DB / vector store |
| **`C.external`** | `#4f5359` ink gray | `#e9e7e3` warm gray | 6.3:1 | External dependency / background reference | Third-party API, external service, industry comparison |
| **`C.error`** | `#a52928` brick red | `#f0d8d2` pale ochre | 5.2:1 | Exception / failure / degradation — **use sparingly** | Exception path, fallback, failure branch |

> Contrast is computed with the WCAG 2.1 relative luminance formula (stroke against fill). The AA threshold for body text is ≥ 4.5:1, AAA is ≥ 7:1.
> All 9 colors pass AA; none reaches AAA for body text (highest: llm at 6.9:1). Node titles are ≥ 22px bold, which WCAG counts as large text, whose AAA threshold is 4.5:1; all pass.

## Shared colors

| Use | Hex | Notes |
|---|---|---|
| **Background** (canvas) | `#fdfdfa` warm off-white | Not pure white; set body / .stage / canvas backgrounds all to it |
| **Flow / default line** | `#3a3530` warm ink | Every normal arrow |
| **Title** | `#2a2520` warm ink black | Main title text |
| **Subtitle** | `#5a544f` warm mid-gray | Subtitles / secondary text |
| **Caption** | `#7a746e` warm light gray | Legend text, notes, legend descriptions; 4.53:1 on the background, just past AA, do not lighten it |

## Color discipline

1. **The number of colors follows the content**: use as many colors as the content has kinds of concepts, at most 9. The colors are low in saturation and close in lightness, so even 9 on one canvas do not fight (with normal vision any two strokes are ΔE2000 ≥ 13 apart, clearly distinct). Above 5 colors, add a short color legend (`legend()`, listing only the colors used in this diagram); otherwise readers cannot remember what each color means.
   - **Color must not be the only cue**: with red-green color blindness (about 8% of men), the pairs Agent / Sub-Agent, User / LLM and IM / External are only ΔE 3-6 apart and nearly indistinguishable. So every node must have a text label, and shape adds a cue where needed.
   - When a diagram is too dense to read, split it into an overview and zoomed-in subsystem diagrams. Split for readability, not to reach a color count.
2. **All arrows are warm ink `#3a3530`.** Lines are not colored; nodes carry the color. Coloring lines breaks the whole diagram.
3. **Red is only for exception paths.** Once a normal flow is red too, readers cannot tell what is primary.
4. **Do not add a role color for a single diagram.** For a new concept, change the shape first (card / bubble / hexagon / timeline) instead of opening a new color.
5. **Make the protagonist bigger and bolder**: the main agent's box is always 1.3-1.5 times the others, with a 3px stroke, so it stands out without a brighter color.
6. **Text color in a node = node stroke color.** A dark and light shade of one hue keeps it restrained. Do not use black or neutral gray for node text, and do not use a contrasting hue (orange text on a blue node).
7. **Contrast ≥ 4.5:1.** Before adding a role or adjusting a color, you **must** compute the WCAG contrast of stroke against fill; below 4.5, do not use it.

## Where the colors come from

These are not the saturated [Open Color](https://yeun.github.io/open-color/) defaults of common whiteboard tools (too bright); they are a muted warm set **tuned specifically** for printed type + hand-drawn shapes + off-white ground. In other drawing tools, enter the hex values from the tables above.

Design references:
- **Solarized Light**: warm background and low saturation
- **iA Writer** / **Bear**: the paper feel of long-form reading apps
- **Parchment / old newspaper**: warm white (253/253/250 is close to ivory)
- **WCAG 2.1** contrast rules (AA from 4.5:1)

## Concept → color mapping

The 9 colors above are **slots**; one slot can hold several concrete concepts. How a domain's concepts map to the 9 slots is written in a domain dictionary under `references/domains/`:

| Domain dictionary | Covers |
|---|---|
| [`domains/agent-team.md`](./domains/agent-team.md) | Agent teams / multi-agent / memory / coding agents / document and research pipelines |
| [`domains/cloud-architecture.md`](./domains/cloud-architecture.md) | Services and platforms: gateways, control planes, workers, sandboxes, data, egress, trust boundaries |
| [`domains/vertical-search.md`](./domains/vertical-search.md) | Search engines / crawlers / indexing / retrieval and ranking |

Each dictionary has: a main table of concept aliases, secondary distinction by shape, a decision tree for coloring a term, exclusion rules, and suggested color coverage for a series of diagrams.

For a domain without a dictionary: map by the abstract meaning column and write a new dictionary from [`../assets/domain-dictionary.md`](../assets/domain-dictionary.md) (if it serves only one set of diagrams, fill in [`../assets/diagram-binding.md`](../assets/diagram-binding.md) instead).

In short: **a concept always has the same color and the same base shape in every diagram.** The dictionary and the binding table lock this in, not memory.
