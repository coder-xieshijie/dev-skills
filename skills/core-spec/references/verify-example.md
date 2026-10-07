# Example: acceptance requirements for the execution quota change

The following reuses the "execution quota change" spec from the [spec example](spec-example.md), de-identified and simplified, to show split granularity, proof methods, how tight checkpoints should be, and how to write decoy implementations; its business rules do not apply to other tasks.

## Input: the spec's normative content

- The quota counts logical requests actually sent: internal retries of the same request are not counted again; requests blocked before sending are not counted; requests that fail after being sent are still counted.
- Old quotas carry over unchanged: old limit 12, used 7 → new limit 12, historical usage 7, remaining 5; the historical part is labeled with the old counting basis.
- An exhausted quota blocks the next ordinary request; the result of the last permitted request is still processed; time limits, permissions and user stops can still independently prevent further execution.
- Wrap-up happens only when the current execution can still continue, and no new execution is created for a summary; it is accepted that some stop scenarios have no new summary.
- A task can be started from two entry points: the UI and the command line.

## The verify excerpt this can produce

### Smoke set

- Start an ordinary task from the UI; the result appears in the execution record.
- Start an ordinary task from the command line; the result appears in the execution record.

Both are existing features that this change touches, and both should pass before work starts. Scenarios for new behavior fail until the implementation is done, so they do not go into the smoke set.

### Requirements table

| ID | Requirement | Spec location | Proof method |
|---|---|---|---|
| R01 | Internal retries of the same request increase the count by only 1 | Count logical requests | Scenario S01 |
| R02 | A request blocked before sending is not counted | Count logical requests | Scenario S01 |
| R03 | A request that fails after being sent is still counted | Count logical requests | Scenario S01 |
| R04 | After old data is upgraded, 5 remain, and the historical 7 are labeled with the old counting basis | Keep historical quota | Scenario S04 |
| R05 | After the quota is exhausted, the next ordinary request is not sent | Last permitted request | Scenarios S02, S03 |
| R06 | The result of the last permitted request is still processed | Last permitted request | Scenarios S02, S03 |
| R07 | When there is no current execution that can continue, no new execution is created, and the existing results and stopped state are kept | Wrap up only when the current execution can continue | Scenario S05 |

### Scenarios

```text
S01 Counting rules  Covers: R01, R02, R03
Entry point: start a task from the command line
Preconditions: set the remaining quota to 5 with test data
Steps: start three tasks in turn: in the first, the external provider fails once and the retry succeeds; the second is blocked before sending; the third fails after being sent
Checkpoints: the counts for the three tasks are +1, +0, +1 in order; the remaining quota reads back as 3
Must not appear: a retry making the count +2; a blocked request being counted
Baseline expectation: fails (the old counting basis does not count by logical requests)
Decoy implementation: count every HTTP attempt (the count is +2 after a retry); count before sending (a blocked request is also +1)
Test double: the external provider is replaced by a test double at the integration layer, which controls failures, retries and blocking
Evidence: the result of the read-only quota query; a log of the requests the test double received
Execution status: needs verification capability (gap G1)
```

```text
S02 Exhaustion boundary (UI)  Covers: R05, R06
Entry point: start a task from the UI
Preconditions: set the remaining quota to 1 with test data
Steps: from the UI, start a task that needs two requests to finish; the first request is permitted and returns a result
Checkpoints: that result appears in the execution record; the number of logical requests actually sent is 1; the task stops in the quota-exhausted state
Must not appear: a second ordinary request is sent
Baseline expectation: fails (the baseline terminates immediately when the quota reaches zero, and the result does not enter the execution record)
Decoy implementation: check the quota only after the result returns (the second request has already been sent); do not check the quota at all (the second request is sent as usual)
Test double: the external provider is replaced by a test double at the integration layer; the first result asks for another request, so the task does attempt a second request
Evidence: the execution record, the outbound request log
Execution status: bind command after implementation
```

