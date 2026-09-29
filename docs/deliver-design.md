# deliver 的来源与验证

## 从真实流程中提炼的任务

用户 2026-09-29 确认的交付流程：

- 用户只在开头的定义阶段做决定，用 core-spec 定下 spec.md 和 verify.md，并由另一家模型查漏。
- 用户确认一次之后全自动，交付物是一个 MR/PR。
- 交付中每个里程碑都在应用里跑它涉及的场景，效果优先于速度。

此前的做法是 Agent Lord 的 plan-to-implement：按 plan 的阶段换 session，用上一个 session 的最后一条消息交接，结束后再由 reviewer 和 acceptance tester 检查。过往任务里反复出现两类问题：

- 局部测试都通过，真实入口或默认启动路径却没有接上；
- 主会话遇到错误后停住，没有人发现，闲置了约 55 小时。

deliver 把“从冻结的 spec、verify 到可合入的 MR”交给一个连续运行的 owner：自己写计划、自己验证，由另一家模型独立验证，用机械检查守住冻结和证据版本。

## 与现有 Skill 的边界

- `core-spec` 属于定义阶段。deliver 只读它的产物，不修改。
- `plan-for-agents` 是通用计划 Skill。deliver 的 plan 由 owner 按 ExecPlan 格式自己写，不经人或评审确认。
- `review-rules` 在独立验证者审代码时使用；`mr-for-human` 用于写 MR 的阅读路线；`explain-as-fool` 规定给用户的汇报怎样表达。
- deliver 不依赖编排器。会话中断后的检测、多个需求并行，留到试跑之后再决定是否由 Agent Lord 承担。

## 规则与依据

