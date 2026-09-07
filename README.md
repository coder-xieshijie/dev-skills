# dev-skills

谢世杰自用的开发 Skills，供 Codex 和 Claude Code 使用。把实际开发中反复用到的流程、判断依据和工具操作维护在这里。

## 仓库结构

每个 Skill 独立存放在 `skills/<skill-name>/`，入口是 `SKILL.md`。需要脚本、参考资料或输出素材时，再在该 Skill 内增加 `scripts/`、`references/` 或 `assets/`。

## Skill 列表

| Skill | 用途 | 触发方式 |
|---|---|---|
| [explain-as-fool](skills/explain-as-fool/SKILL.md) | 面向对话题一无所知的人进行解释 | 仅手动触发 |

### explain-as-fool

提示词：

```text
Explain like I'm someone who knows nothing about this topic
```

调用示例：

- Codex：`$explain-as-fool 解释一下什么是线程池`
- Claude Code：`/explain-as-fool 解释一下什么是线程池`

Codex 通过 `agents/openai.yaml` 中的 `policy.allow_implicit_invocation: false` 限制自动调用；Claude Code 通过 `SKILL.md` 中的 `disable-model-invocation: true` 保留手动入口。普通解释请求不会自动触发这个 Skill。

`disable-model-invocation` 是 [Claude Code 支持的扩展字段](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill)。当前 Codex 附带的通用 `quick_validate.py` 会把它报告为未知字段；维护时保留这个手动开关，并分别检查两个客户端的原生加载结果。

## 添加 Skill

1. 选一个真实、重复出现的开发任务，说明它应在什么请求下触发，以及完成后交付什么。
2. 在 `skills/<skill-name>/SKILL.md` 中填写 `name`、`description` 和执行指引；目录名使用小写字母、数字和连字符，并与 `name` 一致。
3. 用一个真实请求检查触发条件、流程和结果；涉及脚本时执行脚本验证，再提交到 Git。

`description` 用来描述能力和触发场景。正文记录会改变 Agent 判断的项目知识、操作步骤和验证依据；较长且仅在部分场景下需要的内容放入按需引用的资料中。

## 本地使用

本仓库是这些 Skill 的唯一维护源。选择需要启用的 Skill，链接到共享入口；兼容 Claude Code 的 Skill 再通过 CC 入口引用同一份源文件。

共享入口使用 `~/.agents/skills/<skill-name>`，指向本仓库的 `skills/<skill-name>`；CC 入口使用 `~/.claude/skills/<skill-name>`，指向前面的共享入口。注册前检查同名入口的来源，保留已有安装；仅依赖 Codex 能力的 Skill 只注册共享入口。

添加并验证具体 Skill 后再按需启用，并在客户端确认可以找到和读取它。已有 Skill 内容更新后，入口继续读取仓库中的同一份文件；本地修改完成后通过 Git 提交、推送同步。
