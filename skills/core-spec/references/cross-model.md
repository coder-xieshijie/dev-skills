# 跨模型调用

三处由另一家模型在新 session 里做：core-spec 第 7 步的查漏，deliver 交付中的决定咨询，deliver 的独立验证。同一家模型、相近的上下文容易犯同样的错；新 session 只拿到调用方给的文件，看不到调用方的会话。

## 选哪一家

| 当前 session 的模型 | 调用 |
|---|---|
| Claude（在 Claude Code 里） | Codex：`codex exec` |
| GPT（在 Codex 里） | Claude Code：`claude -p` |
| 以上任一 | MiniMax Code：`mcode exec`，默认是 MiniMax 自家模型；也可以用 `--model <provider/model>` 选别家的模型 |

用对方 CLI 当前配置的模型和 effort；用户另有指定时按用户的。报告里写明实际模型。对方 CLI 用不了（未安装、未登录，或重试后仍失败）时，换另一个不同家族的 CLI；都用不了时不用同家族代替，按调用处的说明处理。`claude -p` 需要已登录：`claude auth status` 中 `loggedIn` 为 `true`。

## 怎样调用

说明文件（[查漏说明](gap-check.md)、deliver 的验证说明）不复制进命令：命令里给出它的绝对路径和本次输入的路径，由对方自己读取。回复写到文件，调用方读文件。`codex exec` 在 stdin 不是终端时会读取 stdin，所以把 stdin 接到 `/dev/null`。调用可能运行很久，放到后台运行，靠结束时的通知回来。

要在同一个会话里接着谈或接着做，记下 session id（`codex exec` 打印在输出开头；`claude -p --output-format json` 的结果里有 `session_id`），然后：

| CLI | 续接 |
|---|---|
| Codex | 在原来的目录里运行 `codex exec resume <session id> "<下一轮>"`；它没有 `-s`，沙箱用 `-c sandbox_mode=<read-only 或 danger-full-access>`，`-o` 照常可用 |
| Claude Code | `claude -p --resume <session id> "<下一轮>"`，权限参数与第一次相同 |
| MiniMax Code | `mcode exec --session <session id> "<下一轮>"` |

### 只读：查漏、交付中的决定

```bash
codex exec -C <仓库> -s read-only -o <回复文件> "按 <gap-check.md 的绝对路径> 查漏。spec：<路径>，sha256 <值>；verify：<路径>，sha256 <值>；原始约定：<路径>；仓库：<路径>。" < /dev/null
```

```bash
claude -p "按 <gap-check.md 的绝对路径> 查漏。spec：<路径>，sha256 <值>；verify：<路径>，sha256 <值>；原始约定：<路径>；仓库：<路径>。" --permission-mode dontAsk --allowedTools Read Grep Glob "Bash(git log:*)" "Bash(git show:*)" "Bash(ls:*)" > <回复文件>
```

`dontAsk` 拒绝所有未列出的工具，因此不能写文件。`--allowedTools`、`--add-dir` 会把后面的参数都当成自己的值，所以提示词紧跟在 `-p` 后面。

交付中的决定用同样的命令，提示词换成：要决定的问题、相关的 spec 原文、可选做法、各自的证据，请它给出选择和理由。不写调用方的倾向。

### 运行应用：独立验证

验证者要启动和操作应用，三个 CLI 都不带沙箱：Codex 用 `-s danger-full-access`，Claude 用 `--permission-mode bypassPermissions`，MiniMax Code 用 `--permission full`。在检出待验证 head 的专用目录里运行（`mcode` 用 `--cwd <验证检出目录>`），证据目录用 `--add-dir` 加入；`mcode` 没有这个参数，证据目录的绝对路径写在验证输入里。以 60 分钟为一个周期，用 `perl -e 'alarm 3600; exec @ARGV'` 包住命令（macOS 没有 `timeout`）：

```bash
perl -e 'alarm 3600; exec @ARGV' codex exec -C <验证检出目录> -s danger-full-access --add-dir <证据目录> -o <报告文件> "按 <verifier-brief.md 的绝对路径> 验证。验证输入：<路径>。" < /dev/null
```

到点进程被停掉，`-o` 不会写出报告。看输出和证据目录里的 `results.md`：没做完，就续接同一个会话（例如 `codex exec resume <session id> -c sandbox_mode=danger-full-access -o <报告文件> "接着验还没有结果的场景"`），再包一层 60 分钟；失败了，看原因决定下一步。被停掉时它启动的应用可能还在运行；不再续接时，由调用方停掉。

验证结束后，检出目录的 `git status --porcelain` 为空、`HEAD` 未变：验证者没有改代码。

## 调用之后

- 回复有必需的内容：查漏报告要有问题条目，或写明“未发现问题”并列出检查范围；验证报告要有 `head:`、`验证模型：`、`verdict:` 三行和结果表。缺项、被截断或调用出错时重试一次。
- 要抽查某次调用，按 session id 找对方的会话日志；Codex 在 `$CODEX_HOME/sessions/` 下，文件名含 session id。
