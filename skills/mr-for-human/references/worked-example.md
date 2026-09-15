# 教学示例

按需读示例一的失败窗口，或示例二的简短降级指南。两者均为合成材料；文件名及行号指各自代码块，从 1 起算。实际交付须换成固定快照的真实源码链接。示例下方的指南展示写法，代码块是输入材料。

## 示例一：新增查重改变了失败后的重试行为

教学需求：ACCEPTED 表示已建立可恢复的执行责任；同租户、同 request_id 的串行重试返回原任务，租户间隔离。

依赖约定：actor 来自可信认证入口；store 的 get/insert 在本模型中成功，记录在示例调用之间保留；publish 可能在入队前抛错。模型没有后台恢复扫描。store 内部的索引、唯一性、清理、日志与真实持久化语义均未给出。

### 输入：submit.py，修改

Before：

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

After：

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

### 指南：先看结论

**新增早返回将“有记录”当成“已接受执行”的充分条件。首次发布失败后，重试会报成功却不再发布，违反教学需求。**证据：After 第 4–6、7–11 行。修复方向应恢复执行责任；若考虑放宽 ACCEPTED 的契约，需要用户决定这一业务变化。

另一个关键决定是按可信 actor 的租户查重，并保留读写前鉴权（第 2–4 行），使重试隔离在同一租户内。

### 目录具体改了什么

| 目录 / 文件及状态 | 具体变化 | 与目标的关系 |
|---|---|---|
| 根目录 / submit.py，修改 | 新增第 4–6 行，同租户同键存在记录时提前返回 | 目标内修改，实现串行查重；同时改变发布失败后的重试行为 |

本模型只提供这一文件的完整 before/after，未见额外改动；权限检查、插入和发布为未改上下文。

### 主流程、边界与失败

正常路径：鉴权 → 同租户查重 → 命中返回旧任务；未命中则插入 → 发布 → 返回。submit 封装了内部调用顺序；调用者仍需传入 store 和 broker。

核心伪代码保留失败窗口（After 第 4–11 行）：

```text
existing = store.get(actor.tenant_id, request.request_id)
if existing exists:
    return ACCEPTED(existing.id)
job = store.insert(actor.tenant_id, request.request_id, request.payload)
broker.publish(job.id)  // 入队前可能抛错；示例中的记录仍保留
return ACCEPTED(job.id)
```

| 边界 / 失败条件 | 已完成什么 | 实际处理与可见结果 |
|---|---|---|
| 无权限 | 尚无业务读写 | 抛 FORBIDDEN（第 2–3 行） |
| 插入后 publish 在入队前失败 | 已有记录，没有消息 | 首次向调用者抛错；无本函数内的降级或补偿（第 7–11 行） |
| 失败后用同键重试 | 旧记录仍在 | 第 6 行返回 ACCEPTED，不再发布；模型无恢复扫描，尚未建立执行责任 |

原版已有先写后发的失败窗口，但重试会再次创建并发布；新增查重改变了重试后果。真实系统应核实已有恢复能力；若建议命中后再发，先确认重复投递与消费幂等的边界。

### 阅读路线与验证边界

从 After 第 4 行追查重键，到第 6 行看提前返回，再看第 10 行发布是否执行。观察首次异常、重试响应、store 记录与 broker 消息，能区分“已记录”和“已投递”。

可静态核实入口调用次数有界；get/insert/publish 的内部成本、唯一性与清理策略未知，不能推导总工作量为常数或记录永不过期。首次错误可被调用方观察，其他告警渠道未知。并发唯一性、同键不同 payload 的契约需另查。

## 示例二：读取超时后返回明确标记的备用结果

教学需求已确认：目录读取超时可以返回同租户的备用数据，并提示降级；权限等其他错误继续向上抛出。备用读取失败也传播错误。remote/fallback 在本模型中均为只读依赖，按传入 tenant_id 隔离数据；上游身份可信。真实实现需另核实这些依赖保证。

### 输入：两个文件的完整 before/after

catalog.py Before：

```python
def load_catalog(remote, fallback, tenant_id):
    return {"items": remote.fetch(tenant_id), "source": "live"}
```

catalog.py After：

```python
def load_catalog(remote, fallback, tenant_id):
    try:
        return {"items": remote.fetch(tenant_id), "source": "live"}
    except TimeoutError:
        return {"items": fallback.get(tenant_id), "source": "fallback"}
```

page.py Before：

```python
def render(result):
    return {"items": result["items"], "notice": ""}
```

page.py After：

```python
def render(result):
    notice = "备用数据" if result["source"] == "fallback" else ""
    return {"items": result["items"], "notice": notice}
```

### 指南：先看结论

**超时现在能返回有标记的备用结果，读取与展示两侧都落实了已确认的降级契约。当前没有需要用户决定的事项。**关键决定是只捕获 TimeoutError：其他错误保持抛出，避免将权限失败伪装为可用结果。证据：catalog.py After 第 2–5 行、page.py After 第 2–3 行。

### 目录具体改了什么

| 目录 / 文件及状态 | 具体变化 | 与目标的关系 |
|---|---|---|
| 根目录 / catalog.py，修改 | 超时后按同一 tenant_id 读取备用数据，source 设为 fallback | 目标内修改，提供约定的降级 |
| 根目录 / page.py，修改 | 根据 source 显示“备用数据” | 必要配套，使调用结果中的降级状态对用户可见 |

两个文件的变化均与目标有关；所给完整差异中未见额外改动。

### 主流程、边界与失败降级

正常读取显示远端数据；超时后显示备用数据及提示。没有写入副作用，备用数据的实时性取决于 fallback，代码没有承诺新鲜度。权限错误以及备用读取失败均传播给调用方，本例未提供外层错误展示。降级结束于本次响应，后续调用仍先尝试远端；没有后台恢复任务。

### 阅读路线与验证边界

先看 catalog.py 的异常类型和 tenant_id 传递，再看 page.py 的 source 分支。逻辑较短，直接链接这两处即可。示例可核实控制流和展示字段；真实数据隔离、备用数据更新策略、超时后原请求是否仍运行及外层错误展示需结合实际依赖验证。

---

执行检查与限制见 [验证记录](../../../docs/mr-for-human-validation.md)。示例结果不证明生产数据库、真实网络超时或读者使用效果。
