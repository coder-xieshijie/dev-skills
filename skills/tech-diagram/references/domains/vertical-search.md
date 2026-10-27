# Vertical search engine: concept → color dictionary

Use for a series of diagrams about vertical search / site search / crawlers / index building / retrieval and ranking. Written in the format of [`assets/domain-dictionary.md`](../../assets/domain-dictionary.md); the full worked example (binding table + 3 diagrams) is in [`examples/vertical-search/`](../../examples/vertical-search/diagram-binding.md).

## Main table

| Color slot | Category in this domain | Common aliases | Default shape |
|---|---|---|---|
| **`C.user`** steel blue | User / entry | user · search box · app · API caller | Box |
| **`C.external`** ink gray | Data sources | target websites · partner feeds · open APIs · third-party data | Box (solid = a source actually crawled / called) |
| **`C.subagent`** caramel | Offline index building | crawler · parsing and extraction · dedup and cleaning · index building · incremental update jobs | Box; with several components, add a same-color dashed `frame()` around them |
| **`C.agent`** brick orange | Online retrieval (this domain's protagonist) | query understanding · spelling correction · intent detection · recall · coarse / fine ranking · result assembly | Box; with several components, add a same-color dashed `frame()` around them |
| **`C.memory`** chestnut | Storage | inverted index · forward index · vector store · cache · raw page store | Box |
| **`C.llm`** indigo | Models | embedding model · ranking model · query rewrite model | Box |
| **`C.im`** ink teal | Queues | URL crawl queue · incremental update messages · log stream | Channel (long flat bar) |
| **`C.error`** brick red | Exceptions | degradation · circuit breaking · timeout · crawl failure · anti-crawler block | Hexagon; exception paths use red dashed arrows |

`C.tools` moss green is not used in this domain; when a component really is a "callable capability" (such as a tokenizer service shared by several subsystems), add it by the decision tree.

## Secondary distinction by shape

| Slot | Subconcept | Shape | Notes |
|---|---|---|---|
| `C.subagent` / `C.agent` | Several steps within one subsystem | Several Boxes inside a same-color dashed `frame()` | Steps are told apart by name and number, not by color |
| `C.memory` | All storage in the overview diagram | Merged into one "index storage" Box | Split into inverted / forward / vector store in the zoomed-in diagrams |
| `C.im` | Queue | Channel | Distinct from Box: "things flowing through" vs. "things that stay" |

## Decision tree: coloring a term

```
Is it the person or caller who starts the search?
  └ Yes → C.user
Is it a data source outside the system that is crawled or called?
  └ Yes → C.external
Is it messages / URLs / events queued for processing?
  └ Yes → C.im (Channel)
Is it a step of the online path that answers a search request?
  └ Yes → C.agent
Is it an offline step that turns raw data into an index?
  └ Yes → C.subagent
Is it a trained model that scores or produces vectors?
  └ Yes → C.llm
Is it the data being read and written (index / store / cache)?
  └ Yes → C.memory
Is it a failure / degradation / circuit break?
  └ Yes → C.error
Still does not fit? → Merge into the nearest slot rather than opening a new color; or distinguish by shape.
```

## Exclusion rules

1. **Vector store ≠ embedding model**: the vector store holds data, so it is `C.memory`; only the model that produces vectors is `C.llm`.
2. **Index building ≠ index**: building is an offline processing action, `C.subagent`; the index itself is storage, `C.memory`.
3. **Cache → `C.memory`**, even when deployed on the online path. Color says what a thing is, not which path it sits on.
4. **The protagonist color stays with online retrieval.** In the zoomed-in offline diagram the offline pipeline is the subject, but it still uses `C.subagent` and stands out by size and stroke weight, not by borrowing `C.agent`. Otherwise one concept changes color between diagrams.
5. **Recall / ranking steps ≠ models**: "multi-path recall" and "fine ranking" are online steps (`C.agent`); the ranking model they call is drawn as a separate `C.llm` Box.

## Suggested color coverage for a series

| Diagram | Topic | Colors | Key shapes |
|---|---|---|---|
| 1 | Overall architecture | user / agent / subagent / memory | Box |
| 2 | Offline index building | subagent / memory / im (+ external) | Box, Channel, frame |
| 3 | Online retrieval | user / agent / llm / memory | Box, frame, elbow return arrow |
| 4 | Degradation and disaster recovery | agent / memory / error | Box, Hexagon, red dashed lines |
