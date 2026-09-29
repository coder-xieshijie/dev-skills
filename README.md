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
| [core-spec](skills/core-spec/SKILL.md) | 讨论结束后，把多轮澄清与多份材料收敛为核心决策 spec，再依据 spec 写验收文档 verify：以用户可观察的端到端场景为单位，写明每项约定怎样算做对、用什么证据证明；另一家模型在新 session 中查漏后，用户一次确认，两份冻结。只要 spec 时只产出 spec | 仅手动触发 |
| [deliver](skills/deliver/SKILL.md) | 依据冻结的 spec 和 verify，由一个 owner session 连续完成实现、逐里程碑在应用里验证、另一家模型的独立验证、MR/PR 与 CI，直到可合入 | 仅手动触发 |
| [plan-for-agents](skills/plan-for-agents/SKILL.md) | 创建、修订或检查供 agent 执行的完整计划，覆盖方案、步骤、边界、产物与验收 | 仅手动触发 |
| [mr-for-human](skills/mr-for-human/SKILL.md) | 把 MR/PR 整理成面向人的金字塔式阅读指南：核心结论、功能与抽象设计、执行逻辑与伪代码、底层运行约束、代码定位 | 仅手动触发 |
| [agent-prompt-rules](skills/agent-prompt-rules/SKILL.md) | 依据 Anthropic 与 OpenAI 官方原文，设计和修改写给 agent 的 prompt、多 agent pipeline 与 SKILL.md | 仅手动触发 |
| [recon-to-contract](skills/recon-to-contract/SKILL.md) | 将多个外部参照物的对标调研收敛为有证据、有决策、有验收的可执行契约 | 仅手动触发 |

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

写作前直接读取同仓库 `explain-as-fool/SKILL.md` 的正文规则，统一维护表达要求，不再复制原文。使用完整仓库或保留相邻的 `explain-as-fool` 目录；两个 Skill 的手动触发设置保持不变。

调用示例：

- Codex：`$design-for-review 根据当前需求和已确认的设计讨论，整理一份可独立阅读的技术评审文档。`
- Claude Code：`/design-for-review 根据当前需求和已确认的设计讨论，整理一份可独立阅读的技术评审文档。`

沿用上面的 Codex 和 Claude Code 手动触发设置。

### core-spec

用于多轮讨论、grill 和需求澄清结束后的定稿。默认产出两份文件，一起查漏、一起确认、一起冻结：

- `spec.md`《核心决策与约束》：开头通常选 3–5 个最重要的决定，后文完整保留已确认的规则、边界和取舍，供 agent 在 plan、implement、review 阶段使用，也供人核对和汇报。交付前对照原始约定与最终确认检查遗漏、无依据新增、冲突和歧义。用于自动交付时另外写明目的、非目标、硬约束和交付与授权（目标仓库与分支、能否推送并开 MR、能否合入）；非目标和授权只由用户决定，讨论中没有定下时作为问题提出。
- `verify.md`《验收要求》：以 spec 为唯一需求来源，写冒烟集、要求表（每条约定对应的证明方式：场景、机械检查或已有检查）、场景、回归范围、验证工具缺口和覆盖盲区。场景是用户在一个入口上完成的一次完整操作及其结果，默认从真实入口驱动，由实现 agent 自己运行；每个场景写字面检查点、在改动前代码上的基线预期和会被拒绝的错误实现。启动和驱动应用引用项目已有的验证能力（控制命令、功能地图），缺口补成可复用的能力。

写 verify 之前，先按每个功能的用户入口和状态找 spec 没有定下的行为，会改变判定的回写 spec。写完后，用与写文档的模型不同家族的 CLI（在 Claude Code 里用 `codex exec`，在 Codex 里用 `claude -p`）开一个新 session 查漏：它只读 spec、verify 和仓库，按固定的[查漏说明](skills/core-spec/references/gap-check.md)报告问题；verify 的问题直接改，spec 的问题转成给用户的问题，最多两轮。最终回复给出两份文件的 sha256，请用户一次确认，确认后两份冻结。

