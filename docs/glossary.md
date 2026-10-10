# Glossary

The Skills in this repository use these terms with one meaning each. The Chinese column helps readers of the design records in `docs/`, which are written in Chinese.

## Workflow

| Term | 中文 | Meaning |
|---|---|---|
| self-verifying loop | 自证闭环 | The agent can start, operate and observe the application itself, and shows evidence that the result is right |
| owner | owner | The one agent that carries a requirement from reading the spec to a mergeable MR |
| stage A: repository readiness | A 仓库准备 | Making a repository's app drivable by agents: control commands, feature map, smoke set, quality commands |
| stage B: definition | B 定义 | core-grill and core-spec: from the request to a frozen spec and verify |
| stage C: delivery | C 交付 | deliver: from the frozen spec and verify to a mergeable MR |
| stage D: feedback | D 回流 | Gaps found during delivery go back into stage A or the Skills |
| four inputs: goal, done criteria, authorization, scope | 四项输入：目标、完成条件、授权、范围 | What core-grill collects before asking questions |
| decision summary | 决定汇总 | The file core-grill writes and the user confirms once: the four inputs, decisions the user answered, default decisions |
| default decision | 默认决定 | A decision the agent made on its own, with its reason and how to overturn it |
| source agreements | 原始约定 | The materials a spec must be faithful to: request text, ADRs, the user's final decisions in their own words, the decision summary |
| spec | spec | `spec.md`, the core decisions and constraints |
| verify | verify | `verify.md`, the acceptance requirements: how to prove an implementation meets the spec |
| gap check | 查漏 | A model from another family reads spec, verify, source agreements and the repository in a new session and reports gaps |
| freeze | 冻结 | After the user confirms, spec and verify are fixed by their sha256 and no longer change during delivery. In recon-to-contract, "freeze" means fixing the dimension vocabulary, the reference set and the criteria before the parallel research starts |
| handoff, handoff commit | 交接、交接提交 | Passing the frozen spec and verify from core-spec to deliver. Normally through the handoff commit, which adds them to the feature branch with `Frozen-Spec` and `Frozen-Verify` trailers; when pushing or committing them is not allowed, through their local paths and sha256 values instead. In agent-prompt-rules, "handoff" has its general sense: passing work between roles or sessions |
| feature branch | 需求分支 | The branch the handoff commit and the delivery go to |
| decision list | 决定清单 | The list at the top of plan.md and the MR description: product choices, changed judging methods, fact corrections, and parts that could not be done |
| irreversible operation | 不可逆操作 | Merging, force-pushing a shared branch, deleting shared data, sending messages outside, changing a shared environment. Always left to the user |
| a model from another family | 另一家模型 | A model from a different vendor than the one that wrote the work, e.g. GPT checking Claude's work |
| independent verification | 独立验证 | A model from another family runs the scenarios on the final code in its own session and gives a verdict. In agent-prompt-rules the phrase has its general sense: verification by an agent other than the author |
| milestone, milestone check | 里程碑、里程碑检查 | A piece of behavior that can be verified on its own; at full verification depth, a fresh-context subagent checks a milestone against the spec before later milestones that build on it start |
| verification depth | 验证档位 | `light` or `full`, set in verify.md's key points and confirmed with the freeze. It decides how many intermediate checks delivery runs (up-front review, milestone checks, code review before verification); both end with the same independent verification |
| check results, not process | 只查结果，不查过程 | The only script check is on results: frozen files unchanged, a passing verification of the final code by another family |

## Verify

