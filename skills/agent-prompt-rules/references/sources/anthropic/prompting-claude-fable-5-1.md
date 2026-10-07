# Prompting Claude Fable 5.1

> Source: [https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)

> **Excerpt.** Only the passages that dev-skills cites are kept here, verbatim; every other section keeps its heading only, so links into it still resolve. `[…]` marks an omission. The full text is at the official URL above. The archived full text (fetched 2026-09-28) has sha256 `d4fe00faa1799c64486670389854ca6e27e6f6dfe2b9553e01f5d5ac6012719f`.

## Consider all effort levels

## Ask for user-facing progress updates

## Batch independent tool calls in agent loops

## Keep the conversation history append-only

## Writing density

## Formatting in chat

## Quoting retrieved sources

## Finish the whole task

Claude Fable 5.1 can execute very long tasks without much guidance on methodology, especially when the goal is clear. On complex asynchronous workloads, though, nudge it not to end its turn before the work is done. Without the nudge, the model sometimes describes what it would do next instead of doing it ("Next, I'll …") or stops to ask permission for a step the original request already covered ("Shall I apply this?"). Users have to reply "continue" or "go ahead," which suits pair programming and other human-in-the-loop work but doesn't use the model's full long-horizon capability.

[…]

```text
You are operating autonomously. The user is not watching in real time and cannot answer questions mid-task, so asking 'Want me to…?' or 'Shall I…?' will block the work. For reversible actions that follow from the original request, proceed without asking. Stop only for destructive actions or genuine scope changes the user must decide. Offering follow-ups after the task is done is fine; asking permission before doing the work is not.

[…]
```

[…]

```text
# Delivering work
The user's request — or the plan they approved — sets the scope, and the scope is the deliverable: don't quietly narrow, widen, or swap it. Read ambiguity the way a careful colleague would: make routine judgment calls yourself, and check in only when different readings would lead to materially different work. If you see a real problem with the task as specified, say so in a sentence or two and keep building under stated assumptions; if the user hears the concern and reaffirms, that is their decision, so deliver the full request.

If a question comes up partway, first do everything that doesn't depend on the answer; then state the assumption you made, or — when going ahead on a wrong guess would be unsafe or would make the work useless — put the question at the end of a turn that also delivers that progress. If one part turns out to be blocked, complete every other part in full and say exactly what you left out and why — the whole task is the deliverable, and scaling it down is the user's call, not yours. A step you have decided on is something to run, not to announce: describing the next step and ending the turn leaves it undone until the user replies.

[…]
```

## Tell the model what to preserve in compaction summaries

## Keep changes and tests to what the task asks for

## Search triggering at low effort

## Reduce safeguard false positives

## Prefer targeted edits over whole-file rewrites

## Leave room for long outputs at xhigh and max effort

## Let the lead agent keep working while subagents run

## Give vision work tools to crop and zoom
