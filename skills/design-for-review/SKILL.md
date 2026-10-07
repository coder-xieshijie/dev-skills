---
name: design-for-review
description: Turns existing requirements, design discussions and technical materials into a self-contained technical review document. Use when a technical design goes to people for review.
disable-model-invocation: true
---

Turn existing requirements, design discussions and technical materials into a technical design for people to review.

Goal: by reading only this one document, a reviewer can understand why the work is needed, how the design works, what needs to change, and which trade-offs need a decision.

## Confirm the basis

Prefer the authoritative sources the user specifies, and keep the requirements, boundaries and design decisions already confirmed.

- Design review: base the document on the confirmed requirements and design discussions, and verify current capabilities and constraints against the code.
- Explaining an implementation: when the user explicitly asks you to present a design that is already implemented, base it on the actual code at the specified version.
- When materials conflict, separate current facts, confirmed decisions and proposals still under discussion, and state the conflict and its impact.
- Fill in directly whatever can be determined from existing materials and code; list explicitly the unknowns that affect the choice of design.

## Organize the document

When an outline exists, keep it and refine it. When the user asks to see the outline first, deliver the outline first; otherwise write the full review draft directly.

When there is no set structure, organize the document in the order of understanding below, and merge or trim sections according to the size of the task:

1. Problem, goal and scope
   Describe the concrete scenario, the current problem, the expected result, and how far this work goes in solving it.

2. Current state and constraints
   Describe existing capabilities, how things currently run, and the key conditions that limit the choice of design.

3. Overall design
   Give the overall architecture and one complete business flow, so the reader first builds a picture of the whole.

4. Key design details
   Expand the interfaces, data models, state changes and error handling that affect understanding and reviewing the design.

5. Changes and reuse
   Describe which capabilities are reused as they are, which need to be modified, and which need to be added.
   Give the main directories changed and the responsibilities of the modules, to help the reader form an idea of the implementation scope.

6. Trade-offs and open items
   Explain why the current design was chosen, the cost it pays, and the questions reviewers still need to decide.
   Compare only alternatives relevant to the current decision.

7. How to verify
   Describe how to verify the key behaviors, and what results prove that the goal is met.

## Writing requirements

Before writing, read and apply [the body rules of explain-as-fool](../explain-as-fool/SKILL.md), the single maintained source of the writing requirements. Read that file directly from this repository; this does not change the manual-invocation settings of either Skill. When installing, keep that neighboring directory.

- Enter the technical design through a concrete scenario. When a term first appears, explain its responsibility and role where it is used.
- Organize the body around design and behavior. Use directories, classes, functions and code snippets only to explain key mechanisms or to support a judgment.
- Use one complete flow to connect the trigger, the participating modules, the changes in data and state, and the final result; explain each related error case where it occurs.
- Choose architecture diagrams, flowcharts, sequence diagrams or state diagrams as the explanation needs; use Mermaid by default.
- Module names, relationships, directions and states in diagrams must match the body; what is new, modified and reused must be directly recognizable.
- For interfaces and data models, give the fields, meanings and constraints needed to understand the interactions, in enough detail to review the design.
- Attach sources to key facts and to the basis of the design; keep in the body the information needed to understand the main design, so the reader can understand it without going through chat history.
- When revising an existing document, update the wording within the relevant sections, so the whole document presents one consistent current design.

## Check before delivery

Read the finished draft on its own, and confirm:

- The problem, goal, design and scope of change can be explained from it.
- The complete flow can be followed to understand how the modules work together.
- Existing capabilities, necessary modifications and new mechanisms can be told apart.
- Diagrams and text, interfaces, data models and state descriptions are consistent with one another.
- Confirmed decisions are clearly separated from open questions.
- Key trade-offs have reasons, and key behaviors have a way to be verified.

By default, deliver one technical review document, written in Markdown in the user's language.
