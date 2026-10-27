# <series name>: figures and concept color binding

<!--
  Copy into the working directory (next to the diagrams' HTML files, one file per document); fill in and lock it before drawing the first diagram.
  - Figures: written by "Plan the set" (references/figure-plan.md) before the first figure; update a row when its figure changes.
  - Read this file before starting each diagram; the "Concept color binding" comment at the top of main() must match this table.
  - New concept: only append new rows; never change the color or shape of an existing row.
  - Choose color slots by the abstract meaning column of references/palette.md; when the domain has a dictionary (references/domains/), follow it.
  - Examples: examples/vertical-search/diagram-binding.md, examples/design-overview/diagram-binding.md
-->

## Figures

| # | File | Question it answers | Kind | Sections | Parts and paths covered (normal / abnormal) | Not drawn → where |
|---|---|---|---|---|---|---|
| 1 | `01-<name>` | <question> (<pillar or reader question>) | <kind> | §<n> | Parts: <container> = <part> · <part>. Normal: <path>. Abnormal: <path>, <path> | <content> → <figure N or table §n> |

Not drawn as figures: <content> (§<n>) stays a table.

## Concept → color → shape

| Concept category | Components | Color slot | Shape |
|---|---|---|---|
| <category> | <component · component> | `C.<slot>` <color name> | Box |

## Rulings on ambiguous concepts

<!-- Concepts that could fall into two categories: fix their category and the reason here. Delete this section if there are none. -->

- <concept> → <category> (`C.<slot>`), not <other category>. Reason: <one sentence>.

## Colors used per diagram

<!-- The colors each diagram actually uses, listing only concepts in its content. A diagram with more than 5 colors carries a legend() (see references/palette.md). -->

| Diagram | <slot> | <slot> | <slot> |
|---|---|---|---|
| ① <diagram name> | ● | | |
