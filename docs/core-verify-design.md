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

### 吸收 Lauren Tan 的 pstack 验证实践

Lauren Tan 公开的 pstack（固定到 `ecc249f`）把“让 agent 自己证明改动可用”做成了一组 Skill。下列规则据此补入，引用的都是该仓库的原文；她自述的 PR 数量不作为依据。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| verify.md 只写本次需求验什么、怎样判定；怎样启动和驱动应用引用项目的验证能力 | 每份验收各写一套驱动步骤，不同会话写法不一，功能改了也没人维护 | [create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md) 把控制命令和功能地图放在项目里长期维护；[功能地图示例](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/references/feature-map-example/README.md) |
| 工具缺口补成项目可复用的验证能力 | 为一次验收写临时脚本，下次需求重来 | [06-verify-and-ship](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/06-verify-and-ship.md)：有了验证 Skill 后，“在应用里验证”成为任何 agent 都能执行的步骤 |
| 过一遍每个功能的入口和状态，找 spec 缺口 | 只验一个方便的入口；加载、空、错误等状态的行为没人定 | 功能地图要求列出全部用户入口，“只驱动一个方便入口的证明不完整”；[control-adapter](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md) 的状态清单 |
| 覆盖每个入口，一个入口的结果不代表其他入口 | 从 CLI 验过就当界面也通过 | 功能地图示例：“Do not report a skipped entry point as verified through a different path” |
| 走真实用户路径；内部 setter、测试专用接口只用于安排前提 | 用内部调用制造出结果，真实入口其实没接上 | create-verification-skill 的证明标准；control-adapter：安排前提不等于可以注入要验证的现象 |
| 同时观察动作和状态变化；写入后从另一个只读视图读回 | 只看最终画面或“保存成功”提示 | create-verification-skill 的证明标准；功能地图示例：mutation proof 需要只读的第二视图 |
| 预期取 spec 的字面值；“不得出现”配正向观察；空实现不能通过 | 断言什么都没测到，空实现也能通过 | [principle-test-behavior-not-implementation](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-test-behavior-not-implementation/SKILL.md)：导入的函数全部返回 undefined 时仍能通过的测试，改写或删除 |
| 用基线对照：新行为在改动前应失败，保持的行为前后都通过 | “错误实现”只停在想象里，无法执行 | [tdd](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/tdd/SKILL.md) 要求修复前先确认测试因预期原因失败；[multi-phase-plan](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md) 与 [autopilot-full](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autopilot-full.md) 的回归对照：同一场景在主干和改动上各跑一次，主干没有该功能时判定新增行为和用户最终等待的状态 |
| 按改动类型选证明形式；性能先测基线并写明失败数值 | 所有改动都用同一种测试；性能要求没有可判定的阈值 | 06-verify-and-ship 的“Match the check to the change”；multi-phase-plan 的双侧性能门槛 |
| mock 放在生产中本来就隔离外部系统的边界上；spec 点名的平台在该平台上验 | mock 通过被当作真实验证；只在开发机上证明平台支持 | create-verification-skill 的证明标准；Lauren 在访谈中描述让 agent 在目标 Linux 虚拟机上验证（[YouTube 14:23–16:50](https://www.youtube.com/watch?v=xZ5TEaleUdg&t=863s)，自动字幕） |

没有照搬的部分：每个 PR 十条实时验证通道、swarm 多 agent 裁决、Graphite 和特定模型配置。这些属于执行与合入阶段，也是 pstack 自身的重型模板，不适合放进产出 verify.md 的步骤。

## 有意不放进 Skill 的内容

| 内容 | 原因 |
|---|---|
| 执行状态与聚合规则（通过、失败、受阻、未运行、证据过期） | 属于实现后的验收执行，写 verify 时还没有执行 |
| 每个场景的环境、数据隔离、清理和超时 | 功能尚未实现，多数只能在验收时绑定 |
| JSON 格式 | 人和 agent 读同一份 Markdown；需要机器判定时再定 |
| 独立核查轮次 | 由交叉评审按 spec 校验 verify |
| 性能、权限、并发等专项清单 | spec 有要求时自然进入要求表，Skill 不额外添加没有依据的标准 |

## 验证记录

- 脱敏示例沿用 core-spec 示例中的“执行额度改造”spec，逐项走查了要求拆分、证明方式选择、错误实现、基线预期、入口覆盖和十三个检查案例。这是静态案例走查。
- 建议按 pstack [PR #419](https://github.com/cursor/plugins/pull/419) 的做法评估本 Skill：固定一组带已知遗漏的历史 spec 作为种子缺陷，比较产出的 verify.md 能拦住多少遗漏，同时统计无依据的场景（噪声）；一次只改一处规则。
- 尚未在真实 spec 上调用本 Skill，也没有用独立 agent 测试触发和产出；需要在第一次真实使用后核对：场景能否覆盖当时实际发生的遗漏、工具缺口是否在实现前被补上、交叉评审是否还要大量补场景。
