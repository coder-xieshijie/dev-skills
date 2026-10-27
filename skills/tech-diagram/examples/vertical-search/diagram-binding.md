# Vertical search engine series: concept color binding

Locked before the first diagram. Read this file before each later diagram; a new concept may only be appended, existing rows never change.
Categories follow `references/domains/vertical-search.md`.

## Concept → color → shape

| Concept category | Components | Color slot | Shape |
|---|---|---|---|
| 用户 (user) | 用户 (user) / 搜索框 (search box) | `C.user` steel blue | Box |
| 数据源 (data sources) | 目标网站 (target websites) · 合作方 Feed (partner feeds) · 开放 API (open APIs) | `C.external` ink gray | Box (solid, a source actually crawled) |
| 离线建库 (offline index building) | 爬虫 (crawler) · 解析抽取 (parsing and extraction) · 去重清洗 (dedup and cleaning) · 建索引 (index building) | `C.subagent` caramel | Box; with several components, add a same-color `frame()` |
| 在线检索 (online retrieval) | Query 理解 (query understanding) · 多路召回 (multi-path recall) · 排序 (ranking) · 结果组装 (result assembly) | `C.agent` brick orange | Box; with several components, add a same-color `frame()` |
| 存储 (storage) | 倒排索引 (inverted index) · 正排库 (forward index) · 向量库 (vector store) (merged into 索引存储 (index storage) in the overview) | `C.memory` chestnut | Box |
| 模型 (models) | Embedding 模型 (embedding model) · 排序模型 (ranking model) | `C.llm` indigo | Box |
| 队列 (queues) | URL 抓取队列 (URL crawl queue) | `C.im` ink teal | Channel |

## Rulings on ambiguous concepts

- 向量库 (vector store) → 存储 (storage, `C.memory`), not a model. Only the Embedding 模型 (embedding model) that produces the vectors is `C.llm`.
- 建索引 (index building) → 离线建库 (offline index building, `C.subagent`), not storage. It is a processing action; only the index itself is storage.
- In the zoomed-in 离线建库 (offline index building) diagram, the offline pipeline is the subject but still uses `C.subagent`, standing out by `frame()` and size, not by borrowing `C.agent`.

## Colors used per diagram

| Diagram | user | subagent | agent | memory | llm | im | external |
|---|---|---|---|---|---|---|---|
| ① 总体架构 (overall architecture) `01_overview` | ● | ● | ● | ● | | | ● |
| ② 离线建库 (offline index building) `02_offline` | | ● | | ● | | ● | ● |
| ③ 在线检索 (online retrieval) `03_online` | ● | | ● | ● | ● | | |