S03 has the same preconditions and checkpoints as S02; its entry point is starting a task from the command line. S04 and S05 are written with the same fields and are omitted here.

### Verification tooling gaps

| Gap | Scenarios served |
|---|---|
| G1 The number of logical requests an execution actually sent cannot be read from outside; add a read-only query or metric | S01, S02, S03 |

### Coverage blind spots

None.

## Check cases and judgments

The following are standalone check situations; each row gives a candidate wording and the judgment to make.

| Candidate wording | Judgment and minimal fix |
|---|---|
| S02 only asserts "the UI shows 0 remaining" | Too loose. The decoy implementation "check the quota only after the result returns" also shows 0; assert the actual number of outbound requests instead |
| S02 uses a task that needs only one request | Too loose. This task only makes one request anyway, so an implementation that never checks the quota also passes; use a task that is certain to attempt a second request |
| S02's positive checkpoint is removed, leaving only "must not appear: a second request" | Too loose. An implementation that does nothing also sends no second request; keep "the first result enters the execution record" as the positive checkpoint |
| S01's checkpoint is written as "the remaining quota equals the return value of `quota.remaining()`" | Self-referential. The expected value comes from the code under test, so a wrong implementation also passes; use the literal value 3 derived from the spec |
| S01's baseline expectation is written as "passes" | Contradiction. The counting basis changes in this change; if the scenario passes on the old code, it does not test the change; recheck the checkpoints |
| Only S02 is written, with no scenario for the command-line entry point | Incomplete. The same behavior can also be triggered from the command line, and the result at one entry point does not stand for the other; add S03 or state why it is not needed |
| S02 covers both the UI and the command-line entry points | Split it. Different entry points go into different scenarios; the preconditions and checkpoints may be the same |
| R01–R03 are written as three scenarios, each preparing the quota and the test double again | Too fine. Same entry point, same preconditions, and they can be triggered one after another in one flow: merge them into one scenario with three checkpoints |
| A unit test of `countRequests()` is written as the acceptance for R01 | Wrong level. Unit tests belong to the implementation; acceptance starts a task from the entry point and reads back the count through a read-only query; if the query does not exist, list it as a tooling gap |
| To verify R06, the internal result-processing function is called directly | Not the user path. The remaining quota may be arranged with test data, but the "result is processed" under verification must come from a real task started at the entry point |
| S01 asserts "`RequestLedger.increment` is called once" | Too narrow. The spec does not specify internal structure, so other correct implementations would be wrongly rejected; assert the externally visible count instead |
| "Migration finishes within 5 seconds" is added to R04 | Beyond the spec. The spec has no time requirement; delete it |
| The spec does not say who gets the last slot when two concurrent executions share a quota, and the draft writes "the one started first gets it" | Do not settle it yourself. Ask the user, write the answer into the spec, then write the scenario; until the answer comes, mark it pending confirmation |
| The accepted cost "some stop scenarios have no new summary" has no corresponding requirement | Omission. An accepted cost is also an agreement; a scenario must confirm that no new execution is created in this case, so that the implementation does not create one to produce a summary |
| S01 uses a test double for the provider | Acceptable. The test double sits in the layer that connects to the external service and replaces only the external responses; the count is still produced by this system. When the spec requires real provider behavior, it cannot be replaced this way |
| Starting a task from the UI pops up a browser-native confirmation dialog that the driving tool cannot see, yet S02 is still marked "entry point exists" | Untrue status. List the affected checkpoints under coverage blind spots and state what is used to judge them instead |
| S01 is put in the smoke set | Wrong. S01 verifies new behavior and is bound to fail until the implementation is done; the smoke set holds only existing features that should pass before work starts |
| "Reuse the existing quota storage; add no new table" is written as a scenario | Wrong proof method. This is a structural constraint; make it a mechanical check, e.g. a structural test confirming that this change adds no table; where it cannot be mechanized, state what review checks and what counts as a failure |

Give a conclusion only after actually doing these checks; do not copy the scenarios or judgments from the example.
