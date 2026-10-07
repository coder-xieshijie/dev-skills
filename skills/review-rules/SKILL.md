---
name: review-rules
description: Applies five review criteria (correctness, minimal change, proportionate complexity, extensibility, clear ownership) to code and designs. Use when reviewing code or a design, rechecking review findings, or judging a proposed fix.
disable-model-invocation: true
---

Apply the criteria below to the current review target and to the changes proposed during the review. They can be used on their own or together with an existing code or design review process.
The review scope, how the review is carried out, and whether to fix follow the user's current task.

## Review criteria

1. **Correct and complete**
   Does the implementation meet this requirement? Are there bugs that can actually be triggered, or missing functionality?
   Keeping functionality complete and behavior correct is the precondition for changing less.

2. **The minimum necessary change**
   Is the new code necessary? First check what already exists and look for implementations that can be reused.
   Is there an equivalent approach that changes a smaller area and introduces fewer concepts?
   Consider maintenance cost as well; do not compare only the number of diff lines.

3. **Complexity proportionate to the benefit**
   What concrete problem do the new abstractions, state and coordination mechanisms solve?
   For local or low-probability cases, state the trigger conditions, the consequences and the cost of handling them.
   Do not add complex design for imagined risks, and do not reject a necessary safeguard just because the case is a race condition.

4. **Enough extensibility**
   Will the next similar feature be easier to build?
   Test the limits of extensibility against concrete changes; avoid building frameworks in advance for changes nobody has asked for yet.

5. **Less to understand, clear boundaries of responsibility**
   Does the next change need less context to understand?
   Do state, decisions and resources have a clear owner?
   Can a failure be traced to the layer responsible for it? Can the change be rolled back as a whole?
   Is there cross-layer coupling, duplicated logic, or the same rule maintained in several places?

## Reaching a conclusion

For each issue raised, state the exact location, the triggering scenario or the maintenance consequence, the basis for the judgment, and the smallest fix with its cost.

Distinguish real defects, improvement suggestions, and trade-offs the user needs to decide.
Answer directly any question that the existing implementation and the explicit requirements can answer.
Keep confirmed product boundaries as they are; without new evidence, do not list them as defects again.
When no issue holds up, you may say plainly that there are none; do not make up issues to fill a count.
