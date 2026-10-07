---
name: plan-for-agents
description: Creates, revises or checks a complete plan for agents to execute, turning requirements and confirmed decisions into an approach, steps, outputs and acceptance evidence. Use for implementation, research, content creation, data processing and similar tasks.
disable-model-invocation: true
---

# Complete plans for agents

Write the plan so that an agent that did not take part in the earlier discussion, after reading the plan and the materials it explicitly references, knows the goal, the basis, how to carry out the work, its decision authority and the done criteria, without guessing key agreements from chat history.

Judge completeness by the requirements in effect and the boundaries of execution, not by length, number of sections, or agreement among models. Keep the information execution needs, and merge repeated statements; a simple task may use a short plan that covers everything necessary. By default, write the plan in the user's language.

## 1. Determine this piece of work and its basis

First tell whether the user is asking you to create a plan, revise an existing plan, or only check completeness. When only checking, deliver the issues and their basis; when creating or revising, deliver a current plan that can be used on its own. Writing a plan does not by itself authorize implementing, publishing or starting other agents; carry over the authorization already given in the conversation.

Read the requirements, confirmed decisions, existing plan and factual materials relevant to execution that the user specifies. Make clear the authoritative sources and the scope each applies to; when a version must be pinned, record an identifier that can be checked again, such as a commit, a document version or a data time range. Verify "latest" and then point it to a specific version.

- Separate current facts, target requirements, confirmed decisions, implementation suggestions, assumptions and open items. The current state cannot stand in for the goal, and assistant suggestions do not automatically become user decisions.
- Adopt directly what the user has already ruled on. The agent may choose routine execution details within the constraints; avoid turning naming, file layout and the like into questions for the user.
- When a conflict or gap in the materials would change the scope, the result or an important trade-off, first look for the evidence you can get; for what still cannot be settled, list the impact and the minimum necessary question, and continue with the parts that are not blocked.

Done criteria: you can state the scope, basis and confirmation status of this plan, and identify which work is blocked by open items.

## 2. Write out the common core content

The following are content requirements, not a fixed nine-chapter template. Keep a suitable existing structure, and merge sections according to the size of the task; content that does not apply needs no empty heading. State key rules in the body; source links are for verification and cannot replace the rules themselves.

| Content | Information that must be explicit |
|---|---|
| Goal and done criteria | The expected result, who it is delivered to, and done criteria that can be observed and checked. |
| Scope and constraints | The work included in and excluded from this effort; user requirements, resource limits, permission boundaries and behavior that must be preserved. |
| Inputs and factual basis | The materials needed, the verified current state, reusable capabilities, the gap to the goal; source versions, the basis for resolving conflicts, and unverified information. |
| Decisions and open items | Confirmed choices with the necessary reasons, accepted costs, execution details that may be adjusted; open questions, who decides them, and the steps they block. |
| Overall approach | How to get from the current state to the target state; the responsibilities, inputs and outputs, and collaboration of the parts; the reasons for key choices. |
| Execution steps and dependencies | Concrete actions, preconditions, order, outputs and done criteria; work that can proceed independently, and the conditions for handing off. |
| Boundaries and error handling | Situations relevant to the task such as missing inputs, failures, conflicts and interruptions; the conditions for retrying, stopping, rolling back, recovering or asking for a ruling. |
| Verification and acceptance | For each requirement, the verification method, the expected result, where the evidence is, what to do on failure, and what cannot be verified. |
| Delivery and continuation | Where the outputs are, their format and delivery status; when work is interrupted or handed off, how to identify the valid results and continue the remaining work. |

When open items exist, you may deliver a draft pending confirmation, but the affected steps must stay blocked. Do not make up facts, choose important trade-offs by default, or claim something is verified in order to make the plan look complete.

## 3. Expand the approach to executable granularity

Split steps into units that "can be executed on their own and judged complete", and give stable identifiers to steps that others depend on or that are handed off. Avoid having only phase names like "analyze, implement, test", and there is no need to write out ordinary mechanical operations one by one in advance.

For each substantive step, write out the following; simple steps may be merged into one paragraph:

```text
Step ID and goal:
Preconditions / dependencies:
Concrete actions:
Expected outputs:
Done criteria:
Handling of errors or blockers:
```

Judge whether the granularity is enough with this question: does the executor still have to decide on its own matters that would change the target behavior, agreements across stages, or correctness? If so, add the relevant rules or mark them as open; when only routine implementation choices within the constraints remain, leave them to the executor.

