# Prompting Claude Opus 5.5

> Source: [https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `5256a8e9a3b4727a29c2be44c6adb6b6558605e089cbb1499456bcc21b3c74aa`.

## Capabilities relevant to prompting

## Calibrate effort

## Prompts written for thinking disabled

## Unattended agentic runs

Treat a text-only end of turn as a report rather than as proof the task is done. Keep the task's parts in a checklist the model updates, such as a to-do tool or a file. If a turn ends with items still open and no blocker stated, send a short user message naming them, like the following one. You can also state the completion condition up front and have a separate, smaller model check the conversation against it at each end of turn, returning its reason as the next user message when the condition isn't met. Either way, stop after two or three automatic continuations on the same task rather than repeating them indefinitely, so that a run that is genuinely stuck ends and can be reviewed.

## Safeguard refusals

## User-facing progress updates

## Explore context in multi-app workflows

## Time signals for multiagent harnesses

## Thinking instructions in chat system prompts

## Mark pasted text in user messages

## Tools for complex visual inputs

## Frontend design defaults
