# How to write verify.md

Step 6 of core-spec writes verify.md by this document. Deliver one self-contained Markdown file, "<topic>: Acceptance Requirements", in the same language as spec.md, with the default file name `verify.md`. From it, the reader judges what it takes for an implementation to satisfy the spec: where to operate, what results to observe, and what evidence to leave before declaring it done.

This document is finished before the plan and the code are written, from the basis set out in section 1, so omissions in the plan and the implementation do not narrow the acceptance scope. The unit of acceptance is a complete operation whose result the user can observe. During development, the implementing agent drives the real application itself, and a scenario passes only when it actually runs through. verify.md states what to verify and how to judge it; how to start and drive the application belongs to the project's own verification capabilities (control commands, feature map, test tools), which verify.md references. Implementation steps, unit tests and execution results are not part of it.

## 1. List the spec's normative content

Read the whole spec and record its path, the sha256 of its content, and the current commit of each related repository; when the spec is updated later, record the hash again. The spec is the only source of requirements. The current session, ADRs and the glossary help you understand the spec's wording and find concrete examples; requirements come only from the spec.

List the spec's normative content item by item: chosen behaviors, defaults, conditions and exceptions, things that must not happen, existing behavior that must be preserved, non-goals, accepted costs, and invariants. Existing behavior that the non-goals touch goes into the regression scope. Do not list sentences that only explain reasons.

Done criteria: every item of the spec's normative content has a place: it becomes a requirement, or it is merged into another requirement with a note saying so.

## 2. Write agreements as requirements that can be judged

Give each requirement a stable ID (R01, R02, ...), write it as an observable conclusion, and note its location in the spec. When one agreement carries several conditions or exceptions, split it so that each exception can be judged on its own.

Choose a proof method for each requirement:

| Proof method | What it fits |
|---|---|
| Scenario | Behavior, state, output, side effects; run from the real entry point |
| Mechanical check | Structural constraints, e.g. layering direction, reusing a specified capability, no new dependencies, interfaces staying compatible; write them as lint rules or structural tests, one rule per constraint. Where a constraint truly cannot be mechanized, state what review checks and what counts as a failure |
| Existing check | What the repository's existing end-to-end tests, structural tests or lint can already prove; name the specific file or command |

Done criteria: every requirement has a proof method, and the reader does not need to guess how it is judged.

## 3. Design scenarios for behavioral requirements

A scenario is one complete operation a user performs at one entry point, with its result, written as "the user does something at some entry point and sees or produces some result". By default it is driven from the real entry point. Write it with these fields:

```text
S01 <title>  Covers: R01, R03
Entry point: the user entry point this scenario drives (a feature map entry or a specific entry point)
Preconditions: the initial state, arranged with test data, configuration or fixtures
Steps: what the user does at the entry point, in order
Checkpoints: one per result; the literal expected value or state taken from the spec, and where it is read from
Must not appear:
Baseline expectation: on the code before the change, fails / passes / the baseline lacks this feature
Decoy implementation: same as baseline / for a key risk the baseline does not cover: a plausible approach that makes this scenario fail
Test double: none / which external dependency uses a test double, and at which integration layer
Evidence:
Execution status: entry point exists / needs verification capability (see tooling gaps) / bind command after implementation
```

**Splitting and merging.** Split when results differ: every provision of the spec, every exception, every entry point, and every state that leads to a different result must be covered by a scenario. What has the same entry point and the same preconditions and can be checked one after another in one operation flow goes into one scenario, with one checkpoint per result; what needs a different entry point or different preconditions goes into separate scenarios. Split by results the user can observe; implementation steps and internal functions are not grounds for splitting.

**Choose the form of proof by type of change.**

| Change | Form of proof |
|---|---|
| CLI | Run the real command; check the output and exit code |
| UI | Walk the changed flow in the running app |
| Storage | After writing, read the value back from a separate read-only view |
| Parsing or migration | Replay saved real inputs |
| Platform support | Run on the target platform the spec names |
| Performance (when the spec requires it) | In the same environment, measure the baseline first, then the change; state the metric and the value that counts as failure |

**Make internal rules observable first.** For internal rules that cannot be seen from the entry point, such as counts, the parameters actually sent, or the data written, first add observability (logs, metrics, traces or a read-only query) and list it as a verification tooling gap; the scenario still starts from the entry point. Trigger conditions such as failures or rate limiting of external dependencies with a test double placed in the layer that connects to the external system; a test double proves only the behavior inside its boundary. When the spec requires a real provider, a real device or the target platform, the scenario runs in the real environment. Unit tests belong to the implementation and do not go into verify.md.

**Take the real user path.** Preconditions may be arranged with test data, configuration, permissions or supported test flags; the behavior under verification must come from real operations at the entry point. Internal setters, test-only interfaces and direct writes to storage are used only to arrange preconditions.

**Observe the actual result.** Evidence directly proves the result the spec requires. When the requirement is itself about what is displayed, the UI is direct evidence. When the requirement involves the parameters actually sent, the persisted state, the wiring under default startup or other side effects, observe both the action and the state change it causes, and read back the actual value or state; do not infer it from a UI message, a function being called or a log line.

