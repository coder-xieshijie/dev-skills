---
name: agent-prompt-rules
description: 为写给 agent 的 prompt、多 agent pipeline 和 SKILL.md 提供依据官方原文的设计规则与修改流程。用于编写、修改或审查这些内容。
disable-model-invocation: true
---

# 写给 agent 的 prompt、pipeline 与 Skill 设计规范

编写、修改或审查以下内容时，逐条对照本规范，并按第四节的流程改动：调度方（派发任务的 agent 或脚本）写给执行端（接收任务的子 agent 或外部 agent）的 prompt、多 agent pipeline、`SKILL.md`（包括 frontmatter 里的 `description`），以及执行端会读到的 Skill。每条规则后面列出官方原文出处。原文存档在 [references/sources/](references/sources/README.md)，引用以存档里的原文为准。

## 总原则

**每条指令、每个角色、每个步骤，都是在补一项"模型自己做不到"的假设。** 模型变强后，这些假设会过时，过时的就删掉。判断一条内容该不该留，问一句：删掉它，模型会做错吗？不会就删，或者改成由运行时强制。

依据：[Harness design · Iterating on the harness](references/sources/anthropic/harness-design-long-running-apps.md#iterating-on-the-harness)、[Fable 5 · Recommended scaffolding changes](references/sources/anthropic/prompting-claude-fable-5.md#recommended-scaffolding-changes)、[Claude Code · Write an effective CLAUDE.md](references/sources/anthropic/claude-code-best-practices.md#write-an-effective-claudemd)、[GPT-6 Astra · Up-to-date AGENTS.md](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#up-to-date-agentsmd)、[Scaling Managed Agents](references/sources/anthropic/scaling-managed-agents.md)（开篇：旧模型需要的 context reset 在新模型上成了累赘）。

"做减法"减的是行为约束，不是背景。背景是只有作者知道的信息：受众、环境事实、质量标准、约束背后的原因。背景宁多勿少：委派时任务描述过于简略，执行端会用保守的默认做法填空，重复劳动、漏掉部分或误解任务。行为约束是要求执行端怎样做的句子，逐条验证后再删，验证方法见第四节第 5 条。目标、完成标准和少量真实的边界始终要写清楚。

依据：[Prompt audit · Step 3](references/sources/anthropic/prompt-audit.md#step-3-classify-every-line---the-deletion-rule)（背景与行为约束分开判断）、[Prompt audit · What not to flag](references/sources/anthropic/prompt-audit.md#what-not-to-flag---the-keep-list)（"give the model more context than seems necessary, not less"）、[Multi-agent research system · Prompt engineering](references/sources/anthropic/multi-agent-research-system.md#prompt-engineering-and-evaluations-for-research-agents)、[Context engineering · The anatomy of effective context](references/sources/anthropic/effective-context-engineering.md#the-anatomy-of-effective-context)。

**优先级。** 用户的明确要求高于本规范和任何 Skill。依据：[Using GPT-6 · Instruction following](references/sources/openai/using-gpt-6.md#instruction-following)。

**只对某个模型成立的建议。** 官方指南里点名某个模型的建议，只在那个模型上测过。不同模型的建议冲突时，写成对各模型都成立的结果要求，不照抄某个模型的专用指令。例如验证：Opus 5 指南建议删掉验证指令，Fable 5 指南建议在长任务里明确要求用子 agent 按间隔验证。依据：[Prompting best practices · General principles](references/sources/anthropic/claude-prompting-best-practices.md#general-principles)。

## 一、调度方写给执行端的 prompt

1. **写结果、目的和完成标准，不写步骤。** 说清要什么、给谁用、做到什么程度算完成。只有用户或 pipeline 明确要求时，才规定过程。
   依据：[Codex Prompting · Describe the result you need](references/sources/openai/codex-prompting.md#describe-the-result-you-need)、[Codex Prompting · Prompting overview](references/sources/openai/codex-prompting.md#prompting-overview)、[Fable 5 · Give the reason, not only the request](references/sources/anthropic/prompting-claude-fable-5.md#give-the-reason-not-only-the-request)、[Codex Long-running work · Define what done means](references/sources/openai/codex-long-running-work.md#define-what-done-means)、[Opus 5 · Capability improvements](references/sources/anthropic/prompting-claude-opus-5.md#capability-improvements)（"performs best when given the complete task specification up front and left to run"）。

2. **完成标准写成可观察的结果和要交回的证据。** 验证类指令分两种。"再检查一遍""回复前验证两次"这类复查仪式不写。能运行的真实检查写进完成标准：给出可以直接运行的命令或脚本，例如测试、类型检查、构建、调用改动后的命令，要求交回它的输出；检查跑不了时，说明哪项没跑、为什么。用户自己提出的验证要求原样转达。
   依据：[Reducing cost · Instructions](references/sources/anthropic/reducing-cost-and-improving-performance.md#instructions)（"Verification rituals"）、[Opus 5 · Task scope and over-verification](references/sources/anthropic/prompting-claude-opus-5.md#task-scope-and-over-verification)、[Opus 5 · Self-correction](references/sources/anthropic/prompting-claude-opus-5.md#self-correction)、[GPT-6 Astra · Up-to-date AGENTS.md](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#up-to-date-agentsmd)（测试类指令会导致不必要的测试）、[Using GPT-6 · Testing and verification](references/sources/openai/using-gpt-6.md#testing-and-verification)、[Sonnet 5.5 · Verification on coding tasks](references/sources/anthropic/prompting-claude-sonnet-5-5.md#verification-on-coding-tasks)（"say which one you did not run and why"）、[Claude Code · Give Claude a way to verify its work](references/sources/anthropic/claude-code-best-practices.md#give-claude-a-way-to-verify-its-work)、[Prompt audit · 1c](references/sources/anthropic/prompt-audit.md#1c-over-specification---describe-the-goal-not-the-method)（"State outcomes, constraints, and how to verify"）。

3. **材料写清用途和什么时候用，不要求"先读完再动手"。** 给出路径，由执行端按需读取。只有用户或 pipeline 明确要求全文时，才要求完整阅读。
   依据：[GPT-6 Astra · Up-to-date AGENTS.md](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#up-to-date-agentsmd)、[Context engineering · Context retrieval and agentic search](references/sources/anthropic/effective-context-engineering.md#context-retrieval-and-agentic-search)、[Harness engineering · Repository knowledge as the system of record](references/sources/openai/harness-engineering.md#we-made-repository-knowledge-the-system-of-record)。

4. **边界只写真正会出问题的一两条，每条附上原因，只写一次，用正面表述。** 执行端会照字面执行，措辞强硬的边界会让它在本可继续的地方停下；叠加的禁止句和强调词会稀释真正重要的那条。真实存在的边界仍要写明。
   依据：[Codex Prompting · Set boundaries that prevent real problems](references/sources/openai/codex-prompting.md#set-boundaries-that-prevent-real-problems)、[GPT-6 Astra · Decision boundaries](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#decision-boundaries)、[Prompting best practices · Add context to improve performance](references/sources/anthropic/claude-prompting-best-practices.md#add-context-to-improve-performance)、[Claude Code · Write an effective CLAUDE.md](references/sources/anthropic/claude-code-best-practices.md#write-an-effective-claudemd)、[Fable 5 · State the boundaries](references/sources/anthropic/prompting-claude-fable-5.md#state-the-boundaries)。

5. **授权执行端无人值守地把工作做完。** 可回退、在授权范围内的工作直接做；先完成不受问题阻塞的部分；只有用户才能决定的事，以及破坏性、不可逆的操作，才交回调度方。
   依据：[Fable 5.1 · Finish the whole task](references/sources/anthropic/prompting-claude-fable-5-1.md#finish-the-whole-task)、[Fable 5 · Strong instruction following](references/sources/anthropic/prompting-claude-fable-5.md#strong-instruction-following)、[Using GPT-6 · Initiative and follow-through](references/sources/openai/using-gpt-6.md#initiative-and-follow-through)、[GPT-6 Astra · Persistence](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#persistence)。

6. **不规定方法。** 算法、库、命令顺序、测试数量都留给执行端，除非用户有要求。要守住的是不变量，不是实现方式。用不用子 agent 也由执行端决定；harness 默认不派子 agent，或执行端容易多派（例如自己派评审子 agent）时，写一条派或不派的适用条件，并写明原因，例如每多一个 agent 就多一份 token 和时间，或者某部分工作需要隔离上下文。
   依据：[Fable 5.1 · Finish the whole task](references/sources/anthropic/prompting-claude-fable-5-1.md#finish-the-whole-task)（"without much guidance on methodology"）、[Harness engineering · Enforcing architecture and taste](references/sources/openai/harness-engineering.md#enforcing-architecture-and-taste)、[Harness design · The architecture](references/sources/anthropic/harness-design-long-running-apps.md#the-architecture)（planner 只约束交付物，路径留给执行者）、[Sonnet 5.5 · Steer initiative and scope](references/sources/anthropic/prompting-claude-sonnet-5-5.md#steer-initiative-and-scope)（"don't launch reviewer sub-agents unless the user asked for a review"）、[Opus 5 · Controlling subagent spawning](references/sources/anthropic/prompting-claude-opus-5.md#controlling-subagent-spawning)、[Using GPT-6 · Subagent delegation](references/sources/openai/using-gpt-6.md#subagent-delegation)、[Codex Subagents · Orchestration and thread controls](references/sources/openai/codex-subagents.md#orchestration-and-thread-controls)（本地版只在用户直接要求或有适用的项目、Skill 指令时才派）。

7. **不要求执行端在回复里复述推理过程。** 这类指令可能被判为提取推理而拒绝执行。
   依据：[Fable 5 · Recommended scaffolding changes](references/sources/anthropic/prompting-claude-fable-5.md#recommended-scaffolding-changes)。

8. **只有文字、没有工具调用的结尾是一次汇报，不代表完成。** 执行端交回时仍列着未完成、又没说明被什么卡住的事项，调度方就在同一 session 里点名这些事项让它继续；同一任务最多续 2–3 次。
   依据：[Opus 5.5 · Unattended agentic runs](references/sources/anthropic/prompting-claude-opus-5-5.md#unattended-agentic-runs)。

9. **不向执行端描述评分者，只写评分者会查的每一项要求。** "之后有人评审""有隐藏测试"这类说法描述的是检查机制，不是要求，会把执行端的力气引向"被检查"。验证者要查的每一项，都直接写进完成标准。
   依据：[Prompt audit · 1c](references/sources/anthropic/prompt-audit.md#1c-over-specification---describe-the-goal-not-the-method)（"State every requirement the grader checks; never describe the grader"）。

## 二、Pipeline 设计

1. **从一个 agent 开始，有明确收益才拆。** 值得拆的情况只有四种：上下文会互相污染、工作确实能并行、需要不同的工具或互相冲突的指令、需要独立验证。多 agent 一般要多花 3–10 倍 token。
   依据：[Multi-agent systems · Starting with a single agent](references/sources/anthropic/building-multi-agent-systems-when-and-how.md#the-case-for-starting-with-a-single-agent)、[Multi-agent systems · Decision framework](references/sources/anthropic/building-multi-agent-systems-when-and-how.md#a-decision-framework-for-multi-agent-systems)、[Orchestration · Add specialists only when the contract changes](references/sources/openai/orchestration-and-handoffs.md#add-specialists-only-when-the-contract-changes)、[Building effective agents · When to use agents](references/sources/anthropic/building-effective-agents.md#when-and-when-not-to-use-agents)。

2. **按上下文边界拆，不按工种拆。** 已经掌握某份上下文的角色，接着做依赖这份上下文的下一步；同一件事的规划、实现、测试不拆给不同角色，否则信息每交接一次就丢一部分。可以拆开的边界有三类：互不相关的调研方向、接口清晰的组件、只看结果的验证。例：核查过评审处置结论的 checker 接着写修订后的 plan，不另派新角色从头读一遍争议。
   依据：[Multi-agent systems · Context-centric decomposition](references/sources/anthropic/building-multi-agent-systems-when-and-how.md#context-centric-decomposition)、[Multi-agent research system · Appendix](references/sources/anthropic/multi-agent-research-system.md#appendix)（"game of telephone"）。

3. **检查交给新 session，不让作者检查自己。** 作者评价自己的产出，倾向于放行。验证者只拿到完成标准、产物和原始材料，拿不到过程中的讨论；验证者只报告问题、不改产物，由作者按报告修改。
   依据：[Harness design · Why naive implementations fall short](references/sources/anthropic/harness-design-long-running-apps.md#why-naive-implementations-fall-short)、[Fable 5 · Recommended scaffolding changes](references/sources/anthropic/prompting-claude-fable-5.md#recommended-scaffolding-changes)（"fresh-context verifier subagents tend to outperform self-critique"）、[Claude Code · Run multiple Claude sessions](references/sources/anthropic/claude-code-best-practices.md#run-multiple-claude-sessions)、[Claude Code · Add an adversarial review step](references/sources/anthropic/claude-code-best-practices.md#add-an-adversarial-review-step)、[Multi-agent systems · The verification subagent pattern](references/sources/anthropic/building-multi-agent-systems-when-and-how.md#the-verification-subagent-pattern)。

4. **验证者的 prompt 逐项写明查什么、怎样算不通过，并且只让它报告影响正确性或既定要求的问题。** 只写"检查一下"，验证者会看几眼就放行；反过来，让它"找缺口"，即使工作没问题它也会报出一些，逐条追改会导致过度设计，所以其余意见标为可选。这和第一节第 2 条不冲突：验证本身就是验证者的任务。
   依据：[Multi-agent systems · The early victory problem](references/sources/anthropic/building-multi-agent-systems-when-and-how.md#the-early-victory-problem)、[Harness design · Running the harness](references/sources/anthropic/harness-design-long-running-apps.md#running-the-harness)（"Out of the box, Claude is a poor QA agent"）、[Claude Code · Add an adversarial review step](references/sources/anthropic/claude-code-best-practices.md#add-an-adversarial-review-step)。

5. **独立验证按需设置，同一作者的重复检查不设。** 任务超出模型单独可靠完成的范围时（长时间运行、大文档、需要跨多份来源保持一致），才加独立验证者。要删的是作者重读自己的产出、自己确认的额外轮次；作者运行测试或脚本、按结果修复，是第一节第 2 条的真实检查，保留。
   依据：[Harness design · Removing the sprint construct](references/sources/anthropic/harness-design-long-running-apps.md#removing-the-sprint-construct)（"The practical implication is that the evaluator is not a fixed yes-or-no decision"）、[Opus 5 · Task scope and over-verification](references/sources/anthropic/prompting-claude-opus-5.md#task-scope-and-over-verification)（"The same applies to legacy harness scaffolding that adds separate verification steps"）、[Multi-agent systems · The verification subagent pattern](references/sources/anthropic/building-multi-agent-systems-when-and-how.md#the-verification-subagent-pattern)、[Sonnet 5.5 · Steer initiative and scope](references/sources/anthropic/prompting-claude-sonnet-5-5.md#steer-initiative-and-scope)（"Don't start extra rounds of review or hardening on your own"）、[Skill authoring · Implement feedback loops](references/sources/anthropic/skill-authoring-best-practices.md#implement-feedback-loops)（"Run validator → fix errors → repeat"）。

6. **评审先求全，再过滤。** 初审 prompt 不写严重度门槛，也不写"保守一点"，否则模型会照字面少报；过滤放到后面的质证或核查环节。
   依据：[Opus 5 · Capability improvements](references/sources/anthropic/prompting-claude-opus-5.md#capability-improvements)（Code review and bug-finding）。

7. **独立视角要真的不同，结论靠证据裁决。** 同一模型、相近上下文的多个 agent 会犯同样的错；讨论容易收敛到大家都知道的信息，只有一方掌握的关键事实会被忽略。多位 reviewer 的共识不等于证据；出现分歧时，交给一个独立角色按证据裁决，不靠多数票或协商。
   依据：[Multiagent systems research · Failures from conformity](references/sources/anthropic/multiagent-systems-patterns-and-problems.md#failures-from-conformity)、[Multiagent systems research · Epistemic failures](references/sources/anthropic/multiagent-systems-patterns-and-problems.md#epistemic-failures)。

8. **每个循环都写明收敛条件和轮数上限。** 自动续做或修订一般 2–3 轮；到上限就停，保留未决项和证据，不伪造通过。
   依据：[Opus 5.5 · Unattended agentic runs](references/sources/anthropic/prompting-claude-opus-5-5.md#unattended-agentic-runs)。

9. **只有必须由用户决定时才停下来问**，其余不受影响的工作继续推进；需要用户批准的事，先做到可以直接批准的程度。
   依据：[Fable 5 · Strong instruction following](references/sources/anthropic/prompting-claude-fable-5.md#strong-instruction-following)、[Fable 5.1 · Finish the whole task](references/sources/anthropic/prompting-claude-fable-5-1.md#finish-the-whole-task)（Delivering work）、[Using GPT-6 · Initiative and follow-through](references/sources/openai/using-gpt-6.md#initiative-and-follow-through)。

10. **每次都必须发生的动作，交给运行时或工具强制，不写成 prompt 规则。** 例如安装依赖、核验提交、校验来源 SHA。
    依据：[Claude Code · Set up hooks](references/sources/anthropic/claude-code-best-practices.md#set-up-hooks)（hooks 是确定执行的，说明文件里的指令只是建议）、[Harness engineering · Enforcing architecture and taste](references/sources/openai/harness-engineering.md#enforcing-architecture-and-taste)。

11. **跨 session 接续，默认在同一 session 里继续。** session 不可用时再开新的，交接依靠仓库、git 历史和进度记录。不要向模型展示剩余上下文额度，也不要用"你没有记忆、马上要交接"这类说法，这会诱发提前收尾。
    依据：[Harness design · The architecture](references/sources/anthropic/harness-design-long-running-apps.md#the-architecture)（新模型上去掉了 context reset）、[Fable 5 · Rare cases of context-budget concern](references/sources/anthropic/prompting-claude-fable-5.md#rare-cases-of-context-budget-concern)、[Prompting best practices · Long-horizon reasoning and state tracking](references/sources/anthropic/claude-prompting-best-practices.md#long-horizon-reasoning-and-state-tracking)、[Effective harnesses · Getting up to speed](references/sources/anthropic/effective-harnesses-for-long-running-agents.md#getting-up-to-speed)、[Long horizon tasks with Codex · Durable project memory](references/sources/openai/run-long-horizon-tasks-with-codex.md#the-key-idea-durable-project-memory)。

## 三、SKILL.md 与 description

1. **description 只写"做什么"和"什么时候用"。** 用用户实际会说的词作触发，越短越好；不堆同义词，也不把适用范围写得比实际宽。
   依据：[GPT-6 Astra · Better skills](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#better-skills)、[Skill authoring · Writing effective descriptions](references/sources/anthropic/skill-authoring-best-practices.md#writing-effective-descriptions)。

2. **SKILL.md 当路由用。** 每次都要用到的内容放正文；只在某些情况下才用到的放进 `references/`，正文只留一行指针，写清什么时候去读。正文控制在 500 行以内。最重要、全程适用的约束放在正文开头：Skill 载入后不会重读，上下文压缩后可能只保留开头一段。
   依据：[Skill authoring · Progressive disclosure patterns](references/sources/anthropic/skill-authoring-best-practices.md#progressive-disclosure-patterns)、[Skill authoring · Token budgets](references/sources/anthropic/skill-authoring-best-practices.md#token-budgets)、[GPT-6 Astra · Better skills](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#better-skills)、[Harness engineering · Repository knowledge as the system of record](references/sources/openai/harness-engineering.md#we-made-repository-knowledge-the-system-of-record)（"give Codex a map, not a 1,000-page instruction manual"）、[Claude Code skills · Skill content lifecycle](references/sources/anthropic/claude-code-skills.md#skill-content-lifecycle)（压缩后每个 Skill 只保留前 5,000 tokens）、[Claude Code skills · Claude stops following a skill](references/sources/anthropic/claude-code-skills.md#claude-stops-following-a-skill)（"put the most important instructions near the top of SKILL.md"）。

3. **默认模型已经很聪明，只写它不知道的：** 项目自己的约定、选择背后的原因、踩过的坑。
   依据：[Skill authoring · Concise is key](references/sources/anthropic/skill-authoring-best-practices.md#concise-is-key)、[Claude Code · Write an effective CLAUDE.md](references/sources/anthropic/claude-code-best-practices.md#write-an-effective-claudemd)。

4. **自由度与风险相匹配。** 出错代价高、每次都必须一致的环节是"窄桥"，例如调度控制面的派发、恢复、并发写入、交付核验，用精确的命令和运行时校验；执行端的实现、评审、写作是"开阔地"，只给目标，不给路线。
   依据：[Skill authoring · Set appropriate degrees of freedom](references/sources/anthropic/skill-authoring-best-practices.md#set-appropriate-degrees-of-freedom)。

5. **一个意思只写在一处；强调只留给确实被反复忽略的那一行。** 什么都强调，等于什么都没强调。
   依据：[Claude Code · Write an effective CLAUDE.md](references/sources/anthropic/claude-code-best-practices.md#write-an-effective-claudemd)、[Harness engineering · Repository knowledge as the system of record](references/sources/openai/harness-engineering.md#we-made-repository-knowledge-the-system-of-record)（"When everything is important, nothing is"）。

6. **执行端会读到的 Skill，也按本规范审。** 较新的模型对 Skill 和 AGENTS.md 里的指令更敏感，含糊或互相冲突的指令会让它提前停下；Skill 会被不同模型读到，要在所有会用它的模型上成立。
   依据：[Using GPT-6 · Instruction following](references/sources/openai/using-gpt-6.md#instruction-following)、[GPT-6 Astra · Better skills](references/sources/openai/rethinking-skills-and-prompts-for-gpt-6-astra.md#better-skills)、[Skill authoring · Test with all models you plan to use](references/sources/anthropic/skill-authoring-best-practices.md#test-with-all-models-you-plan-to-use)。

7. **规则只写当前要求，不写来历。** 一次失误不直接写成永久规则：先确认同样的问题在多数 session 里都会出现，再按第 3 条当作踩过的坑写进去。规则正文只写现在要怎样做，不写事故经过、PR 号、日期，也不写"不再""改为"这类相对旧版本的说法：执行端没见过旧版本，这类字眼会让它去猜并不存在的另一种做法。同类特例积累多了，合成一条原则。
   依据：[Prompt audit · Group 2](references/sources/anthropic/prompt-audit.md#group-2---brittle-skill-and-configuration-files)（The recency trap、History narratives）、[Prompt audit · 1d](references/sources/anthropic/prompt-audit.md#1d-fossils---text-that-outlived-its-model)（Migration-relative phrasing、Patch accretion）、[Codex skill-creator · Core Principles](references/sources/openai/codex-skill-creator.md#core-principles)（"Do not turn a particular example, past failure, or personal preference into a universal requirement"）、[Codex skill-creator · Validate and Iterate](references/sources/openai/codex-skill-creator.md#validate-and-iterate)（"Prefer a narrow correction to accumulating universal rules"）。

## 四、修改流程

按顺序做，前一步完成再做下一步：

1. **列出改动。** 新增或修改的每条指令、每个角色、每个步骤，逐一写出它弥补的是哪项模型不足，并对应到本规范的条目或原文章节。对应不上的不加。
2. **对照相关的旧内容。** 改动涉及的旧指令，逐条确认在当前模型上是否仍然需要，不需要的删掉。同一 Skill 里两条规则在某些情况下会冲突时，写明哪条在什么情况下优先，不让执行端自己调和。依据：[Reducing cost · Instructions](references/sources/anthropic/reducing-cost-and-improving-performance.md#instructions)（"Contradictory rules"）、[Using GPT-6 · Instruction following](references/sources/openai/using-gpt-6.md#instruction-following)（含糊或冲突的 Skill 指令会让模型提前停下）、[Prompt audit · Group 2](references/sources/anthropic/prompt-audit.md#group-2---brittle-skill-and-configuration-files)（Instruction files that contradict each other）。
3. **一次只拆一个组件。** 删减 pipeline 的角色或步骤时，每次只动一处，并在项目的变更记录里记下依据和下次运行要观察的数据。依据：[Harness design · Iterating on the harness](references/sources/anthropic/harness-design-long-running-apps.md#iterating-on-the-harness)。
4. **记录依据。** PR 描述或变更记录引用本规范的条目。
5. **对照运行。** 删改指令后，用几条真实请求在新 session 里分别跑改前和改后的版本（或带与不带这个 Skill），比较行为，结果写进同一份记录。询问模型"还需不需要这条"不算验证；新 session 能避免编写时留下的上下文掩盖文字里的缺口。依据：[Prompt audit · Step 7](references/sources/anthropic/prompt-audit.md#step-7-verify---removal-is-a-hypothesis-not-a-conclusion)（"Asking the model whether it needs an instruction is not a measurement"）、[Claude Code skills · Evaluate and iterate on a skill](references/sources/anthropic/claude-code-skills.md#evaluate-and-iterate-on-a-skill)、[Skill authoring · Build evaluations first](references/sources/anthropic/skill-authoring-best-practices.md#build-evaluations-first)。

完成标准：每条改动都能对应到本规范的条目或原文章节；不同模型的建议有冲突的地方，已改成对各模型都成立的写法；同一 Skill 里可能冲突的规则写明了优先顺序；删改过的指令有改前改后的对照结果。

## 五、更新本规范

厂商发布新模型或新的提示词指南时，按[原文清单](references/sources/README.md#更新原文)更新原文和本规范。
