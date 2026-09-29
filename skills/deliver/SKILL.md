---
name: deliver
disable-model-invocation: true
description: 依据用户确认并冻结的 spec.md 和 verify.md，由一个 owner session 连续完成实现、逐里程碑在应用里验证、另一家模型的独立验证、MR/PR 与 CI，直到可合入。适用于“按 spec 和 verify 交付”“做到 MR 可合入”；spec 和 verify 用 core-spec 产出。
---

# 依据冻结的 spec 和 verify 交付到可合入的 MR

你是这个需求的 owner：从读 spec 到 MR 可合入，全程由你负责。用户已经在 spec.md 和 verify.md 里做完了决定，两份文件已冻结。你要交付一个 MR/PR：它满足 spec，verify 的全部场景在最终 head 上实际跑通，并且经过另一家模型的独立验证。

一直做到下面的完成条件全部满足，或遇到“停下”一节的三种情况；中途不向用户汇报进度，也不问下一步。

## 输入

- **spec.md、verify.md**：用户给出的路径。它们是需求和判定的唯一依据，交付中不修改。
- **确认过的哈希**：用户确认两份文件时得到的两个 sha256（core-spec 第 8 步给出）。没给时，开工前先向用户要。
- **交付与授权**：写在 spec 的“交付与授权”一节，包括目标仓库、基线分支、能否合入、允许的不可逆操作。spec 没写时，可以推送自己的分支并开 MR，但不合入。
- **项目的验证能力**：验证 Skill、控制命令、功能地图和质量命令（lint、类型检查、测试）。verify.md 的来源部分列出了它引用的这些内容。

## 完成条件

1. **场景在最终 head 上跑通。** verify.md 的每个场景都由你在运行中的应用上实际跑通；之后代码又有改动的，受影响的场景在改动后重跑。冒烟集、回归范围和质量命令在最终 head 上通过。覆盖盲区里的检查点标为未验证，不算通过。
2. **独立验证没有 FAIL。** 另一家模型在单独的 session 中验证最终 head，由 `scripts/run-verifier.mjs` 启动并留下调用记录。每个场景的结果是 PASS，或是覆盖盲区造成的 UNVERIFIED；因环境原因 UNVERIFIED 的，先解决环境再复验。
3. **机械检查通过。** 取 MR 在平台上的实际 head，运行：

   ```bash
   node <本 Skill 目录>/scripts/check-delivery.mjs --plan <plan.md> --report <验证报告> --head <MR head>
   ```

   它检查四件事：spec.md、verify.md 的 sha256 与记在 plan.md 里的确认版本一致；验证报告对应的 head 等于 MR head；verify 的每个场景都在报告里，而且没有 FAIL；报告来自 `run-verifier.mjs` 的调用，之后没被改过，验证者的模型家族与你不同。
4. **MR 可合入。** CI 在最终 head 上通过；每条评审意见都已处理，改了代码或回复了理由。授权合入的，合入；没有授权的，停在可合入。
5. **plan.md 反映实际情况**，并已向用户汇报（见“汇报”一节）。

## 产物

| 产物 | 位置 | 内容 |
|---|---|---|
| plan.md | 与 spec 同目录 | 按[计划格式](references/plan-format.md)写的活文档，随代码提交；仓库规则不允许提交时留在本地，MR 里给出摘要 |
| 证据 | 与 plan.md 同目录的 `evidence/` | 场景的实际输出、读回的状态、截图或录像。plan.md 和 MR 只写路径和一句结论；是否提交按仓库规则 |
| 验证输入 | `evidence/verification-<head 前 12 位>.inputs.md` | 你写：验证说明列出的各项输入，包括允许验证者使用的环境 |
| 验证报告与调用记录 | `evidence/verification-<head 前 12 位>.md`、`.run.json`、`.log` | `run-verifier.mjs` 写：报告是验证者按[验证说明](references/verifier-brief.md)格式给出的最终回复；调用记录含 CLI、模型家族、模型、session id、head 和报告的 sha256 |
| 提交 | 你自己的分支 | 按里程碑提交，每个提交可以单独看懂 |
| MR/PR | 仓库所在平台 | 见“MR”一节 |

## 要求

**开工与接续。** 在自己的分支和 worktree 上工作，这个分支只有你写入。开工时把用户确认过的两个 sha256 原样写进 plan.md 的冻结输入，连同基线 commit 和你自己的模型家族（见[计划格式](references/plan-format.md)），然后运行 `node <本 Skill 目录>/scripts/check-delivery.mjs --plan <plan.md> --frozen-only`：文件与确认的版本不一致就停下，告诉用户哪份文件变了。写好计划后提交。每次开工或接续，先跑 verify.md 的冒烟集，不通过就先修好。session 中断后，新 session 只读 plan.md 和 git 历史就能接着做。

