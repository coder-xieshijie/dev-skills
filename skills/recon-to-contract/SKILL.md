---
name: recon-to-contract
description: Converges benchmarking research across several references into one executable contract: three laws, a parallel process, a scorecard.
argument-hint: "What plan do you want to produce?"
disable-model-invocation: true
---

# recon-to-contract

**Check the shape first**; continue only when both hold:

1. You have ≥2 external references to compare side by side
2. The end point is something that someone else (or your future self, without this session's context) will execute as written

Technology selection, architecture review, competitor benchmarking, migration plans and feature design usually meet both. If only one holds, exit and say which one does not — for pure exploration, bug localization and incremental development, the bottleneck is not the carrier of the conclusions, and for them this process is pure overhead.

By default, write in the user's language.

---

## Law 1 · Contract

**Context loss is solved by writing a contract, not by writing a document.**

A document needs to be **understood**; a contract only needs to be **executed**. Understanding takes context, execution does not — that is why a contract is immune to context loss.

**Zero-context test** — to judge whether an output is a contract:

> Give it to an executor with no background at all. Can it produce the result directly, without asking a single question?

If not, it is still a document. Fill it in until it can, or do not pass it downstream.

A contract carries: the goal / anchors to the current state (`file:line` or equivalent coordinates) / the surface of change, split into work packages / the acceptance for each work package / the constraints already decided. Lock the version with a content hash; downstream references the hash, not the file name.

**When trimming a contract, cut the narration, cut the cross-references, cut the process records; source anchors and confidence labels (verified / inferred / pending confirmation) survive until delivery.** The anchors are the executor's coordinate system, and the labels are what it uses to judge "what can be trusted" — both are part of being "executable"; delete them and it falls back into a document, and downstream has to dig everything up again. And when the labels are deleted, every "pending confirmation" is silently promoted to an assertion.

---

## Law 2 · Negative space

**The most valuable output of benchmarking is not "who has what", but "what none of the references have".**

Filled cells tell you the industry consensus; the **negative space** — the cell that not a single reference fills — tells you where the room for innovation is. The footing of the plan is usually that very cell.

**So structure the table as a difference view, and give the negative space a column of its own:**

```
Dimension | We have, they don't | They have, we don't | None have it
```

A matrix view (dimension × reference) can express negative space — a row that is all empty — but a person has to scan the row to **infer** it. A difference view **states** it directly.

Read the negative-space column first, then the other two columns.

---

## Law 3 · Three carriers

**Conclusions fall into exactly three types, each with its own carrier. Mix them in one piece of prose, and downstream has to reread the whole thing every time it uses them — so it writes yet another new one.**

| Type | Carrier | Parallelism |
|---|---|---|
| **Values** — who has what | Difference table | Fully parallel, can be generated mechanically |
| **Propositions** — which premises are false | Ledger | Discovered in parallel, merged serially |
| **Relations** — why / whether it is worth it / how things are tied to each other | Seam notes | Cannot be parallelized along a single dimension |

Measured composition of one benchmarking corpus: **values ≈44% / propositions ≈12% / relations ≈45%**. Nearly half the value is in the relations; allocate effort in this proportion.

**Values** go into the difference table, one value per cell.

**Propositions** go into the ledger, append-only, one record per proposition:

```
original claim | source | verdict(overturned|corrected|confirmed|pending confirmation) | actual situation |
evidence anchor | verification strength | period in effect | downstream impact(which conclusions need re-evaluation)
```

Propositions correct one another — one adversarial check can overturn the judgment of an earlier entry. So discover in parallel, and **merge serially**.

**Relations** go into seam notes: short prose entries, one causal sentence each. A table cell can hold only one value; a relation needs a causal sentence, and squeezed into a cell it degrades into a label — sign, attribution and dependency order all evaporate. **It cannot be compressed.**

A seam is the knowledge where two dimensions meet. **A subagent that looks at a single dimension cannot, by definition, see a seam** — so assign relation work by **dimension pair**, not by dimension. There is no need to enumerate all `C(n,2)`; pick 3–5 high-value pairs.

---

## Process

### 0 · Freeze (done by a person, no subagents)

Write down three lists:

- **Dimension vocabulary** — column names and enumerated values. All subagents share this one table header; otherwise their outputs cannot be joined, and an extra round of manual merging is needed.
- **Reference set** — including "what not to look at". Freeze it before assigning work; freeze it after the outputs come in, and what gets voided is research already spent.
- **Falsifiable criteria** — each one can be judged yes/no. With vague criteria, the outputs are bound to drift off course.

At the same time, pick the dimension pairs to scan for relations.

*Done criteria*: the three lists are written to files; every enumeration is exhaustive; every criterion can be judged yes/no.

### 1 · Three carriers in parallel

- **Values**: one subagent per dimension → one row of the difference table
- **Propositions**: one subagent per group of premises → several ledger entries
- **Relations**: one subagent per dimension pair → one seam note

**The raw corpus stays in the subagents' context. The main session reads only these three carrier files.** What a subagent returns is its row / its entries / its note, not a summary of the full text. Long reports are written to disk as an audit trail and do not go downstream.

Each parallel line gets a different prompt — a different slice, a different carrier. The same prompt sent down several lines is a rerun, not parallelism.

*Done criteria*: all three files exist; the negative-space column of the difference table is filled (write `—` when there is none); every ledger entry has a verdict and an evidence anchor; every planned dimension pair has a note; the three together are within 30KB.

### 2 · Decide (done by a person)

Read the **room for innovation** from the negative-space column of the difference table, and the **dependency order for implementation** from the seam notes, and form a decision table:

```
decision point | what each reference chose | my ruling | reason
```

**Decisions come before documents.** When decisions are hidden in prose, a person has to dig them out point by point — things that each take 30 seconds to decide end up taking days.

Decide everything in one go: where the output converges to a single answer (outline, scope, priorities, naming), a person decides; where diverse outputs are valuable (research, review perspectives, projections into different forms, work packages), assign subagents.

*Done criteria*: the decision table has no empty rows; every row has a ruling.

### 3 · Contract

There are only three inputs: the frozen lists + the three carriers + the decision table. **Do not go through a "design document" as an intermediate product.**

*Done criteria*: it passes the zero-context test; anchors and confidence labels are in place; the content hash is recorded.

### 4 · Fan out

Outputs for people — review drafts, trimmed versions, layered explanations, change descriptions, implementation work packages — are all **projected** from the contract: same source, independent of one another, produced in parallel.

Doing it the other way round (first writing what people read, then distilling from it what machines execute) stretches one fan-out into a long serial chain.

*Done criteria*: every output can be traced to a section of the contract.

---

## Scorecard

| Metric | Target |
|---|---|
| Size of the factual base downstream must read | < 30KB |
| Survival rate (final delivery ÷ total output) | > 50% |
| Number of context compactions | < 3 |
| Anchor retention rate | 100% |
| Merge rounds | 1 |
| Up-front decision rate (decided before the document ÷ all decisions) | > 80% |

The last one is the root-cause metric. Raising it from 0 to 80% is what turns days into hours.