| Term | 中文 | Meaning |
|---|---|---|
| smoke set | 冒烟集 | A few quick checks that the app starts and its main path works |
| requirements table | 要求表 | Each requirement in the spec and how it is proven: scenario, mechanical check, or existing check |
| scenario | 场景 | One complete operation a user performs at one entry point, with its result |
| entry point | 入口 | Where the user performs the operation, e.g. a desktop app, a TUI, an API |
| literal checkpoint | 字面检查点 | What must be observed, written so that it can be checked as written |
| baseline expectation | 基线预期 | What the scenario shows on the code before the change |
| decoy implementation | 会被拒绝的错误实现 | A plausible wrong implementation that the checks must reject |
| mechanical check | 机械检查 | A check a script or command can decide without judgment |
| regression scope | 回归范围 | Existing behavior that must still work |
| coverage blind spot, substitute test | 覆盖盲区、替代测试 | A requirement scenarios cannot reach, and the test that covers it instead |
| verification tooling gap | 验证工具缺口 | A capability the scenarios need that the project does not have yet |
| feature map | 功能地图 | For each feature: entry, actions, what to observe, what evidence to keep |
| verification Skill | 验证 Skill | The project-local Skill (`verify-<app>`) that starts, drives, reads and stops the app and indexes the feature maps; [repo-readiness](../skills/repo-readiness/SKILL.md) builds it |
| sub-feature | 子功能 | One behavior of a feature with its own observable outcome, ID `<map>.<short>` |
| criterion | 判据 | One observable expected result of a sub-feature at one entry point, ID `<sub-feature>#<n>`, kept only in the feature map |
| scenario script | 场景脚本 | The script that drives one sub-feature at one entry point and checks each of its criteria once |
| counterexample run | 反例对照 | A run on a deliberately broken product; it counts only when the broken criterion gives FAIL |
| structure check | 结构检查 | The read-only `check` command that links maps, criteria, scenario scripts and spec IDs, and keeps results out of maps and the verification Skill; CI runs it |
| entry adapter | 入口适配器 | The module in a verification Skill that starts, checks, drives and stops an isolated instance for one entry point; every adapter passes the kit's contract test |
| result: PASS, FAIL, BLOCKED, UNVERIFIED, TO-CONFIRM | 结果 | One per sub-feature and entry point in a verification Skill run. BLOCKED: the precondition could not be built; TO-CONFIRM: a product owner must say whether it is intended |
| control commands | 控制命令 | Commands that start, stop, reset and read the state of the app |
| quality commands | 质量命令 | Lint, type check, tests |
| test double | 替身 | A stand-in for a real dependency in tests (mock, stub, fake) |
| integration layer | 对接层 | The code that connects the change to the rest of the system |
| evidence | 证据 | Files that show what happened: screenshots, logs, outputs |
| verdict: PASS, FAIL, UNVERIFIED | 结论 | PASS: verified; FAIL: a check failed or there is a code problem; UNVERIFIED: could not be verified |

## agent-prompt-rules numbering

Older documents cite [agent-prompt-rules](../skills/agent-prompt-rules/SKILL.md) by its Chinese numbering: a rule as "一-4" or "第一节第 4 条" (section 一, item 4), a section as "第一节". The English Skill numbers the sections 1 to 5 and each rule as section.item.

| Chinese | English | Section or rule |
|---|---|---|
| 总原则 | General principles | Unnumbered principles at the top |
| 一（第一节） | 1 | Prompts from the dispatcher to the executor |
| 一-1 | 1.1 | Describe the result, the purpose and the done criteria, not the steps |
| 一-2 | 1.2 | Done criteria as observable results and evidence; real checks, no verification rituals |
| 一-3 | 1.3 | Say what each material is for and when to use it |
| 一-4 | 1.4 | Only the one or two real boundaries, each with its reason |
| 一-5 | 1.5 | Authorize the executor to finish the work unattended |
| 一-6 | 1.6 | Do not prescribe the method |
| 一-7 | 1.7 | Do not ask the executor to reproduce its reasoning |
| 一-8 | 1.8 | A text-only end of turn is a report, not completion |
| 一-9 | 1.9 | Do not describe the grader; state every requirement it checks |
| 二（第二节） | 2 | Pipeline design |
| 二-1 | 2.1 | Start with one agent; split only for a clear benefit |
| 二-2 | 2.2 | Split along context boundaries, not by type of work |
| 二-3 | 2.3 | Hand checks to a new session, not to the author |
| 二-4 | 2.4 | The verifier's prompt states what to check and what counts as a failure |
| 二-5 | 2.5 | Independent verification as the task needs it; no repeated checks by the same author |
| 二-6 | 2.6 | In reviews, report everything first, then filter |
| 二-7 | 2.7 | Independent perspectives must really differ; evidence settles the conclusion |
| 二-8 | 2.8 | Every loop has a convergence condition and a round limit |
| 二-9 | 2.9 | Stop to ask only when the user must decide |
| 二-10 | 2.10 | The runtime or a tool enforces what must happen every time |
| 二-11 | 2.11 | Continue in the same session by default |
| 三（第三节） | 3 | SKILL.md and the description |
| 三-1 | 3.1 | The description says only what the Skill does and when to use it |
| 三-2 | 3.2 | SKILL.md as a router |
| 三-3 | 3.3 | Write only what the model does not know |
| 三-4 | 3.4 | Match the degree of freedom to the risk |
| 三-5 | 3.5 | Say each thing in one place; emphasis only for the line that is ignored |
| 三-6 | 3.6 | Review Skills the executor will read against these rules too |
| 三-7 | 3.7 | Rules state current requirements, without their history |
| 四（第四节） | 4 | Change process |
| 四-1 | 4.1 | List the changes |
| 四-2 | 4.2 | Check the related existing content |
| 四-3 | 4.3 | Remove one component at a time |
| 四-4 | 4.4 | Record the basis |
| 四-5 | 4.5 | Compare runs |
| 五（第五节） | 5 | Updating these rules |
