# Skill authoring best practices

> Source: [https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `f747d44fa4603fd4167c7ac251b6dcd74cf1ee8fce66ae6fb3bf19b17cbb9c30`.

## Core principles

### Concise is key

**Default assumption:** Claude is already very smart

Only add context Claude doesn't already have. Challenge each piece of information:

* "Does Claude really need this explanation?"
* "Can I assume Claude knows this?"
* "Does this paragraph justify its token cost?"

### Set appropriate degrees of freedom

Match the level of specificity to the task's fragility and variability.

[…]

**Analogy:** Think of Claude as a robot exploring a path:

* **Narrow bridge with cliffs on both sides:** There's only one safe way forward. Provide specific guardrails and exact instructions (low freedom). Example: database migrations that must run in exact sequence.
* **Open field with no hazards:** Many paths lead to success. Give general direction and trust Claude to find the best route (high freedom). Example: code reviews where context determines the best approach.

### Test with all models you plan to use

Skills act as additions to models, so effectiveness depends on the underlying model. Test your Skill with all the models you plan to use it with.

[…]

What works perfectly for Opus might need more detail for Haiku. If you plan to use your Skill across multiple models, aim for instructions that work well with all of them.

## Skill structure

### Naming conventions

### Writing effective descriptions

The `description` field enables Skill discovery and should include both what the Skill does and when to use it.

[…]

**Be specific and include key terms**. Include both what the Skill does and specific triggers/contexts for when to use it.

### Progressive disclosure patterns

SKILL.md serves as an overview that points Claude to detailed materials as needed, like a table of contents in an onboarding guide. For an explanation of how progressive disclosure works, see [How Skills work](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work) in the overview.

**Practical guidance:**

* Keep SKILL.md body under 500 lines for optimal performance
* Split content into separate files when approaching this limit
* Use the following patterns to organize instructions, code, and resources effectively

#### Visual overview: From simple to complex

#### Pattern 1: High-level guide with references

#### Pattern 2: Domain-specific organization

#### Pattern 3: Conditional details

### Avoid deeply nested references

### Structure longer reference files with table of contents

## Workflows and feedback loops

### Use workflows for complex tasks

### Implement feedback loops

**Common pattern:** Run validator → fix errors → repeat

This pattern greatly improves output quality.

## Content guidelines

### Avoid time-sensitive information

### Use consistent terminology

## Common patterns

### Template pattern

### Examples pattern

### Conditional workflow pattern

## Evaluation and iteration

### Build evaluations first

**Evaluation-driven development:**

1. **Identify gaps:** Run Claude on representative tasks without a Skill. Document specific failures or missing context
2. **Create evaluations:** Build three scenarios that test these gaps
3. **Establish baseline:** Measure Claude's performance without the Skill
4. **Write minimal instructions:** Create just enough content to address the gaps and pass evaluations
5. **Iterate:** Execute evaluations, compare against baseline, and refine

### Develop Skills iteratively with Claude

### Observe how Claude navigates Skills

## Anti-patterns to avoid

### Avoid Windows-style paths

### Avoid offering too many options

## Advanced: Skills with executable code

### Solve, don't defer

### Provide utility scripts

### Use visual analysis

### Create verifiable intermediate outputs

### Package dependencies

### Runtime environment

### MCP tool references

### Avoid assuming tools are installed

## Technical notes

### YAML frontmatter requirements

### Token budgets

Keep SKILL.md body under 500 lines for optimal performance. If your content exceeds this, split it into separate files using the progressive disclosure patterns described earlier. For architectural details, see the [Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview#how-skills-work).

## Checklist for effective Skills

### Core quality

### Code and scripts

### Testing

## Next steps
