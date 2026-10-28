# Planning the evaluation of a model behavior

When a design's goal is a model behavior (it keeps constraints after compaction, it answers before calling tools, it picks the right task), "how to verify" is an evaluation, and reviewers judge it by its design: what it compares, what controls it has, and whether its numbers can tell a real change from noise. In the case behind this file, the document already had a metric with a definition, a target and its basis; the reviewer's next question, "how do we evaluate this, how is the benchmark built, how are the cases constructed?", turned up nine gaps, all of them evaluation design.

Write the evaluation into the "How to verify" chapter with these parts.

## Reuse before building

- Search the organization's benchmark catalog, evaluation repositories and existing scorers for the behavior first. A scorer or a probe format that already exists is the default; say why when you build your own.
- Read every evaluation asset the design cites (case files, scorer code). Name the ones you could not read.

## Arms

- A **baseline arm** runs the current code. Describe its behavior completely, including what it drops, so the baseline numbers can be predicted and checked.
- Each **experiment arm** changes one variable against the baseline: one batch of the plan, one parameter.
- Bound each task with an **upper arm** that never loses the information (no compaction, full history) and a **lower arm** with the key fact removed. An upper arm below full marks means the task or the scorer is broken; a lower arm above zero means the item can be answered without the behavior under test.

## Items

- Keep items that change the model's default behavior; an item the model already obeys with no instruction has no power to discriminate. Give each probe a **negative control**: the same conversation without the item.
- Add **reverse probes**: items that were superseded or revoked, which the model must stop following.
- Place items where the design is supposed to lose them (before the compaction point, in the turns a summary replaces), and record whether each answer came from what stayed in context or from retrieval; count the two apart.
- Describe how items are generated or collected, how many per category, and which real conversations they are drawn from.

## Scoring

- When a model judges answers, calibrate it against human labels on a sample first and state the agreement required before it is used (for example, at least 90 %).
- State the minimum number of items per cell of the report and the confidence interval it gives (about ±8 points at 95 % for 50 items near the middle of the scale).

## Cost and plumbing

- Put the entry points the evaluation needs into the batch plan as work: restoring a session from a snapshot, forcing a compaction at a chosen turn, exporting what the model saw.
- Estimate the cost of one full run from the baseline run, and say how often it runs.
