# plan.md format

Based on OpenAI's ExecPlan ([Using PLANS.md for multi-hour problem solving](https://cookbook.openai.com/articles/codex_exec_plans)). The owner writes plan.md, revises it while working, and commits it with the code. It has two readers: a new session taking over after an interruption, which must be able to continue from only plan.md and the git history; and the user before merging, who reads the decision list first.

spec.md and verify.md are frozen and committed on the feature branch. plan.md refers to them and does not restate the requirements or scenarios; acceptance follows verify.md.

## Sections

Write them in the order below. Sections marked "kept up to date" are updated at every stopping point and after each milestone; when you change course, revise all affected sections together, not only by appending at the end.

### Decision list (kept up to date)

Put it first, ordered from largest to smallest impact. Each entry is one top-level list item:

```text
- Decision: <the choice you made>
  - Rationale: <basis and evidence>
  - Other family: <the model you asked and its opinion; if you did not ask, write "Not asked; affects implementation only">
  - If overturned: <what must change; which scenarios to rerun>
```

For what goes in it, see "Decision list" in SKILL.md. If there are no decisions, write "None". The decision list at the top of the MR description is copied from here.

### Frozen inputs

```text
- handoff: <MR link> <feature branch> @ <handoff commit>
- spec: <path in the repository>
- verify: <path in the repository>
- baseline: <target branch> @ <commit>
- owner: <your model ID, e.g. claude-opus-5-5>
```

`check-delivery.mjs` reads the owner line to confirm that the independent verifier is from another family. When only local paths were handed over, write "local" on the handoff line, and on the spec and verify lines write the absolute path and the sha256 the user gave (`- spec: <absolute path> sha256=<value>`); a session taking over uses them to run `check-delivery.mjs --spec <path>@<sha256> --verify <path>@<sha256>`.

### Purpose / Big Picture

One or two sentences: what the user can do once this is done, and how to see it working. Taken from the spec's purpose.

### Progress (kept up to date)

A checklist with timestamps, one line per step: time, what was done, which scenarios passed, commit. Write an unfinished step as "completed: X; remaining: Y".

```text
- [x] (2026-09-29 14:05+08:00) M1 add read-only quota query; S01 passes; milestone check found no problems; a1b2c3d
- [ ] M2 quota-exhausted boundary (completed: UI entry point S02; remaining: command-line entry point S03)
```

### Surprises & Discoveries (kept up to date)

Facts that differed from what you expected and shaped your approach, for example a library that lacks support for something, an interface that behaves differently, or a baseline failure unrelated to this change. For each, write the observation and brief evidence.

### Outcomes & Retrospective (kept up to date)

What was achieved, what remains, the result compared against the purpose, and the repository gaps this work exposed (missing verification capabilities, docs or lint).

### Context and Orientation

Files and modules relevant to this task (full paths), non-obvious conventions, and the terms you will use; link to existing docs, and do not restate the implementation.

### Milestones

One paragraph per milestone, starting with its number (M1, M2, ...): the scope, what will exist at the end that did not exist before, which scenarios and coverage blind spots in verify it covers, and which quality commands to run. A scenario that depends on a verification capability is placed after the capability is added.

### Validation and Acceptance

How to start the app and run the smoke set; how to drive each scenario from its entry point, with the actual commands, including those marked "bind command after implementation" in verify. Verdicts follow the checkpoints in verify.md. This section is given to the independent verifier for running the scenarios.

### Interfaces and Dependencies

The libraries, modules and services used, and why; parts the spec does not prescribe are the owner's choice and may change when the approach changes.

## Size

For evidence, write only the path and a one-sentence conclusion; full output goes in `evidence/`. When Progress grows so long that reading plan.md at every start takes real time, you may move it to `progress.md` in the same directory and leave a link in plan.md; the decision list and frozen inputs stay in plan.md.
