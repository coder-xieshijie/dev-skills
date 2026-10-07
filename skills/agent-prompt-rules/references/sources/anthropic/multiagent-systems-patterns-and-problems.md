# Patterns and problems in multiagent systems

> Source: [https://www.anthropic.com/research/multiagent-systems](https://www.anthropic.com/research/multiagent-systems) (published 2026-08-13)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `2d713f6c44200ace06a78e43109d7d6c181524122935ac21c415d97aab0858e6`.

## Measuring coordination

## Failures from conformity

Individual agents are “low variance”: they often act the same in situations where different people might take a much more diverse range of actions. All that differentiates one agent from another is its context, its scaffolding, and the model that underlies it. When these factors are all the same (or similar), different agents will take very similar actions, even when the action space is very large. And, by implication, this means that when one agent makes a bad decision, it is likely that many agents will make that same bad decision. What would have been isolated problems can quickly become systemic failures.

## Epistemic failures

Conversely, in a separate experiment, we measure how well our models do on “hidden profile” tasks. Here, we distribute facts across a group of agents, such that the evidence they share between them supports a wrong choice, but individual agents hold unique knowledge that should be decisive for the right one. Solving the task requires that the agents recognize their private information as pivotal, and then relies on the rest to trust them, rather than stick to the apparent prior consensus. Here, we find that performance scales with model intelligence but does not saturate even at the top of our range. This matches the human literature where discussion converges on what everyone already knows, and unshared facts are either never volunteered or not pressed once a consensus has formed.

## Incompatible goals

## Conclusion