Marking work as parallelizable does not authorize creating multiple agents. Assign execution roles only when the task needs them; when several people or agents collaborate, make clear who owns which outputs, the boundaries for shared changes and the conditions for joining the work up; do not presuppose models or scheduling tools.

Depending on the task, add the domain-specific details that affect whether execution is correct:

- **Software development:** the scope of change and reuse, interface and data agreements, state and key sequencing; when migration, concurrency, idempotency, compatibility or recovery is involved, expand the corresponding semantics and their verification. There is no need to write out every function and all the code in advance.
- **Research and analysis:** the scope of the question, how materials are obtained, the credibility of sources, the method of comparison, and the limits of conclusions when evidence conflicts or falls short.
- **Documents or content creation:** audience, structure, sources of facts, requirements on expression, how it is reviewed, and the format of the finished product.
- **Data processing:** inputs and outputs, transformation rules, quality standards, handling of anomalous data; when there is a risk of overwriting or loss, state how to recover.
- **External operations:** the target, the permissions to act, the boundary between preview and submission; according to the actual risk, decide how results are verified and how to undo or remedy them.

Write only what the task actually needs; do not bring in new mechanisms, extra platforms or hypothetical risks just to complete the list.

## 4. Keep the plan complete when revising

Take the existing complete plan as what you revise, and update the relevant parts using new facts, user rulings and valid review comments. When the user changes only one decision, first check that decision and what depends on it; do not read it as authorization to rewrite or compress the whole plan.

- Keep requirements, interface agreements, boundaries, steps and acceptance details that are still valid.
- Replace a design overturned by a new conclusion in its own place, and update the dependent steps, error handling and verification requirements to match.
- Merge repeated content into one authoritative place; readers find it through explicit references.
- When deleting or merging substantive content, record in the revision check the original content, the reason for how it was handled, and where its replacement is; when it is truly no longer needed, state the basis. By default the record stays in your working process; deliver it separately when review or handoff needs it.

A summary may be provided separately; it cannot replace the complete body. When the approach is simplified, state which work is dropped, why it can be dropped, what cost remains, and how the other requirements are still met. A longer original is not a reason to restore all of it, but "keep it concise" is not a reason to delete necessary details either.

When a review process exists, what is reviewed should be the complete file as actually revised, and the diff. Agreeing on a suggestion does not mean the revised document has passed the check; when changes are made after confirmation, check the affected parts again and state clearly which version the confirmation applies to. The body of the plan presents the approach currently in effect; keep the history of debates and review records elsewhere as needed.

## 5. Check coverage, executability and delivery status

Against the original requirements in effect and the final rulings, build up, item by item while you work:

**Requirement → place in the approach → execution step → output → acceptance method and expected evidence.**

For a simple task you may check item by item; for a complex or cross-stage task you may use a mapping table. Deliver a separate ledger only when handoff or review really needs it.

- **Forward coverage:** every requirement in effect, condition, exception and accepted cost has a place; checking only topic headings or keywords is not enough.
- **Reverse check:** every piece of planned work serves the goal, a requirement or a necessary dependency; delete expansions that have no basis, or mark them explicitly as suggestions to choose from.
- **Execution closure:** every step has inputs, dependencies, actions, outputs and done criteria; no key handoff is missing a responsible party or has parties waiting on each other.
- **Consistent boundaries:** the overall approach, the concrete steps, error handling and acceptance requirements are consistent with one another. Check whether there is a reasonable way of executing that follows the wording of the plan yet violates a confirmed requirement.
- **Honest verification:** keep the verification methods in the plan separate from the evidence after execution. Record "to be verified, passed, failed, blocked" as they actually are; do not claim completion by lowering the acceptance criteria.

When you find during execution that the facts do not match the plan, record the difference, its impact and the reason for the adjustment. Adjust details yourself when they stay within the set goal and constraints; when an adjustment goes beyond existing authorization, changes a decision the user confirmed, or needs a new important trade-off, ask for the minimum necessary ruling, and meanwhile move forward with the work it does not affect.

Before delivering, reread the final output. It passes when: within the stated scope of sources, omissions, contradictions and ambiguities that affect execution are resolved, the open items and what they block are clear, and the executor can locate the information it needs. When a key source is missing, state the limits of the completeness check.

By default, deliver one complete plan, at the path the user specifies or following the project's existing conventions. Put progress and execution evidence in a clearly separated status section or in existing records; only at an actual handoff, record the current results, failed attempts, remaining work and the entry point for continuing. The final reply gives the location of the output, the scope checked and the issues not yet resolved; a plan passing its check does not mean the actual work is done.
