# core-verify 的来源与验证

## 从真实流程中提炼的任务

用户的复杂需求交付流程是：在一个 grill 会话里多轮澄清，依次产出 `spec.md`、`verify.md`、`plan.md`；随后新开会话做交叉评审，只以 spec 为依据校验并修改 verify 和 plan，通过后两份冻结，再进入实现。spec 产出即视为需求冻结，是后续校验的唯一依据。

core-spec 负责 spec，plan-for-agents 负责 plan，中间的验收文档此前没有对应 Skill。过往任务中，多次在交付后才由人发现问题：

- 设置页面显示了新值，实际发出的请求仍用旧值；
- 各模块分别完成，默认启动路径却没有接上新能力；
- 后台任务结束后，本应自动继续的流程没有继续；
- 文本层面的测试通过，真实终端入口没有验证。

共同点是局部测试都通过了，真实入口、组合路径和实际结果没有被验证，并且验收标准是在实现之后才补的。core-verify 要在写 plan 和代码之前，从 spec 得出“怎样算做对、怎样证明”。

## 与现有 Skill 的边界

- `core-spec` 固化已选定的决定与约束，明确不含详细测试清单；`core-verify` 把这些约定转成可判断的要求和场景。没有 spec 或 spec 缺少会改变判定的行为时，core-verify 按 core-spec 生成或更新 spec，不自行补语义。
- `plan-for-agents` 规定怎样实施，其中的验证部分引用 verify 的场景，并把验证工具缺口排进计划；`core-verify` 只规定验什么、怎样判定。
- `review-rules` 用于评审代码和设计；core-verify 的产物由后续交叉评审按 spec 校验。
- core-verify 不写测试代码、不执行验证。执行结果、状态判定和证据留给实现后的验收步骤。

## 规则与依据

按 [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md) 第四节第 1 条，逐条列出 Skill 中的规则、它针对的问题和依据。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| spec 是唯一需求来源，在 plan 和代码之前写 | 从实现或计划反推验收，与实现共享遗漏 | 用户流程决定；Factory 在实现前定义断言并分配到功能切片（[演讲](https://www.youtube.com/watch?v=ow1we5PzK-o&t=394s)，06:34–08:06） |
| 逐条列出默认值、例外、不得发生的事、接受的代价 | 合并条款时丢掉条件，只核对主题 | [core-spec](../skills/core-spec/SKILL.md) 第 4 步；[plan-for-agents](../skills/plan-for-agents/SKILL.md) 第 5 步正向覆盖 |
| 未定行为按 core-spec 更新 spec，不自行补 | 模型用看似合理的默认值补齐语义，验收与 spec 分叉 | grilling 的“决定由用户做”；agent-prompt-rules 二-9 |
| 证明方式分场景、评审或静态检查、已有检查 | 结构性约束被硬写成运行场景，或者没人验 | 按成本与风险分配验证：pstack `orchestrate` 区分便宜的命令验证与昂贵的独立判断（[cursor/plugins pstack](https://github.com/cursor/plugins/tree/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack)） |
| 观察实际参数、持久状态、默认装配和最终副作用 | 只看界面显示或内部调用，漏掉真正的结果 | 上文过往问题；pstack `create-verification-skill` 要求记录动作、结果与副作用 |
| 每个必需场景写一个错误实现 | 断言太松，错误实现照样通过 | SWE-Bench Pro 审计发现测试漏测（[OpenAI](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)）；Anthropic 观察到评估者倾向浅层测试、放过问题（[Harness design](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#running-the-harness)） |
| 断言只约束 spec 约定的内容 | 断言太窄，误拒其他正确实现 | SWE-Bench Pro 审计发现过窄测试（同上；[修订论文](https://arxiv.org/html/2609.08149v2)） |
| 按风险选最少且足够的层次 | 每条要求铺满各层测试，或者全推给昂贵的端到端测试 | agent-prompt-rules 一-2 所引 [Opus 5 过度验证](../skills/agent-prompt-rules/references/sources/anthropic/prompting-claude-opus-5.md#task-scope-and-over-verification) |
| mock 只证明它边界内的行为 | mock 通过被当作真实验证 | 上文过往问题 |
| 定位入口，列出验证工具缺口 | 到验收时才发现无法操作或观察；配置写了验证步骤，脚本却不存在 | pstack `create-verification-skill`（启动、真实驱动、保留证据）；Anthropic 长任务文章要求先准备启动与验证入口（[Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)） |
| 执行状态如实标注 | 占位命令被当成可执行 | 同上 |
| 交付前双向核对，作为完成条件 | 与 core-spec、plan-for-agents 一致；独立校验由交叉评审承担，不另设作者复查轮次 | agent-prompt-rules 一-2、二-5 |

## 有意不放进 Skill 的内容

| 内容 | 原因 |
|---|---|
| 执行状态与聚合规则（通过、失败、受阻、未运行、证据过期） | 属于实现后的验收执行，写 verify 时还没有执行 |
| 每个场景的环境、数据隔离、清理和超时 | 功能尚未实现，多数只能在验收时绑定 |
| JSON 格式 | 人和 agent 读同一份 Markdown；需要机器判定时再定 |
| 独立核查轮次 | 由交叉评审按 spec 校验 verify |
| 性能、权限、并发等专项清单 | spec 有要求时自然进入要求表，Skill 不额外添加没有依据的标准 |

## 验证记录

- 脱敏示例沿用 core-spec 示例中的“执行额度改造”spec，逐项走查了要求拆分、证明方式选择、错误实现和八个检查案例。这是静态案例走查。
- 尚未在真实 spec 上调用本 Skill，也没有用独立 agent 测试触发和产出；需要在第一次真实使用后核对：场景能否覆盖当时实际发生的遗漏、工具缺口是否在实现前被补上、交叉评审是否还要大量补场景。
