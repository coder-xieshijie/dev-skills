# 示例：给任务提交增加重试查重

这是合成的教学变更，下面包含完整的入口函数 before/after。它不是生产系统或真实 MR。代码块内的 `submit.py` 是临时验证仓库中的文件名；实际分析必须使用真实文件、SHA 和行号。

## 输入请求与依赖约定

> 这次改动给 submit 增加 request_id 查重。请说明最值得看的设计、主流程和底层约束，让我能定位“重试后提示已接受，但任务没有执行”的问题。

教学需求：ACCEPTED 表示系统已经建立可恢复的任务执行责任；相同租户、同一 request_id 的串行重试返回原任务。不同租户不能通过该键取得其他租户的结果。

依赖约定：actor 来自可信认证入口；store 的 get/insert 在本教学模型中每次成功，记录在调用之间保留；broker.publish 可能在消息入队前抛出异常。模型没有后台恢复扫描。这里不规定真实数据库的持久化、并发唯一性或 broker 在响应丢失时的语义。

### Before — submit.py

```python
def submit(store, broker, actor, request):
    if not actor["can_submit"]:
        raise PermissionError("FORBIDDEN")
    job = store.insert(
        actor["tenant_id"], request["request_id"], request["payload"]
    )
    broker.publish(job["id"])
    return {"status": "ACCEPTED", "job_id": job["id"]}
```

### After — submit.py

```python
def submit(store, broker, actor, request):
    if not actor["can_submit"]:
        raise PermissionError("FORBIDDEN")
    existing = store.get(actor["tenant_id"], request["request_id"])
    if existing is not None:
        return {"status": "ACCEPTED", "job_id": existing["id"]}
    job = store.insert(
        actor["tenant_id"], request["request_id"], request["payload"]
    )
    broker.publish(job["id"])
    return {"status": "ACCEPTED", "job_id": job["id"]}
```

## L1：三个核心决定

1. **按可信租户和 request_id 查重。**串行重试复用旧任务，不同租户使用同一个键仍可创建自己的任务。先检查权限、再读取历史结果是值得保留的边界。对应 P01/P02。
2. **现有记录被当成 ACCEPTED 的充分条件。**新增早返回分支直接返回成功；它没有检查任务是否已经发布。对应 P02，这是本次最重要的行为变化。
3. **插入与发布是两个独立步骤。**发布抛错后记录还在；重试进入新早返回分支，此后不再发布。在给定的无恢复模型下，与教学需求冲突。对应 P03；上层返回承诺和下层交付机制在此不一致。

## L2：主链路

可信 actor → 权限检查 → 同租户查重 → 命中则返回旧任务；未命中则插入 → 发布 → 返回。

失败链路：插入成功 → 发布抛错 → 首次调用抛错 → 相同请求重试 → 命中记录 → 返回 ACCEPTED → broker 中仍没有任务。

原版同样有插入后发布失败的窗口，但重试会再次创建并发布；本次新增查重分支改变了后续行为。不能把整个失败窗口都说成本次新引入，也不能因此忽略早返回造成的新后果。

## L3：当前实现的忠实伪代码

```text
P01 授权
  若 actor.can_submit 为 false：抛出 FORBIDDEN

P02 查重
  existing = store.get(actor.tenant_id, request.request_id)
  若 existing 存在：返回 ACCEPTED(existing.id)
  // 没有检查发布状态，也没有核对同键 payload 是否相同

P03 创建并尝试发布（不是一个原子操作）
  job = store.insert(actor.tenant_id, request.request_id, request.payload)
  调用 broker.publish(job.id)
  // 这里抛错会向调用者传播；已插入记录仍在
  返回 ACCEPTED(job.id)
```

“同键不同 payload 是否应拒绝”在需求中未明确，属于契约问题；没有并发约束证据，不能将串行查重称为并发幂等。示例也没有资源限制信息，无法得出性能或容量结论。

### 契约与验证

| ID | 性质 | 机制与证据 | 边界 |
|---|---|---|---|
| I01 | 无权限调用在业务读写前被拒绝 | After 第 2–3 行，P01 | 上游 actor 的真实性由示例约定提供 |
| I02 | 相同租户/键的串行重试复用任务 | After 第 4–6 行，P02 | 无并发唯一性或同键不同意图保证 |
| I03 | ACCEPTED 已建立可恢复执行责任 | After 第 6 行与第 7–10 行之间存在矛盾 | 给定依赖模型中可构造反例；真实系统先查恢复机制 |

### 判断和替代方案

已成立的好设计是从可信 actor 取得租户，并在读取历史结果之前检查权限。需要重点处理的是早返回的成功语义。

可选方案按实际环境比较：若已有可靠恢复扫描，核实其记录条件和责任即可；如果当前 API 允许改变契约，可返回“已记录、执行待确认”等真实状态；如果确实要求可靠接受且没有现有机制，再评估事务记录待发送意图及后续交付。直接在命中记录时重复 publish 可能制造重复执行，需先确认 broker/消费端的幂等边界。

### 示例映射与变更账本

| 解释 | 教学源码位置 | 性质 |
|---|---|---|
| P01 / I01 | After 的 submit.py 第 2–3 行 | 未改上下文，支撑安全边界 |
| P02 / I02 / D01 查重决定 | After 第 4–6 行 | 新增的查重分支 |
| P03 / I03 | Before 第 4–8 行；After 第 7–11 行 | 未改主链路，与新分支共同解释失败行为 |

对以上两个函数使用 unified=3 的 diff，新增 3 行形成一个 hunk H01，由 P02 解释新增内容，由 P03 补足其语义上下文。H=1、E=1、X=0、U=0，记账覆盖与映射率均为 100%。这不代表实现满足 I03。

正式输出需把上述教学位置替换为固定 base/head 的源码链接；不能为本示例虚构 MR URL 或生产 commit。真实运行示例时的固定 SHA 和结果记录于仓库综述配套的验证记录。

## 人的阅读与定位

从 After 第 4 行看查重使用的租户和 request_id；在第 6 行确认重试是否提前返回；到第 10 行检查 publish 是否被执行。观察 store 中有无任务、broker 中有无对应 ID，以及两次调用分别抛错还是返回 ACCEPTED。

对给定症状的回答：首次发布前失败留下记录；第二次调用提前返回，使发布不再尝试。首先定位查重早返回和发布之间的关系，再核对真实 store/broker/恢复器的保证。

本示例的 Python 验证只能证明给定教学模型的行为，不能作为数据库、消息队列、生产故障或 Skill 自动触发稳定性的验证。