**Assertions must be able to fail.** Checkpoints use the literal values the spec gives, not values computed by the code under test. Pair each "must not appear" item with a positive checkpoint in the same scenario, which proves the flow actually ran. The check: would the scenario still pass if the implementation did nothing or returned empty? If it would, rewrite the checkpoints. For a feature whose interaction the spec specifies, a display-only stub that cannot be interacted with must also fail, so these checkpoints assert the effect the interaction produces, not just that the control appears.

**Compare against the baseline.** For new or changed behavior, the scenario should fail on the code before the change; for behavior that must be preserved, it should pass both before and after the change. When the baseline lacks the feature, say so, and judge the added behavior and the end state the user waits for instead. The baseline is the first ready-made decoy implementation. For a key risk it does not cover, write one more plausible decoy implementation and confirm that the checkpoints make it fail.

**Cover every entry point.** When the same behavior can be triggered from several user entry points, each entry point either has a scenario or has a stated reason why it does not need one; the result at one entry point does not stand for the others.

**Constrain only what the spec specifies.** Checkpoints check the results the spec requires. Internal structure, naming and implementation paths that the spec does not specify are left to the implementation; other correct implementations should be able to pass.

**Results that code cannot assert**, such as model output quality or visual effects: state the fixed samples, the reference and the judging criteria, and note that independent judgment is needed.

Done criteria: every provision, exception, relevant entry point and result-changing state in the spec is covered by a scenario; every scenario has literal checkpoints and a baseline expectation, and where the baseline does not cover a key risk, it also has a decoy implementation; no two scenarios have exactly the same entry point, preconditions and operation flow.

## 4. Locate verification capabilities; list tooling gaps and coverage blind spots

First find the project's existing verification capabilities: verification Skills, control commands, feature map, end-to-end test tools, existing tests, logs, metrics and data queries. When there is a feature map, a scenario's "Entry point" references its feature map entry and drive commands; do not rewrite the drive steps in verify.md. A referenced entry point must exist in the recorded commit; what you cannot confirm from the repository is marked "bind command after implementation" or listed as a verification tooling gap. Whether it actually runs is verified in the delivery stage.

For features implemented in this change, state the type of entry point and how the result is observed; bind the specific commands at acceptance after implementation. Mark commands, parameters and paths not yet determined as "bind command after implementation".

What cannot be observed or driven now goes under "Verification tooling gaps": what is missing and which scenarios it serves. During delivery, prefer reusing the project's existing verification capabilities, fill only the minimal gaps these scenarios need, and keep them as reusable entry points according to the repository's rules, for example an extra observation in a control command, a read-only query or metric, or an entry in the feature map.

Parts that existing tools cannot see or operate, and that this change does not fill (for example, the driving tool cannot see browser-native dialogs), go under "Coverage blind spots": write each blind spot as one list item or table row, stating the affected scenario IDs and checkpoints and what is used to judge them instead. The independent verifier recognizes only the blind spots in these items; IDs mentioned in passing in a paragraph do not count. Checkpoints inside a blind spot cannot be marked verified.

Done criteria: each scenario's execution status is marked truthfully, and each gap and blind spot maps to scenarios.

## 5. Write the document

The document contains, in order:

1. **Purpose and authority**, adjustable to the topic:

   > Based on the spec, this document defines what counts as doing this requirement right and how to prove it. It is the shared basis for implementation, independent verification and final acceptance. During implementation, the implementing agent runs these scenarios itself, and a scenario passes only when it actually runs through; after freezing, scenarios and checkpoints do not change. This document only describes acceptance requirements; it does not mean verification has been run or has passed.

   Then write the sources: the spec path and sha256, the related repositories and commits, and the verification Skill or feature map referenced.
2. **Key points**: the number of requirements and scenarios, and the 3–5 scenarios most likely to go wrong, usually real cross-module paths, default wiring and key exceptions; readable within one screen.
3. **Smoke set**: a few core user journeys chosen by the risk of this change, preferring existing features this change touches, to confirm that the environment and existing features are not broken.
4. **Requirements table**: ID, requirement, spec location, proof method.
5. **Scenarios**.
6. **Regression scope**: existing behavior this change touches that the spec does not ask to change, covered by the repository's existing tests or additional scenarios; these scenarios should pass both on the baseline and after the change. Behavior the spec explicitly changes is not a regression; its old tests are updated with it.
7. **Verification tooling gaps**.
8. **Coverage blind spots**.
9. **Done criteria**: all scenarios pass by actually running, except checkpoints in coverage blind spots; checkpoints in blind spots are marked UNVERIFIED and listed separately; the evidence matches the code and running instance of the delivered version; scenarios that lack tools are truthfully marked blocked, not replaced by unit tests or other lower-level checks.

When deciding split granularity, how tight checkpoints should be, the proof method, or how to write a decoy implementation, read [the example and check cases](verify-example.md).

Deliver one `verify.md` in the location the user specifies; when no separate location is given, put it in the same directory as the spec.
