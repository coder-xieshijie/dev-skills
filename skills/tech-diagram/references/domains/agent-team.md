# Agent team: concept → color dictionary

Use for diagrams about **agent teams / multi-agent systems / memory / coding agents / document pipelines / research pipelines**. This is one domain dictionary under `references/domains/`; other domains are in the same directory, and a new domain is written from [`assets/domain-dictionary.md`](../../assets/domain-dictionary.md).

## Why this dictionary

A design document or review about an agent team usually needs 5-10 diagrams: asynchronous IM execution, coding agent collaboration, research and retrieval, document pipelines, memory layers, the verifier flow, state-machine timing, cross-vendor comparison…

**A concept must have the same color and the same base shape in every diagram.** Otherwise readers rebuild "which color is who" on each diagram and cannot read across them.

This dictionary fixes one color slot and one base shape for each frequent concept. **Look it up here before drawing; do not pick colors from memory.**

## Main table: 9 colors, 9 kinds of concept

| Color slot | Kind | Common aliases | Default shape |
|---|---|---|---|
| **`C.user`** steel blue | Person / decision maker | User · end user · decision maker · asker · Operator · Human-in-the-loop · human sign-off · human approval · the human in the accountability chain | Box (plain) / Hexagon (human decision point) |
| **`C.im`** ink teal | Async channel / status | IM Channel · WeChat · Telegram · Feishu · Slack · messaging channel · Async Push · Status Bubble · progress notice · heartbeat · ACK receipt | Channel (long flat bar) / Bubble (status message) |
| **`C.agent`** brick orange | The single protagonist / control plane | Owner · Orchestrator · main agent · Supervisor · control plane · orchestration core · Coordinator · Planner (the one that splits and dispatches) · Plan / Round (the orchestrator's unit of execution) | Box (large + strokeWidth: 3) / Group Frame (Plan/Round border) |
| **`C.subagent`** caramel | Dispatched executors / verifiers | Worker · Sub-Agent · Developer · Writer · Researcher · Formatter · Tool Agent · Doc Worker · Verifier · Tester · Reviewer · Producer · Critic · Synthesizer · any dispatched task-level agent | Box (plain) / Hexagon (verifier / decision meaning) / Task Card (the task a worker handles) |
| **`C.llm`** indigo | Inference / model | LLM · model · Reasoner · GPT · Claude · Gemini · inference engine · decision model · Foundation Model · base model | Box |
| **`C.tools`** moss green | Executable capability / isolated environment | Tools · MCP · MCP Server · Skill (as an executable capability) · Tool Gateway · CLI · API call (within this system) · Sandbox · Workspace · Worktree · container · toolchain (the agent harness itself is `C.subagent`, as in [cloud-architecture](cloud-architecture.md); the sandbox it runs in is `C.tools`) | Box / Group Frame (sandbox/workspace isolation, dashed group frame) |
| **`C.memory`** chestnut | Memory / persistence / handoff artifacts | Memory · User Memory · Agent Memory · Team Memory · Topic Memory · persistence · KV / DB / vector store · scratchpad · handoff document · deliverable · session log · archive · AGENTS.md / CLAUDE.md-style memory files · Skills (as accumulated knowledge, vs. the Tools sense) | Box / Task Card (a single memory entry / file) |
| **`C.external`** ink gray | External / third party / industry comparison | External · third-party API · external service · GitHub · OpenAI Agents SDK · Google A2A / ADK · Anthropic Agent Skills · AWS Bedrock AgentCore · papers / benchmarks · any dependency or reference "outside this system" | Box (solid) / Box (dashed strokeLineDash, meaning "industry reference, not this system") |
| **`C.error`** brick red | Exception / failure / blocking | Error · Block · Blocker · Stuck · exception path · failure · Retry · FAIL · Verifier FAIL · fallback · send back · Reject · Escalation · memory pollution · context pollution · risky action (before human approval stops it) | Hexagon (exception/decision meaning) / Bubble (exception notice, IM shape but Error color) |

## Shared colors (not roles, but fixed across diagrams)

| Color | Use | Aliases |
|---|---|---|
| **`C.flow`** warm ink `#3a3530` | All arrows, dashed timelines, workflow / pipeline direction | flow · information flow · call · pass · hand over · dispatch · timing · round progression |
| **`C.bg`** warm off-white `#fdfdfa` | Canvas background | paper · background |
| **`C.title`** `#2a2520` | Main title | — |
| **`C.subtitle`** `#5a544f` | Subtitle | — |
| **`C.caption`** `#7a746e` | Notes / Cost / Token / Budget / ROI small text / paper citations / timestamps | Do not open a new color for cost or numbers |

## Secondary distinction by shape (subtypes within one color)

A color slot can hold several subconcepts; tell them apart by **shape**, not by a new color.

### Division of labor within `C.subagent` (the most complex slot)

| Subrole | Shape | Notes |
|---|---|---|
| Worker / Developer / Writer / Researcher / Formatter | Box (plain) | Executing entity |
| Verifier / Tester / Reviewer | **Hexagon** | Verification meaning; a different shape from Worker shows at a glance "this is a verify node" |
| Task / Job / Sub-task / Work Unit (the work package being processed) | Task Card (folded corner) | Something that flows, not a resident entity |

> Key point: **Worker and Verifier usually come in pairs per task** (one worker executes a task, another verifier accepts it), so same color + different shape pairs them at a glance. Do not give Verifier its own color.

### Layers within `C.memory`

| Sublayer | Shape | Notes |
|---|---|---|
| User Memory | Box | The "knows the user" layer |
| Agent Memory | Box | The "gets more skilled" layer; a Task Card can show a single memory file |
| Team Memory | Box (**dashed border** `strokeLineDash: [10,6]`) | Temporary; dashed means "exists at runtime" |
| Topic Memory / scratchpad / handoff | Task Card | Single-file entity |

> User Memory must **not** use `C.user` (user is a role, user memory is memory; they go in different slots), or the concepts collide across diagrams.

### Categories within `C.tools`

| Subcategory | Shape | Notes |
|---|---|---|
| Tools / MCP Server / Skill (capability side) | Box | Ordinary tool |
| Sandbox / Workspace / Worktree isolation | **Group Frame** (rectangle of 4 dashed lines) | Means "isolated environment"; holds Workers / Tools |

### Within `C.agent`

| Subcategory | Shape | Notes |
|---|---|---|
| Main agent / Orchestrator | Box (large + strokeWidth: 3) | The single protagonist, always 1.3-1.5× the Workers |
| Plan / Round | **Group Frame** (dashed group frame) | Means "this group of tasks is coordinated by the orchestrator" |

### Within `C.user`

| Subcategory | Shape | Notes |
|---|---|---|
| User (ordinary input) | Box | Input side |
| Human approval / Human-in-the-loop / human sign-off | **Hexagon** | Decision node; hexagon because the decision meaning matches Verifier, while the user color separates it from Verifier |

### Within `C.error`

| Subcategory | Shape | Notes |
|---|---|---|
| Error / Failure / Block node | Hexagon | Exception end point |
| Exception status notice | Bubble (IM shape, Error fill) | Pushes like "Path C failed · retry?" |

## Decision tree: coloring a term

```
Is it an initiator / decision maker / receiver?
  └ Yes → C.user (Hexagon for human decision points)
  └ No
Is it a message channel / async feedback / status push?
  └ Yes → C.im
  └ No
Is it the control plane / split-dispatch-merge / the single protagonist / a Plan/Round unit?
  └ Yes → C.agent
  └ No
Is it a dispatched executor / verifier / task package?
  └ Yes → C.subagent (Hexagon for Verifier, Task Card for Task)
  └ No
Is it inference / a model?
  └ Yes → C.llm
  └ No
Is it a tool / Skill capability / sandbox / isolated environment?
  └ Yes → C.tools (Group Frame for isolated environments)
  └ No
Is it memory / persistence / a handoff artifact / accumulated experience?
  └ Yes → C.memory (all three memory layers; Task Card for Topic/scratchpad)
  └ No
Is it a third party / external dependency / industry comparison?
  └ Yes → C.external (dashed Box for papers/comparisons)
  └ No
Is it an exception / failure / blocking / risky action?
  └ Yes → C.error (Hexagon for nodes, Bubble + Error color for exception notices)
  └ No
Is it Cost / Token / Budget / ROI / a timestamp / a numeric note?
  → No color; label it in C.caption small gray text
Is it a workflow / pipeline / direction / timing?
  → No color; show it with C.flow arrows / Timeline

Still does not fit? → Merge into the nearest slot rather than opening a new color; or distinguish by shape.
```

## Exclusion rules (hard constraints, check while drawing)

1. **The `User` role ≠ `User Memory`**: the first is `C.user`, the second `C.memory`. Same color would merge "the user" and "memory about the user" into one blob.
2. **Do not color `Owner` / `Orchestrator` as `C.user`**: it is an agent (a machine); only human approval / sign-off is `C.user`. Orchestrator is always `C.agent`.
3. **No separate color for `Verifier`**: `C.subagent` + Hexagon is enough. Worker and Verifier share a color to show the per-task pairing.
4. **`Skill` takes a different color by context**:
   - As an "executable capability / tool" (loadable capability packages such as Agent Skills) → `C.tools`
   - As "accumulated knowledge / experience" (experience documents the agent writes back) → `C.memory`
   - In one diagram it can only mean one of these; choose by the current topic.
5. **`External` splits further**:
   - Industry comparison (OpenAI / Google / Anthropic / AWS) + papers / benchmarks → `C.external` + **dashed Box** for "not this system"
   - Third-party APIs actually called (search engines / OSS / databases) → `C.external` + solid Box
6. **When `Error` appears, the whole exception path is red dashed arrows**: Worker → Verifier FAIL → human approval (Reject) → Retry is one continuous red chain; do not switch colors midway.
7. **Colors on demand, not by checklist**: the 9 colors are a dictionary, not a checklist. Color only the concepts this diagram's content has; do not draw colors that do not appear. Above 5 colors, add a color legend.

## Counterexamples (common mistakes)

| Mistake | Why it is wrong | Do this instead |
|---|---|---|
| User Memory colored blue | Collides with the User role | User Memory in `C.memory` brown, as a Box |
| Verifier in green (as if "pass = green") | Only 9 colors; no 10th color for a single concept | `C.subagent` caramel + Hexagon |
| Orchestrator in blue (User is blue, and the orchestrator also "leads") | Orchestrator is a machine, User is a person; they must differ | Orchestrator = `C.agent` brick orange |
| Cost / Token numbers in large bright red | Cost is not an error; red makes readers think the budget is blown | `C.caption` warm gray small text |
| A different color per sub-worker (blue Developer / green Tester / violet Reviewer) | Role color = concept color, not individual color; splitting one kind into several colors makes readers think they are different kinds | Developer / Tester / Reviewer all in `C.subagent`, told apart by the sub-labels "Developer" / "Tester" / "Reviewer"; verifiers as Hexagons |
| One color per memory layer (User Memory blue, Agent Memory brown, Team Memory gray) | Collides with the User / External roles, pollutes the dictionary | All three in `C.memory`, told apart by shape: User Memory Box / Agent Memory Box / Team Memory **dashed Box** |
| Exception notice bubble in IM teal | Cannot tell "this is an exception" from "ordinary progress" | Keep the Bubble shape, fill it `C.error` red |
| Plan/Round in its own color (gray frame around a group of tasks) | Plan/Round is the orchestrator's unit of execution | `C.agent` dashed Group Frame, titled "Round 1" or similar |
| Sandbox / Workspace in external gray (as if "not in the prompt" means external) | A sandbox is a tool capability, not a third party | `C.tools` moss green Group Frame |

## Example: diagrams for one document

Say a design document on "agent team + memory" needs 5-10 diagrams; color coverage could be split like this:

| No. | Topic | Colors | Key shapes |
|---|---|---|---|
| 1 | Single agent vs. agent team | user / agent / subagent / error | Box, Bubble |
| 2 | Async IM execution | user / im / agent / subagent | Channel, Bubble, Timeline |
| 3 | Coding agent collaboration (Developer/Tester/Reviewer) | agent / subagent / tools / external | Box, Hexagon, Group Frame (sandbox) |
| 4 | Research and retrieval | agent / subagent / external / memory | Box, Hexagon (verifier), Task Card (source card) |
| 5 | Document pipeline | agent / subagent / tools / memory | Box, Task Card, Group Frame (workspace) |
| 6 | Orchestrator / Worker / Verifier triangle | agent / subagent / user (decision) | Box, Hexagon (verifier + decision) |
| 7 | Three memory layers | memory only (+ user / agent / im with reference arrows to their owners) | Box, dashed Box (Team Memory) |
| 8 | Plan / Round state machine | agent / subagent / error | Group Frame, Hexagon, Timeline |
| 9 | Industry comparison (Google / Anthropic / OpenAI / AWS) | external (dashed Box) + agent | Box (dashed), text labels |
| 10 | Memory injection and pollution | memory / agent / error | Box, dashed Box, Bubble (Error color) |

Each diagram writes this comment at the top of main():

```js
// Concept color binding (this diagram):
//   C.agent    = Orchestrator / Plan
//   C.subagent = Worker (Developer / Writer)
//   C.error    = Verifier FAIL / Reject
//   C.flow     = arrows / timeline
// Concepts NOT in this diagram (but reserved in palette): user, im, llm, tools, memory, external
```

Each diagram then carries its own color-concept mapping, and reviews across diagrams can match them at a glance. For a series (≥ 2 diagrams), also copy the choices from this table into `diagram-binding.md` in the working directory (template: [`assets/diagram-binding.md`](../../assets/diagram-binding.md)), and keep each diagram's comment consistent with it.