按 [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md) 第四节第 1 条，逐条列出规则、它针对的问题和依据。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| 一个 owner 从读 spec 负责到 MR 可合入，连续运行，不按阶段换 session | 每交接一次丢一部分信息；阶段之间没人对整体结果负责 | OpenAI：一个 agent 从复现到开 PR、回应评审、修构建，只在需要判断时找人（[Increasing levels of autonomy](../skills/agent-prompt-rules/references/sources/openai/harness-engineering.md#increasing-levels-of-autonomy)）；Anthropic 在新模型上去掉 sprint 和 context reset（[Removing the sprint construct](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#removing-the-sprint-construct)）；pstack 每个 PR 一个 owner 负责到合入（[autopilot-full](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autopilot-full.md)）；agent-prompt-rules 二-2、二-11 |
| 只在三种情况停下，其余自己决定并写进决策日志 | 人成为瓶颈，交付停在可以继续的地方 | ExecPlan：执行时不问下一步，自行消歧（[原文](https://cookbook.openai.com/articles/codex_exec_plans)）；pstack [principle-never-block-on-the-human](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-never-block-on-the-human/SKILL.md)；agent-prompt-rules 一-5、二-9 |
| plan.md 按 ExecPlan 写成活文档，只读它和 git 历史就能接续 | 中断后的新 session 从头摸索，或者只能依靠上一条消息 | ExecPlan；OpenAI 长任务实践的 durable project memory（[原文](../skills/agent-prompt-rules/references/sources/openai/run-long-horizon-tasks-with-codex.md#the-key-idea-durable-project-memory)）；Anthropic 每次开工先读进度和 git 日志（[Getting up to speed](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#getting-up-to-speed)） |
| 开工和接续时先跑冒烟集 | 带着上次留下的坏状态继续开发 | Anthropic [Getting up to speed](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#getting-up-to-speed) |
| 每个里程碑在应用里跑通对应的场景，失败先修 | 后面的工作建在坏的基础上；失败集中到最后，难以定位是哪一步引入的 | OpenAI 每个里程碑跑验证命令，失败先修（[Verification at every milestone](../skills/agent-prompt-rules/references/sources/openai/run-long-horizon-tasks-with-codex.md#verification-at-every-milestone)）；Anthropic 一次做一个功能（[Incremental progress](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#incremental-progress)）；pstack [principle-sequence-verifiable-units](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-sequence-verifiable-units/SKILL.md)；用户“效果优先”的决定 |
| 验证工具缺口排在最前面，补成项目可复用的验证能力 | 到验收时才发现没法操作或观察 | pstack [create-verification-skill](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/create-verification-skill/SKILL.md)；OpenAI 让应用对 agent 可观察（[Increasing application legibility](../skills/agent-prompt-rules/references/sources/openai/harness-engineering.md#increasing-application-legibility)） |
| 独立验证：另一家模型、新 session，只按 spec 和 verify 判断，不以 MR 描述为准；验证者只报告 | 作者评价自己的产出倾向于放行 | Anthropic [Why naive implementations fall short](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#why-naive-implementations-fall-short)；Fable 5：新上下文的验证 subagent 优于自我批评（[原文](../skills/agent-prompt-rules/references/sources/anthropic/prompting-claude-fable-5.md#recommended-scaffolding-changes)）；pstack：审 diff 时不信 PR 描述（autopilot-full），验证者用与作者不同家族的模型（[orchestrate](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md)）；agent-prompt-rules 二-3、二-7 |
| 验证说明固定写在 `references/verifier-brief.md`，逐项写明查什么、怎样算失败 | 作者临时写的 prompt 缩小检查范围；只写“检查一下”会看几眼就放行 | agent-prompt-rules 二-4 |
| 修复加复验最多 3 轮；同一个 CI 失败修 3 次仍不过就停下 | 循环不收敛，或者为了交差伪造通过 | agent-prompt-rules 二-8；Opus 5.5 [Unattended agentic runs](../skills/agent-prompt-rules/references/sources/anthropic/prompting-claude-opus-5-5.md#unattended-agentic-runs) |
| 机械检查：spec、verify 的 sha256 未变，验证报告的 head 等于 MR head，每个场景都有结果且没有 FAIL | 靠修改验收让结果变绿；旧版本的验证结论被当成最终结果 | agent-prompt-rules 二-10；pstack：一次 rebase 就可能让结论悄悄失效，不能用旧 SHA 上的通过代替（[shipping](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/shipping.md)） |
| 复验时由验证者判断哪些场景受影响，沿用上次结果的写明理由 | 每次小改都全量重跑，成本过高；或由作者自己宣称“不受影响” | pstack shipping 的 patch-id 规则，这里简化为由验证者按 diff 判断 |
| 评审意见要求改变 spec 规定的行为时停下 | 评审者绕过用户改了需求 | 用户决定 spec 是需求的唯一依据 |
| MR 列出自主决定和未验证项 | 用户事后看不到 agent 替他做了哪些决定、哪些没验到 | ExecPlan 的决策日志；pstack 的 decisions trail（autopilot-full） |
| 复盘写仓库缺口 | 同样的问题下次再来 | OpenAI：卡住时问“缺了什么能力”，补进仓库（[Harness engineering](../skills/agent-prompt-rules/references/sources/openai/harness-engineering.md#we-started-with-an-empty-git-repository)）；ExecPlan 的 Outcomes & Retrospective |

### 中间与最终验证、调用记录和冻结绑定（2026-09-29）

用户确认：里程碑中间的结果用 subagent 验证，subagent 继承主 agent 的模型和推理强度；最终结果用另一家模型在单独的 session 中验证；试跑期间由 owner 发起，另一家不可用时停下。同时纳入 agent-prompt-rules 审查中涉及交接和机械检查的几条。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| 每个里程碑的场景跑通后，由新上下文的 subagent 按固定的 `references/milestone-check.md` 检查证据和 diff；只报告，owner 修改，每个里程碑最多两轮 | 做到后面才发现前面坏了；作者自查倾向于放行 | Anthropic：长任务中按间隔 "verifying your work with subagents against the specification"，新上下文的验证 subagent 优于自我批评（[Prompting Claude Fable 5](../skills/agent-prompt-rules/references/sources/anthropic/prompting-claude-fable-5.md)）；完成前让 subagent 在新上下文里审 diff（[Add an adversarial review step](../skills/agent-prompt-rules/references/sources/anthropic/claude-code-best-practices.md#add-an-adversarial-review-step)）；agent-prompt-rules 二-3、二-4、二-8；用户的决定 |
| subagent 继承 owner 的模型和推理强度：Claude Code 用 general-purpose，Codex 用默认 agent，不传模型和推理强度参数，不用 Explore 这类自带配置的类型；它报告模型 ID，与 owner 不同就作废 | 中间检查悄悄换成了较弱的模型或较低的推理强度 | 用户的决定；Codex 文档：不指定时 subagent 继承父 agent 的模型和推理强度（[Codex subagents](../skills/agent-prompt-rules/references/sources/openai/codex-subagents.md)）；实测见验证记录 |
| 最终验证由 owner 通过 `scripts/run-verifier.mjs` 启动另一家模型；脚本保存验证者的最终回复作为报告，写下调用记录（CLI、模型家族、模型、session id、head、报告 sha256） | owner 跳过调用、自己写一份格式正确的报告，检查照样通过 | agent-prompt-rules 二-10（每次必须发生的动作交给程序核对）；pstack `orchestrate`：验证昂贵、需要判断或影响面大时，验证者用不同模型家族 |
| `check-delivery.mjs` 核对调用记录：有效、head 一致、报告在验证之后没被改过、验证者与 plan.md 登记的 owner 家族不同 | 同上；报告事后被改；同家族验证冒充跨模型 | agent-prompt-rules 二-7、二-10 |
| 另一家模型都不可用时，deliver 不降级为同家族，按“停下”的第 2 种情况处理；只有用户明确放宽时才用同家族，并记在 plan.md | 交付阶段没人再看，降级后宣称可合入，违背用户“用不同模型审”的决定 | 用户的决定；agent-prompt-rules 审查第 17 条 |
| 验证输入写明允许验证者使用的环境（独立的实例、profile、端口、数据目录、测试数据和清理范围）；验证者只在范围内操作，被挡住时报“环境受阻”，不自行绕过沙箱 | 验证者与 owner 共用实例，或自行放开权限；Agent-Archon 在 detached 检出目录中会退回共享 profile 并退出已安装的应用 | agent-prompt-rules 审查第 18 条；Agent-Archon `scripts/dev-electron-profile.mjs`、`dev-electron-latest.mjs` 的行为 |
| 报告必须有 `head:` 行、`验证模型：` 行和场景表，缺项或截断重试一次 | 报告缺项或被截断仍被当作通过 | agent-prompt-rules 审查第 24 条 |
| `/deliver` 的输入包括用户确认的两个 sha256；开工时原样写进 plan.md，并运行 `check-delivery.mjs --frozen-only` | 冻结哈希由 owner 开工时自己算，确认之后文件又被改，没人发现 | agent-prompt-rules 审查第 7 条；二-10 |

## 有意不放进 Skill 的内容

| 内容 | 原因 |
|---|---|
| 具体实现步骤、测试数量 | 留给 owner，agent-prompt-rules 一-6 |
| 通用的“完成前再复查一遍” | 验证已经是完成条件，agent-prompt-rules 一-2 |
| 编排器或看管层 | 会话内能完成主路径；是否需要存活检测、并行，由试跑记录决定 |
| pstack 的多通道 swarm 验证、root 定期巡查 | 重型模板；这里一个独立验证者加机械检查，试跑后再按记录增减 |
| rebase、patch-id 的具体做法 | 各平台不同；结果要求是“验证报告对应 MR 的最终 head”，由机械检查守住 |
| 由会话外的一方（Agent Lord）派发最终验证 | 用户 2026-09-29 决定：试跑期间由 owner 发起，靠调用记录和机械检查防止跳过；无人值守或多个需求并行时，再改由 Agent Lord 派发，对应 pstack 的 root |

## 验证记录

- `scripts/check-delivery.mjs` 在临时 git 仓库上跑了 9 个用例，结果都符合预期：通过（默认 head 和显式 `--head`）、head 不一致、有 FAIL、缺少场景行、spec 被改动、plan.md 缺冻结行，这些返回 1；缺参数、`--head` 不是 40 位，这些返回 2。场景 ID 取自脱敏示例的 verify.md（S01–S05）。
- 跨模型调用：`codex exec -s read-only` 能读文件、运行 git，写文件被拒绝；按查漏说明的实际运行见 [core-spec 的验证记录](core-spec-design.md#verify-部分的验证记录)。需要运行应用的 `workspace-write` 加网络的调用、`claude -p` 路径都还没有测试，后者在本次会话的 shell 里显示未登录。
- SKILL.md 和两份 references 的相对链接都能解析。
- 尚未在真实需求上使用。计划先拿一个有已知漏洞的历史需求校准 core-spec 的验收部分，再用 1–2 个新需求完整走一遍 deliver。每个需求记录：定义之后用户介入的次数和原因、独立验证首轮 FAIL 的场景数、MR 之后用户自己发现的问题、总时长与费用、会话是否中断。

### 2026-09-29：中间与最终验证、调用记录

- 独立审查：Codex（`gpt-6-astra`，high，只读）按固定说明审查本次改动，报出 5 个问题，都成立，已修正：
  1. 调用记录为 `null` 时，检查脚本会跳过全部记录检查；
  2. 把 provider 当作模型家族，经网关调用的同家族模型能冒充另一家。改为按模型 ID 判断家族，放在共用的 `scripts/model-family.mjs`，判断不出就不放行；检查脚本也重新计算，不采信记录中的家族字段；
  3. 被截断的报告，或"验证模型"一行为空，也能通过。改为逐个场景核对完整的四列行，要求有"冒烟集与回归范围""代码问题"两节，模型值必须在同一行；
  4. 调用记录缺模型也能通过；
  5. CLI 返回了错误文本时，退出码被归为 1 而不是 3。
- `run-verifier.mjs`：用假的 codex、claude、mcode 在临时 git 仓库上跑 12 个用例，结果都符合预期：
  - 三种 CLI 正常返回：通过，并记下 provider、家族、模型和 session id；
  - 报告被截断、"验证模型"一行为空、claude 输出中没有模型、模型 ID 认不出家族（如 `qw-mid-5`）：返回 1；
  - 调用失败，包括 claude 返回 `is_error`：返回 3；
  - 验证者改了检出目录：返回 1；
  - CLI 未安装，或 claude 未登录：返回 3。
- `check-delivery.mjs`：15 个用例都符合预期：
  - `--frozen-only` 通过，以及 spec 改动后失败；
  - 跨家族的记录通过（mcode、经网关的 GPT 对 anthropic 的 owner）；
  - 同家族失败，包括经网关的 GPT 对 openai 的 owner；
  - 报告事后被改、记录为 `null`、记录的家族被改、记录缺模型、报告被截断、head 不一致、缺 owner 行：失败；
  - 有用户放宽记录时，同家族只提示；
  - 参数错误返回 2。
- 真实调用：在一个只有 `./hello.sh` 和一个场景的临时仓库里，`run-verifier.mjs --cli codex` 调用 codex-cli 0.158.0-alpha.2.1（`gpt-6-astra`，high），用时约 1 分钟。验证者按验证说明实际运行了命令，证据写进证据目录，检出目录未改动，报告格式正确；调用记录中的 session id 能在 `$CODEX_HOME/sessions/` 的会话日志里找到；随后 `check-delivery.mjs` 通过。修正 5 个问题后重跑，结果见 PR 描述。
- subagent 继承：在 Claude Code（`claude-opus-5-5[1m]`）中分别开 general-purpose 和 Explore 类型的 subagent，让它们报告系统提示词中的模型和推理强度。两者的模型都与主 agent 相同；general-purpose 的提示词里有推理强度值，Explore 的没有，所以规定用 general-purpose。主 agent 在这个环境里看不到自己的推理强度值，因此 SKILL.md 规定：模型 ID 必须核对，推理强度在 owner 能看到时再核对。
- `mcode exec --output-format json` 的返回里有 `sessionId`、`model.providerId`、`model.modelId`，默认模型为 MiniMax-M3.1。
- 未验证：`claude -p` 的真实调用（本机 shell 未登录）；用 mcode 做一次真实验证；里程碑检查在真实交付中的效果。
