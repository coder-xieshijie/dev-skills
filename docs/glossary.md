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
| freeze | 冻结 | After the user confirms, spec and verify are fixed by their sha256 and no longer change during delivery |
| handoff, handoff commit | 交接、交接提交 | The commit that adds the frozen spec and verify to the feature branch, with `Frozen-Spec` and `Frozen-Verify` trailers |
| feature branch | 需求分支 | The branch the handoff commit and the delivery go to |
| decision list | 决定清单 | The list at the top of plan.md and the MR description: product choices, changed judging methods, fact corrections, and parts that could not be done |
| irreversible operation | 不可逆操作 | Merging, force-pushing a shared branch, deleting shared data, sending messages outside, changing a shared environment. Always left to the user |
| a model from another family | 另一家模型 | A model from a different vendor than the one that wrote the work, e.g. GPT checking Claude's work |
| independent verification | 独立验证 | A model from another family runs the scenarios on the final code in its own session and gives a verdict |
| milestone, milestone check | 里程碑、里程碑检查 | A piece of behavior that can be verified on its own; after each one, a fresh-context subagent checks it against the spec |
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
| control commands | 控制命令 | Commands that start, stop, reset and read the state of the app |
| quality commands | 质量命令 | Lint, type check, tests |
| test double | 替身 | A stand-in for a real dependency in tests (mock, stub, fake) |
| integration layer | 对接层 | The code that connects the change to the rest of the system |
| evidence | 证据 | Files that show what happened: screenshots, logs, outputs |
| verdict: PASS, FAIL, UNVERIFIED | 结论 | PASS: verified; FAIL: a check failed or there is a code problem; UNVERIFIED: could not be verified |
