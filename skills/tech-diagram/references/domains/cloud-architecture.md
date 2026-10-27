# Cloud and service architecture: concept → color dictionary

Use for architecture diagrams of services, platforms and their security boundaries: gateways, control planes, workers and sandboxes, data stores, model or tool backends, third-party dependencies, and what is denied. Written in the format of [`assets/domain-dictionary.md`](../../assets/domain-dictionary.md); the worked example is [`examples/zones-architecture.html`](../../examples/zones-architecture.html).

## Main table

| Color slot | Category in this domain | Common aliases | Default shape |
|---|---|---|---|
| **`C.user`** steel blue | Callers and clients | user · web · app · CLI · IM client · API client · operator · on-call | Box |
| **`C.im`** ink teal | Controlled transport: everything that only lets traffic in or out | API gateway · connection / WebSocket gateway · load balancer · ingress · egress proxy · NAT · model / tool gateway · service mesh sidecar · queue · topic · stream | Box for gateways and proxies; Channel for queues and streams |
| **`C.agent`** brick orange | The main subject: control plane or core service | control plane · business service · orchestrator · scheduler · API server · controller (creates, mounts, reclaims) | Box, largest, `strokeWidth: 3`; a `frame()` in this color for the trusted zone |
| **`C.subagent`** caramel | Runtimes that do the work for the main subject | worker · job runner · agent harness / agent loop · plugin · consumer · cron job | Box |
| **`C.tools`** moss green | Isolated execution: where untrusted or tenant code runs | sandbox · MicroVM · container · pod per task · isolated VPC · tenant pool | `stack()` for many instances; `frame()` for the isolated zone |
| **`C.llm`** indigo | Models and inference | model service · inference endpoint · embedding model · ranking model | Box |
| **`C.memory`** chestnut | Data at rest | database · cache · object storage · per-user space · session directory · disk / NAS · log store · secrets store | Box; Task card for a single file or record |
| **`C.external`** ink gray | Outside the system | third-party API · SaaS · customer endpoint · public internet · upstream provider | Box |
| **`C.error`** brick red | Denied, unreachable, blocked, failed | default deny · off allow-list · blocked egress · quota exceeded · circuit open | Hexagon; red dashed arrows into it |

`C.flow` warm ink is every normal arrow; it never takes a role color.

## Secondary distinction by shape

| Slot | Subconcept | Shape | Notes |
|---|---|---|---|
| `C.im` | Gateway / proxy vs. queue / stream | Box vs. Channel | The same slot: both only carry traffic. The shape says whether it is a hop or a buffer |
| `C.agent` | Core service vs. controller | Big box vs. normal box | Both live in the control plane; only the main subject is enlarged |
| `C.tools` | One sandbox vs. a fleet | Box vs. `stack()` | Caption the stack with the isolation unit or count (`one per task`, `× 100k`) |
| `C.memory` | Shared store vs. per-user / per-session space | Box vs. several smaller boxes side by side | Draw per-user spaces as separate boxes so the isolation is visible |

## Decision tree: coloring a term

```
Is it a person or a client program that starts requests?
  └ Yes → C.user
Is its job only to let traffic in or out, or to buffer it (gateway, proxy, queue)?
  └ Yes → C.im
Is it the subject of this diagram, or the control plane that owns state and decisions?
  └ Yes → C.agent
Is it isolated execution for untrusted or tenant code (sandbox, VM, per-task container)?
  └ Yes → C.tools
Is it a runtime that does work on behalf of the main subject (worker, harness, plugin)?
  └ Yes → C.subagent
Is it a model or an inference endpoint?
  └ Yes → C.llm
Is it data at rest?
  └ Yes → C.memory
Is it outside the system's ownership?
  └ Yes → C.external
Is it a refusal, a block or a failure?
  └ Yes → C.error
Still unclear? Merge it into the nearest slot by what it does, not where it runs.
```

## Exclusion rules

1. **A gateway is not the service behind it.** The API gateway is `C.im` even when the team that owns the service owns it too.
2. **A model gateway is not the model.** The gateway that holds upstream keys is `C.im`; the models behind it are `C.llm`, or `C.external` when they are a third party's.
3. **A harness running inside a sandbox stays `C.subagent`.** The sandbox around it is the `C.tools` stack or frame; color follows what a thing is, not where it runs.
4. **A cache in the request path is still `C.memory`.**
5. **Red only for what is denied or failed.** A firewall or proxy that allows traffic is `C.im`; only the denied path and its end state are red.

## Suggested color coverage for a set

| Diagram | Topic | Colors | Key shapes |
|---|---|---|---|
| 1 | Overview with zones and numbered rules | all slots in use, legend | frames, stacks, `notes()` |
| 2 | Ingress: who may call what | user / im / agent / error | Box, red hexagon |
| 3 | Isolation: control plane vs. execution | agent / subagent / tools / memory | frames, stack, `route()` |
| 4 | Egress: what may leave, and how | tools / im / llm / external / error | Box, red dashed arrows, hexagon |
| 5 | Data isolation | agent / tools / memory | per-user boxes, frames |
