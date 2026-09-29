# 跨模型调用

查漏（core-spec 第 7 步）和独立验证（deliver）都由另一家模型在新 session 里做。同一家模型、相近的上下文容易犯同样的错；新 session 只拿到调用方给的文件，看不到调用方的会话。

## 选哪一家

| 当前 session 的模型 | 调用 |
|---|---|
| Claude（在 Claude Code 里） | Codex：`codex exec` |
| GPT（在 Codex 里） | Claude Code：`claude -p` |

用对方 CLI 当前配置的模型和 effort；用户另有指定时按用户的。MiniMax Code 可以用 `mcode exec --model <provider/model>` 选另一家的模型，用它时在报告里写明实际模型。

## 怎样调用

说明文件（[查漏说明](gap-check.md)、deliver 的验证说明）不复制进命令：命令里给出它的绝对路径和本次输入的路径，由对方自己读取。报告写到文件，调用方读文件。`codex exec` 在 stdin 不是终端时会读取 stdin，所以把 stdin 接到 `/dev/null`，避免它一直等输入。调用可能运行很久，放到后台运行并等它结束，不设短超时。

**只读：查漏。**

```bash
codex exec -C <仓库> -s read-only -o <报告文件> "按 <gap-check.md 的绝对路径> 查漏。spec：<路径>，sha256 <值>；verify：<路径>，sha256 <值>；原始约定：<路径>；仓库：<路径>。" < /dev/null
```

```bash
claude -p "按 <gap-check.md 的绝对路径> 查漏。spec：<路径>，sha256 <值>；verify：<路径>，sha256 <值>；原始约定：<路径>；仓库：<路径>。" --permission-mode dontAsk --allowedTools Read Grep Glob "Bash(git log:*)" "Bash(git show:*)" "Bash(ls:*)" > <报告文件>
```

`dontAsk` 拒绝所有未列出的工具，因此不能写文件。`--allowedTools`、`--add-dir` 会把后面的参数都当成自己的值，所以提示词紧跟在 `-p` 后面。

**需要运行应用：独立验证。** 在检出待验证 head 的专用目录里运行。权限放开到项目验证 Skill 需要的程度：

```bash
codex exec -C <验证检出目录> -s workspace-write -c sandbox_workspace_write.network_access=true --add-dir <应用写入的其他目录> -o <报告文件> "按 <验证说明的绝对路径> 验证。……" < /dev/null
```

```bash
claude -p "按 <验证说明的绝对路径> 验证。……" --permission-mode bypassPermissions --add-dir <应用写入的其他目录> > <报告文件>
```

沙箱仍然挡住应用运行时，Codex 可以改用 `--dangerously-bypass-approvals-and-sandbox`。它和 `bypassPermissions` 一样，只在专用的验证检出目录里使用。

## 调用之后

- 报告文件存在且非空。为空或调用出错时重试一次。
- 独立验证之后，验证检出目录的 `git status --porcelain` 为空、`HEAD` 未变：验证者没有改代码。证据写在检出目录之外。
- 对方 CLI 不可用（未安装、未登录，或重试后仍失败）时，改用当前家族的一个新 subagent，只给同样的输入，并在报告和最终回复里写明“同家族，未满足跨模型要求”。`claude -p` 需要已登录：`claude auth status` 中 `loggedIn` 为 `true`。
