# Prompting

> Source: [https://learn.chatgpt.com/docs/prompting](https://learn.chatgpt.com/docs/prompting)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `8106241b75202ced279030fbae85455f6df1701b6681f9c6d67fda4c8b7a9549`.

## Prompting overview

A short prompt is often enough. For larger or more important tasks, include the
parts that matter:

- **Goal:** What should ChatGPT do?
- **Context:** What information or sources will help?
- **Output:** What format, length, or level of detail do you need?
- **Boundaries:** What must stay unchanged? What should ChatGPT avoid or check
  with you before it acts?

## Describe the result you need

Start with the result, not a detailed list of steps. Include the audience or
format when those details change what ChatGPT should produce.

[…]

This prompt explains what to create and who will read it. Describe a process when
the process itself matters. Otherwise, leave ChatGPT room to search, compare
information, and adjust its approach.

## Add useful context

### Use connected sources

### Use plugins

### Personalize ChatGPT

## Set boundaries that prevent real problems

Boundaries are the few instructions ChatGPT needs to avoid creating extra work
or taking an action you didn't intend. Add one when changing the wrong detail
would make the result unusable, or when you want to review something before it
affects other people.

[…]

Focus on the one or two boundaries that matter most. You don't need to control
every step ChatGPT takes.

## Make the result ready to use

## Improve the result with follow-up messages

### Steering and queuing

## Put the pieces together

## Use voice dictation

## Prompting examples for Chat

### Understand a topic

### Draft and refine writing

### Compare options

### Make a practical plan

## Prompting for ChatGPT Work

### Use ChatGPT Work efficiently

### Turn source material into finished files

### Research a decision

### Coordinate a launch

## Prompting Codex

### How to read these examples

### Explain a codebase

#### IDE extension workflow (fastest for local exploration)

#### CLI workflow (good when you want a transcript + shell commands)

### Fix a bug

#### CLI workflow (tight loop with reproduction and verification)

#### IDE extension workflow

### Write a test

#### IDE extension workflow (selection-based)

#### CLI workflow (path + line range described in prompt)

### Prototype from a screenshot

#### CLI workflow (image + prompt)

#### IDE extension workflow (image + existing files)

### Iterate on UI with live updates

#### CLI workflow (run Vite, then iterate with small prompts)

### Delegate refactor to the cloud

#### Local planning (IDE)

#### Cloud delegation (IDE → Cloud)

### Do a local code review

#### CLI workflow (review your working tree)

### Review a GitHub pull request

#### GitHub workflow (comment-driven)

### Update documentation

#### IDE or CLI workflow (local edits + local validation)
