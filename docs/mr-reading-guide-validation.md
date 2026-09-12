# mr-reading-guide 验证记录

日期：2026-09-11。对象为本工作树中的新 Skill、配套资料和综述。

本次完成结构检查、编写者按流程进行的场景走查，以及教学代码的隔离执行。没有使用独立 Agent 盲测，没有注册客户端入口或验证原生自动触发，也没有开展真实生产 MR 的完整阅读试验。以下结果不能用于声称用户阅读效率已经提升。

## 1. 输入与触发边界走查

采用本次用户请求及飞书参考请求的意图，逐项核对入口 description 和执行行为：

| 输入意图 | 当前指引如何处理 | 本次核验方式 |
|---|---|---|
| “AI 写了很多代码，我想知道 MR 重点看哪里” | 触发分层阅读、设计重点和代码映射 | description/步骤人工走查 |
| “逆向 MR，给伪代码和代码映射” | 保留标识符、不变量、固定快照和正反账本 | 参考请求与步骤对照 |
| “解释 base..head 并帮助定位问题” | 读取固定差异及必要上下文，输出阅读路线 | 下述真实变更走查 |
| “只找 bug” | 不自动用此 Skill 代替缺陷评审 | description 边界核对 |
| “设计尚未实现的功能” | 不伪造实际实现或代码映射 | description 与事实分级核对 |
| 只有截断 diff | 输出已见部分及缺口，整体比例未知 | 步骤 1/5 与模板人工核对，未另做行为执行 |

这里验证的是指令对这些输入的适配关系，不是 Agent 选择 Skill 的实测成功率。

## 2. 教学代码的实际执行

输入是 [worked-example.md](../skills/mr-reading-guide/references/worked-example.md) 中完整的 before/after Python 代码块。验证时将它们原样提取到隔离临时 Git 仓库的 submit.py，分别提交并执行；依赖使用符合示例约定的 Store/Broker 测试替身。

- base：`2a7e489658e659723051281f405369bde697d3d3`
- head：`787b27f034923523c0d0addaf52d2ace493136e9`
- diff：unified=3，1 个 hunk，`@@ -1,6 +1,9 @@`，新增 3 行。
- 临时仓库：`/var/folders/pm/2zy2y3rd3tdd5j7yzlgjppvr0000gp/T/mr-reading-guide-eval-a7j7dfbx`
- 机器结果：`/tmp/mr-understanding-research/behavior-evaluation.json`。

临时路径不是安装或运行 Skill 的依赖；下表保留核心观察，示例源码在仓库内可读。测试提交期间本机 hook 提示找不到 lefthook，但 Git 提交退出成功，两个 SHA、diff 与代码执行结果均已回读。未修改用户 hook 配置。

| 场景 | 实际观察 | 判断 |
|---|---|---|
| 无权限提交 | PermissionError(FORBIDDEN)，业务读取 0、记录 0、消息 0 | I01 在模型中成立 |
| 正常提交后串行重试 | 两次结果相同，记录 1、消息 1 | I02 的串行部分成立 |
| 不同租户使用相同键 | 返回不同任务 ID，分别创建记录 | 租户范围在模型中成立 |
| 首次 publish 入队前失败，再重试 | 首次抛错；重试返回 ACCEPTED(job-1)，记录 1、消息 0 | 教学需求 I03 的反例复现 |
| 对比 before 中相同失败 | 重试后记录 2、消息 1 | 原版也有失败窗口；本次查重改变了重试后果 |

伪代码 P03 保留“插入后发布”，P02 保留“已有记录就返回”的实际语义。未把它们写成原子创建并入队。反例与教程描述一致。

H=1、E=1、X=0、U=0；两个映射比例均为 100%，但 I03 不成立。这个结果具体展示了为什么映射覆盖不能当成正确性证明。

验证边界：记录只在测试替身中跨调用保留；没有测试磁盘持久化、进程崩溃、真实 broker、并发唯一性、真实恢复器或授权来源。

## 3. 对真实仓库变更的手工应用

使用当前 dev-skills 已有提交，不修改它：

- 仓库：`coder-xieshijie/dev-skills`
- base：`4b46de87aa09a092c6c375e8d1487aac9692f6d8`
- head：`0829c05bd0396ce554e686f0738a1f23af0a7ab7`
- 真实变化：新增 design-for-review Skill，并更新导航；3 个文件，93 行新增。
- 分析请求：将用户“先看核心点、再看全貌和代码作用”的意图应用到该真实提交；这不是用户另行指定的 MR。

### L1：该变更的三个核心决定

**D01 — 材料来源按任务类型处理。**方案评审使用已确认需求与讨论，已实现方案说明使用指定版本的实际代码；冲突分成事实、决定和待讨论事项。这样可以避免把实现反推成原本需求。位置：新增 SKILL.md 第 11–18 行。

**D02 — 输出先建立完整流程，再展开实现。**没有既定大纲时使用七个主题，有既定大纲则沿用；正文围绕行为，源码作为机制证据。位置：第 20–47、57–64 行。把“七个主题”误读为所有请求必须固定七章，会改变实际指令。

