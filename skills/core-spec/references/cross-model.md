# Cross-model calls

These tasks are done by a model from another family in a new session: the gap check in core-spec step 7; in deliver, the up-front review at the start, consultation on decisions during delivery, the code review before independent verification, and independent verification. Models from the same family with similar context tend to make the same mistakes; a new session gets only the files the caller gives it and cannot see the caller's conversation.

## Which family to call

Go by the family of the current session's model, not by the client: MCode runs whichever model you configure in it.

| Model of the current session | Call |
|---|---|
| Claude (in Claude Code, or in MCode with a Claude model) | Codex: `codex exec` |
| GPT (in Codex, or in MCode with a GPT model) | Claude Code: `claude -p` |
| Another family (for example a MiniMax model in MCode) | Either: `codex exec` or `claude -p` |
| Any of the above | Any other CLI that runs a model from another family and can take a prompt and write its reply to a file |

Use the model and effort currently configured in the other CLI; when the user specifies otherwise, follow the user. The report states the actual model. When the other CLI cannot be used (not installed, not logged in, or still failing after a retry), switch to another CLI of a different family; when none can be used, do not substitute the same family, and handle it as the place that makes the call says. `claude -p` requires being logged in: `loggedIn` is `true` in `claude auth status`.

## How to call

Do not copy the brief ([gap check brief](gap-check.md), deliver's verifier brief) into the command: the command gives its absolute path and the paths of this call's inputs, and the other side reads them itself. The reply is written to a file, and the caller reads the file. `codex exec` reads stdin when stdin is not a terminal, so connect stdin to `/dev/null`. A call may run for a long time; run it in the background and come back on the notification when it ends.

To continue talking or working in the same session, record the session id (`codex exec` prints it at the start of its output; the result of `claude -p --output-format json` contains `session_id`), then:

| CLI | Resume |
|---|---|
| Codex | In the original directory, run `codex exec resume <session id> "<next turn>"`; it has no `-s`, so set the sandbox with `-c sandbox_mode=<read-only or danger-full-access>`; `-o` works as usual |
| Claude Code | `claude -p --resume <session id> "<next turn>"`, with the same permission flags as the first call |
| Other CLIs | Their own option for continuing a session by id |

### Read-only: gap check, up-front review, decisions during delivery, code review

```bash
codex exec -C <repository> -s read-only -o <reply file> "Run a gap check per <absolute path of gap-check.md>. spec: <path>, sha256 <value>; verify: <path>, sha256 <value>; clause list: <path>; source agreements: <path>; repository: <path>." < /dev/null
```

```bash
claude -p "Run a gap check per <absolute path of gap-check.md>. spec: <path>, sha256 <value>; verify: <path>, sha256 <value>; clause list: <path>; source agreements: <path>; repository: <path>." --permission-mode dontAsk --allowedTools Read Grep Glob "Bash(git log:*)" "Bash(git show:*)" "Bash(ls:*)" > <reply file>
```

For the check limited to changed clauses in core-spec step 7, add the IDs of the changed clauses, or the spec diff, to the same command.

`dontAsk` denies every tool that is not listed, so it cannot write files. `--allowedTools` and `--add-dir` take all the arguments after them as their own values, so the prompt goes right after `-p`.

For decisions during delivery, use the same commands with the prompt replaced by: the question to decide, the relevant spec text, the possible approaches and the evidence for each, asking it to give a choice and the reason. Do not write the caller's leaning.

The up-front review and the code review also use read-only commands; the prompt gives the absolute path of deliver's verifier brief, the parts to do this time and the paths of the input files. The code review runs in a directory that has the head under review checked out.

### Running the app: independent verification

The verifier must start and operate the application, so every CLI runs without a sandbox: Codex with `-s danger-full-access`, Claude with `--permission-mode bypassPermissions`, another CLI with its equivalent. Run in a dedicated directory that has the head under verification checked out, and add the evidence directory with `--add-dir`; for a CLI without such a flag, write the absolute path of the evidence directory in the verification input. Use 60 minutes as one cycle, wrapping the command in `perl -e 'alarm 3600; exec @ARGV'` (macOS has no `timeout`):

```bash
perl -e 'alarm 3600; exec @ARGV' codex exec -C <verification checkout directory> -s danger-full-access --add-dir <evidence directory> -o <report file> "Verify per <absolute path of verifier-brief.md>. Verification input: <path>." < /dev/null
```

When time is up, the process is killed and `-o` does not write the report. Look at the output and at `results.md` in the evidence directory: if it is not done, resume the same session (for example `codex exec resume <session id> -c sandbox_mode=danger-full-access -o <report file> "Continue verifying the scenarios that have no result yet"`), wrapped in another 60 minutes; if it failed, decide the next step from the cause. When it is killed, the application it started may still be running; when you will not resume, the caller stops it.

After verification, `git status --porcelain` in the checkout directory is empty and `HEAD` has not changed: the verifier did not change the code.

## After the call

- The reply has the required content: a gap check report has issue entries, or says "No issues found" and lists the scope checked; a verification report has the three lines `head:`, `verifier-model:` and `verdict:` and the results table. When something is missing, the reply is truncated, or the call errors, retry once.
- To spot-check a call, find the other side's session log by session id; Codex keeps them under `$CODEX_HOME/sessions/`, with the session id in the file name.
