# Convergence example: execution quota change

The following is a de-identified, simplified example for checking how conclusions are updated and how the pyramid layers are split; its business rules do not apply to other tasks.

## Input materials

- Early draft: after the quota runs out, create a new execution to generate a summary.
- Later discussion: the user confirmed that wrap-up happens only when the current execution can still continue, with no new execution; the user accepted that some stop scenarios have no new summary.
- Requirements draft: the quota counts logical requests actually sent; retries of the same request are not counted again, requests blocked before sending are not counted, and requests that fail after being sent are still counted.
- ADR: the user confirmed that the old limit of 12 and usage of 7 carry over unchanged, leaving 5; historical usage is labeled with the old counting basis and is not passed off as a real request count.
- Boundary discussion: the result of the last permitted request may still be processed, and the quota blocks the next ordinary request; time limits, permissions and user stops still apply independently.
- Design draft: the assistant suggested a new `RequestLedgerV2` class; there is no record of confirmation.
- Question still open in the materials: the internal table name is not decided yet.
- User's explanation: the change is meant to make the quota reflect requests actually sent, so users are no longer charged extra quota for internal retries; this change does not alter the quota's UI display style, nor billing.
- User's authorization: deliver to `main`; may push its own branch and open an MR; the user merges it themselves.
- Assistant's inference: "do not change the command-line output format" should also be listed as a non-goal; the user did not respond.

## The spec body this can produce

> This document records the core decisions and constraints of the quota change, for shared use in design, implementation and review; the target requirements do not mean implementation or verification is done.
>
> Purpose: the quota is charged by requests actually sent, and internal retries no longer charge extra; the remaining count the user sees in the execution record matches the actual requests.

### The core decisions of this change

1. **The quota is counted by logical requests, and old quotas carry over unchanged.** Existing tasks do not get a fresh budget because of this.
2. **An exhausted quota blocks the next ordinary request.** The result of the last permitted request can still be processed, and other independent limits stay in effect.
3. **Wrap-up happens only within the current execution.** We accept that some stop scenarios have no new summary; creating a new execution for the summary is dropped.

### Complete decisions and constraints

#### Count logical requests actually sent; keep historical quota

| Case | Counting rule |
| --- | --- |
| Internal retries of the same request | Not counted again |
| Request blocked before sending | Not counted |
| Request fails after being sent | Still counted |

Old limit 12, used 7 → new limit 12, historical usage 7, remaining 5. The historical part is labeled with the old counting basis; historical usage is not treated as a real request count.

#### Process the result of the last permitted request; block the next ordinary request

The count quota does not cut off processing of a permitted request's result. Time limits, permissions and a user stop can still independently prevent further execution; the "last result" cannot be used to bypass these limits.

#### Wrap up only when the current execution can continue

Do not create a new execution for a summary; when there is no current execution that can continue, keep the existing results and the stopped state.

> Accepted trade-off: some stop scenarios have no newly generated summary.

#### Non-goals

- No change to the quota's UI display style.
- No change to billing.

### Delivery and authorization

Deliver to `main`. May push its own branch and open an MR; does not merge: stop at mergeable, and the user merges.

## Points to check

- The early plan of creating a new execution for the summary was explicitly replaced; it cannot stand alongside the current agreement.
- The class name is only an unconfirmed suggestion and does not enter the spec; the internal table name is left to design and does not block convergence.
- "An exhausted quota immediately stops all processing" changes the original boundary; it cannot serve as the condensed wording.
- "Every stop has a summary" erases the accepted cost; even if it sounds better, it is not the final decision.
- The opening need not cram in every counting case, but the body must keep them. The small overlap between the two layers serves different reading depths.
- "Do not change the command-line output format" is only the assistant's inference and does not go into the non-goals; it would affect the implementation scope, so confirm it with the user as a question.
- If two sources conflict on historical quota and no record of adoption can be found, keep it as an item pending confirmation; do not write a draft as the final agreement just because its date is newer.

## Check cases and acceptance judgments

The following are standalone check situations; they add no business requirements to the example above. Each row gives the source basis, a candidate draft, and the judgment to make.

| Source basis | Candidate draft or check suggestion | Judgment and minimal fix |
| --- | --- | --- |
| Confirmed: a request that fails after being sent is still counted | The intermediate summary missed this, and the reordered clauses match the summary exactly | Fail. Go back to the original confirmation and restore failure counting; identical text does not prove the meaning is complete |
| Confirmed: ordinary requests are subject to the count limit; there is also a wrap-up allowance within the current execution, and wrap-up requests also count as steps | Only says "wrap-up consumption is recorded as usual" | Fail. An implementer could still disable wrap-up when total steps reach the ordinary limit; state where the wrap-up allowance applies; actual total steps may exceed the ordinary work limit |
| Confirmed: old quotas carry over unchanged, and the user accepts that the change of unit leaves less executable work | Only an example of converting the old quota | Spell out the accepted cost; a worked example cannot replace an explicit statement of the product trade-off |
| Confirmed: reuse the shared capability; the original draft also names a shared package | Suggests adding the package name as a new clause | If the package is indeed covered by the reuse scope, record the existing coverage and do not add it again |
| The original draft references the repository's existing contract-generation conventions | Suggests copying the whole convention into the spec | Referencing the applicable convention explicitly is enough; contract changes specific to this change must still be spelled out |
| Only the assistant suggested adding a storage class | The draft requires adding that class | Fail. Remove the unconfirmed implementation requirement; keep the business constraints that have a basis |
| The summary says "every stop has a summary", while the body allows some cases without a summary | Each layer has its own complete paragraph | Fail. Fix the summary according to the accepted trade-off; the body having an exception does not justify keeping a wrong generalization |
| The user only said "let the agent finish it" | The draft says "merge into `main` when done" | Fail. Merging is an irreversible operation and is always done by the user after delivery; write "stop at mergeable; the user merges" |
| The discussion only confirmed the scope of the change and did not discuss what is out of scope | The draft lists five non-goals the assistant considers reasonable | Fail. Non-goals limit the implementation scope, so write only those with a basis; when none were agreed, write "No separate non-goals listed". Only when a specific adjacent matter would materially change the delivery scope, ask the user the minimum necessary question, e.g. whether the adjacent display style changes |
| Both options for historical quota can be found, but the message with the user's final choice cannot be read | The draft picks the newer option | Pending confirmation. Isolate this gap and state its impact, continue delivering the other confirmed parts, and do not declare the check passed |

Example check conclusion:

> Checked this version of the spec against the original requirements draft, the accepted ADRs and the final clarifications; restored failure counting and the boundary of the wrap-up allowance. The shared package name is already covered by the reuse scope and needs no separate entry. All substantive issues identified are resolved and the document check passes; this does not mean implementation is done or tests pass.

Use the corresponding conclusion only after actually doing these checks; do not copy the sources or the pass status from the example.