**D03 — 两个客户端设置共同表达手动入口。**SKILL.md 第 4 行与 agents/openai.yaml 第 2 行明确写入相应手动策略。只按“文档变更”跳过 YAML，就会漏掉影响使用方式的配置。

### L2/L3：合并后的规则流程

此变更没有业务运行函数，使用规则流程表达：

```text
P01 选择依据：按方案评审/已实现说明区分权威材料；冲突显式列出
P02 组织文档：有大纲时沿用，否则使用问题到验证的七个主题
P03 解释机制：从场景和完整流程进入，在关键处给事实来源和实现依据
P04 检查成稿：读者能理解目的、流程、范围、取舍和验证方式
P05 手动使用：两个客户端入口策略及 README 示例相互对应
```

对顶层契约，输入是已有需求与材料，输出是可独立评审的中文 Markdown；未知事实须区分。对中间逻辑，规则有实际条件分支而非调用链。对底层，本 diff 没有新增数据库、连接、后台任务或运行时资源，资源容量/事务视角不适用；客户端配置仍有行为语义。

### 正向映射

下列链接以固定 head 定位；行区间字段均从 `git show <head>:<path> | nl -ba` 回读。

| 解释 | 文件和 head 行区间 | 固定快照入口 |
|---|---|---|
| D01 / P01 | skills/design-for-review/SKILL.md:11–18 | [依据规则](https://github.com/coder-xieshijie/dev-skills/blob/0829c05bd0396ce554e686f0738a1f23af0a7ab7/skills/design-for-review/SKILL.md#L11) |
| D02 / P02 | 同文件:20–47 | [大纲规则](https://github.com/coder-xieshijie/dev-skills/blob/0829c05bd0396ce554e686f0738a1f23af0a7ab7/skills/design-for-review/SKILL.md#L20) |
| P03 / P04 | 同文件:49–77 | [写作与完成要求](https://github.com/coder-xieshijie/dev-skills/blob/0829c05bd0396ce554e686f0738a1f23af0a7ab7/skills/design-for-review/SKILL.md#L49) |
| D03 / P05 | 同文件:1–9；agents/openai.yaml:1–2 | [配置文件](https://github.com/coder-xieshijie/dev-skills/blob/0829c05bd0396ce554e686f0738a1f23af0a7ab7/skills/design-for-review/agents/openai.yaml#L1) |
| P05 | README.md:15、47–58 | [使用入口说明](https://github.com/coder-xieshijie/dev-skills/blob/0829c05bd0396ce554e686f0738a1f23af0a7ab7/README.md#L47) |

这些是由本地 origin 与真实 SHA 构造的链接；源码内容通过本地 Git 验证，未另做远端网页可访问性检查。

### 反向账本

原始 diff 使用 `git diff --unified=3 <base> <head>`，4 个唯一 hunk：

| Hunk | 文件及旧/新范围 | 解释 | 状态 |
|---|---|---|---|
| H01 | README.md：旧 12,6 / 新 12,7 | P05 导航条目 | 已解释 |
| H02 | README.md：旧 43,6 / 新 44,19 | P05 使用方式和边界 | 已解释 |
| H03 | skills/design-for-review/SKILL.md：旧 0,0 / 新 1,77 | P01–P05，含定位、正文规则及元数据 | 已解释 |
| H04 | skills/design-for-review/agents/openai.yaml：旧 0,0 / 新 1,2 | P05 / D03 | 已解释 |

H=4、E=4、X=0、U=0；这里的对象是规则和配置变更，非“生产业务逻辑覆盖”。没有以文件扩展名将 YAML 豁免，也没有为凑伪代码编造程序调用。

### 阅读与排查路线

先读 SKILL.md 第 11–18 行确认来源优先级，再读第 20–47 行确认大纲分支，最后看 SKILL.md 第 4 行与 YAML 第 2 行解释手动策略。若文档把当前实现当成已确认需求，先查 P01；若用户报告不能自动调用，先查 P05 的配置意图，再核实真实客户端加载。

静态能回答的内容是配置表达了什么意图；客户端确实发现、加载并执行了该策略，需要原生客户端验证，本次未执行。此次固定 head 与本工作树 HEAD 的回读一致；它是已选提交的指南，不声称远端最新状态。

## 4. 结构与交付检查

- `quick_validate.py skills/mr-reading-guide`：通过（Skill is valid）。
- 新 Skill 的 name 与目录一致；3 个 references 都有入口和读取条件。
- 主文件保留默认自动发现；没有复制其他 Skill 的手动限制到新 Skill。
- README 已更新导航和初始化状态；既有 Skill 内容未变。
- 新增教学代码已执行上述 5 个行为场景，未新增生产脚本。
- 收尾检查通过：7 个 Markdown 文件的本地链接有效、代码围栏闭合；新 Skill frontmatter 与 UI YAML 有效；文件名与目录匹配；新增文件和已跟踪修改的空白检查均通过。

后续仍需用真实业务 MR 和真实读者检验重点选择、解释保真与阅读成本；这与本次结构/教学模型检查是不同层级的验收。
