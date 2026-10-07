# Rethinking skills and prompts for GPT-6 Astra

> Source: [https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) (published 2026-09-11)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `a8fd3c9959d21ce6902bea825bd59112b2983ee10b599218b4088ca70570f182`.

## Better skills

First, skill descriptions should be as short as possible while making it clear when the model should use them:

> Illustration: Skill descriptions. Bad: Create and validate Postgres schema migrations. Use when working with databases, queries, models, or persistence. Good: Create and validate Postgres schema migrations. Use when adding or changing a migration, or reviewing its rollout.

[…]

Second, one of the key markers of a useful skill is progressive disclosure. Reading a skill takes up context, bringing you closer to compaction and introducing guidance that may not apply to the task. For skills with multiple workflows, make the root document a minimal router that points to supporting docs and scripts. Give the model enough guidance to know where to look without forcing it to read things that don't matter in the moment.

[…]

Repository skills also guide other contributors' agents, which may use different models. Guidance that helps Sol or Luna may overconstrain GPT-6 Astra, so consider which models will use the instructions you leave behind.

## Up-to-date AGENTS.md

Because [`AGENTS.md`](https://agents.md) applies whenever the model works in your repository, you should frequently revisit each instruction and ask yourself whether it's still needed.

Requiring a stack of docs or a full repo map before every edit is excessive for a typo fix. GPT-6 Astra can work out what it needs to read without being pushed to review the whole project before every change.

> Illustration: AGENTS.md context. Bad: Before every edit, read architecture.md, database.md, and deployment.md. Good: Use architecture.md for service boundaries, database.md for schema changes, and deployment.md when preparing a deployment.

_Prompting the model to read files before every edit is a great way to burn context and slow work down. Pointing to some docs can still be helpful, however, so long as it is contextual. Be sure to keep your docs updated too!_

Previous models needed encouragement to run tests and check their work. GPT-6 Astra does that on its own, so the same instructions can lead to unnecessary testing.

## Decision boundaries

Pay careful attention to how you describe boundaries. If a previous model did things on your behalf without permission, you may have added strong language to make it ask first. That can be useful, but GPT-6 Astra, as our most aligned model, has much better judgment and will not perform tasks unless it knows it is safe – so you should treat it as such.

If you stated boundaries previously because you wanted to prevent other models from going too far and you're now switching to GPT-6 Astra, consider updating that language: Astra could take it too seriously and may stop work where you'd actually be happy for it to continue.

## Persistence

If you're used to GPT-5.6 Sol taking a request and continuing for long stretches, GPT-6 Astra can feel more tentative about when to stop. It may reach a first implementation and come back for your review while there's still work to do.

This is where it helps to define completion before starting. You might need to push Astra to continue until it's fully done. If the task includes getting the implementation running, inspecting the result, and fixing what fails, make that part of the request. A requirement to stop for review after the first implementation will pull the model toward an earlier stopping point, so check whether that's a decision you actually need to make.
