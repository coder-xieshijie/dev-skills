# dev-skills

谢世杰自用的开发 Skills，供 Codex 和 Claude Code 使用。把实际开发中反复用到的流程、判断依据和工具操作维护在这里。

## 仓库结构

每个 Skill 独立存放在 `skills/<skill-name>/`，入口是 `SKILL.md`。需要脚本、参考资料或输出素材时，再在该 Skill 内增加 `scripts/`、`references/` 或 `assets/`。

## Skill 列表

| Skill | 用途 | 触发方式 |
|---|---|---|
| [explain-as-fool](skills/explain-as-fool/SKILL.md) | 面向对话题一无所知的人进行解释 | 仅手动触发 |
| [review-rules](skills/review-rules/SKILL.md) | 为代码和设计评审、问题复核及修复方案提供判断准则 | 仅手动触发 |
| [design-for-review](skills/design-for-review/SKILL.md) | 将需求和设计材料整理成可独立阅读的技术评审文档 | 仅手动触发 |
| [core-spec](skills/core-spec/SKILL.md) | 讨论结束后，将多轮澄清与多份材料收敛为单份核心决策 spec，先突出重点，再完整展开约束 | 自动匹配或手动触发 |
| [mr-for-human](skills/mr-for-human/SKILL.md) | 把 MR/PR 整理成面向人的金字塔式阅读指南：核心结论、功能与抽象设计、执行逻辑与伪代码、底层运行约束、代码定位 | 自动匹配或手动触发 |

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

### review-rules

将复用、必要改造、复杂度、扩展性和责任边界等准则应用于当前评审，也用它们检查 Reviewer 提出的修改建议。可以独立使用，或与现有 `code-review`、设计评审流程一起使用；评审范围、执行方式和是否修复由当前任务决定。

调用示例：

- Codex：`$review-rules review 这个 MR：<链接>`
- Claude Code：`/review-rules review 这个 MR：<链接>`
- 配合评审流程：`使用 code-review 评审这个 MR，并应用 review-rules。`
- 复核结论：`按 review-rules 重新检查刚才的 findings，判断哪些问题成立、哪些修复方案可以更简单。`

沿用上面的 Codex 和 Claude Code 手动触发设置。

### design-for-review

将已有需求、设计讨论和技术材料整理成面向人评审的技术方案。读者只读这一篇，就能理解问题、完整流程、改动与复用范围，以及关键取舍。默认交付中文 Markdown，按需使用 Mermaid，并沿用已经确认的需求、设计决定和文档大纲。

写作要求已完整包含 `explain-as-fool` 的原文规则：面向没有相关知识的读者解释，并直接、准确地表达。

调用示例：

- Codex：`$design-for-review 根据当前需求和已确认的设计讨论，整理一份可独立阅读的技术评审文档。`
- Claude Code：`/design-for-review 根据当前需求和已确认的设计讨论，整理一份可独立阅读的技术评审文档。`

沿用上面的 Codex 和 Claude Code 手动触发设置。

### core-spec

用于多轮讨论、grill 和需求澄清结束后的定稿。产出一份《核心决策与约束》：开头通常选 3–5 个最重要的决定，后文完整保留已确认的规则、边界和取舍，供 agent 在 plan、implement、review 阶段使用，也供人核对和汇报。

交付前对照原始约定与最终确认检查遗漏、无依据新增、冲突和歧义；只补影响判断的内容。材料或关键决定有缺口时交付待确认稿，并简述检查范围与结果。

调用示例：

- Codex：`$core-spec 将当前讨论和相关文档收敛成一份 spec，保存到 docs/feature-spec.md。`
- Claude Code：`/core-spec 根据这个 session 和需求、ADR 文件，只保留最终核心决策与约束。`

`core-spec` 固化“已经选定什么、必须满足什么”；`design-for-review` 展开技术方案如何运转。前者不自动开始新一轮 grill、产品实现或远端发布。

目录与脱敏示例已创建，保持默认自动发现。尚未注册新的客户端软链接。来源分析与验证边界见[设计与验证记录](docs/core-spec-design.md)。

### mr-for-human

面向“AI 写了很多代码，我想知道重点看哪里”的阅读任务。金字塔原则贯穿全文，只把最重要的事项交给读者决策；按目录核对每个文件的具体变化及其与目标的关系；沿主流程解释边界、失败降级与恢复。默认交付简短指南，复杂逻辑、源码证据和完整文件清单按需下钻。

调用示例：

- Codex：`$mr-for-human 带我读懂这个 MR 的关键设计，并给出从主流程到源码的阅读路线：<链接>`
- Claude Code：`/mr-for-human 解释 base..head 的变化，先看核心决定，再下钻到伪代码和证据。`

新 Skill 保持默认自动发现；单纯找 bug、编写未实现的设计或润色文本不属于自动触发范围。

设计依据与历史取舍见[综述](docs/mr-for-human-design.md)，失败窗口与正常降级的写法见[教学示例](skills/mr-for-human/references/worked-example.md)，检查结果见[验证记录](docs/mr-for-human-validation.md)。目录与配套资料已创建，保持默认自动发现；当前修订在本工作树，客户端同步与真实 MR 阅读效果需另行验证。

## 添加 Skill

1. 选一个真实、重复出现的开发任务，说明它应在什么请求下触发，以及完成后交付什么。
2. 在 `skills/<skill-name>/SKILL.md` 中填写 `name`、`description` 和执行指引；目录名使用小写字母、数字和连字符，并与 `name` 一致。
3. 用一个真实请求检查触发条件、流程和结果；涉及脚本时执行脚本验证，再提交到 Git。

`description` 用来描述能力和触发场景。正文记录会改变 Agent 判断的项目知识、操作步骤和验证依据；较长且仅在部分场景下需要的内容放入按需引用的资料中。

## 本地使用

本仓库是这些 Skill 的唯一维护源。选择需要启用的 Skill，链接到共享入口；兼容 Claude Code 的 Skill 再通过 CC 入口引用同一份源文件。

共享入口使用 `~/.agents/skills/<skill-name>`，指向本仓库的 `skills/<skill-name>`；CC 入口使用 `~/.claude/skills/<skill-name>`，指向前面的共享入口。注册前检查同名入口的来源，保留已有安装；仅依赖 Codex 能力的 Skill 只注册共享入口。

添加并验证具体 Skill 后再按需启用，并在客户端确认可以找到和读取它。已有 Skill 内容更新后，入口继续读取仓库中的同一份文件；本地修改完成后通过 Git 提交、推送同步。
