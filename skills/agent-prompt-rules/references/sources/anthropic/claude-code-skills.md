# Extend Claude with skills

> Source: [https://code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-10-01) has sha256 `70477a2c0582ee540539f1202e243dcb4168ab8e4f9ad6a977a1bf441522257e`.

## Bundled skills

### Run and verify your app

### Work on Claude API projects

## Getting started

### Create your first skill

## Choose where skills load

### Load skills in monorepos and subdirectories

### Load skills from a directory outside the project

### Resolve skills that share a name

### Use skills in Cowork and cloud sessions

### Skills synced from claude.ai

#### Where synced skills load

#### When a synced skill name matches another command

#### Names reserved for synced skills

#### How Claude Code handles the frontmatter of a synced skill

#### How Claude Code handles the body of a synced skill

### Edit a skill during a session

### Remove a skill

## Configure skills

### Types of skill content

### Frontmatter reference

#### Using skill frontmatter outside Claude Code

Claude Code accepts every field in the table above. Outside Claude Code, you can use only the fields in the [Agent Skills](https://agentskills.io) spec:

#### How a skill gets its command name

#### Available string substitutions

### Add supporting files

### Control who invokes a skill

By default, both you and Claude can invoke any skill. You can type `/skill-name` to invoke it directly, and Claude can load it automatically when relevant to your conversation. Two frontmatter fields let you restrict this:

* **`disable-model-invocation: true`**: Only you can invoke the skill. Use this for workflows with side effects or that you want to control timing, like `/commit`, `/deploy`, or `/send-slack-message`. You don't want Claude deciding to deploy because your code looks ready.
* **`user-invocable: false`**: Only Claude can invoke the skill. Use this for background knowledge that isn't actionable as a command. A `legacy-system-context` skill explains how an old system works. Claude should know this when relevant, but `/legacy-system-context` isn't a meaningful action for users to take.

[…]

Here's how the two fields affect invocation and context loading:

| Frontmatter | You can invoke | Claude can invoke | When loaded into context |
| :- | :- | :- | :- |
| (default) | Yes | Yes | Description always in context, full skill loads when invoked |
| `disable-model-invocation: true` | Yes | No | Description not in context, full skill loads when you invoke |
| `user-invocable: false` | No | Yes | Description always in context, full skill loads when invoked |

### Skill content lifecycle

When you or Claude invoke a skill, the rendered `SKILL.md` content enters the conversation as a single message and stays there across later turns. This persistence applies to the skill's instructions, not its permissions: an [`allowed-tools`](#pre-approve-tools-for-a-skill) grant clears when you send your next message. Claude Code does not re-read the skill file on later turns, so write guidance that should apply throughout a task as standing instructions rather than one-time steps.

[…]

[Auto-compaction](https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up) carries invoked skills forward within a token budget. When the conversation is summarized to free context, Claude Code re-attaches the most recent invocation of each skill after the summary, keeping the first 5,000 tokens of each. Re-attached skills share a combined budget of 25,000 tokens. Claude Code fills this budget starting from the most recently invoked skill, so older skills can be dropped entirely after compaction if you have invoked many in one session.

### Pre-approve tools for a skill

### Pass arguments to skills

## Advanced patterns

### Inject dynamic context

#### How injected commands run

#### When an injected command fails

#### Permission checks on injected commands

### Run skills in a subagent

#### Example: Research skill using Explore agent

### Restrict Claude's skill access

### Override skill visibility from settings

### Find unused skills

## Evaluate and iterate on a skill

The check for both is a baseline comparison. Collect a few realistic prompts, run each one in a fresh session with the skill available and again with it turned off, and compare the results. A fresh session matters because leftover context from authoring the skill will mask gaps in the written instructions.

### Run evals with skill-creator

## Share skills

### Generate visual output

## Troubleshooting

### Skill not triggering

### Skill triggers too often

### Claude stops following a skill

* **Claude skipped guidance it should apply with judgment**: word the guidance so it applies to the whole task, for example "Run the tests after every edit" rather than "Run the tests". Claude Code adds the skill's content to the conversation when the skill is invoked and [doesn't re-read the file](#skill-content-lifecycle) on later turns.
* **The conversation was compacted**: invoke the skill again to restore its full content. After [compaction](https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up), Claude Code [can keep only the start of an invoked skill](#skill-content-lifecycle), so put the most important instructions near the top of `SKILL.md`.

### Skill descriptions are cut short

Claude Code loads a listing of skill names and descriptions into context so Claude knows what's available. The listing always contains every skill name, but if you have many skills, Claude Code drops some descriptions to fit the listing's character budget, which removes the keywords Claude needs to match your request. The budget scales at 1% of the model's context window. When the listing overflows, Claude Code drops descriptions starting with the skills you invoke least, so the skills you use most keep their full text.

[…]

To raise the budget, set the [`skillListingBudgetFraction`](https://code.claude.com/docs/en/settings-reference#skilllistingbudgetfraction) setting (for example, `0.02` = 2%) or the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable to a fixed character count. To free budget for other skills, set low-priority entries to `"name-only"` in [`skillOverrides`](#override-skill-visibility-from-settings) so they list without a description. You can also trim the `description` and `when_to_use` text at the source: put the key use case first, since each entry's combined text is capped at 1,536 characters regardless of budget. The cap is configurable with [`skillListingMaxDescChars`](https://code.claude.com/docs/en/settings-reference#skilllistingmaxdescchars).

### Personal skills disappeared

## Related resources
