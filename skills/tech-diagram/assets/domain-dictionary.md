# <domain name>: concept → color dictionary

<!--
  Reusable dictionary template for a new domain. How it differs from diagram-binding.md:
  - Dictionary (this file) = a domain's general conventions, reused across documents, kept in references/domains/.
  - Binding table (diagram-binding.md) = the concrete lock for one series of diagrams, serving only that set, kept in the working directory.
  Rules for filling it in:
  - Choose only from the 9 slots in references/palette.md, by the abstract meaning column; add no colors.
  - One slot per category; subconcepts within a category are told apart by shape, not by color.
  - Filled examples: references/domains/agent-team.md, references/domains/vertical-search.md
-->

Use for: <diagrams of which documents / systems>.

## Main table

| Color slot | Category in this domain | Common aliases | Default shape |
|---|---|---|---|
| **`C.<slot>`** <color name> | <category> | <alias · alias> | Box |

## Secondary distinction by shape (subtypes within one color)

| Slot | Subconcept | Shape | Notes |
|---|---|---|---|
| `C.<slot>` | <subconcept> | <shape> | <why this shape> |

## Decision tree: coloring a term

```
Is it <test for category A>?
  └ Yes → C.<slot>
  └ No
Is it <test for category B>?
  └ Yes → C.<slot>
  └ No
...
Still does not fit? → Merge into the nearest slot rather than opening a new color; or distinguish by shape.
```

## Exclusion rules

1. **<concept X> ≠ <concept Y>**: <where each belongs and why>.

## Suggested color coverage for a series

| Diagram | Topic | Colors | Key shapes |
|---|---|---|---|
| 1 | <overview> | <slot / slot> | <shape> |