**里程碑。** 每个里程碑是一段能单独验证的行为，对应 verify 的若干场景。verify 列出的验证工具缺口排在最前面，补成项目可复用的验证能力；项目还没有验证能力时，先补到能跑冒烟集为止。一个里程碑做完的标准：它对应的场景在运行中的应用上跑通，质量命令通过，里程碑检查没有未解决的问题，已提交，plan.md 的进度已更新。失败先修，再进入下一个里程碑。全部里程碑完成后，自己把全部场景和回归范围跑一遍。

**里程碑检查。** 每个里程碑的场景跑通后，开一个新上下文的 subagent，按[里程碑检查说明](references/milestone-check.md)检查，调用时引用这份说明，不另写。subagent 继承你的模型和推理强度：Claude Code 用 general-purpose 类型，Codex 用默认 agent；不传模型和推理强度参数，也不用 Explore 这类自带配置的类型。只给它说明里列出的输入，不给你的推理过程。它只报告，由你修改；改完请它再查一次，每个里程碑最多两轮。它报告的模型 ID 与你的不同，这次检查作废，重开一个；你能看到自己的推理强度时，也一并核对。把它报告的模型 ID、推理强度和结论记进 plan.md 的进度；两轮后仍未解决的问题也记在那里，在请独立验证之前解决。

**绑定命令。** verify.md 里标为“实现后绑定命令”的场景，把实际命令写在 plan.md 的“验证与验收”一节，不改 verify.md。

**自主决定。** spec 没有规定、也不影响任何场景判定的问题，你自己决定，写进 plan.md 的决策日志，在 MR 里汇总。

**独立验证。** 全部场景自验通过后，请另一家模型在单独的 session 中验证当前 head。先在证据目录写验证输入，列出[验证说明](references/verifier-brief.md)要的各项。其中允许验证者使用的环境，按项目验证能力的说明给一个独立的实例（profile、端口、数据目录），不与你正在用的实例共用。然后在检出这个 head 的专用目录里运行：

```bash
node <本 Skill 目录>/scripts/run-verifier.mjs --cli <codex|claude|mcode> --checkout <验证检出目录> --head <head> --inputs <验证输入> --verify <verify.md> --report <证据目录>/verification-<head 前 12 位>.md --add-dir <证据目录>
```

`--cli` 按[跨模型调用](../core-spec/references/cross-model.md)选与你不同的家族。脚本返回 3 表示这个 CLI 不可用，换另一个不同家族的 CLI 再试；都不可用时，不用同家族代替，做完其余工作，记为“跨模型验证未完成”，按“停下”的第 2 种情况处理。只有用户明确放宽时才用同家族，并在 plan.md 的冻结输入里记一行 `- cross-family: waived <用户原话与日期>`。验证者只报告，由你修改；改完请它复验受影响的场景和回归范围。修复加复验最多 3 轮，之后仍有 FAIL 就停下汇报，不宣称通过。开 MR 后，代码再有改动（CI 修复、评审意见）时，对新 head 复验受影响的场景，保证最终的验证报告对应 MR 的最终 head。

**MR 与 CI。** 用仓库所在平台的已认证 CLI：GitHub 用 `gh`，GitLab 用 `glab`。CI 失败时先判断是否由本次改动引起；同一个失败修了 3 次仍不过，停下汇报。评审意见如果要求改变 spec 规定的行为，不照改，按“停下”一节处理。

## 停下

只在三种情况下停下来找用户：

1. spec 自相矛盾，或缺少一个会改变场景判定结果的决定。
2. 需要你自己拿不到的权限、凭据或环境。
3. 需要授权范围以外的不可逆操作，例如合入、删除共享数据、对外发消息、改动共享环境。

停下之前，先把不受影响的部分做完；在 plan.md 的进度里记下卡在哪里；给用户的问题写清楚可选项、各自的影响和你的建议。spec 和 verify 在交付中不修改：用户做出决定后，由用户用 core-spec 更新并重新确认，你再继续。

## MR

MR 描述写给决定是否合入的人，先写结论：

- 改了什么，对应 spec 的哪些决定。
- 场景结果：每个场景的结果和证据路径；独立验证用的模型、结论和对应的 head。
- 自主决定：决策日志里值得用户事后看的条目。
- 未验证：覆盖盲区里的检查点、UNVERIFIED 的场景和原因；跨模型要求没满足时写明。
- 补上的验证能力，以及复盘发现的仓库缺口。

评审者需要阅读路线时，按同仓库的 [mr-for-human](../mr-for-human/SKILL.md) 写。

## 汇报

完成或停下时，给用户一段简短的汇报：

- MR 链接和状态：已合入、可合入，或停下及原因。
- 场景总数、通过数、未验证数。
- 独立验证用的模型和结论。
- 需要用户事后看的自主决定。
- 复盘发现的仓库缺口。

按同仓库 [explain-as-fool](../explain-as-fool/SKILL.md) 的表达要求写，不写过程。
