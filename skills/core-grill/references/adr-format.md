# ADR format

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `skills/engineering/domain-modeling/ADR-FORMAT.md` (`74ca5fe`, MIT License).

ADRs live in `docs/adr/` and use sequential numbering: `0001-slug.md`, `0002-slug.md`. Create the directory lazily, only when the first ADR is needed; for the number, take the highest existing number in the directory and add one. With multiple contexts, an ADR that concerns only one context goes in that context directory's `docs/adr/`.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

A single paragraph is enough. The value is in recording that a decision was made and why, not in filling out sections. Add the following only when genuinely needed: status (`proposed`, `accepted`, `deprecated`, `superseded by ADR-NNNN`), rejected alternatives (when the reason for rejecting them is not obvious), consequences (when the downstream effects are not obvious).

## When to write an ADR

Write one only when all three of these are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful.
2. **Surprising without context**: a future reader will look at the code and ask "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and this one was picked for specific reasons.

If a decision is easy to reverse, skip it: you will just reverse it. If it is not surprising, nobody will ask. If there was no alternative, you just did the obvious thing.

What qualifies: architectural shape; integration patterns between contexts; technology choices that carry lock-in (the ones that would take a quarter to swap out, not every library); boundary and scope decisions, including what is explicitly not done; deliberate deviations from the obvious path; constraints not visible in the code; rejected alternatives when the rejection is non-obvious.
