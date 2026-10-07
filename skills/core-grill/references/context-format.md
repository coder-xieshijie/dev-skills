# Glossary format

Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) `skills/engineering/domain-modeling/CONTEXT-FORMAT.md` (`74ca5fe`, MIT License).

## Structure

```md
# {Context Name}

{One or two sentences: what this context is and why it exists.}

## Terms

**Order**:
A purchase request placed by a customer.
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

## Rules

- **Pick one word.** When multiple words exist for the same concept, pick the best one and list the others under _Avoid_.
- **Keep definitions tight.** One or two sentences max. Define what it is, not what it does.
- **Only include concepts specific to this project.** General programming concepts such as timeouts and error types do not belong, even if the project uses them extensively.
- **Group terms under subheadings when natural clusters emerge**; if all terms belong to a single area, a flat list is fine.

## Single and multiple contexts

- Most repositories have a single context: one `CONTEXT.md` at the repository root.
- With multiple contexts, a `CONTEXT-MAP.md` at the repository root lists the contexts, where they live, and how they relate to each other, and each context directory has its own `CONTEXT.md`.
- If `CONTEXT-MAP.md` exists, read it to find contexts; if only a root `CONTEXT.md` exists, there is a single context; if neither exists, create the root `CONTEXT.md` lazily, when the first term is resolved.
- When there are multiple contexts and you cannot tell which one the current topic belongs to, ask the user.