只要 spec（用于方案设计、design-for-review、plan-for-agents 或汇报）时，写完并核对 spec 即交付，不写 verify、不查漏。已有定稿 spec、只需要验收时，从找 spec 缺口开始，不重新收敛 spec。

调用示例：

- Codex：`$core-spec 将当前讨论收敛成 spec 并写出验收，保存到 docs/<需求>/。`
- Claude Code：`/core-spec 根据这个 session 和需求、ADR 文件写 spec.md 和 verify.md。`
- 只要 spec：`/core-spec 只保留最终核心决策与约束，保存到 docs/feature-spec.md，不写验收。`
- 已有 spec：`/core-spec 依据 docs/feature/spec.md 写 verify.md。`

`core-spec` 固化“已经选定什么、必须满足什么、怎样算做对”；`design-for-review` 展开技术方案如何运转。本 Skill 不实现产品、不编写测试代码、不执行验证，也不发布到远端。2026-09-29 起合并了原 `core-verify`，原因见设计记录。

沿用上面的 Codex 和 Claude Code 手动触发设置。来源分析与验证边界见[设计与验证记录](docs/core-spec-design.md)。

### deliver

用户确认并冻结 spec.md 和 verify.md 之后使用。一个 owner session 从读 spec 连续做到 MR/PR 可合入，中途不找人：

- 按 OpenAI ExecPlan 的格式写 `plan.md`，边做边更新进度、意外与发现、决策日志和复盘；中断后新 session 只读 plan.md 和 git 历史就能接着做。
- 逐个里程碑实现，每个里程碑在运行中的应用上跑通它对应的 verify 场景，失败先修；全部完成后自己跑一遍全部场景。
- 请另一家模型在新 session 中按固定的验证说明验证最终 head，最多 3 轮修复与复验。
- 开 MR/PR，处理 CI 和评审意见，直到可合入；spec 授权合入时合入。
- 合入前运行 `scripts/check-delivery.mjs`：spec、verify 与开工时的 sha256 一致，验证报告对应 MR 的最终 head，每个场景都有结果且没有 FAIL。

只在三种情况下停下找用户：spec 自相矛盾或缺少会改变判定的决定；缺少 agent 拿不到的权限、凭据或环境；授权以外的不可逆操作。

调用示例：

- Codex：`$deliver 按 .harness/docs/specs/<需求>/ 下的 spec.md 和 verify.md 交付。`（可在 `/goal` 中使用，让同一个对话持续到完成）
- Claude Code：`/deliver 按 .harness/docs/specs/<需求>/ 下的 spec.md 和 verify.md 交付。`

沿用上面的 Codex 和 Claude Code 手动触发设置；安装时保留相邻的 `core-spec`、`mr-for-human` 和 `explain-as-fool` 目录。来源与验证边界见[设计与验证记录](docs/deliver-design.md)。

### plan-for-agents

将需求和已确认决策落实为可由 agent 独立执行的计划，适用于开发、调研、创作、数据处理等任务。核心内容通用，专业细节按需展开；沿用用户决策，并核对每项要求到执行步骤、产物和验收证据的对应关系。

修订已有 plan 时保留有效细节，说明实质删除或替换的依据；摘要不能替代完整正文。编写计划本身不授权实施、发布或启动其他 agent。

调用示例：

- Codex：`$plan-for-agents 根据当前需求和已确认的 spec，编写一份可独立执行的完整 plan。`
- Claude Code：`/plan-for-agents 按刚才的裁决修订现有 plan，保留有效细节并核对覆盖。`
- 完整性检查：`按 plan-for-agents 检查这份调研计划，只报告缺口与依据，不修改文件。`

`core-spec` 固化要求与决定，`plan-for-agents` 将其展开为执行计划，`design-for-review` 服务于人的方案评审。各 Skill 可独立使用，无须串行调用。

目录与入口已创建，沿用上面的 Codex 和 Claude Code 手动触发设置。实际执行效果仍需在使用中验证。

### mr-for-human

面向“AI 写了很多代码，我想知道重点看哪里”的阅读任务。金字塔原则贯穿全文，只把最重要的事项交给读者决策；按目录核对每个文件的具体变化及其与目标的关系；沿主流程解释边界、失败降级与恢复。默认交付简短指南，复杂逻辑、源码证据和完整文件清单按需下钻。

