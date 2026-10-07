# 

> Source: [https://code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `258c32ee15b3fd306c53a6b692beeca9c7ba1ba42f1bdd1409d71e32a92e0413`.

# Best practices for Claude Code

## Give Claude a way to verify its work

> **Tip:**
>
> Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from.

[…]

Have Claude show evidence rather than asserting success: the test output, the command it ran and what it returned, or a screenshot of the result. Reviewing evidence is faster than re-running the verification yourself, and it works for sessions you weren't watching.

## Explore first, then plan, then code

## Provide specific context in your prompts

### Provide rich content

## Configure your environment

### Write an effective CLAUDE.md

Keep it concise. For each line, ask: *"Would removing this cause Claude to make mistakes?"* If not, cut it. Bloated CLAUDE.md files cause Claude to ignore your actual instructions!

| ✅ Include                                            | ❌ Exclude                                          |
| ---------------------------------------------------- | -------------------------------------------------- |
| Bash commands Claude can't guess                     | Anything Claude can figure out by reading code     |
| Code style rules that differ from defaults           | Standard language conventions Claude already knows |
| Testing instructions and preferred test runners      | Detailed API documentation (link to docs instead)  |
| Repository etiquette (branch naming, PR conventions) | Information that changes frequently                |
| Architectural decisions specific to your project     | Long explanations or tutorials                     |
| Developer environment quirks (required env vars)     | File-by-file descriptions of the codebase          |
| Common gotchas or non-obvious behaviors              | Self-evident practices like "write clean code"     |

If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost. If Claude asks you questions that are answered in CLAUDE.md, the phrasing might be ambiguous. Treat CLAUDE.md like code: review it when things go wrong, prune it regularly, and test changes by observing whether Claude's behavior actually shifts. For a checked-in CLAUDE.md, run [`/doctor`](https://code.claude.com/docs/en/commands#all-commands) and Claude proposes cuts for content it can derive from the codebase.

If Claude keeps skipping one instruction, add emphasis such as "IMPORTANT" to that line alone. If you emphasize many lines, none of them stands out. Check CLAUDE.md into git so your team can contribute. The file compounds in value over time.

### Configure permissions

### Use CLI tools

### Connect MCP servers

### Set up hooks

> **Tip:**
>
> Use hooks for actions that must happen every time with zero exceptions.

[Hooks](https://code.claude.com/docs/en/hooks-guide) run scripts automatically at specific points in Claude's workflow. Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens.

### Create skills

### Create custom subagents

### Install plugins

## Communicate effectively

### Ask codebase questions

### Let Claude interview you

> **Tip:**
>
> For larger features, have Claude interview you first. Start with a minimal prompt and ask Claude to interview you using the `AskUserQuestion` tool.

[…]

```text
I want to build [brief description]. Interview me in detail using the AskUserQuestion tool.

Ask about technical implementation, UI/UX, edge cases, concerns, and tradeoffs. Don't ask obvious questions, dig into the hard parts I might not have considered.

Keep interviewing until we've covered everything, then write a complete spec to SPEC.md.
```

Once the spec is complete, start a fresh session to execute it. The new session has clean context focused entirely on implementation, and you have a written spec to reference.

The most useful specs are self-contained: they name the files and interfaces involved, state what is out of scope, and end with an end-to-end verification step that proves the feature works. Time spent making the spec precise pays off more than time spent watching the implementation.

## Manage your session

### Course-correct early and often

### Manage context aggressively

### Use subagents for investigation

### Rewind with checkpoints

### Resume conversations

## Automate and scale

### Run non-interactive mode

### Run multiple Claude sessions

Beyond parallelizing work, multiple sessions enable quality-focused workflows. A fresh context improves code review since Claude won't be biased toward code it just wrote.

### Fan out across files

### Run autonomously with auto mode

### Add an adversarial review step

> **Tip:**
>
> Before treating a task as done, have a subagent review the diff in a fresh context and report gaps.

The longer Claude works unattended, the more an independent check matters before you count the work as done. A reviewer running in a fresh [subagent](https://code.claude.com/docs/en/sub-agents) context sees only the diff and the criteria you give it, not the reasoning that produced the change, so it evaluates the result on its own terms.

[…]

> **Note:**
>
> A reviewer prompted to find gaps will usually report some, even when the work is sound, because that is what it was asked to do. Chasing every finding leads to over-engineering: extra abstraction layers, defensive code, and tests for cases that can't happen. Tell the reviewer to flag only gaps that affect correctness or the stated requirements, and treat the rest as optional.

## Avoid common failure patterns

## Develop your intuition

## Related resources
