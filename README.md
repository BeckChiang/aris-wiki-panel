# @local/aris-wiki

DSH 客户端插件：侧栏「Aris_Wiki」，**全链路只读**的四页签面板。看流水线怎么跑、产物长什么样、知识库有什么；写操作都在 `Aris_Dsh`。

## 四个页签

| 页签 | 内容 |
| --- | --- |
| 总览 | KPI 卡墙 + 每条流水线一张卡：状态点、阶段、11 段阶段 rail（可点）、现在、两条进度条、页脚（轮 / 费用 / 门禁 / 阻碍 / 下轮）、最顶一条阻碍 |
| 计划 | 状态条 → 阻碍 → 门禁 → **11 阶段总表** → 进展时间线 → 最近轮次；点阶段行在该行下方展开明细（进入 / 退出条件、计划项、待做、等外部回件、已完成步骤），每组单独可折叠 |
| 产物 | 顶部 chips 选流水线；主论文卡；左列六组文件表 + 右列预览（文本 / 图片 / **PDF iframe 内嵌**）；左表与预览撑满页签，拖拽条调宽、双击复位 |
| 文档 | 知识库索引与阅读器：上游文档、替代矩阵、项目文献、笔记、检索日志；搜索 + 类型 chips |

2026-11-19 起「总计划」不再额外画一棵与 11 阶段表重复的阶段树，树与表合一；顶部页签与 `Aris_Dsh` 同一套规格（下划线页签 + 计数胶囊）。

## 数据来源（只读，不新建存储）

| 来源 | 用途 |
| --- | --- |
| `lib/plan.mjs` 的 `planOf()` | 计划详情：阶段、计划项、步骤、门禁、阻碍、时间线、历史轮次 |
| `<项目>/pipeline/state.json`、`PIPELINE.md`、`budget.json` | 状态、进入退出条件、预算 |
| `<项目>/.aris-run/runtime.json`、`costs.jsonl`、`runs/<runId>/meta.json` | 本轮、每轮费用与结论 |
| `<项目>/.aris/reviews/*.json`、`~/.dsh/aris-dashboard.json` | 审查裁决、邮箱与在途审稿 |
| `lib/artifacts.mjs` 扫描 | 产物六组、主论文、引用体检、文件预览 |

## HTTP 接口（只读，都要面板头 `x-dsh-aris-wiki: 1`）

```http
GET /api/aris-wiki/index?refresh=1         -> [{ id, group, source, title, rel, size, mtime, excerpt }]
GET /api/aris-wiki/doc?id=<id>             -> { ok, title, rel, group, source, text, truncated, size, mtime }
GET /api/aris-wiki/plan?name=all           -> 总览（全部流水线）
GET /api/aris-wiki/plan?name=<流水线>      -> 单条详情
GET /api/aris-wiki/artifacts?name=<流水线> -> { main, files, groups, audit }
GET /api/aris-wiki/file?name=<流水线>&rel=<路径> -> { mime, text | dataUrl }（PDF 走 dataUrl）
```

- 缺面板头 → `403`；未知 id / 路径越界 → `403` 或 `404`；读盘异常 → `500`。
- `file` 只做越界校验（必须落在项目根内），不设目录白名单；PDF 超过 `MAX_BINARY_BYTES`（4MB）返回 oversized，面板只给「打开原文件」。

## 判定口径（与 dsh 流水线同源）

`statusOf()` 顺序：出错 → 等待人工（`state.block` 或任一阶段 `blocked_on_user`）→ 停止中 → 正在运行 → 已停止 → 等待审核（在途审稿）→ 待命。

「在途审稿」复刻 `bin/lib/aris-runner.mjs` 的 `pendingReviews`：`~/.dsh/aris-dashboard.json` 的 `mailbox` → `<邮箱>/projects.json` + `in/<base>.request.md` 双条件；超时阈值 `max(30, 2×Kimi 取件周期)` 分钟，超阈值只告警、不转人工。

## 边界

- **只读**：只有 `stat` / `readdir` / `read`，没有写盘、没有 `spawn`。
- **不新建存储**：无配置、无落盘索引、无数据库；索引在内存里缓存 60 秒。
- **不接受前端传路径**：文档页只认 SHA-1 前 16 位 `id`；文件预览走 `rel` 但先 `safeResolve` 防越界。
- **不跟软链**：递归扫描跳过 symbolic link / junction。

## 上限与缓存

| 项 | 值 |
| --- | --- |
| 索引条目 | 2000 条，超出截断 |
| 单文件参与索引 | 2 MB |
| 返回正文 | 200 KB（超出 `truncated: true`） |
| 递归深度 | 12 层；跳过 `node_modules` / `.git` / `.svn` / `.hg` |
| 产物扫描 | 单组 400 文件、总 1500、文本 2MB、二进制 4MB、深度 4 |
| 索引缓存 | 内存 60 秒；「刷新」带 `?refresh=1` |

## 安装

```bash
# 用 plugin_manager install_bundle，target 是包目录绝对路径
# <工作区>/plugins/aris-wiki
```

装完刷新页面。卸载只注销 slot 与路由，没有数据要清。

## 结构

```
index.js            宿主半边：5 条只读路由 + 内存索引
client.js           客户端半边：四页签面板（样式在文件前段）
lib/plan.mjs        计划数据层：状态判定、阻碍、阶段 / 步骤 / 计划项、门禁、时间线、历史
lib/artifacts.mjs   产物扫描与文件读取（safeResolve 防越界）
cordis.patch.yml    插入 aris-wiki 插件
locale/*.json       zh-CN / en 文案
icon.svg            插件图标
```