调用示例：

- Codex：`$mr-for-human 带我读懂这个 MR 的关键设计，并给出从主流程到源码的阅读路线：<链接>`
- Claude Code：`/mr-for-human 解释 base..head 的变化，先看核心决定，再下钻到伪代码和证据。`

沿用上面的 Codex 和 Claude Code 手动触发设置。

设计依据与历史取舍见[综述](docs/mr-for-human-design.md)，失败窗口与正常降级的写法见[教学示例](skills/mr-for-human/references/worked-example.md)，检查结果见[验证记录](docs/mr-for-human-validation.md)。目录与配套资料已创建；真实 MR 阅读效果需在使用中验证。

### agent-prompt-rules

编写、修改或审查三类内容时逐条对照：调度方写给执行端（子 agent、外部 agent）的 prompt，多 agent pipeline，以及 `SKILL.md` 和它的 `description`。每条规则都链接到 Skill 内存档的 Anthropic、OpenAI 官方原文章节，改动按 Skill 第四节的流程记录依据。

调用示例：

- Codex：`$agent-prompt-rules 审一下这个 pipeline 给 reviewer 的 prompt，列出不符合的条目和依据。`
- Claude Code：`/agent-prompt-rules 按规范修改这个 SKILL.md，每条改动对应到规范条目。`

厂商发布新模型或新的提示词指南时，按[原文清单](skills/agent-prompt-rules/references/sources/README.md#更新原文)的步骤更新原文和规则；CI 会检查规则指向原文的每个锚点是否仍然存在。[agent-lord](https://github.com/coder-xieshijie/agent-lord) 修改 Skill 和 pipeline 时使用这套规则。

沿用上面的 Codex 和 Claude Code 手动触发设置。

### recon-to-contract

用于至少两个外部参照物的横向对比，并将结果交给后续执行者落实。以差集表、命题账本和接缝笔记保留事实与关系，结合已确认的决策，产出包含目标、改动范围、约束和验收标准的契约；纯探索、缺陷定位和普通增量开发不适用。

调用示例：

- Codex：`$recon-to-contract 根据两个参考实现、当前代码和已确认的取舍，整理迁移方案的可执行契约。`
- Claude Code：`/recon-to-contract 将这份多方对标调研收敛为后续实现可以直接使用的契约。`

从已有本地 Skill 原样迁入，保留正文及 Claude Code 手动触发设置，并补充 Codex 手动触发配置。目录和导航已建立；本次核对内容一致性、结构及客户端发现，未重新执行完整调研工作流。

## 添加 Skill

1. 选一个真实、重复出现的开发任务，说明它应在什么请求下触发，以及完成后交付什么。
2. 在 `skills/<skill-name>/SKILL.md` 中填写 `name`、`description` 和执行指引；目录名使用小写字母、数字和连字符，并与 `name` 一致。
3. 用一个真实请求检查触发条件、流程和结果；涉及脚本时执行脚本验证，再提交到 Git。

`description` 用来描述能力和触发场景。正文记录会改变 Agent 判断的项目知识、操作步骤和验证依据；较长且仅在部分场景下需要的内容放入按需引用的资料中。

## 本地使用

本仓库是这些 Skill 的唯一维护源。当前九个 Skill 均设为仅手动触发，Codex 使用 `$skill-name`，Claude Code 使用 `/skill-name`。安装时链接到共享入口，再通过 CC 入口引用同一份源文件；入口注册不改变手动触发策略。

共享入口使用 `~/.agents/skills/<skill-name>`，指向本仓库的 `skills/<skill-name>`；CC 入口使用 `~/.claude/skills/<skill-name>`，指向前面的共享入口。注册前检查同名入口的来源，保留已有安装；仅依赖 Codex 能力的 Skill 只注册共享入口。

添加并验证具体 Skill 后再按需启用，并在客户端确认可以找到和读取它。已有 Skill 内容更新后，入口继续读取仓库中的同一份文件；本地修改完成后通过 Git 提交、推送同步。
