# Building multi-agent systems: When and how to use them

> Source: [https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them](https://claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them) (published 2026-01-23)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `3be713964ed0228752b36a4992f1504bc9ec815ed007017377c319723315d62f`.

## What is a multi-agent system?

## The case for starting with a single agent

A well-designed single agent with appropriate tools can accomplish far more than many developers expect.

[…]

We've observed teams build elaborate multi-agent systems with separate agents for planning, execution, review, and iteration, only to discover that they suffered from lost context at each handoff and spent more tokens coordinating than executing. In our testing, multi-agent implementations typically use 3-10x more tokens than single-agent approaches for equivalent tasks. This overhead stems from duplicating context across agents, coordination messages between agents, and summarizing results for handoffs.

## A decision framework for multi-agent systems

Multi-agent architectures provide value when they address specific constraints that a single agent cannot overcome. This means multi-agent architectures should be reserved for cases where they provide clear benefits that justify the additional cost.Managed infrastructure can also handle this for you (see [multiagent orchestration in Claude Managed Agents)](https://claude.com/blog/new-in-claude-managed-agents).

### Context protection

Large language models have finite context windows, and response quality can degrade as context grows. When an agent's context accumulates information from one subtask that is irrelevant to subsequent subtasks, context pollution occurs. Subagents provide isolation, with each operating in its own clean context focused on its specific task.

### Parallelization

Running multiple agents in parallel allows you to explore a larger search space than a single agent can cover. This pattern has proven particularly valuable for search and research tasks.

### Specialization

Different tasks sometimes benefit from different tool sets, system prompts, or domains of expertise. Rather than providing a single agent with access to dozens of tools, specialized agents with focused toolsets matched to their responsibilities can improve reliability.

#### **Tool set specialization**

#### **System prompt specialization**

Different tasks sometimes require different personas, constraints, or instructions that conflict when combined. A customer support agent needs to be empathetic and patient; a code review agent needs to be precise and critical. A compliance-checking agent needs rigid rule-following; a brainstorming agent needs creative flexibility. When a single agent must switch between conflicting behavioral modes, separating into specialized agents with tailored system prompts produces more consistent results.

#### **Domain expertise specialization**

## Outgrowing single-agent architectures

## Context-centric decomposition

**Problem-centric decomposition (often counterproductive).** Dividing by type of work (one agent writes features, another writes tests, a third reviews code) creates constant coordination overhead. Each handoff loses context. The test-writing agent lacks knowledge of why certain implementation decisions were made and the code reviewer lacks the context of exploration and iteration.

**Context-centric decomposition (usually effective).** Dividing by context boundaries means an agent handling a feature should also handle its tests, because it already possesses the necessary context. Work should only be split when context can be truly isolated.

[…]

**Effective decomposition boundaries include:**

- **Independent research paths.** Investigating "market trends in Asia" versus "market trends in Europe" can proceed in parallel with no shared context.
- **Separate components with clean interfaces.** With a well-defined API contract, frontend and backend work can proceed in parallel.
- **Blackbox verification.** A verifier that only needs to run tests and report results does not require implementation context.

**Problematic decomposition boundaries include:**

- **Sequential phases of the same work.** Planning, implementation, and testing of the same feature share too much context.
- **Tightly coupled components.** Components requiring constant back-and-forth belong in the same agent.
- **Work requiring shared state.** Agents that would need to frequently synchronize understanding should remain together.

## The verification subagent pattern

One multi-agent pattern that consistently works well across domains is the **verification subagent**. This is a dedicated agent whose sole responsibility is testing or validating the main agent's work.

It's worth noting that more capable orchestrator models (like Claude Opus 4.5) are increasingly able to evaluate subagent work directly without a separate verification step. However, verification subagents remain valuable when using less capable orchestrators, when verification requires specialized tools, or when you want to enforce explicit verification checkpoints in your workflow.

Verification subagents succeed because they sidestep the telephone game problem. Verification requires minimal context transfer by nature, so a verifier can blackbox-test a system without needing the full history of how it was built.

### Implementating a multi-agent system

The main agent completes a unit of work. Before proceeding, it spawns a verification subagent with the artifact to verify, clear success criteria, and tools to perform verification.

The verifier does not need to understand why the artifact was built as it was. It only needs to determine whether the artifact meets the specified criteria.

### Multi-agent system applications

### The early victory problem

The most significant failure mode for verification subagents is marking outputs as passing without thorough testing. The verifier runs one or two tests, observes them pass, and declares success.

Mitigation strategies include:

- **Concrete criteria.** Specify "Run the full test suite and report all failures" rather than "make sure it works."
- **Comprehensive checks.** Require the verifier to test multiple scenarios and edge cases.
- **Negative tests.** Direct the verifier to attempt inputs that should fail and confirm they do.
- **Explicit instructions.** The instruction "You MUST run the complete test suite before marking as passed" is essential. Without explicit requirements for comprehensive validation, verification agents take shortcuts.

## Choosing between single-agent and multi-agent systems

## Acknowledgements
