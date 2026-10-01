# core-grill 的来源与验证

## 从真实流程中提炼的任务

需求起步时，用户在 grill 会话里回答问题，结果交给 core-spec 收敛成 spec 和 verify。此前用上游的 grill-with-docs，另在流程记录仓库里放一份交接模板，补上四项输入和一条提问边界。2026-10-01 用户提出：流程优化完之后，产出只看 dev-skills 就够。于是把模板和上游里实际用到的部分合成一个自成一体的 Skill。

## 为什么迁进来，不依赖上游

上游 [mattpocock/skills](https://github.com/mattpocock/skills)（`74ca5fe`，MIT 许可）的 grill-with-docs 只有一句“依次调用 grilling 和 domain-modeling”。我们的提问边界与上游 grilling 相反：

| 上游 grilling | core-grill | 原因 |
|---|---|---|
| “every branch of the design tree visited, nothing left silently assumed”，每个决定都交给用户 | 只问会改变用户可见结果的决定，其余由 agent 定，记成默认决定 | 之后全自动交付，用户的注意力留给会改变结果的决定；实现方式问了也只是增加轮次 |
| 用户确认达成共识即结束 | 结束时把用户答过的决定和默认决定写成一份汇总，请用户确认一次 | core-spec 第 1 步规定“用户没有反对不等于批准”；默认决定要经用户确认才能进 spec，汇总也就是 core-spec 第 7 步查漏要的原始约定 |
| 没有输入要求 | 开头收四项：目标、完成条件、授权、范围 | 2026-09-30 首个需求试跑的复盘：缺这四项，交付中才发现授权和范围没定 |

做成依赖时，模型会同时读到两份相反的指令（Anthropic prompt-audit 列的 contradictory rules）；上游近期改动也频繁，流程行为会跟着变。迁进来只保留用到的部分，总字数比“上游三份加一层包装”少。代价是上游的改进不会自动进来：更新上游时对照差异，按需吸收。上游的 grilling、grill-with-docs 继续装着，用于流程以外的讨论。

## 保留了什么、改了什么

| 来源 | 保留 | 改动 |
|---|---|---|
| grilling | 按轮次问，每轮问前提已定的全部问题；每题给推荐答案；事实自己查，可以派 subagent，不阻塞其余问题 | 提问边界、默认决定、决定汇总（见上表）；去掉固定的回复格式 |
| domain-modeling | 术语当场写进 `CONTEXT.md`，它只放术语；用户说的与代码不符时当场指出；ADR 只在三条同时成立时写 | 去掉“质疑用词、编造边界场景”等通用访谈技巧，模型本来会做 |
| CONTEXT-FORMAT.md、ADR-FORMAT.md | 结构、规则、单与多上下文、ADR 的三条标准和适用范围 | 译成中文，压缩示例；放在 `references/`，文件头注明来源 |

## 依据

- 只问会改变结果的决定，其余带默认值继续：pstack [principle-never-block-on-the-human](https://github.com/cursor/plugins/blob/ecc249f1e306fc64ddf83c7bed16cacf7c2239db/pstack/skills/principle-never-block-on-the-human/SKILL.md)；poteto-mode 对只有人能做的决定“apply a default … and the one word that reverses it”。
- 先访谈写 spec，再开新 session 执行：Anthropic [Claude Code best practices](../skills/agent-prompt-rules/references/sources/anthropic/claude-code-best-practices.md)。
- 写给 agent 的说明只写结果和边界：agent-prompt-rules 一-1、一-4。

## 验证

见本次 PR 描述中的行为探针：在新 session 里只给 core-grill，问“只影响实现的问题要不要问用户”和“结束时交什么”。真实需求中的效果待下一个需求观察。
