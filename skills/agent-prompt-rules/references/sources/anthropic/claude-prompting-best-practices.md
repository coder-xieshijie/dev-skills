# Prompting best practices

> Source: [https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-01) has sha256 `ee34af076fde08c7218a9930af1f6cd79d095471dc52c35388efa0bee17c8ad4`.

## Model-specific guidance

## General principles

The techniques in this section and the sections that follow apply to current Claude models, including Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, and Claude Mythos 5. Where a technique names a specific model, treat it as measured on that model and re-check it against your own evals before applying it to another.

### Be clear and direct

### Add context to improve performance

Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important, can help Claude better understand your goals and deliver more targeted responses.

**Example: Formatting preferences**

**Less effective:**

```text
NEVER use ellipses
```

**More effective:**

```text
Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them.
```

Claude is smart enough to generalize from the explanation.

### Use examples effectively

### Structure prompts with XML tags

### Give Claude a role

### Long context prompting

### Model self-knowledge

## Output and formatting

### Communication style and verbosity

### Control the format of responses

### LaTeX output

### Document creation

### Migrating away from prefilled responses

## Tool use

### Tool usage

### Optimize parallel tool calling

## Thinking and reasoning

### Overthinking and excessive thoroughness

### Leverage thinking & interleaved thinking capabilities

## Agentic systems

### Long-horizon reasoning and state tracking

Claude's latest models handle long-horizon reasoning tasks with strong state tracking. Claude maintains orientation across extended sessions by focusing on incremental progress, making steady advances on a few things at a time rather than attempting everything at once. This capability especially emerges over multiple context windows or task iterations, where Claude can work on a complex task, save the state, and continue with a fresh context window.

#### Context awareness and multiwindow workflows

If you are using Claude in an agent harness that compacts context or allows saving context to external files (like in Claude Code), consider adding this information to your prompt so Claude can behave accordingly. Otherwise, Claude may sometimes naturally try to wrap up work as it approaches the context limit. The following is an example prompt:

#### Workflows across multiple context windows

4. **Starting fresh versus compacting:** When a context window is cleared, consider starting with a brand new context window rather than using compaction. Claude's latest models are extremely effective at discovering state from the local filesystem. In some cases, you may want to take advantage of this over compaction. Be prescriptive about how it should start:

   * "Call pwd; you can only read and write files in this directory."
   * "Review progress.txt, tests.json, and the git logs."
   * "Manually run through a fundamental integration test before moving on to implementing new features."

#### State management best practices

* **Use git for state tracking:** Git provides a log of what's been done and checkpoints that can be restored. Claude's latest models perform especially well in using git to track state across multiple sessions.

### Balancing autonomy and safety

### Research and information gathering

### Subagent orchestration

### Chain complex prompts

### Reduce file creation in agentic coding

### Overeagerness

### Avoid focusing on passing tests and hardcoding

### Minimizing hallucinations in agentic coding

## Capability-specific tips

### Improved vision capabilities

### Frontend design

## Migration considerations

### Migrating to Claude Sonnet 5.5

## Next steps
