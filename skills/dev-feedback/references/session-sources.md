# Session sources

[sessions.mjs](../scripts/sessions.mjs) reads these stores without writing to them. Each needs only Node.js 24 or later (the Codex app and MCode stores are SQLite, read with `node:sqlite`).

| Client | Where | What is read |
|---|---|---|
| Claude Code | `~/.claude/projects/<project>/<session>.jsonl` | The main chain; subagent files, sidechain entries, meta and compact-summary entries are skipped. Answers to AskUserQuestion and plan approvals are kept as answers |
| Codex app | `~/.codex/thread_history_<n>.sqlite`, with thread metadata in `state_<n>.sqlite` | User messages of top-level threads; subagent threads and threads imported from other agents are skipped |
| Codex CLI | `sessions/` and `archived_sessions/` under `~/.codex` and any other Codex home such as `~/.codex-cli` | `user_message` events; `codex exec` runs and subagents are skipped. A requirement's `codex exec` runs (gap check, reviews, verification) are found from their reply files in the requirement directory |
| MCode | `~/.minimax/v2/sqlite/runtime-state.sqlite` | User messages of top-level conversation sessions; scheduled, background and continuation turns are skipped |

A store that is missing is skipped. A client keeping its sessions elsewhere needs a reader added to the script.

## Extract

```bash
node <this Skill's directory>/scripts/sessions.mjs extract --from 2026-10-12T00:00+08:00 --to 2026-10-26T00:00+08:00 [--grep '!8233'] [--session <id>] --out <file.jsonl>
```

The window is half-open: `--from` is included, `--to` is not. `--grep` keeps whole sessions in which any user message, the agent text before it or the working directory contains the text; repeat it for an MR number, a branch and a directory. `--session` adds sessions by id. Without either, every session in the window is kept.

Each line has `platform`, `sid`, `ts`, `kind`, `text` (the user's own words, with the context the client attached removed), `prev` (the end of the agent message just before, so an answer can be told from a new request), `cwd` and `title`. `kind` is one of:

- `typed`: written by the user;
- `answer`: a reply to the agent's structured question or plan;
- `slash`: a slash command;
- `interrupt`: the user stopped the turn;
- `automation`: machine text that arrives as a user message (task notifications, heartbeats, hook output);
- `programmatic`: a run started by a program, such as an SDK call.

The extract contains the user's words; keep it out of any repository and delete it when the run ends.

## Stats

```bash
node <this Skill's directory>/scripts/sessions.mjs stats --in <file.jsonl>
```

`by_kind` counts every row of the extract as it is; the other numbers count only `typed`, `answer`, `slash` and `interrupt`, with fork copies removed. A fork copies earlier messages into the new session with their original time, so a message with the same time and text is counted once.

| Number | What it measures |
|---|---|
| `messages`, `sessions` | Messages and sessions after removing fork copies |
| `fork_copies_dropped` | How many copies were removed |
| `sessions_messaged_in_past_30min_median` | At each message, how many sessions the user had sent a message to in the past 30 minutes; the median. It says how many threads the user is keeping in their head, not how many are running |
| `switch_rate_within_30min` | Of consecutive messages less than 30 minutes apart, the share sent to a different session |
| `short_reply_share` | Typed messages and answers of at most `--short` characters (default 8): mostly "continue", "ok", "commit", which usually means the agent stopped for a go-ahead |
| `interrupts` | Turns the user stopped |

These are proxies. Read a sample of the messages behind a number before drawing a conclusion from it.
