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
| 全程不停，只在不可逆操作前停；其余自己决定并写进决定清单（2026-10-01 起；此前为三种、后为四种停下的情况，见[全程不停，只查结果](#全程不停只查结果2026-10-01)） | 人成为瓶颈，交付停在可以继续的地方 | ExecPlan：执行时不问下一步，自行消歧（[原文](https://cookbook.openai.com/articles/codex_exec_plans)）；pstack [principle-never-block-on-the-human](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-never-block-on-the-human/SKILL.md)；agent-prompt-rules 一-5、二-9 |
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
| 验证输入写明允许验证者使用的环境（独立的实例、profile、端口、数据目录、测试数据和清理范围）；验证者只在范围内操作，被挡住时报“环境受阻”，不自行绕过沙箱 | 验证者与 owner 共用实例，或自行放开权限；业务仓库的桌面应用在 detached 检出目录中会退回共享 profile 并退出已安装的应用 | agent-prompt-rules 审查第 18 条；业务仓库 `scripts/dev-electron-profile.mjs`、`dev-electron-latest.mjs` 的行为 |
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
- `run-verifier.mjs`：用假的 codex、claude 和第三个 CLI 在临时 git 仓库上跑 12 个用例，结果都符合预期：
  - 三种 CLI 正常返回：通过，并记下 provider、家族、模型和 session id；
  - 报告被截断、"验证模型"一行为空、claude 输出中没有模型、模型 ID 认不出家族（如 `qw-mid-5`）：返回 1；
  - 调用失败，包括 claude 返回 `is_error`：返回 3；
  - 验证者改了检出目录：返回 1；
  - CLI 未安装，或 claude 未登录：返回 3。
- `check-delivery.mjs`：15 个用例都符合预期：
  - `--frozen-only` 通过，以及 spec 改动后失败；
  - 跨家族的记录通过（第三个 CLI、经网关的 GPT 对 anthropic 的 owner）；
  - 同家族失败，包括经网关的 GPT 对 openai 的 owner；
  - 报告事后被改、记录为 `null`、记录的家族被改、记录缺模型、报告被截断、head 不一致、缺 owner 行：失败；
  - 有用户放宽记录时，同家族只提示；
  - 参数错误返回 2。
- 真实调用：在一个只有 `./hello.sh` 和一个场景的临时仓库里，`run-verifier.mjs --cli codex` 调用 codex-cli 0.158.0-alpha.2.1（`gpt-6-astra`，high），用时约 1 分钟。验证者按验证说明实际运行了命令，证据写进证据目录，检出目录未改动，报告格式正确；调用记录中的 session id 能在 `$CODEX_HOME/sessions/` 的会话日志里找到；随后 `check-delivery.mjs` 通过。修正 5 个问题后重跑，结果见 PR 描述。
- subagent 继承：在 Claude Code（`claude-opus-5-5[1m]`）中分别开 general-purpose 和 Explore 类型的 subagent，让它们报告系统提示词中的模型和推理强度。两者的模型都与主 agent 相同；general-purpose 的提示词里有推理强度值，Explore 的没有，所以规定用 general-purpose。主 agent 在这个环境里看不到自己的推理强度值，因此 SKILL.md 规定：模型 ID 必须核对，推理强度在 owner 能看到时再核对。
- 第三个 CLI 的 `--output-format json` 返回里有 `sessionId`、`model.providerId`、`model.modelId`。
- 未验证：`claude -p` 的真实调用（本机 shell 未登录）；用第三个 CLI 做一次真实验证；里程碑检查在真实交付中的效果。

## 按 agent-prompt-rules 修订（2026-09-29）

这一节接着 core-spec 的修订（见 [core-spec 设计记录](core-spec-design.md)第四节，在 dev-skills#16 中加入），依据同一份审查：
1. Codex `gpt-5.6-sol` 独立审查；
2. Codex `gpt-6-astra` 用同一份说明重新审查；
3. `gpt-6-astra` 逐条复核前两轮，助手按规范二-7 逐条裁决。

用户确认了两点：
- 把"卡住"作为第四种停下的情况；
- 按审查的 P0、P1 修改意见提 PR。

审查里 deliver 相关的项，已有一部分在上一次提交中完成：跨模型不降级、确认哈希、验证者的环境边界、里程碑 subagent 检查、调用记录与报告有效性。本节是其余各项。

| 改动 | 规范条目 | 原因 | 下次试跑观察什么 |
|---|---|---|---|
| "卡住"作为第四种停下：同一个失败（场景、里程碑检查、独立验证或 CI），一种修法连续 3 次无效就换思路，换了思路后再连续 3 次仍没有进展，就停下。它替代原来的"修复加复验最多 3 轮""同一个 CI 失败修 3 次" | 二-8；用户决定 | 原来的两个上限在"三种停下"之外，另成两个停止条件；Opus 5.5 原文的"两三次"指自动续做，用意是让真正卡住的运行结束、交给人看 | 因卡住停下的次数，以及停下时是否确实无法推进 |
| 门禁补全：报告加 `verdict:`、`smoke-regression:`、`code-issues:` 三行；要求表中用机械检查或已有检查证明的要求（R 编号）也要有结果行；UNVERIFIED 只有说明以“覆盖盲区”开头、且编号列在 verify“覆盖盲区”标题下的列表项或表格行里，才放行；总体结论须与明细、冒烟结果和代码问题数一致 | 二-4、二-10 | 原门禁只看 S 场景是否 FAIL：代码问题（如默认启动路径没接上）、环境原因的 UNVERIFIED、非场景要求都拦不住 | 门禁拦下、而验证者判为 PASS 的次数 |
| 报告解析抽成 `scripts/report-format.mjs`，`run-verifier.mjs` 和 `check-delivery.mjs` 共用 | 三-5 | 两个脚本原来各写一份，改格式时要同步两处 | — |
| 启动独立验证的条件改为"除覆盖盲区外全部通过"；verify 的完成条件同步修改 | — | 原写法要求全部通过，又允许盲区 UNVERIFIED，存在盲区时进不了独立验证 | — |
| 复验：只沿用仍然有效的 PASS；上次 FAIL 的、因环境原因 UNVERIFIED 的，一律实际重跑 | 二-4 | 环境修好后没有代码 diff，旧的 UNVERIFIED 会被沿用 | — |
| 验证输入加"场景 ID → 实际命令、启动配置和前提"对应表，取自 plan.md 的"验证与验收"一节，只用来执行 | 一-3、二-3 | 实际命令写在 plan.md，验证说明却规定 plan.md 的说法不能作为依据，验证者拿不到命令 | 验证者因找不到命令而 UNVERIFIED 的场景数 |
| 冒烟：状态不明、环境变了或相关代码变了才跑；与本次改动无关的基线失败，记下后继续做不受影响的部分 | 一-2、一-5；GPT-6 [Testing and verification](../skills/agent-prompt-rules/references/sources/openai/using-gpt-6.md#testing-and-verification) | 原写法每次开工都跑，不通过就先修，无关的失败也会挡住工作 | 开工冒烟被跳过后出现的"坏状态带入"次数 |
| 删掉"全部里程碑完成后，自己把全部场景和回归范围跑一遍" | 二-5 | 与完成条件 1（最终 head 上的证据）和独立验证重复 | 独立验证首轮 FAIL 中，本该由 owner 全量自验发现的数量 |
| 验证能力缺口：依赖某项能力的场景执行前先补上；优先复用已有能力，只补最小缺口，按仓库规则保留成可复用的入口。不再规定"排在最前面" | 一-6 | 原写法规定了顺序，还可能把交付扩大成验证基础设施建设 | — |
| 开头改为"常规进展不停下来等确认；运行环境要求进度更新时，简短更新后继续" | 一-4 | 原写法"中途不向用户汇报进度"过强 | — |
| "交付中不修改 spec、verify"只留在"停下"一节 | 三-5 | 原来写在两处 | — |
| 平台 CLI 压缩成一句；CI 只修本次改动引入、或阻塞既定交付的问题；删掉"每个提交可以单独看懂" | 三-3 | 模型默认会做 | — |
| 自主决定只记影响后续工作、或值得用户事后看的；plan 的"现状与上下文"只写本任务相关的路径、协作关系和不明显的约定，已有文档给链接 | 三-3、二-11 | 原写法要求记每个决定，并假设读者对仓库一无所知 | plan.md 的长度，以及中断后接续是否还要重新探索 |
| 输入加"代码评审准则：同仓库的 review-rules"；验证说明写明产品行为按 spec 判断，代码质量按 review-rules 判断，review-rules 不新增产品要求 | 一-3、二-4 | 原来要求传 review-rules 路径，却没说从哪来、起什么作用 | — |
| 验证说明中的证据规则：要求本身是展示时，界面就是直接证据 | 一-4 | 与 core-spec 的 verify 规则同步 | — |
| description 缩成一句 | 三-1 | 原来写了流程 | — |

验证：
- 首轮 `check-delivery.mjs` 在临时 git 仓库上跑了 9 个用例，都符合预期：
  - 全部 PASS、覆盖盲区 UNVERIFIED、R 行 PASS，返回 0；
  - 缺 `verdict:`、总体结论为 FAIL（代码问题）、环境原因 UNVERIFIED、缺 R 行、结论为 PASS 却有 FAIL、head 不一致、验证者与 owner 同家族，返回 1；
  - `--frozen-only` 返回 0。
- `run-verifier.mjs` 用一个假的 `codex`（打印 `model:`、`session id:`，并把报告写到 `-o`）做了端到端测试：
  - 完整报告返回 0，写出有效调用记录，随后 `check-delivery.mjs` 返回 0；
  - 缺 R 行、缺 `verdict:` 的报告返回 1，调用记录标为无效，门禁也拦下。
- 修改后由 Codex（`gpt-6-astra`，high，只读）在新 session 审查 diff，报出 5 条，都已修正：
  - 只检查“代码问题”“冒烟集与回归范围”两节是否存在，结论为 PASS 时代码问题或冒烟失败拦不住 → 改为可解析的 `smoke-regression:`、`code-issues:` 两行，并与总体结论核对；
  - 盲区豁免只看编号，环境受阻的整场景 UNVERIFIED 也会放行 → 说明须以“覆盖盲区”开头；
  - R 编号带反引号、证明方式含转义竖线时要求会被漏掉 → 按单元格解析；读不出要求表时报错；
  - 盲区一节里任何提到的编号都算豁免 → 只读列表项和表格行，core-spec 的 verify 写法同步要求盲区写成条目（dev-skills#16）；
  - 里程碑和里程碑检查没有盲区例外，存在盲区时里程碑完不成 → 同步加上例外。
- 修正后 `check-delivery.mjs` 共 16 个用例，都符合预期：新增结论为 PASS 但代码问题为 1、冒烟 FAIL、盲区场景写成环境受阻、带反引号和转义竖线的 R 编号、段落里提到的编号被当作盲区、verify 提到 R 编号却读不出表、报告被截断；`run-verifier.mjs` 的假 CLI 测试 3 个用例都符合预期。
- 三个脚本通过 `node --check`；全仓库相对链接检查通过。

尚未验证：真实 CLI 下的独立验证、"卡住"规则在真实交付中的表现。

## 从交接的 Draft MR 开工（2026-09-30）

core-spec 新增第 9 步，把冻结的 spec.md、verify.md 提交到需求分支并开 Draft MR/PR，原因和依据见 [core-spec 的来源与验证](core-spec-design.md#五随需求分支交接2026-09-30)。deliver 相应修改：

- 输入改为交接信息：MR/PR 链接、需求分支、交接提交、两份文件在仓库内的路径，以及两个 sha256。只拿到本地路径时，照旧在读得到文件的 worktree 开工，是否推送、开 MR 按 spec 的交付与授权。
- owner 在自己的 worktree 里检出需求分支，新建的 worktree 也可以；从交接提交往后只有 owner 写入。
- 交接的 Draft MR 就是交付的 MR，完成条件 1–3 满足后更新描述、取消 Draft；“MR 可合入”增加“已取消 Draft”。
- 停下前提交需求分支，授权允许时推送；spec 重新确认后，core-spec 按原来的交接方式交回，owner 拉取或读取后把新的 sha256 写进冻结输入。
- plan.md 默认仍与 spec 同目录；用户指定了位置时放在那里，冻结输入可以写绝对路径。计划格式的冻结输入增加一行“交接”，记 MR 链接、需求分支和交接提交，供中断后接手的 session 找到 MR；`check-delivery.mjs` 不读这一行。
- 复验的触发从“开 MR 后代码有改动”改为“独立验证通过后代码有改动”，因为 MR 从开工起就存在。

验证：`check-delivery.mjs` 未修改。在临时目录构造 plan.md，放在 spec 目录以外，跑 `--frozen-only` 三个用例，都符合预期：
- 冻结输入写绝对路径，另有“交接”一行：返回 0；
- 冻结后改动 verify.md：返回 1，报出变动的文件和前后哈希；
- 冻结输入写相对 plan.md 的 `../` 路径：返回 0。

尚未验证：owner 在新建的 worktree 里检出需求分支、接手已有 Draft MR 并取消 Draft 的完整过程。

## 只凭 MR 链接开工（2026-09-30）

core-spec 把用户确认的 sha256 记进交接提交，原因见 [core-spec 的来源与验证](core-spec-design.md#六交接提交记下确认的-sha256deliver-只收-mr-链接2026-09-30)。deliver 相应修改：

- 输入只要交接的 MR/PR 链接。需求分支取它的源分支；交接提交是这个 MR 自己的提交里，提交信息以 `Frozen-Spec`、`Frozen-Verify` 两个 trailer 结尾的最新一个。
- 新增 `scripts/read-handoff.mjs`，在检出需求分支的 worktree 里运行，`--base` 取 MR 目标分支的远端引用：
  - 只看 `<base>..HEAD` 的第一父提交，从目标分支继承或从别处合并进来的交接记录都不算；
  - 用 git 自己的 trailer 解析读取两行，提交正文里举例的同名行不算；只有其中一行、或同一行出现两次，报错；
  - 核对该提交里两份文件的 sha256 等于记录值，之后没有提交改过这两份文件，这两份文件没有未提交、已暂存或冲突的改动；
  - 用户给了 `--expect-spec`、`--expect-verify` 时以用户的值为准，不一致就失败；
  - 通过后输出 plan.md 冻结输入的 spec、verify、交接三行，路径是反引号括起来的绝对路径，交接一行带提交的作者和时间。
- 找不到交接提交时（例如交接早于这条规则），向用户要两个 sha256，手写冻结输入；只交本地路径时照旧由用户给出。
- 重新确认后，拉取需求分支重新运行 `read-handoff.mjs`，更新冻结输入。
- `check-delivery.mjs` 的冻结输入解析改为接受反引号括起来、含空格的路径；其余不变。

修改后由 Codex（`gpt-6-astra`，reasoning high，只读）在新 session 审查 diff，报出 6 条（1 条 P1），都已修正：

- P1：`git log HEAD` 搜全部祖先历史，新需求没有交接记录时会选中目标分支上别的需求的交接 → 限定为 `<base>..HEAD` 的第一父提交，`--base` 必填；
- 正则扫描整个提交正文，代码块里举例的两行也会命中 → 改用 git 的 trailer 解析，并拒绝重复或不完整的记录；
- 路径含空格时，读取端的 `\S+` 和 `check-delivery.mjs` 的解析都失败 → 读取端取 ` sha256=` 之前的全部内容，输出加反引号，`check-delivery.mjs` 接受反引号路径；
- `freeze.mjs --trailers` 没有比较两份文件所在的仓库 → 不在同一仓库时拒绝；
- 只核对工作区文件，漏掉已暂存的改动 → 用 `git status` 检查暂存区、工作区和冲突状态；
- 没有交接记录的旧 MR，要到用户的 sha256 后怎样继续没有写清 → deliver 与计划格式写明手写冻结输入的做法。

验证：`read-handoff.mjs`、`freeze.mjs --trailers` 与 `check-delivery.mjs` 的衔接，在临时 git 仓库实跑，工作目录和文件路径都含空格，16 个用例都符合预期：

- 目标分支上已有需求 A 的交接、需求分支还没有交接：返回 1，不选 A；
- 提交正文里举例的两行：不算交接，返回 1；
- 需求 B 用 `freeze.mjs --trailers` 生成两行做交接（与其他 trailer 同在末尾区块）：返回 0，输出反引号括起来的路径；
- 把输出写进 plan.md，`check-delivery.mjs --frozen-only` 返回 0；
- 目标分支之后有需求 C 的交接并合并进需求分支：仍选 B，返回 0；
- 改动已暂存、工作区恢复原样：返回 1，报出暂存的改动；
- `--expect-*` 与记录值一致：返回 0；不一致：返回 1；
- 交接之后另有提交改了 spec：返回 1，列出该提交；
- 重新确认后追加新的交接提交：返回 0，取新的一个；
- 同一个 trailer 出现两次、只有 `Frozen-Spec`：返回 1；
- 缺少 `--base`、`--base` 不存在：返回 2；
- `freeze.mjs --trailers` 的两份文件在不同仓库：返回 2；
- `check-delivery.mjs` 的冻结输入写普通相对路径：仍返回 0；
- 在业务仓库真实的需求 worktree（交接早于本规则）上，以仓库准备阶段的验证能力 MR 的分支为 `--base` 运行：返回 1，提示向用户要 sha256。

此前第一版的用例（配套检查失败时不输出两行、文件不在 git 仓库时返回 2 且不输出 OK 等）同样通过。三个脚本通过 `node --check`；全仓库链接检查通过。

尚未验证：deliver 在真实需求中只凭 MR 链接开工的完整过程。

## 里程碑检查记录与报告沿用（2026-09-30）

来源：首个真实需求的复盘，见 super-auto `research/goal-final-delivery-trace-2026-09-30/README.md` 第 5.3、5.4 节与第 6 节的 B1–B3、C4。用户确认后改。

### 试跑中的问题

- owner 提交 M1 后没做里程碑检查就开始 M2，两个检查到 M2 和文档都写完才一起开。M1 的问题（生产装配里的钩子顺序、证据不在最终措辞的版本上、集成测试缺两类用例）晚了约 30 分钟才发现，三个入口全部重跑。推理记录里 16:15–16:51 没有提到这一步；它不在 owner 自己写的 plan.md 里，也没有脚本核对。
- 独立验证第一轮报出一个问题后，修复只改了 UI 去重，复验者仍重跑三个入口、重读全部代码。验证说明原来让复验者“自己判断哪些场景受影响”，沿用与否取决于验证者的推理。

### 改动

- 新增 `scripts/record-milestone-check.mjs`：把里程碑检查的报告存为 `evidence/milestone-<编号>-r<轮次>.md`，头部写检查的 commit 范围（完整 SHA）、保存时间和报告的 sha256；拒绝不在 plan.md 里的编号、反向或空的范围、不在当前 HEAD 上的范围、空报告。
- `check-delivery.mjs` 新增第 5 项检查和 `--milestones-only`（`scripts/milestones.mjs`）：
  - plan.md“里程碑”一节写了场景 ID 的里程碑，都要有检查记录；没有场景的（例如文档）不要求。
  - 从交接提交（没有时取基线）到被检查的最后一个提交，需求分支的提交都在某条记录的范围里。
  - 每条记录早于它范围之后的第一个提交（按 author 时间，精确到秒；rebase 和 cherry-pick 不改变它）。晚了无法事后补救，用户同意时在冻结输入加 `- milestone-order: waived <原话与日期>` 放行。
  - 每个里程碑的第一条记录只覆盖这个里程碑自己的提交，两个里程碑不能共用一次事后的整段检查；之后几轮可以跨里程碑覆盖修复。
  - rebase 之后，记录里的旧 SHA 先按 `git patch-id --stable` 找候选，再逐字比较改动内容（只忽略 blob 编号和行号），一致才算同一个提交。对不上的记录（提交被 amend、或早于新的交接）保留为历史、不计入，由之后的一轮替代。
  - 交接或基线提交不是当前 head 的祖先时（分支 rebase 过或重新交接），报错并提示用 `read-handoff.mjs` 更新冻结输入，不把上游新增的提交算进需求分支。
  - 代码仓库取 `--repo`，否则取 spec.md 所在的 git 仓库。
- 报告沿用（`scripts/report-reuse.mjs`）：验证报告对应的 head 是 MR head 的祖先，并且之后改的文件都是测试、文档或 lint 配置时，报告对 MR head 仍然有效，逐个列出这些文件；否则按原规则要求对 MR head 重新验证。只在明确的位置才算测试或文档：`*.test.*`、`*.spec.*`、`__tests__/`，仓库根或包根（有 package.json 等清单的目录）下的 `test/`、`tests/`、`e2e/`、`docs/`，顶层点目录里的 `docs/`（如 `.harness/docs/`），以及仓库根的 Markdown；冻结的 spec.md、verify.md 改了一律重新验证；重命名拆成删除和新增，移进测试目录的产品文件照样算产品改动。
- 验证说明的“复验”一节改为：复验和首次验证做同样的事，上次报告只用来确定要重点确认的问题；沿用与否由脚本判断。
- deliver：检查在后台进行时可以接着做下一个里程碑，下一个里程碑的第一个提交要等检查结果处理完；每一轮报告用 `record-milestone-check.mjs` 存下。“失败先修，再进入下一个里程碑”限定为场景和质量命令的失败，避免与前一句冲突。复验改为完整验证，只改测试、文档、lint 配置时由 `check-delivery.mjs` 沿用。
- 计划格式：里程碑以编号开头并写场景 ID；冻结输入可有 `milestone-order` 放行行。里程碑一节不加勾选项：OpenAI ExecPlan 规定勾选清单只放在进度一节（“Checklists are permitted only in the `Progress` section”），用户确认的 B1 由脚本核对代替。

### 依据

- 规则进结构，不写成 prompt：OpenAI “When documentation falls short, we promote the rule into code”（harness-engineering）；Anthropic “Use hooks for actions that must happen every time with zero exceptions”（claude-code-best-practices）；Lauren “If the fix is structural, only use the structural fix. The instruction is the symptom.”（pstack principle-encode-lessons-in-structure）。agent-prompt-rules 二-10。
- 检查可以与下一步并行，但要由机制保证先处理：Anthropic “On coding tasks, letting the lead continue while subagents run lowers average time to completion”，同时 “The model still often chooses to wait”（prompting-claude-fable-5-1）；Lauren 审计与下一波并行，失败时停下一次补充（pstack orchestrate）；OpenAI 里程碑之后先修再继续（run-long-horizon-tasks-with-codex）。
- 按 SHA 记账、缺记录的结果不算：Lauren “A new head SHA voids the row”（orchestrate）、“Drop a result that does not record the SHAs”（swarm）。
- 报告沿用：Lauren 的 patch-id 规则，差异只在测试、文档、lint 配置时沿用，“Re-verify anything else when the patch changed.”（pstack playbooks/shipping.md）；Anthropic 提醒验证者会走捷径（building-multi-agent-systems-when-and-how）。与 pstack 的不同：不做两次构建比对，因为 deliver 已要求质量命令和 CI 在最终 head 上通过；也没有实现“patch-id 不变时沿用”，rebase 后报告仍要对新 head 重新验证。

### 验证

在临时 git 仓库实跑，工作目录含空格，37 个用例都符合预期（Codex 审查后的修正另见下文）：

- 两个里程碑按时检查、全覆盖：返回 0；M1 的记录晚于 M2 的第一个提交：返回 1，写明两个时间和放行方法；加上 `milestone-order` 放行行：返回 0，列为说明。
- 有场景的 M2 没有记录：返回 1；没有场景的 M3 不要求。
- 两条记录之间漏了一个提交：返回 1，列出该提交；记录保存后被改：返回 1；第二轮记录覆盖之后的修复提交：返回 0。
- 里程碑没有编号：返回 1，提示按编号写。
- 需求分支 rebase 到新基线后，记录里的旧 SHA 按 patch-id 对应：返回 0。
- `record-milestone-check.mjs`：正常保存与第二轮自动编号、从 stdin 读报告：返回 0；不在 plan 里的编号、反向范围、范围不在 HEAD 上、空报告：返回 1；编号格式不对：返回 2。
- 完整检查：报告就在 MR head 上：返回 0；报告在前一个提交、之后只加了测试文件：返回 0 并列出文件；之后改了产品文件：返回 1 并列出文件；报告的 head 不是祖先：返回 1；缺里程碑记录时完整检查也失败；`--frozen-only` 行为不变。

用试跑的真实数据回放：按两个检查子代理实际返回的时间构造四条记录（M1、M2 各两轮），在第一个真实需求的需求分支上运行 `--milestones-only`：返回 1，报出 M1 第一轮晚于 M2 的第一个提交 `e4742a609d`、M2 第一轮晚于 `4abb95d974`；M3（文档）不要求记录。

### Codex 审查

修改后由 Codex（`gpt-6-astra`，只读）审查 diff，报出 8 条（4 条 P1），都成立并已修正：

- P1：spec、verify 重新冻结后，它们在文档目录里，旧报告会被沿用 → 冻结的两份文件改了一律重新验证；
- P1：产品文件重命名进 `tests/`，`--name-only` 只列新路径 → 用 `--no-renames`，删除的产品路径照样计入；
- P1：按任意目录名判断，`src/app/docs/page.tsx`、`src/app/api/test/route.ts` 被当成文档和测试 → 只认仓库根、包根和顶层点目录下的这些目录；
- P1：两个里程碑在最后各存一条覆盖整段分支的记录，顺序检查被绕过 → 每个里程碑的第一条记录只能覆盖自己的提交；
- P2：patch-id 忽略空白，冲突处理改了有意义的空白也会对上 → patch-id 只找候选，再逐字比较改动；
- P2：rebase 到新目标后仍用旧交接 SHA 列提交，把上游提交算进来 → 交接不是祖先时报错，提示更新冻结输入；
- P2：一条对不上的旧记录让整个检查失败，补做的新一轮也无法解除 → 对不上的记录只作历史、不计入；
- P2：记录时间有毫秒、git 时间只到秒，同一秒内的合法顺序被判晚 → 统一到秒比较，记录时间也只写到秒。

针对这 8 条在新的临时仓库各补了用例，18 个断言都符合预期；前面的 37 个用例和真实数据回放的结论不变。

修正后由 Codex 在新 session 复审：上一轮 5 条已解决、3 条部分解决，另报 1 条新问题，共 4 条，都已修正：

- P1：spec、verify 在代码仓库之外（只交本地路径、用 `--repo` 指定代码仓库）时，重新冻结后旧报告仍会被沿用 → 冻结文件不在代码仓库里时，无法证明报告对应同一份验收文档，一律重新验证；
- P2：只有基线、没有交接提交时，rebase 后上游提交仍被算进需求分支 → 列提交时排除基线分支（先找 `origin/<分支>`，再找本地分支）已有的提交；
- P2：第一轮对不上之后，第二轮被当成第一轮，和别的里程碑的第一轮报重叠 → 重叠只在记录头写明 `round: 1` 的记录之间检查；
- P2：`core.quotePath` 会把中文文件名转义，`docs/说明.md` 被当成产品改动 → 用 `git diff -z` 按 NUL 分隔读取路径。

为这 4 条补了用例，与前面的用例一起：37 个、23 个断言都符合预期，真实数据回放的结论不变。第二轮的修改没有再送审。

尚未验证：owner 在真实交付中按新说明后台检查、保存记录的完整过程。

## 验证调用限时、预检与图形入口（2026-09-30）

来源：首个真实需求的复盘，见 super-auto `research/goal-final-delivery-trace-2026-09-30/README.md` 第 5.1、5.2 节与第 6 节的 C1–C3、N2。用户确认后改。

### 试跑中的问题

- 第一轮用 Codex 验证，`-s workspace-write` 沙箱里 Playwright 启动 Electron 报 “Process failed to launch!”，核心场景 S01 和 Electron 冒烟只能标“环境受阻”，到交付第 2 小时才暴露。
- 改用第三个 CLI 时模型引用少写了提供方前缀，调用被拒；补上前缀后才能调用。
- 第三个 CLI 的复验跑了 2 小时 3 分钟没有报告：三个入口的场景 23 分钟就跑完，之后一直在读文件。`run-verifier.mjs` 用 `spawnSync` 同步等待，没有超时，运行中不写日志，owner 只能翻这个 CLI 的 runtime 日志判断它在做什么，用户来问了五次进度，最后手动取消。

### 改动

- 调用改为异步：CLI 的输出边运行边写进 `.log`；`.status.json` 记着状态、开始时间和最近一次写证据的时间。
- 两个上限：`--timeout`（默认 90 分钟）和 `--stall`（默认 20 分钟内 `--add-dir` 下没有任何文件变化）。到了就结束验证者的整个进程组，调用记录写明终止原因（`completed`、`cli_failed`、`invalid_report`、`stalled`、`timed_out`、`checkout_changed`），返回 3，owner 换另一个 CLI。停滞只看证据文件，不看 CLI 自己的输出。
- `--preflight`：用同样的 CLI、模型、推理强度和沙箱发一次最短的调用，确认能答、能读出模型和 session id、模型家族可识别；给了 `--owner-family` 时还要求与 owner 不同家族。deliver 开工时就跑一次。codex 的预检在临时目录里运行，加 `--skip-git-repo-check`。
- 验证时三个 CLI 都不带沙箱：codex 改用 `-s danger-full-access` 并关掉审批（`approval_policy=never`），claude 仍用 `bypassPermissions`，第三个 CLI 仍用完全权限。调用记录写明 `sandbox`。最初的版本让 codex 默认带沙箱、要图形界面时再加 `--needs-gui --unsandboxed`；用户 2026-09-30 追加要求验证环节默认去掉沙箱，这两个选项随之删除。查漏（core-spec）只读代码，仍用 `-s read-only`。
- `--effort`：显式设对方的推理强度（codex `model_reasoning_effort`、claude `--effort`、第三个 CLI `--effort`），写进调用记录。
- codex 调用前先查 `codex login status`。
- deliver 与跨模型调用说明相应改写；原先“沙箱挡住应用时不改用无沙箱”的写法按用户 2026-09-30 的决定取消。

### 依据

- 等待与超时由运行时承担：OpenAI Symphony 的超时按静默时长计，停滞就终止并重试，终止原因要分类（“`codex.turn_timeout_ms`: maximum silence interval”“If `elapsed_ms > codex.stall_timeout_ms`, terminate the worker”“Distinct terminal reasons are important”）；Anthropic “if you need a hard stop, keep your own timeout”（prompting-claude-opus-5-5）。
- 只把副作用算作进展：Lauren “Count only side effects as progress… Treat a lane that… passes its expected runtime without a side effect, as stuck”“Transcript mtime is not liveness.”（pstack autopilot-full、orchestrate）。
- 启动前预检、轻量：OpenAI “Validate configuration before starting the scheduling loop”“It validates the workflow/config needed to poll and launch workers, not a full audit”；Lauren “process up, right version/build, port owned by us, auth valid”“Never write a real slug you have not confirmed is available”（create-verification-skill、setup-pstack）；开工时先跑一个单元暴露环境问题：“The pilot exists to falsify the brief template, the verify recipe…”（pstack orchestrate）。
- 放宽沙箱做成写明信任姿态的显式选项：OpenAI Symphony “Implementations are expected to document their trust and safety posture explicitly”，同时提示放宽的风险；Anthropic 建议放宽时在别的层面隔离（building-c-compiler 在容器里运行）。这里的风险与另两家 CLI 已有的权限相同。

### 验证

- 用假 codex CLI 在临时仓库实跑 24 个断言，都符合预期：参数错误返回 2；预检通过并写明沙箱、推理强度；预检拒绝与 owner 同家族；正常运行的调用记录含 `completed`、`effort`、`sandbox`，codex 收到 `model_reasoning_effort`，并以 `danger-full-access`、`approval_policy=never` 运行；只打印输出、不写证据的运行在停滞上限后被结束，记录为 `stalled`，进程已被杀掉，状态文件为 `stalled`；运行中日志已有输出、状态为 `running`；持续写证据的慢运行正常完成；超过总时长记录为 `timed_out`。
- 真实 CLI 的预检：codex 默认、codex `--effort high` 都在 10 秒左右通过；第三个 CLI 用带前缀的完整引用（`gpt-6-astra`，`--effort high`）9 秒通过，用试跑中写错的引用 3 秒内返回 3；本机 claude 未登录，返回 3。

### Codex 审查

修改后由 Codex（`gpt-6-astra`，只读）审查 diff，报出 11 条（3 条 P1），都成立并已修正：

- P1：验证者退出后，忽略 SIGTERM 的后代可能留下，脚本随即退出、SIGKILL 不再执行 → 调用结束时无论怎样结束，都对整个进程组发 SIGKILL；
- P1：脱离进程组的后代继续占着输出管道时，`close` 不来，结果一直不结算 → 进程退出后最多等 5 秒，停止后 SIGKILL 再等 5 秒，到时关掉管道结算，只结算一次；
- P1：脚本收到 SIGINT、SIGTERM 时，独立进程组里的验证者不会跟着结束 → 捕获这两个信号，先结束验证者再退出（130、143）；
- P2：输出按块解码，跨块的中文变成替换字符，报告里“验证模型”被破坏 → 用 `setEncoding("utf8")` 按流解码；
- P2：claude 和第三个 CLI 用 `--output-format json`，结束前没有日志 → 改用 `stream-json`（claude 加 `--verbose`），从最后的结果事件读报告、模型和 session；
- P2：停止不是幂等的，停滞之后又超时会改写终止原因 → 首次停止时锁定原因、停止轮询；
- P2：未来时间戳的文件会让“最近一次变化”停在未来，停滞永远不触发 → 用快照比较是否有变化，时长用单调时钟；
- P2：只看最大 mtime，会漏掉深层、软链接目录里的改写和删除 → 按路径比较完整快照（新增、修改、删除），不限深度、不跟随软链接；
- P2：证据目录经软链接或 `/var` 与 `/private/var` 等不同路径给出时，脚本自己的日志、状态文件被当成进展 → 统一成真实路径再排除；
- P2：deliver 里预检写成“参数同下文”，照抄会带上预检不接受的参数 → 写出完整的预检命令；
- P2：强制带 `--owner-family` 与用户放宽跨模型要求的例外冲突 → 放宽时不加。

补了 16 个用例（忽略 SIGTERM 的后代被清掉；脱离进程组的后代占着管道时 20 秒内结束；给脚本发 SIGTERM 后验证者被结束、返回 143；未来时间戳、经软链接给出的证据目录、深层改动、删除；claude 和第三个 CLI 的 stream-json，跨块的中文不损坏），与前面 24 个都符合预期；真实 CLI 的预检结果不变（第三个 CLI 改用 stream-json 后仍通过）。修改后没有再送审。

实际使用的佐证：试跑最后一次复验在用户同意下没有经本脚本，直接用 `codex exec --dangerously-bypass-approvals-and-sandbox`、`model_reasoning_effort=high` 运行：Electron 20:27 启动成功，20:21–20:32 用 11 分钟完成全部场景和代码审查，结论 PASS；同一个模型经第三个 CLI 的那次跑了 2 小时 3 分钟没有报告。

去掉沙箱后的实测：codex 以本脚本使用的 `-s danger-full-access -c approval_policy=never` 在验证检出目录运行业务仓库的验证 Skill 的 `electron up`，成功启动（`mainUrl` 为应用的 `app://` 地址），随后 `electron down` 成功，检出目录保持干净。

尚未验证：经本脚本跑完一次完整的图形界面验证。

## 精简：不再核对推理强度，写明怎样等长任务（2026-09-30）

来源：首个真实需求的复盘，super-auto `research/goal-final-delivery-trace-2026-09-30/README.md` 第 5.1、5.4 节与第 6 节的 B4、B5、B6。用户确认后改。

- **删去核对 subagent 推理强度的要求。** 里程碑检查说明原来要求 subagent 报告推理强度，deliver 要求 owner 核对。子代理看不到自己的推理强度，试跑中四次报告都写“未写明”，这条无法执行。模型 ID 的核对保留。依据：Lauren “Call-mechanics instructions in skill prose do not change agent behavior; the subagent tool schema (model optional, omitted inherits the parent) governs.”（pstack 提交 #167）；OpenAI Codex 未配置时子代理默认继承父级的模型和推理强度（codex-subagents）；agent-prompt-rules 总原则“删掉它，模型会做错吗？不会就删”。
- **一句环境知识：怎样等长任务。** 试跑中 owner 两次用 `ScheduleWakeup` 等 CI 和验证，都没有唤醒会话，空转 81 分钟，用户来问了五次。这是 Claude Code 这个运行环境的特点，模型不知道，所以写一句：长任务放后台、靠结束通知回来，CI 用会退出的轮询脚本。依据：agent-prompt-rules 三-3“只写它不知道的：项目自己的约定、踩过的坑”；OpenAI、Anthropic 都把等待与超时交给运行时（Symphony、prompting-claude-fable-5 “restructuring harnesses to check on runs asynchronously”）。时长上限由 `run-verifier.mjs` 保证，不写成 prompt。
- **不新增“进入等待前向用户报状态”。** 复盘里的 B6 按 Anthropic 的提醒删掉：把里程碑或长回合当成汇报点是提前停下的反例（prompting-claude-opus-5-5 Unattended agentic runs），Opus 5.5 默认会写进度；状态由 plan.md 进度和 `.status.json` 提供。
- B2（检查可以后台进行、下一个里程碑提交前处理完）已随 `check-delivery.mjs` 的顺序检查一起改，见上文“里程碑检查记录与报告沿用”。

与现有规则逐条对照（避免 pstack PR 422 那类互相矛盾的规则）：新句与“常规进展不停下来等确认”“CI 失败时只修本次改动引入的问题”不冲突；删去的一句没有被其他规则引用。

## 里程碑检查记录经得起 rebase（2026-09-30）

来源：把新版 deliver 同步给进行中的需求（第二个真实需求）时，对照它的计划发现：需求分支最后要 rebase 到更新后的目标分支，而按上文“里程碑检查记录与报告沿用”的做法，一次没有冲突的 rebase 就能让记录作废。super-auto `discussions/2026-09-30-goal-final-delivery-trace-review.md` 记录了发现经过，用户确认后改。

### 问题

在临时仓库复现，两种情况都让整条记录不再计入：

- 记录里的一个提交在 rebase 时被 git 去掉，因为目标分支已经有同样的改动（`patch contents already upstream`）。第二个真实需求的分支带着另一个 MR 的 runtime 提交，那个 MR 先合入后就会这样。
- 目标分支改了某个已检查提交改动附近的一行。rebase 没有冲突，增删的行也没变，但 `git show` 带出的上下文行变了，逐字比较对不上。

记录作废后，门禁报“里程碑没有检查记录”和“提交未被覆盖”；重做的检查晚于之后的提交，只能由用户放行。owner 按规定做了每一步，仍然过不了门禁。

### 改动（`scripts/milestones.mjs`）

- 判断 rebase 前后是否同一个提交：只比较文件头（路径、新增或删除、权限、重命名）和增删的行，按原始字节比较；二进制文件比较改后的 blob 编号；不比较上下文行、hunk 位置和其他 blob 编号。用 `git diff-tree -p -M --full-index`，不受 `diff.renames` 等配置影响；合并提交和空提交只按 SHA 或下面的身份对应。不再用 `git patch-id`：它把上下文行算在内，上下文一变就找不到候选。
- rebase 和 amend 都保留提交的作者时间和标题，用它们作为提交的身份：
  - 改动相同的有多个候选时，取身份相同的那个；没有就按记录里的先后顺序对应，同一处改动出现在两个提交里也能分清。
  - 身份相同、改动不同：这个提交在检查后被改过（冲突处理或 amend），必须由之后的某一轮重新覆盖，否则报错。
  - 身份和改动都找不到：rebase 因目标分支已有而去掉了它，或者被换成了另一个提交，跳过；换上的新提交像其他提交一样要被覆盖。
- 记录里的其余提交照常计入，并列出跳过、改过的各有几个。当前分支上的每个提交仍要被某条记录覆盖，所以不会漏检。
- 时间只核对每个里程碑第一次仍然有效的检查：它要早于之后的第一个提交。找“之后的提交”时，跳过只被这个里程碑后几轮覆盖的提交（它的修复，或检查后被改过的提交）；被任何其他里程碑的记录覆盖的提交都不跳过，所以不能用后一轮把晚了的第一次检查藏起来。后几轮是对修复或 rebase 改动的复查，它们之后的提交本来就更早，不再核对时间。第一轮的提交全被改过、只剩后一轮有效时，按后一轮核对，报错里写明，由用户决定是否放行。

### 依据

- 按内容而不是 SHA 认提交：Lauren 用 patch-id 判断 rebase 后改动是否不变，“Re-verify anything else when the patch changed.”（pstack playbooks/shipping.md）。这里比 patch-id 更窄的一点是不看上下文行：上下文属于目标分支，不属于这次改动；比 patch-id 更严的一点是增删行逐字节比较，不忽略空白。
- 规则进脚本，不写成 prompt：OpenAI “When documentation falls short, we promote the rule into code”（harness-engineering）；agent-prompt-rules 二-10。deliver 正文只把“记录早于之后的提交”改成“第一次检查早于之后的提交”；冲突改过的提交要再查，由脚本报错时说明。

### 验证

新增 33 个断言，都在临时仓库实跑：

- 没有冲突的 rebase：一个已检查的提交因目标分支已有而被去掉，两个已检查的提交附近的行被改（其中一个是带修改的重命名）；更新交接行后返回 0，列出跳过的提交，4 个提交全部覆盖。改前的脚本返回 1。
- rebase 冲突改了 M1 的最后一个提交：返回 1，指出这个提交在 M1 检查后被改过；对它再查一轮（记录时间远晚于之后的提交）后返回 0。改前的脚本仍返回 1，报“晚了”。
- M1 的第一次检查晚于 M2 的第一个提交，再用 M1 的第二轮覆盖 M2 的提交：仍返回 1。
- M1 第一轮的提交全被改过：按第二轮核对时间，返回 1 并说明；加放行行后返回 0。
- M1 的第二轮复查晚于之后的提交：返回 0（改前返回 1）。
- 增删的行里只多了一个空格：对不上，返回 1。

- 下面 Codex 审查报出的各种输入：二进制文件内容被换、用后一轮掩盖晚了的第一次检查、同一处改动出现在两个提交里、形似文件头的增加行、非 UTF-8 字节、检查范围末尾的提交被改，都按预期返回。

原有两组用例 37 个、23 个全部通过；其中 3 个断言的提示文字随之更新（整条记录作废变为“1 个提交改过或跳过、其余计入”，结论不变）。

### Codex 审查

由 Codex（`gpt-6-astra`，推理强度 high）审查第一版 diff，报出 7 条（2 条 P1），处理如下：

- P1：二进制文件只输出 `Binary files … differ`，去掉 blob 编号后不同内容被当成同一改动 → 二进制文件比较改后的 blob 编号；
- P1：M2 的提交被改写后只剩第二轮覆盖，没有第一轮的归属，M1 的第二轮覆盖它就能跳过它，掩盖 M1 晚了的第一次检查 → 只跳过仅被本里程碑后几轮覆盖的提交，任何其他里程碑的记录覆盖的都不跳过；
- P2：同一处改动出现在两个提交里（例如两个函数各改一次相同的行），忽略上下文后无法区分，都对到第一个 → 先用作者时间和标题区分，再按记录内的先后顺序对应；
- P2：正文里的增加行形如 `+++ payload` 被当成文件头，后面的“文件末尾无换行”标记被丢掉 → 按是否已进入 hunk 区分文件头和正文；
- P2：按 UTF-8 解码把不同的非法字节都变成替换字符 → 按 latin1 读取，逐字节保留；
- P2：记录末尾的提交被改过后，记录只剩前面的提交，末尾成了“最后一次检查之后”的提交，不要求再查 → 用作者时间和标题认出检查后被改过的提交，要求后一轮重新覆盖；
- P2：上游大幅改动被重命名的文件，`-M` 的相似度跌破阈值，重命名变成删除加新增，对不上 → 未修。这个提交会被当成检查后改过的提交，要求再查一轮；只有它是某个里程碑第一轮检查里唯一的提交时，第一轮不再计入，时间按后一轮核对，需要用户放行。

修正后没有再送审。

## 重新交接后，之前的里程碑检查仍然计入（2026-10-01）

来源：第二个真实需求交付到一半，用户决定修改 verify 的 S04，按 deliver“停下”一节用 core-spec 重新确认、在需求分支上提交新的交接提交，owner 把 `read-handoff.mjs` 输出的新交接行写进 plan.md。之后 `check-delivery.mjs` 报 M1–M4 都没有检查记录：M1 已存的两轮记录都不再计入。owner 会话报告了这个问题，用户确认后改。

### 问题

`milestones.mjs` 从 plan.md 的交接行起算 owner 的提交。重新交接后交接行换成新的提交，之前的提交全落在范围外，已存的检查记录被当成“早于新交接的历史”。这些里程碑也不可能再补出有效记录：重做的检查一定晚于之后的提交。上文“里程碑检查记录与报告沿用”把“早于新的交接”的记录有意当作历史，但 deliver 允许交付中途重新交接，两条规则合在一起，门禁必然失败。

### 改动（`scripts/milestones.mjs`）

- 起算点：plan.md 有交接行时，在需求分支的 first-parent 线上（目标分支之后）找最早一个同时带 `Frozen-Spec`、`Frozen-Verify` 两行 trailer 的提交，从它起算；它必须是交接行那个提交的祖先。找不到时（只交本地路径、没有 trailer）仍按交接行。只有基线行时不变。
- 之后的交接提交如果不是合并提交、只改了 trailer 里的两份文件（路径先规范化，`./specs/verify.md` 与 `specs/verify.md` 相同），就是用户对 spec、verify 的改动，不是 owner 的代码：不要求里程碑检查覆盖，找“之后的提交”核对时间时也跳过；记录的范围跨过它时，安静地略过它。交接提交还改了别的文件时，照常要求覆盖。
- trailer 的读法与 `read-handoff.mjs` 相同：git 自己的 trailer 解析，每种只能有一行，值必须是“路径 sha256=64 位十六进制”且不折行；它不接受的提交不算交接提交。
- 这两条只在 plan.md 有交接行时生效，只有基线行的计划行为不变。

### 依据

- 规则进脚本：deliver 的“停下”一节规定改 spec、verify 时由用户重新确认、按原方式交回，owner 写入新的冻结输入后继续；门禁要与这条流程一致，不能让按流程走的交付必然失败（agent-prompt-rules 二-10，规则之间不能互相矛盾，见上文 pstack PR 422 的教训）。
- 交接提交只改冻结文件，由用户确认，owner 不写它；里程碑检查查的是 owner 的实现，不是验收文档本身。验收文档的改动由新的 sha256 和最终的独立验证把关。

### 验证

新增 16 个断言，都在临时仓库实跑：

- M1 检查后用户改了 verify 并重新交接，plan.md 写新的交接行：返回 0，M1、M2 的记录都计入，4 个 owner 提交全部覆盖；改前的脚本报 M1 没有记录。
- 新交接提交早于 M1 的记录保存时间：它不算 M1 之后的提交，返回 0。
- 交接提交还加了一个工具文件：返回 1，要求覆盖。
- 记录的范围跨过新交接提交：返回 0，不报“提交已不在分支上”。
- 只有基线行的计划：结果不变，交接提交照常算作 owner 的提交。
- 合并形式的交接提交顺带带进代码：返回 1，要求覆盖；trailer 写成 `./` 路径：与普通路径一样跳过；交接之前有一个折行 trailer 的提交：不当作交接，从真正的交接起算。

改前的脚本在这组用例上有 11 个断言不通过。原有四组用例（37、23、33 个，run-verifier 22、16 个）全部通过。在第二个真实需求的真实 plan 上（head 为新交接提交 `9d998c8968`），M1 的两轮记录重新计入，剩下的问题只有 M2–M4 还没检查。

### Codex 审查

由 Codex（`gpt-6-astra`，推理强度 high）审查第一版 diff，报出 4 条（1 条 P1），都成立并已修正：

- P1：合并形式的交接提交，`diff-tree` 不输出改动，被当成“只改冻结文件”跳过，带进来的代码没人检查 → 合并提交一律不跳过；
- P2：trailer 写成 `./specs/verify.md` 时，与 `diff-tree` 列出的 `specs/verify.md` 对不上，交接提交被当成之后的提交，判晚 → 路径先规范化；
- P2：只有基线行的计划也被过滤改变，覆盖交接提交的记录对不上 → 只在有交接行时生效；
- P2：门禁接受 `read-handoff.mjs` 拒绝的折行 trailer，把交接前的草稿提交当成最早的交接 → 改用与 `read-handoff.mjs` 相同的格式要求。

修正后没有再送审。

### 补充：交付中改 spec、verify，要留下用户确认并由验证者对照

用户追问 owner 会不会为了好实现自己改 spec、verify。规则上不能：deliver“停下”第 1 种要求 owner 停下、由用户决定，用户用 core-spec 更新并重新确认。但机械检查拦不住 owner 自己走完一整套重新交接（改文件、算 sha256、提交带两行 trailer 的交接提交、换掉 plan 的冻结输入）：交接提交里只有哈希，没有谁确认的；独立验证者按改后的 verify 验，看不出验收被放宽。上面的修正让重新交接不再顺带破坏里程碑门禁，这条路就更顺了。用户确认后一并补上两道检查：

- `check-delivery.mjs`（`--frozen-only` 和完整检查）从需求分支上最早的交接提交读出 spec、verify 当时的 sha256，与 plan.md 冻结输入的值比较。不同时，要求冻结输入里有 `- 重新确认: <spec|verify> sha256=<现值> <用户原话与日期>`，同一行里必须有原话；并列出 `git diff <第一次交接> <head> -- <文件>`，供 MR 描述“验收文档改动”一条使用。
- `run-verifier.mjs` 新增必填的 `--base`（目标分支），在检出目录里只看目标分支之后本需求的交接提交，第一次与最后一次的哈希不同时，在调用里写明第一次交接的提交和查看方法。验证说明新增“验收文档改动”一节：逐处列出改动，判断是否放宽了验收，各场景仍按最终的 verify 判定。调用记录写 `base` 和 `first_handoff`。完整检查在有改动时要求报告里有这一节，并核对调用记录的 `first_handoff` 就是门禁自己找到的第一次交接，owner 漏传或传错 `--base` 会被拦下。
- “本需求的交接提交”：从 spec、verify 现在的路径对应的最新交接提交往前，凡与已取的交接共用 spec 或 verify 路径的都算，文件换了路径也连得上；同一分支上别的需求、目标分支上用过同样路径的旧需求都不算。门禁找不到基线分支时报错，不当作没有改动；有没有交接行都检查。
- 交接提交的读法抽到 `scripts/handoffs.mjs`，与 `read-handoff.mjs` 的规则一致，`milestones.mjs`、`check-delivery.mjs`、`run-verifier.mjs` 共用。

依据：确认行与放行行（`cross-family`、`milestone-order`）一样由 owner 照抄用户原话，信任程度相同，作用是让改动在合入前摆到用户面前，并在计划里留下可查的记录；是否放宽交给与实现无关的另一家模型判断（pstack：审 diff 时不信 PR 描述，验证者用与作者不同家族的模型；Anthropic 提醒验证者会走捷径，所以由脚本把第一次交接交给验证者，不靠 owner 写进验证输入）。agent-prompt-rules 二-10：规则进脚本。

验证：新增断言（临时仓库实跑）：
- 第一次交接后 verify 改过、没有确认行：`--frozen-only` 返回 1；确认行的哈希不对、或没有原话：返回 1；有确认行：返回 0 并列出 diff 命令。
- 完整检查：报告没有“验收文档改动”一节返回 1，有则返回 0。
- `run-verifier.mjs`（假 CLI）：交接后改过时调用里写明第一次交接的提交和 `git show` 命令，调用记录有 `first_handoff`；只交接过一次时不加。

- Codex 审查后补的：没有交接行时照样发现改动并要求确认；基线分支没拉取时报错；只改 spec 的重新交接、verify 换了路径时，验证者都被告知；目标分支上旧需求用过同样路径、同一分支上有两个需求时，不误报；调用记录的 `first_handoff` 不对时完整检查返回 1。

共 29 个断言。其余各组用例（37、23、33、16 个，run-verifier 22、16 个）全部通过。在第二个真实需求的真实 plan 上，`--frozen-only` 指出 verify 自第一次交接后改过、缺少确认行。

Codex 审查（`gpt-6-astra`，推理强度 high）第一版报出 5 条（1 条 P1），都成立并已修正：

- P1：删掉交接行、或基线分支没拉取时，确认检查静默跳过 → 有没有交接行都检查，找不到基线分支时报错；
- P2：只改 spec 的重新交接，验证者不被告知（按 verify 路径筛提交漏掉了它）→ 按交接提交本身串起本需求；
- P2：verify 换了路径后找不到第一次交接 → 共用 spec 或 verify 路径的交接都连起来；
- P2：验证者把目标分支上用过同样路径的旧需求当成第一次交接 → `run-verifier.mjs` 必须给 `--base`，只看其后的提交；
- P2：同一分支上有两个需求时，门禁拿前一个需求的交接比较 → 只取与现在的 spec、verify 路径相连的交接。

修正后没有再送审。

## 验收口径偏差由 owner 自定，验证者判断是否放宽（2026-10-01）

来源：第二个真实需求交付中三次停下问用户（S04、S05、S09），6 次提问，用户等了约 52 分钟，verify 中途冻结两次。三处都是同一类：spec 规定的产品行为清楚，实现也符合 spec，只是 verify 的检查方法与观测工具对不上。S04、S05 拿“产品计数”对“观测工具里的调用条数”，而这个工具只保存成功的调用，暂停打断已发出的请求时 spec R20 要计数；S09 的“挂起期间没有新的模型请求”把会话标题的辅助请求也算了进去。用户同意改为 owner 自定、记录，由验证者把关。

### 问题

“停下”第 1 种写的是“缺少一个会改变场景判定结果的决定”，检查方法本身的问题也落在里面，owner 只能停下。哪个读数才对，跑一下就能看出来，不需要用户的产品判断；停下的代价是用户的注意力和中途冻结。同时不能让 owner 借此放宽验收：用户此前追问过 owner 会不会为了好实现自己改 verify。

### 改动

- **SKILL.md**：停下第 1 种改为“缺少一个会改变产品行为的决定”，检查方法与 spec 对不上时按口径偏差处理；新增“口径偏差”一段：owner 自定改用的判定方法，不停、不改 verify.md，在 plan.md 记一条（字面为何不成立、证据、改用的方法），同类检查点一并处理，验证者判为放宽的按停下第 1 种交给用户；完成条件 3 的门禁增为六件事；独立验证命令加 `--plan`；MR 描述与汇报各加一条。
- **plan-format.md**：新增“口径偏差（持续更新）”一节，条目以 D1、D2……开头，写涉及的场景或要求 ID 和“改用”一行。
- **verifier-brief.md**：口径偏差是 owner 的主张，由验证者判断；第 2 步加判定规则：成立且没有放宽的按改用的方法判定，不成立的按 verify 字面判定，放宽了的记 FAIL、说明以“口径偏差放宽”开头；报告加“口径偏差”一节，每条一行 `D<n>：成立|不成立；未放宽|放宽；<理由>`。
- **scripts/deviations.mjs**（新）：读 plan.md 的条目和报告里的判断，`run-verifier.mjs` 与 `check-delivery.mjs` 共用。代码块一律不算；plan.md 只能有一个“口径偏差”节，节外出现 D<n> 条目、节内出现认不出的行都报错，不当作“没有偏差”；条目以编号开头、第一行写场景或要求 ID，字面、不成立的原因、改用、推翻后重跑四项不能空，编号不能重复。报告只读“口径偏差”一节里的判断，同一编号判断两次报错且“放宽”不会被后一行覆盖，理由不能空。
- **run-verifier.mjs**：新增 `--plan`；把条目原文写进报告旁的 `<报告>.deviations.md`，调用说明写明文件位置，不经过 owner 的验证输入，也不占命令行长度；条目写法不合格时退出码 2；调用记录写 `plan`、每条的编号与 sha256（没给 `--plan` 时为 null）和文件的 sha256。
- **check-delivery.mjs**：完整检查新增第 6 项：条目写法合格；调用记录的编号和每条的 sha256 与 plan.md 一致（验证后增删或改写条目要重新验证）；报告有“口径偏差”一节且每条都有判断；有判为放宽的返回 1，报错写明交给用户；全部未放宽时逐条列出，供 MR 描述使用。
- **core-spec/SKILL.md**：交接后只有需要改变产品行为的决定才回到 core-spec；口径偏差由 deliver 记录、验证者判断。
- README 的四种停下同步改写。

### 依据

- 三家都让执行者在多数情况下自己定、继续做：OpenAI ExecPlan“Resolve ambiguities autonomously”，计划是活文档、改动要在决策日志写清原因；Anthropic Fable 5.1“say so in a sentence or two and keep building under stated assumptions”；pstack 给默认答案并报告推翻词，能靠运行看出来的事实“is not the human's to answer”。
- 边界：Anthropic 长任务 harness 不让执行者改验收项，只改通过状态，所以 owner 不改冻结的 verify；pstack“never relax the predicate to declare victory”，放宽已定门槛要先有验证者证明、再由上层会签，这里由另一家模型的验证者判断，放宽的交给用户。
- 规则进脚本（agent-prompt-rules 二-10）：偏差原文由脚本交给验证者、门禁按编号核对，owner 漏报、验证后补报、带着被判放宽的偏差过关都会被拦下。
- 与已有规则对照（pstack PR 422 的教训）：“spec 和 verify 在交付中不修改”不变；用户决定改文件时仍走 #25 的重新确认；“绑定命令”同样不改 verify.md，两段并列。

### 验证

新增 58 个断言（临时仓库实跑，`deliver-deviation-cases.sh`）：

- 没有偏差：行为不变，旧的调用记录（没有 `deviations` 字段）照常通过；plan 里代码块中的示例不算条目；
- plan 有 D1、验证者没拿到 plan：返回 1；验证后新增、删除或改写 D1：返回 1；
- 报告没有“口径偏差”一节（只在别的行里提到这个词不算）、一节里没有 D1 的判断、判断只在代码块里、判断没有理由：返回 1；
- D1 判为放宽：返回 1，报错带验证者的理由并指向停下第 1 种；先写“放宽”、后写“未放宽”：仍返回 1，并报同一编号判断两次；
- D1 判为成立且未放宽、或不成立（按字面判定）且未放宽：返回 0，逐条列出；加粗的标题、`*` 列表、加粗的编号都能读；
- 条目没有编号、写在“口径偏差”节外、有两个“口径偏差”节、编号重复、“改用”为空、第一行没有场景 ID：返回 1；
- `run-verifier.mjs`（假 CLI）：给 `--plan` 时调用说明写明 D1 和文件位置，原文在文件里、不在命令行上，门禁接受它写的调用记录；不给时不提、记录为 null；40 万字的条目也能启动；条目不合格时退出码 2。

改前的脚本在这组用例上有 41 个断言不通过。原有七组用例（37、23、22、16、33、16、29 个）全部通过。

### Codex 审查

由 Codex（`gpt-6-astra`，推理强度 high）审查第一版 diff，报出 6 条（4 条 P1），都成立并已修正：

- P1：调用记录只存编号，验证后改写条目正文、编号不变仍能过关 → 记录每条的 sha256，门禁按编号和原文核对；
- P1：认不出的写法（加粗标题、`*` 列表、写在别的节里）被静默当成没有偏差 → 支持加粗与 `*`、`+` 列表，节外的 D<n> 条目和节内认不出的行都报错；
- P1：代码块里的示例会被当成条目，第一个同名节为空时真实条目被漏读 → 代码块一律不算，两个“口径偏差”节报错；
- P1：报告里的示例行能充当判断，同一编号后写的“未放宽”覆盖前面的“放宽” → 只读“口径偏差”一节、不读代码块，同一编号判断两次报错，“放宽”不会被覆盖；
- P2：“改用”为空、或正文里出现“不改用……”也能通过，判断可以没有理由 → 四个子项按标签逐项要求非空，判断理由不能空；
- P2：条目原文塞进命令行，长了会超出参数长度（E2BIG），被当成 CLI 故障 → 原文写进报告旁的文件，调用说明只写位置。

修正后没有再送审。

## 里程碑检查先审代码；修复后的重跑由脚本选（2026-10-01）

来源：第二个真实需求的交付复盘。M2 从提交到第二轮检查通过用了约 4 小时 50 分钟，其中场景跑了三轮（80、36、72 分钟）。第一轮检查在两轮场景之后才开始，报出的两个代码问题（取消且无用量的请求按 0 计、旧总结项启动后仍算待处理）都不依赖场景结果，修完又跑了第三轮。M3 修复后，owner 凭判断挑了 11 个场景重跑，漏了 S34：它经过的 token 预算路径被其中一个修复改了，M3 的第一轮检查才指出来。

### 改动

- **SKILL.md“里程碑检查”**：每一轮分代码和证据两部分，各开一个 subagent。代码部分在里程碑提交后就开始，与场景同时进行；证据部分在场景跑完后开始；范围同为一段起止 commit，终点是场景所跑的 head。这一轮报出的问题先在工作区改好，等这一轮存下再提交；两份报告按代码、证据的顺序放进一个文件，由 `record-milestone-check.mjs` 存为一轮。哪一部分的模型 ID 不对，那一部分作废重开。
- **milestone-check.md**：拆成“代码部分：读改动”和“证据部分：看证据”；报告多写一行 `part: code|evidence`。证据要在范围终点的 commit 上跑出，更早 head 上的证据只有在 `select-scenarios.mjs` 的输出表明之后的改动不影响该场景时才算数。
- **SKILL.md“里程碑”**：修复后重跑哪些场景，由 `scripts/select-scenarios.mjs` 选，不凭印象挑；最终 head 照常跑全部场景。
- **plan-format.md“验证与验收”**：场景写成 `场景 | 命令 | 涉及路径` 的表；涉及路径是这个场景经过的代码，写成相对仓库根目录的 glob。
- **scripts/select-scenarios.mjs**（新）：读这张表和 `--from..--to` 之间改动的文件。只改测试、文档、lint 配置的不触发（与报告沿用同一套判定）；改了冻结的 spec、verify，或有文件没有任何场景认领，选全部场景；其余按涉及路径选。冒烟集一行、涉及路径为空或 `*` 的行每次都选，`--failed` 追加上次失败的场景。表缺失、缺列、某行没有场景 ID 时返回 1。
- **scripts/report-reuse.mjs**：把列出改动文件并分类的部分提成 `changedFiles()`，`reuseCheck()` 与 `select-scenarios.mjs` 共用。
- `milestones.mjs`、`record-milestone-check.mjs`、`check-delivery.mjs` 不改：一轮仍是一条记录，记录脚本只存正文和它的 sha256，不解析正文；门禁的顺序规则（第一次检查早于之后的提交）照旧，所以修复要等这一轮存下再提交。

### 依据

- 审代码不需要场景结果，可以并行：OpenAI Codex subagents “use parallel agents for read-heavy tasks such as exploration, tests, triage, and summarization”；Anthropic 多代理 “A verifier that only needs to run tests and report results does not require implementation context”，Fable 5.1 让主代理在子代理运行时继续工作；pstack 的审代码 lane 与场景 lane 在同一轮扇出，问题合成一次退回。
- 补丁一变就要重新验证，不凭推理收窄：pstack shipping “Re-verify anything else when the patch changed”；Anthropic 多代理提醒验证者会走捷径。所以中间轮的选择交给脚本，并且认不出的改动一律全选；最终 head 照常全量。
- 中间轮可以只跑相关部分：OpenAI GPT-6 “broaden or repeat testing only when new changes, failures, or unresolved concerns justify it”；Anthropic 编译器实验的 `--fast` 抽样用于迭代、全量交给 CI。
- 规则进脚本，prompt 只写边界（agent-prompt-rules 二-10）：SKILL 只加一句“用脚本选”，怎样选写在脚本里。

### 验证

- `select-scenarios.mjs`：新增 47 个断言（临时仓库实跑，super-auto `deliver-select-cases.sh`），覆盖用法错误、缺节、缺列、行没有场景 ID、无改动、只改测试和文档、`**` 与 `*` 的区别、目录模式不误配同名前缀（`pkg/ui` 不匹配 `pkg/uix`）、一行多个场景、没人认领的文件、`.harness/docs/` 下的冻结 verify、`--failed`、`--json`、空涉及路径与 `*`。故意改坏三处（冻结文件按普通文件处理、目录模式按前缀匹配、没人认领的文件不触发全选），各有断言失败。
- 在第二个真实需求的真实提交上回放（super-auto `deliver-select-replay-7595.sh`，按入口给 32 个场景配了粗粒度的涉及路径，只读 git）：M3 场景跑在 `512fd9792f` 上，修到 `69696e4f2c` 时改了 agent 核心、长任务功能的账本与执行器、TUI 共 19 个产品文件，脚本选出全部 32 个场景，包括 owner 手工漏掉的 S34。这次回放也说明：修复改到运行时核心时，脚本不会比全量少跑；它省的是只碰个别目录的修复，主要作用是不漏选。
- `report-reuse.mjs` 的改动：同一脚本另有 8 个断言直接调用 `reuseCheck()`（只改测试与根目录 README 时沿用；改了产品文件、改了冻结的 verify、报告的 head 不是祖先时不沿用），在重构前后结果相同；原有各组用例（rebase 33、重新交接 16、重新冻结 29、口径偏差 58 个断言）全部通过。
- 未验证：两部分检查在真实交付中的效果；owner 写涉及路径的粒度是否够细。下一个需求观察。

## 全程不停，只查结果（2026-10-01）

### 起因

dev-skills#26 之后对开发流程类 Skill 做了一次一致性检查，同时复盘了第二个真实需求的交付。主要发现：

- **越改越重。** 正文从 #15 的 4,687 字长到 7,945 字，含限制词的句子从 30 句到 50 句，脚本从 3 个到 11 个（2,399 行）。每次试跑暴露一个问题，就加一段正文和一道脚本检查，只有 #23 删过。这正是 Anthropic prompt-audit 说的 patch accretion。
- **规则互相矛盾。** 里程碑检查两轮后能不能往下做，正文两处说法相反；最终 head 全量重跑还是只重跑受影响的，两处说法不一；“涉及路径写漏只会让重跑变多”与 `select-scenarios.mjs` 的实际行为不符（写漏会少选，已复现）。
- **过程门禁挡错了地方。** 门禁的场景解析认不出第二个真实需求 verify 里的 `S12b` 和机械检查 M01–M17，报告少了这 20 项也能过；独立验证 90 分钟到点按“CLI 用不了”处理，换一家 CLI 一样会超时。
- **为决定停下的代价大。** 第二个真实需求的 S24：spec 把现有的“立即发送”快捷键写错，owner 按当时的规则（改 spec 要用户原话）停下问了两次并重新冻结。

### 用户的决定（2026-10-01）

1. 全程不停，只在不可逆操作前停（合入、强推共享分支、删除共享数据、对外发消息、改共享环境）；做不了的部分写明原因，先做完其余部分。
2. 交付中要定的事，先请另一家模型判断并讨论，再由 owner 定；决定写成决定清单，放在 plan.md 和 MR 描述最前面，用户合入前看。
3. 流程要轻：只用很轻的说明约束，不用复杂脚本核对过程；只留一个查结果的检查。
4. 独立验证以 60 分钟为一个周期，到点看执行过程，没做完就在同一个会话里续接，失败由 owner 判断。
5. 代码质量意见和测试覆盖由最后的独立验证列出，不拦合入，owner 逐条改或写理由。
6. 不加凭据泄露的即时通知，Stop 钩子不进这次改动。

### 改动

| 方面 | 之前 | 之后 |
|---|---|---|
| 停下 | 四种情况停下找用户：spec 矛盾或缺决定、缺权限环境、授权外的不可逆操作、卡住 | 只在不可逆操作前停；其余做不了的列进决定清单 |
| 交付中的决定 | 改变产品行为的停下问用户；口径偏差单独一节，按编号和哈希核对；交付中改 spec、verify 要用户原话并重新交接 | 先问另一家模型，owner 定，写进决定清单；口径偏差、事实更正都并入决定清单；spec、verify 在交付中不改 |
| 里程碑检查 | 代码、证据两部分各一个 subagent，`record-milestone-check.mjs` 存档，门禁核对每个里程碑的第一次检查早于之后的提交、记录连续覆盖分支、经得起 rebase | 做完让一个新上下文的 subagent 对照 spec 查一遍，只报告 |
| 修复后的重跑 | `select-scenarios.mjs` 按涉及路径选 | owner 自己判断；最终代码由另一家模型完整验证 |
| 独立验证 | `run-verifier.mjs` 启动，留调用记录，90 分钟到点按 CLI 不可用处理 | 按 core-spec `cross-model.md` 的命令运行，`perl` 的 alarm 实现 60 分钟周期，同一会话续接 |
| 报告沿用 | `report-reuse.mjs` 按文件类型判断 | 合进新的检查：报告之后只改了 Markdown、测试或 plan.md 所在目录的文件时沿用 |
| 门禁 | `check-delivery.mjs` 六项，解析 verify 的场景表、核对报告逐行完整、调用记录、里程碑记录、口径偏差 | 新的 `check-delivery.mjs` 四项：spec、verify 是交接时确认的版本；报告对应 MR 最新代码；`verdict: PASS`；验证者与 owner 不同家族。场景是否验全由验证者对照 verify 负责，在 MR 里逐个列出 |
| 质量与测试 | 质量意见只能是“可选建议，最多三条”；测试覆盖没人看 | 验证者另列代码质量意见（按 review-rules）和测试覆盖缺口，owner 逐条处理，列进 MR |
| 用户放宽的开关 | `cross-family: waived`、`milestone-order: waived` | 去掉：做不到的列进决定清单，由用户合入前决定 |

删除的脚本：`run-verifier.mjs`、`milestones.mjs`、`record-milestone-check.mjs`、`deviations.mjs`、`select-scenarios.mjs`、`report-reuse.mjs`；`read-handoff.mjs`、`handoffs.mjs`、`report-format.mjs`、`model-family.mjs` 中仍需要的部分（找交接提交、读 trailer、认模型家族）合进新的 `check-delivery.mjs`。用例 `scripts/check-delivery.test.mjs` 放进本仓库，CI 运行。

### 依据

- **不等人，事后纠正。** pstack [principle-never-block-on-the-human](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-never-block-on-the-human/SKILL.md)：“Make reasonable decisions, proceed, and let the human course-correct after the fact”；[poteto-mode](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/SKILL.md) 对只有人能做的决定“apply a default … Report the default with a full explanation and the one word that reverses it”，同时“Always pause for irreversible writes”。OpenAI Harness engineering：“corrections are cheap, and waiting is expensive”（[原文](../skills/agent-prompt-rules/references/sources/openai/harness-engineering.md)）；ExecPlan 执行时不问下一步，决定记进 Decision Log。
- **决定请另一家模型看。** poteto-mode：“A second opinion is the same prompt against a different model. Agreement is high-signal.”；agent-prompt-rules 二-7。
- **查结果，不查过程。** Anthropic 在新模型上去掉 sprint，把 evaluator 改为最后一次（[Removing the sprint construct](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#removing-the-sprint-construct)）；pstack 的验证账本按 PR 和 head SHA 记结论；三家原文里没有核对 agent 行动顺序的门禁。每次都必须发生、又最容易被跳过的只有两件：验收文档没被改、最终代码经过另一家模型验证，留给脚本（agent-prompt-rules 二-10）。
- **删掉补丁式的规则和历史。** Anthropic prompt-audit 把“为一次事故加一条特例、越加越多”和“规则里写事故经过”列为过时写法；agent-prompt-rules 第四节第 2 步要求改动时删掉不再需要的旧指令。
- **最重要的放开头。** Claude Code 压缩上下文后每个 Skill 只保留前 5,000 tokens；“全程不停”从正文后半段移到开头。

### 接受的代价

- 错的默认决定要到合入前才被发现，返工可能比当时问一句更贵。缓解：决定先问另一家模型；清单按影响排序，写明推翻后要改什么、重跑哪些场景。
- 里程碑检查晚做、漏做不再被门禁拦下，最终结果由另一家模型的完整验证兜底。
- 场景是否验全不再由脚本逐行核对，靠验证说明和 MR 里逐个列出的场景结果。

### 验证

- `scripts/check-delivery.test.mjs`：20 条用例（临时 git 仓库实跑，零依赖），全部通过。故意改坏 10 处（不比哈希、在整条历史里找交接、放过报告之后的代码改动、放过非祖先、不查 verdict、放过同家族、不查工作区、不要求报告包含最近一次交接、任意层级的 `tests/` 都算测试、不用 `-z` 读路径），每处都有用例失败。
- 在第二个真实需求的真实分支上只读运行 `--frozen`：认出最近一次交接 `9a596da696`，两份文件与记录一致，通过。
- 行为探针：新开一个 Claude 子代理和一个 Codex 会话（`gpt-6-astra`），只给新版 deliver 和 core-grill，问 6 个情境：快捷键写错、两种交互二选一、验证到 60 分钟、准备合入、只影响实现的存储选择、grill 结束时交什么。两边的回答都符合这次的决定：不停下、不改冻结文件、按代码更正并写进决定清单、产品选择先问另一家模型、同一会话续接、合入前停、存储选择记成默认决定、交出决定汇总请用户确认一次。探针暴露两处缺口，已修：验证说明的 PASS 条件仍写“符合 spec 字面预期”，与决定清单的更正冲突，改为按验证者认可的决定判；正文没写验证之后只改 plan 要不要重验，补了一句。
- `check-links.mjs` 通过。

### Codex 审查

由 Codex（`gpt-6-astra`）审查第一版 diff，报出 2 条 P1、4 条 P2，都成立并已修正：

- P1：用户重新交接、只改了 spec 和 verify 时，旧报告仍能通过（验收文档被当成“文档”豁免）→ 报告的 head 必须包含最近一次交接，冻结的两份文件不参与豁免；
- P1：任意层级名为 `tests` 的目录都算测试，`src/app/tests/page.tsx` 这类产品代码会漏过重验 → 只认仓库根或包根下的 `test/`、`tests/`、`e2e/`；
- P2：中文路径被 git 加引号，只改了中文名的文档也被要求重验 → 用 `git diff -z` 读路径；
- P2：事实更正、改用的判定方法可以不问另一家模型 → 咨询范围改为决定清单里会影响结果或判定的三类；
- P2：`cross-model.md` 把第三个 CLI 的 `--cwd` 写成加证据目录 → `--cwd` 指向验证检出目录，证据目录写在验证输入里；
- P2：只交本地路径时 plan.md 不再记确认的 sha256，中断后接手的 session 无法核对 → 冻结输入在这种情况下写绝对路径和用户给的 sha256。

修正后没有再送审。

### 未验证

- 新流程在真实需求上的效果：owner 是否真的不停、决定清单是否够让用户在合入前判断、60 分钟周期续接是否顺利。下一个需求观察。
- `check-delivery.mjs` 约 230 行，比方案估计的 150 行多：识别包根和交接包含关系是审查后加的。

## subagent 按角色选类型（2026-10-01）

### 起因

第二个真实需求的主会话和 62 个 subagent 全部跑在 `claude-opus-5-5`，按公开价粗算花费明显偏高：主会话最多，其次依次是检查与评审（24 个）、写代码与集成（18 个）、跑场景（11 个）。同样 token 换成 Sonnet 5.5，只换跑场景的约省 6%，连检查一起换约省 14%；两家缓存读同价，长会话的输入大多是缓存读，所以省得比价目表少。同时本机另行把所有通用 subagent 默认到了 Sonnet 5.5，与“里程碑检查继承 owner”冲突。

### 用户的决定（2026-10-01）

- 只让跑场景、收证据这类执行型 subagent 用较小模型；写代码、集成、里程碑检查与 owner 同级。
- Skill 里只写角色和类型名，不写模型 ID；具体模型由各台机器的 agent 定义决定。本机 `general-purpose` 改回继承，较小模型的类型 effort 用 `high`。Codex 用默认设置（subagent 继承主 agent）。

### 改动

deliver“里程碑”一节加一段：写代码、集成、里程碑检查用继承 owner 的类型（Claude Code `general-purpose`、Codex 默认 agent，不传模型参数）；跑场景、收证据、读日志可以交给 `verify-runner`，本机没有时用继承的类型。README 同步一句。

### 依据

- Anthropic：“Move down to Sonnet or Haiku for lookups, not for writing code: subagents that search and summarize, reading logs and test output”；“Every subagent that inherits the main model inherits its price too”；模型写在 subagent 定义的 `model:` 里（What a task costs on Opus 5.5，“Choose the right model for your work”）。Sonnet 5.5 在 `xhigh`、`max` 会自开评审轮次，常规工作用 `high` 及以下（[Prompting Claude Sonnet 5.5](../skills/agent-prompt-rules/references/sources/anthropic/prompting-claude-sonnet-5-5.md)）。
- OpenAI：不配置时 subagent 继承父 agent 的模型和推理强度；“`gpt-6-luna`: Use for fast, narrowly scoped agents handling clear, repeatable, or high-volume work”（[Codex Subagents](../skills/agent-prompt-rules/references/sources/openai/codex-subagents.md)）。
- pstack：每个角色显式指定模型，映射由 `/setup-pstack` 写进本地规则，Skill 只写角色；PR #167：“Call-mechanics instructions in skill prose do not change agent behavior; the subagent tool schema ... governs.”

### 接受的代价与未验证

- 跑场景降级后，执行或读回出错要到最终验证才暴露；里程碑检查不降级，正是为了不让判断类问题（如第二个真实需求的 S26、S34）漏到最后。
- 降级的效果没有对照数据；下一个需求可让两种模型各跑同一批场景对比。
- 行为探针：新开 Codex 会话（`gpt-6-astra`）只读新版 SKILL.md，问派里程碑检查和跑场景各用什么类型：答 `general-purpose`、不传模型参数；跑场景派 `verify-runner`，本机没有时回退到 `general-purpose`。与决定一致。

## 约束放在两端：开工预判、验证前的代码审查、自验与独立验证并行（2026-10-07）

### 起因

第二个真实需求的交付复盘（super-auto `research/flow-review-2026-10-03/`）里，最终验证的 6 个 Codex 周期中有三个没给出 PASS，原因都是开工前就能发现的事：

- verify 的完成条件里有一条“每个覆盖盲区指定的替代测试都必须通过”。owner 三轮自验和 Codex 前三个周期都只看了场景表，没有人照着这一条判；验证说明自己转述了一遍完成条件，转述里漏了这一条。
- 覆盖盲区 B01 写明要用“进程中断注入”测试，实际写成了同一进程内关闭再重开，到第 5 周期才被指出。
- 一个写进功能地图、但没人实跑过的步骤缺了前提，第 2 周期判 FAIL。

另外两点也拖慢了交付：
- 最终验证前补做的一次 Codex 只读代码审查，9.3 分钟报出 5 个代码问题，全部成立。同模型的 7 次里程碑检查都没发现这 5 个问题。
- 用户在模型服务故障时选择“不等自验跑完就启动 Codex”，结果 Codex 的发现提早了约 3 小时，自验也没有找到 Codex 漏掉的产品问题。

### 用户的决定（2026-10-07）

- 自验与独立验证同时跑（v0.33）；开工时对齐验证契约、最终验证前做只读代码审查（v0.34）。
- 前提（v0.35）：只定结果和边界，约束放在开头的需求定义和结尾的验证，中间交给模型；不新增僵硬的脚本检查，给模型能自愈的结果；要人决策的点前置，有分歧记录、不中断；每项改动都要有三家原文和 agent-prompt-rules 依据。
- 用户在另一会话里认可过的三项脚本检查（报告完成条件表的行数、check-delivery 复核 spec 哈希、冻结时检查条款覆盖），按上述前提收回，只保留文字改动。条款覆盖由 core-spec 改成“给查漏方一份条款清单”，见 [core-spec 的设计记录](core-spec-design.md)第八节。

### 改动

| 改动 | 位置 | 依据 |
|---|---|---|
| 完成条件第 1 条改为“verify.md‘完成条件’一节逐条满足” | `SKILL.md` | 完成条件只写在 verify 一处，其他地方指向它（agent-prompt-rules 3.5）；ExecPlan 的验收写成可观察行为（OpenAI）；evaluator 每条标准都是硬门槛（Anthropic harness design）；退出条件先写成可检查的谓词（pstack autonomous-run） |
| 开工时请另一家模型按验证说明预判 plan：逐条写最终怎样判每条完成条件和每个覆盖盲区，指出会判不通过或判不了的地方；回复存证据目录，分歧记进决定清单，verify 不改 | `SKILL.md`“开工” | 写代码前双方先谈好怎样算 done，即 sprint contract（Anthropic harness design）；ExecPlan 用原型里程碑提前排除重大未知（OpenAI）；pilot 用来尽早证伪验证配方（pstack orchestrate）；分歧不找用户（agent-prompt-rules 2.9） |
| 里程碑写明对应的场景和覆盖盲区；里程碑检查按 verify 写的替代判断查覆盖盲区，不再跳过 | `references/plan-format.md`、`references/milestone-check.md` | 每个单元验过再做下一个（pstack sequence-verifiable-units）；功能清单里每项都要仔细测过才标为 passing（Anthropic long-running harness） |
| 里程碑全部通过后，先请另一家模型只读审代码（验证说明第 1、4、5、6 步，不启动应用），owner 核实并只修一轮 | `SKILL.md`“独立验证” | agent 对 agent 的评审循环（OpenAI harness engineering）；任务超出单独可靠完成的范围时 evaluator 值得它的成本（Anthropic harness design）；“Verify each claim against the code”（pstack babysit）；初审不设门槛、修订有上限（agent-prompt-rules 2.6、2.8） |
| owner 的全量自验与独立验证同时开始，验同一个 head，各用自己的实例 | `SKILL.md`“独立验证” | “Use separate chats when independent tasks can run in parallel”（OpenAI Codex long-running work）；在同一 head 上并行扇出独立验证者（pstack autopilot-full）；工作确实能并行才拆（agent-prompt-rules 2.1） |
| 验证说明：执行 verify 完成条件要求的检查；verdict 按完成条件逐条判；报告先逐条写完成条件 | `references/verifier-brief.md` | 写出评分者要查的每一项（Anthropic prompt audit）；验证者逐项写明查什么（agent-prompt-rules 2.4） |
| 跨模型调用加上开工预判和代码审查 | `../skills/core-spec/references/cross-model.md` | 同上 |

`check-delivery.mjs` 不变。

### 接受的代价

- 开工预判多一次只读跨模型调用，第二个真实需求的规模下约 3.5 分钟；代码审查约 10 分钟。
- 自验与独立验证并行：owner 的自验如果发现产品问题，要改代码，验证者在旧 head 上那一轮就白跑了。先过里程碑检查和代码审查，就是为了降低这种情况。
- 完成条件靠文字指向 verify 原文，没有脚本核对报告是否逐条写全，结果由 owner 读报告时自行判断。

### 验证

用第二个真实需求的材料在新的 Codex 会话里做对照（`codex exec -s read-only`，模型 `gpt-6-astra`，2026-10-07）：

- **验证说明（改前、改后各一次）**：在 `2cf29eaefb` 上只判完成条件和决定清单，沿用第 3 周期的场景结果。两次都判 UNVERIFIED，都指出覆盖盲区的替代测试没有证据证明通过。改后的报告按 verify 原文逐条写了 4 条完成条件，并逐个列出 21 个盲区，owner 能直接对着补；改前只用一行带过。这说明改后结构更好用，但不能说明“改后才抓得到”：在只判这一项的条件下，改前的版本也读到了 verify 原文。
- **开工预判（新增步骤，没有改前版本）**：拿第二个真实需求最早的 plan（9-30 开工时）和当时的 verify 预判，用时 3.5 分钟。指出 21 个覆盖盲区都没有安排替代判断，B01 需要真实进程中断，RG3 没有排进任何里程碑，验证与验收一节为空。这些问题在实际交付中要到两天后的第 4、5 周期才被发现。

### 未验证

- 代码审查和并行验证的效果，要在下一个需求上观察：审查报出的问题数和属实数，独立验证还报出几个代码问题，owner 自验有没有独立验证没发现的问题。
- 开工预判只在一个需求上试过一次。
