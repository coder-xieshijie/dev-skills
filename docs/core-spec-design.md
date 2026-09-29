# core-spec 的来源与验证

core-spec 把讨论收敛为 spec.md，再依据 spec 写 verify.md。2026-09-29 以前，写 verify 是单独的 core-verify Skill；合并的原因见第一节。第二节记录 spec 部分，第三节记录 verify 部分。

## 一、合为一个 Skill（2026-09-29）

用户在使用中指出：core-spec 和 core-verify 看起来重复，而且在交付流程里不能单独工作，应当是一个 Skill、产出两份文件。核对合并前的两个 Skill：

- core-verify 第 1 步在没有 spec 时先按 core-spec 生成 spec，发现缺口时也按 core-spec 更新 spec。spec 要到 verify 写完才定稿。
- 查漏说明同时检查 spec 自身、spec → verify、verify → spec；用户一次确认两份文件；deliver 一起核对两份文件的 sha256。
- 两个 Skill 各写了一遍“读会话找最终约定、向用户提最小必要问题、对照核对、最终回复”。

三家都没有把“写 spec”和“写验收标准”做成两个独立的工具或步骤：

| 来源 | 验收写在哪 |
|---|---|
| OpenAI 长任务实践 | 同一份 `Prompt.md` 写目标与非目标、硬约束、交付物和 “Done when”（[Durable project memory](../skills/agent-prompt-rules/references/sources/openai/run-long-horizon-tasks-with-codex.md#the-key-idea-durable-project-memory)） |
| OpenAI Codex 长时运行 | 一个目标同时写 Outcome、Constraints、Verification（[Define what done means](../skills/agent-prompt-rules/references/sources/openai/codex-long-running-work.md#define-what-done-means)） |
| OpenAI ExecPlan | 同一份计划里的 “Validation and Acceptance”（[原文](https://cookbook.openai.com/articles/codex_exec_plans)） |
| Anthropic Claude Code | 访谈后写 SPEC.md，结尾是证明功能可用的端到端验证步骤（[Let Claude interview you](../skills/agent-prompt-rules/references/sources/anthropic/claude-code-best-practices.md#let-claude-interview-you)） |
| Anthropic 长任务 harness | 初始化 agent 按 spec 展开功能清单，每项带测试步骤；单独成文件是为了只允许编码 agent 改 `passes`，产出者仍是同一个 agent（[Feature list](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#feature-list)） |
| pstack | 第一条指令里写完成条件和要看的证据（[06-verify-and-ship](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/docs/guide/06-verify-and-ship.md)） |

三家要分开的是评判的一方与实现的一方，不是 spec 与验收的作者。本 Skill 的对应做法是第 7 步由另一家模型查漏，以及 deliver 的独立验证。

合并后的结构：

- 八步：第 1–4 步写 spec 并核对；第 5 步按入口和状态找 spec 缺口；第 6 步写 verify；第 7 步跨模型查漏；第 8 步请用户一次确认。
- 仍产出两个文件，分别核对 sha256；“验收要求只从 spec 来”保留为规则，由第 7 步查漏中的“verify → spec”一项检查。
- 用户只要 spec 时，做完第 1–4 步即交付，保留原 core-spec 供 design-for-review、plan-for-agents 和汇报使用的用途。
- 写 verify 的规则只在需要 verify 时读，放进 `references/verify.md`；写 spec 的规则两种用法都需要，留在正文。原 core-verify 的示例、查漏说明、跨模型调用移入 core-spec 的 `references/`。
- 规则内容没有改：正文第 1–3 步与原 core-spec 相同；`references/verify.md` 第 2–5 节与原 core-verify 第 2–5 节相同，只改了示例的链接。
- 已有定稿 spec、只写验收时，从第 5 步开始，不重新收敛 spec。原 core-verify 支持这种用法，合并后保留。

### 合并的验证

- 链接：把 `agent-prompt-rules/scripts/check-links.mjs` 的根目录改成仓库根目录运行，48 个 Markdown 文件的相对链接和锚点全部能解析；CI 原有的检查通过；`git diff --check` 通过。`quick_validate.py` 只报 `disable-model-invocation` 为未知字段，与上文 README 的说明一致。
- 规则搬迁：正文第 1–3 步与原 core-spec 逐行比对，除第 3 步标题外相同；`references/verify.md` 第 2–5 节由脚本从原 core-verify 截取，只改了示例链接。
- 跨模型审查：Codex（codex-cli 0.158.0-alpha.2.1，`gpt-5.6-sol`，xhigh，`-s read-only`）对照合并前后的正文审查，用时约 6 分钟，报出 3 条问题，都已处理：
  - README 中的 Skill 数量没有更新，已改为八个；
  - 合并后还没有用真实请求调用过，补做了下面的分支测试；
  - 已有定稿 spec、只写验收时，流程会从第 1 步重新收敛，可能改写定稿的 spec，已增加上面这个起点。
- 分支调用测试：同一版本的 Codex 在两个隔离的临时仓库中读取合并后的 SKILL.md 执行，并行运行，各约 6 分钟。
  - 只要 spec：输入是 [spec 示例](../skills/core-spec/references/spec-example.md)的讨论材料。只产出 spec.md，没有写 verify，也没有调用查漏。未确认的类名和表名没有写进 spec；“不改命令行输出格式”是助手推断，用户没有回应，所以没有写成非目标，而是转成了给用户的问题。
  - 已有定稿 spec、写验收：输入是 2026-09-29 查漏试运行用的脱敏 spec，要求停在第 7 步之前。从第 5 步开始，spec.md 的 sha256 前后一致，产出 21 条要求、14 个场景。找出的 4 处 spec 缺口（并发时最后一次额度归谁、跨入口共享、重启持久化、收尾请求是否计数）都转成给用户的问题，没有自行补写。
  - 观察，未改规则：第二个测试把 spec 的“交付与授权”也写成了 3 条要求，证明方式为机械检查。授权由 deliver 执行和核对，这样写是否多余，留到真实使用后再判断。
- 尚未验证：第 7 步查漏在合并后的真实调用；从讨论开始走完第 1–8 步的完整流程；Claude Code 中的手动调用（软链接尚未安装）。


## 二、spec 部分

### 从真实讨论中提炼的任务

用户在一次模块迁移与计量规则改造中，经过多轮澄清、grill 与源码核对，形成需求稿、术语表、迁移边界、专项方案和 ADR，随后要求将这些材料整理成一个文件。需求逐次明确为：

| 收敛阶段 | 暴露的问题 | 最终采用的规则 |
| --- | --- | --- |
| 多份材料合成完整规格 | 包含实施步骤和详细验收，超出核心决策用途 | 筛选会影响后续设计和实现判断的约定 |
| 分为开发决策与 Review 原则 | 同一条经常兼具两者，分类增加理解负担 | 按需要共同判断的问题组织 |
| 平铺全部约定，再按主题分组 | 主题告诉读者在谈什么，仍需读者自行提炼重点 | 核心决定前置 |
| 建议将所有主题改成结论标题 | 仍试图在开头覆盖全部内容，没有体现重要性差异 | 开头只选最重要的 3–5 个决定，后文负责完整 |
| 明确文档用途 | 只面向 Review 的描述过窄 | 同时服务设计、实现、审查与人工核对和汇报 |
| 对照原始材料复查 | 重组只证明精简版条款仍在，未证明最初压缩没有丢失边界 | 以原始约定和最终确认作为基线，验收语义而非文本数量 |

关键不是文件拼接或按时间总结，而是先确定最终有效的约定，再有选择地突出重点，最后完整保存足以约束未来行为的细节。摘要与正文允许必要重复；过程、已否决方案与未采纳实现建议不进入最终约定。

### 与现有 Skill 的边界

- `grilling` 在讨论中发现和解决问题；`core-spec` 在讨论后整理共识，只有关键未决冲突才继续提问。
- Matt Pocock 的 `to-spec` 将讨论整理为完整开发规格并发布到任务系统；`core-spec` 聚焦最终决策与约束，交付单份 Markdown。
- ADR 保留单项重要选择的背景、理由与后果；`core-spec` 汇集当前有效、供后续设计与实现共同遵循的约定。
- `design-for-review` 解释完整技术方案；`core-spec` 固化方案应满足的决定与约束。
- `mr-for-human` 帮人理解已存在的代码变化；`core-spec` 本身不证明实现完成或验证通过。

不将来源任务中的模块名、预算规则、文件数或最终条目数固化成通用要求。

### spec 部分的验证记录

已读取真实会话中“合成一个文件”到“同意金字塔结构”的用户请求、修订意见及最终产物，并与需求稿、ADR、产物总览交叉核对。特别核对了后续 fork 中对用途、编号和摘要选择性的修正。

基于真实请求逐项检查了 Skill 的流程覆盖：

- 既有多份文件可作为输入，但默认只交付一份 spec。
- 新决定替代旧提议；保留行为与实现建议不混作用户确认。
- 开头有选择地突出重点，正文负责完整，避免抽象主题表代替核心决定。
- 决定旁保留边界与接受的代价；不以条目数量证明信息没有丢失。
- 文档适用于 agent 与人，同时明确要求不等于交付状态。

脱敏示例用于核对旧方案被替代、历史额度标注、最后一次请求的处理边界和接受无总结的取舍。此项是静态案例走查，不是独立 agent 的实际调用测试。

#### 成稿检查的验收

后续真实 check 发现，原有主干仍在，但计量生命周期、收尾额度、验证错误处理和范围边界可能在压缩时丢失。复核也发现，检查建议不能一律补回：已覆盖的共享依赖无需单列，已有工程规范可引用，未采纳的实现建议不能成为新要求。

因此加强入口第 4 步，以“存在符合成稿却违反已确认约定的合理实现”为反例检查，同时直接保留已接受的重要代价。通过要求关键遗漏、无依据新增、实质冲突和影响实现的歧义均已解决；材料或确认缺失时交付待确认稿。发现问题后只修正必要内容，并重查受影响规则与摘要。

已用脱敏检查案例静态走查八种情境：中间摘要遗漏、收尾额度歧义、接受代价缺失、已有范围覆盖、规范引用、建议冒充约定、摘要与正文矛盾、缺少最终确认。各例明确依据、候选表述和预期处置，覆盖补写、不补、引用、移除及保留待确认。尚未进行独立新会话行为测试，不将案例走查视为自动化测试通过。

文件结构和格式通过 `quick_validate.py` 与 `git diff --check` 检查。未新增脚本；客户端入口尚未安装。新会话中的自动选择、实际生成效果与客户端发现仍待实际使用验证。

### 为自动交付补充的四项（2026-09-29）

用户的交付流程改为：用户只在定义阶段做决定，之后由 [deliver](../skills/deliver/SKILL.md) 全自动交付到 MR 可合入。交付中的 agent 只能按 spec 自行判断，因此 spec 需要多写四项。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| 开头用一两句写目的：完成后用户能做什么，怎样看到它生效 | 实现只满足条款字面，做出能运行却没有用的东西 | OpenAI ExecPlan：“Purpose and intent come first”（[原文](https://cookbook.openai.com/articles/codex_exec_plans)）；OpenAI 长任务实践中 Prompt.md 的用途是“Freeze the target so the agent doesn’t build something impressive but wrong”（[Durable project memory](../skills/agent-prompt-rules/references/sources/openai/run-long-horizon-tasks-with-codex.md#the-key-idea-durable-project-memory)） |
| 必须有非目标 | 自主执行时范围扩大，改动没人要求的行为 | Prompt.md 的“Goals + non-goals”（同上）；Claude Code 建议好的 spec “state what is out of scope”（[Let Claude interview you](../skills/agent-prompt-rules/references/sources/anthropic/claude-code-best-practices.md#let-claude-interview-you)） |
| 适用时逐类检查硬约束 | 必须满足的条件被当作可以取舍的偏好 | Prompt.md 的“Hard constraints (perf, determinism, UX, platform)”（同上） |
| 用于自动交付时写交付与授权：目标仓库与分支、能否推送并开 MR、能否合入、允许的不可逆操作 | 交付做到一半停下等人，或做了没被授权的操作 | Prompt.md 的“Deliverables”（同上）；pstack `autopilot-full`：操作者的完全授权加独立验证的通过结论才构成合入授权，操作者点名的条目停在可合入（[原文](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/autopilot-full.md)）；`principle-never-block-on-the-human`：不可逆操作仍需确认（[原文](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-never-block-on-the-human/SKILL.md)） |
| 非目标和授权只由用户决定，没有定下时作为问题提出 | 助手推断的非目标限制了实现范围；授权被自行放宽 | 本 Skill 第 1 步“助手建议不升级为约定”；[agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md) 二-9 |

脱敏示例补了目的、非目标和交付与授权，检查案例补了两条：只有“交给 agent 做完”时不能写成可以合入；讨论没有谈到不做什么时，不替用户列非目标。这是静态案例走查。

## 三、verify 部分

### 从真实流程中提炼的任务

用户的复杂需求交付流程（2026-09-29 版）是：在一个定义 session 里多轮澄清，依次产出 `spec.md`、`verify.md`；另一家模型在新 session 中查漏，用户确认一次，两份文件冻结；之后一个 owner session 用 [deliver](../skills/deliver/SKILL.md) 全自动交付到 MR 可合入，plan 由 owner 边做边写。spec 是需求的唯一依据，verify 是判定的唯一依据。

最初的流程是 grill 会话依次产出 spec、verify、plan，再新开会话做交叉评审。core-spec 负责 spec，中间的验收文档此前没有对应 Skill。过往任务中，多次在交付后才由人发现问题：

- 设置页面显示了新值，实际发出的请求仍用旧值；
- 各模块分别完成，默认启动路径却没有接上新能力；
- 后台任务结束后，本应自动继续的流程没有继续；
- 文本层面的测试通过，真实终端入口没有验证。

共同点是局部测试都通过了，真实入口、组合路径和实际结果没有被验证，并且验收标准是在实现之后才补的。verify 要在写 plan 和代码之前，从 spec 得出“怎样算做对、怎样证明”。

### 与现有 Skill 的边界

- spec 固化已选定的决定与约束，不含详细测试清单；verify 把这些约定转成可判断的要求和场景。写 verify 时发现 spec 缺少会改变判定的行为，回到第 5 步更新 spec，不自行补语义。
- `deliver` 的 owner 写 plan 并实施：里程碑对应 verify 的场景，验证工具缺口排在最前面；verify 只规定验什么、怎样判定。
- `review-rules` 用于评审代码和设计；spec 和 verify 由另一家模型在新 session 中查漏（第 7 步），再由用户确认。
- 本 Skill 不写测试代码、不执行验证。执行结果、状态判定和证据留给 deliver 的自验和独立验证。

### 规则与依据

按 [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md) 第四节第 1 条，逐条列出 Skill 中的规则、它针对的问题和依据。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| spec 是唯一需求来源，在 plan 和代码之前写 | 从实现或计划反推验收，与实现共享遗漏 | 用户流程决定；Factory 在实现前定义断言并分配到功能切片（[演讲](https://www.youtube.com/watch?v=ow1we5PzK-o&t=394s)，06:34–08:06） |
| 逐条列出默认值、例外、不得发生的事、接受的代价 | 合并条款时丢掉条件，只核对主题 | [core-spec](../skills/core-spec/SKILL.md) 第 4 步；[plan-for-agents](../skills/plan-for-agents/SKILL.md) 第 5 步正向覆盖 |
| 未定行为回写 spec，不自行补 | 模型用看似合理的默认值补齐语义，验收与 spec 分叉 | grilling 的“决定由用户做”；agent-prompt-rules 二-9 |
| 证明方式分场景、机械检查、已有检查；结构性约束写成 lint 或结构测试，一个约束一条规则 | 结构性约束被硬写成运行场景，或者没人验 | OpenAI Harness engineering：用自定义 lint 和结构测试机械地守住分层与品味规则，“enforcing invariants, not micromanaging implementations”（[原文](https://openai.com/index/harness-engineering/)） |
| 观察实际参数、持久状态、默认装配和最终副作用 | 只看界面显示或内部调用，漏掉真正的结果 | 上文过往问题；pstack `create-verification-skill` 要求记录动作、结果与副作用 |
| 每个场景写一个错误实现 | 断言太松，错误实现照样通过 | SWE-Bench Pro 审计发现测试漏测（[OpenAI](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)）；Anthropic 观察到评估者倾向浅层测试、放过问题（[Harness design](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#running-the-harness)） |
| 断言只约束 spec 约定的内容 | 断言太窄，误拒其他正确实现 | SWE-Bench Pro 审计发现过窄测试（同上；[修订论文](https://arxiv.org/html/2609.08149v2)） |
| mock 只证明它边界内的行为 | mock 通过被当作真实验证 | 上文过往问题 |
| 定位入口，列出验证工具缺口 | 到验收时才发现无法操作或观察；配置写了验证步骤，脚本却不存在 | pstack `create-verification-skill`（启动、真实驱动、保留证据）；Anthropic 长任务文章要求先准备启动与验证入口（[Effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)） |
| 执行状态如实标注 | 占位命令被当成可执行 | 同上 |
| 交付前双向核对，作为完成条件 | 与 core-spec、plan-for-agents 一致；独立检查由第 7 步的跨模型查漏承担，不另设作者复查轮次 | agent-prompt-rules 一-2、二-5 |

#### 以端到端场景为验收单位：Anthropic 与 OpenAI 的长任务 harness

早期版本按风险把场景分成单元、集成、真实入口三层。“风险”没有可操作的判定标准，力度只能靠模型当次判断；三家的做法都把验收放在用户可观察的端到端结果上。据此改为下列规则。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| 场景是用户在一个入口上完成的一次完整操作及其结果，默认从真实入口驱动，由实现 agent 自己运行；单元测试属于实现，不写进 verify | 单测和接口调用通过，端到端却不通 | Anthropic [Effective harnesses](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#testing)：Claude 会用单测或 `curl` 测试，却没发现功能端到端不通，改用浏览器自动化“像真实用户一样”测试后显著改善；功能清单每项是用户能完成的一件事（[Feature list](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#feature-list)）；OpenAI：agent 通过驱动应用验证修复（[原文](../skills/agent-prompt-rules/references/sources/openai/harness-engineering.md#increasing-levels-of-autonomy)） |
| 拆与合：结果不同就拆；同一入口、同一前提、能在一次流程里依次检查的合成一个场景，每个结果一个检查点；不按实现步骤拆 | 按实现步骤拆导致重复和过细；只列主题导致漏掉例外 | Anthropic 功能清单：一项下列多个验证步骤（新建对话同时检查创建、欢迎状态、侧边栏）；Harness design 的 sprint 合同以可测行为为单位，游戏编辑器一个 sprint 有 27 条（[Running the harness](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#running-the-harness)） |
| 从入口看不到的内部规则先补可观察性（日志、指标、链路追踪、只读查询），外部依赖的失败用对接层替身触发 | 看不到的内部规则被降成单测，或者没人验 | OpenAI：日志、指标、链路追踪对 agent 可查，使“服务启动在 800ms 内”这类要求可以验证（[Increasing application legibility](../skills/agent-prompt-rules/references/sources/openai/harness-engineering.md#increasing-application-legibility)） |
| 冒烟集：每个实现会话开始时先跑 2–5 条核心旅程 | 上一次留下的坏状态在新功能开发中被放大 | Anthropic：开始新功能前先跑一遍基本端到端测试（[Getting up to speed](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#getting-up-to-speed)） |
| 覆盖盲区单列，盲区内的检查点不能标为已验证 | 工具看不到的地方被当作通过 | Anthropic：Puppeteer 看不到浏览器原生弹窗，依赖它的功能 bug 更多（[Testing](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#testing)） |
| 检查点断言交互效果，空壳功能必须失败 | 只能显示、不能交互的功能被判通过 | Harness design：QA 发现 DAW 的片段不能拖动、录音只是按钮样子（[Results from the updated harness](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#results-from-the-updated-harness)） |
| 实现 agent 实际运行通过才算通过；冻结后不修改场景和检查点 | 为变绿改测试，或未运行就标完成 | Anthropic：“It is unacceptable to remove or edit tests”，只在仔细测试后标记通过（[Feature list](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#feature-list)） |

三家都没有给出场景数量或粒度的上限；Anthropic 的 200 多项、27 条是单个例子。Anthropic 所说的“过重”指 harness 组件和轮次，原文随后逐个拆除组件、模型变强后取消 sprint；本 Skill 因此只设第 7 步的一次跨模型查漏（最多两轮），不另加作者复查；理由见下文“换一家模型查漏”。是否需要更多独立评估，按任务是否超出模型单独可靠完成的范围决定（[Removing the sprint construct](../skills/agent-prompt-rules/references/sources/anthropic/harness-design-long-running-apps.md#removing-the-sprint-construct)）。

#### 吸收 Lauren Tan 的 pstack 验证实践

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

### 换一家模型查漏（2026-09-29）

用户把流程改为“人只在定义阶段做决定，之后全自动交付”，并决定查漏开新 session、用与写文档不同家族的模型。交付阶段只按 spec 和 verify 判定，定义阶段漏掉的问题没有人再拦，所以查漏放在用户确认之前。

| 规则 | 不写时容易出的问题 | 依据 |
|---|---|---|
| 查漏在新 session 里做，只给 spec、verify 和仓库，不给会话 | 作者自查容易放行；看过讨论的查漏方会沿用同样的假设 | [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md) 二-3；Claude Code 的对抗式复查（[Add an adversarial review step](../skills/agent-prompt-rules/references/sources/anthropic/claude-code-best-practices.md#add-an-adversarial-review-step)） |
| 用不同家族的模型 | 同一模型、相近上下文会犯同样的错 | agent-prompt-rules 二-7；pstack `orchestrate`：“Run a unit's verifier on a different model family from its worker”（[原文](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/poteto-mode/playbooks/orchestrate.md)）；用户 2026-09-29 的决定 |
| 查什么写死在 `references/gap-check.md`，调用时引用，不由作者临时写 | 作者临时写的说明会不自觉地缩小检查范围，只写“检查一下”会看几眼就放行 | agent-prompt-rules 二-4 |
| 只报告会让交付做错或无法判定的问题，其他建议最多三条、标为可选 | 让它“找缺口”，它总会报出一些，逐条追改导致过度设计 | agent-prompt-rules 二-4 |
| 查漏方只报告；verify 的问题作者直接改，spec 的问题转成给用户的问题 | 查漏方或作者替用户补定语义 | agent-prompt-rules 二-3、二-9；本 Skill 第 1 步 |
| 最多两轮，第二轮仍有的问题交给用户 | 循环不收敛 | agent-prompt-rules 二-8 |
| 最终回复给出两份文件的 sha256，用户确认后冻结 | 交付中改 verify 让结果变绿 | deliver 的机械检查；Anthropic：“It is unacceptable to remove or edit tests”（[Feature list](../skills/agent-prompt-rules/references/sources/anthropic/effective-harnesses-for-long-running-agents.md#feature-list)） |
| 非目标列为规范性内容，涉及的现有行为进入回归范围 | 违反非目标的实现照样通过验收 | 2026-09-29 查漏试运行报出的问题，见验证记录 |

跨模型的调用方式写在 `references/cross-model.md`，由查漏和 deliver 的独立验证共用。

### 有意不放进 Skill 的内容

| 内容 | 原因 |
|---|---|
| 执行状态与聚合规则（通过、失败、受阻、未运行、证据过期） | 属于实现后的验收执行，写 verify 时还没有执行 |
| 每个场景的环境、数据隔离、清理和超时 | 功能尚未实现，多数只能在验收时绑定 |
| JSON 格式 | 人和 agent 读同一份 Markdown；需要机器判定时再定 |
| 单元测试 | 属于实现；验收从入口证明结果 |
| 按风险把场景分成单元、集成、真实入口三层 | 早期版本做法；“风险”没有可操作的判定标准，改为以端到端场景为单位，见上文 |
| 性能、权限、并发等专项清单 | spec 有要求时自然进入要求表，Skill 不额外添加没有依据的标准 |

### verify 部分的验证记录

- 脱敏示例沿用 core-spec 示例中的“执行额度改造”spec，逐项走查了要求拆分、场景拆与合、证明方式选择、错误实现、基线预期、入口覆盖、冒烟集、覆盖盲区和十七个检查案例。这是静态案例走查。
- 建议按 pstack [PR #419](https://github.com/cursor/plugins/pull/419) 的做法评估本 Skill：固定一组带已知遗漏的历史 spec 作为种子缺陷，比较产出的 verify.md 能拦住多少遗漏，同时统计无依据的场景（噪声）；一次只改一处规则。
- 2026-09-29 用 Codex（codex-cli 0.158.0-alpha.2.1，`gpt-5.6-sol`，xhigh，`-s read-only`）按 `references/gap-check.md` 对脱敏示例拼成的 spec、verify 做查漏：用时约 1 分钟，约 4.1 万 token，报告格式符合说明。共报出 10 条问题：
  - 3 条来自示例仓库本身：没有应用代码，没有 `main` 分支，S03–S05 在示例里被省略。这在预期之内。
  - 2 条是示例的真实缺陷，已修正：S02 用的任务本来只请求一次，不检查额度的实现也能通过；非目标没有对应的要求。第二条同时在 `references/verify.md` 第 1 节的规范性内容里加入了非目标。
  - 5 条指出示例 spec 为了简短省掉的定义，例如“逻辑请求”的边界、各种停止状态下是否收尾。
- 查漏过程中，Codex 没有写入文件，只读沙箱生效。`claude -p` 路径没有测试：在本次会话的 shell 里，`claude auth status` 显示未登录。
- 尚未在真实 spec 上调用本 Skill，也没有用独立 agent 测试触发和产出；需要在第一次真实使用后核对：场景能否覆盖当时实际发生的遗漏、工具缺口是否在实现前被补上、交叉评审是否还要大量补场景。
