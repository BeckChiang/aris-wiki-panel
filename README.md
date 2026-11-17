# @local/aris-wiki

DSH 客户端插件：在 Web UI 侧栏给一个「Aris_Wiki」（排在「Dsh_Aris」之后），点开是中央面板，三个页签：
**计划 / 产物 / 文档**。它只负责**看**——流水线怎么跑、怎么裁决，都在 `Aris_Dsh` 面板。

**只读插件**：不写盘、不新建存储、不 spawn 进程、不装依赖。所有内容都来自其它工具已经写好的文件。

## 计划页

- **总览（卡墙）**：4 个 KPI（在跑 / 累计 / 需人工 / 等回件）+ 每条流水线一张卡：状态点与徽章、`6/11 · 阶段中文名 · S4b_plan`、11 段阶段 rail（**可点**，点哪段进详情并定位到该段）、「现在」（本轮起点 / 已跑 / 步数 / 上下文）、两条进度条、页脚（轮 / 费用 / 门禁 / 阻碍 / 下轮）、最顶一条阻碍。
- **详情**：状态条（状态 / 阶段 / 现在 / 回件 / 成本）→ 可折叠分区：当前阶段、阻碍、门禁、总计划、进展时间线、最近 8 轮；工具条有「展开全部 / 全部收起」。
- **阶段体内分五组、各自可折叠**：进入退出条件、计划项（PIPELINE.md 的 `- [ ]`，全量）、待做（自己能干）、等外部回件（送审/待回复单列）、已完成步骤；计划项右侧标「N 步」表示对应几个状态机步骤。
- **阻碍会告诉你怎么办**：`state-block` / `blocked-on-user` / `gate` 标「需人工」；`error`、`stopping`、`blocked-until`、`review-pending`、`gate-pending`、`budget`、`never-run` 只看。动作按钮 `看日志 / 看样子 / 看门禁 / 看判据 / 看是哪一步` 页内直接生效（含日志抽屉）；`打开邮箱队列 / 看预算` 需要跨到 `Aris_Dsh`，没有公开跳转 API，降级为复制路径 + 提示。

### 状态与「需人工」怎么判（与 dsh 流水线同源）

`lib/plan.mjs` 的 `statusOf()` 照抄 `Aris_Dsh` 的判定顺序：出错 → 等待人工（`state.block` 或任一阶段 `blocked_on_user`）→ 停止中 → 正在运行 → 已停止 → 等待审核（有在途审稿）→ 待命。

「在途审稿」复刻 `bin/lib/aris-runner.mjs` 的 `pendingReviews`：读 `~/.dsh/aris-dashboard.json` 的 `mailbox`，看 `<邮箱>/projects.json` 里登记、且 `<邮箱>/in/<base>.request.md` 仍存在的请求；超时阈值 = `max(30, 2×Kimi 取件周期)` 分钟（当前 15 分钟 → 30 分钟），**超阈值只告警，不转人工**。

> 0.1.0 的旧口径看 `.aris/reviews/*.json` 的 mtime 判人工，而那是只增不删的归档目录 → 流水线明明在跑却长期报「需人工」。0.2.0 已改为上面这套。

## 产物页

- 顶部 chips 选流水线（产物按流水线分开）
- 主论文卡、左列六组（论文 / 图 / 实验 / 审查 / 运行 / 幻灯片）、右列预览（文本 Markdown、图片直显、PDF 内嵌）
- 扫描上限：单组 400 文件、总 1500、文本 2MB、二进制 4MB、深度 4；越界路径 404

## 文档页

一屏检索和阅读本机 ARIS 知识资产（上游文档 95 篇、替代矩阵、项目文献、笔记、检索日志）。

| 分组 | 来源 | 规则 |
| --- | --- | --- |
| 上游文档 | `<工作区>/.dsh/skills/aris/references/docs/**/*.md` | 递归；`*.review.json` 不索引 |
| 替代矩阵 | `<工作区>/.dsh/skills/aris/MCP_REPLACEMENTS.md` | 单文件，存在才索引 |
| 项目文献 | `<项目根>/literature/**/*.md` | 项目根来自注册表 |
| 笔记 | `<项目根>/notes/**/*.md` | 同上 |
| 检索日志 | `<项目根>/search_logs/**/*.md` | 同上 |

项目注册表按顺序找 `<工作区>/.dsh/aris-projects.json` → `~/.dsh/aris-projects.json`，兼容裸数组 / `{projects:[]}` / `{projects:{id:{…}}}`；缺失、损坏、目录不存在都静默跳过。

## 边界

- **只读**：只有 `stat` / `readdir` / `read`，没有写盘、没有 `spawn`。
- **不新建存储**：没有配置文件、没有落盘索引、没有数据库；一切在内存里。
- **不接受前端传路径**：文档页只认 SHA-1 前 16 位 `id`；文件预览走 `rel` 但先 `safeResolve` 防越界，必须落在项目根内。
- **不跟软链**：递归扫描跳过 symbolic link / junction。
- **不碰暂停中的流水线**：只读展示，不启动、不推进、不写入。

## HTTP 接口（都有面板头 `x-dsh-aris-wiki: 1`）

```http
GET /api/aris-wiki/index?refresh=1        -> [{ id, group, source, title, rel, size, mtime, excerpt }]
GET /api/aris-wiki/doc?id=<id>            -> { ok, title, rel, group, source, text, truncated, size, mtime }
GET /api/aris-wiki/plan?name=<流水线>     -> 总览（allOf）或单条详情（planOf）
GET /api/aris-wiki/artifacts?name=<流水线> -> { groups, main, pipeline }
GET /api/aris-wiki/file?name=<流水线>&rel=<路径> -> { ok, mime, text | dataUrl }
```

- 缺面板头 → `403 { ok:false }`；未知 id / 路径越界 → `403` 或 `404`；读盘异常 → `500`。
- `file` 可读范围是项目根内的文本/图片/PDF（含 `.aris-run/runs/<runId>/*.log|final.txt`），只做越界校验，不设目录白名单。

## 上限与缓存

| 项 | 值 |
| --- | --- |
| 索引条目 | 2000 条，超出截断 |
| 单文件参与索引 | 2 MB |
| 返回正文 | 200 KB（超出 `truncated: true`） |
| 递归深度 | 12 层；跳过 `node_modules` / `.git` / `.svn` / `.hg` |
| 索引缓存 | 内存 60 秒；过期重扫只 `stat`，按 `(path,size,mtime)` 复用标题与摘要；面板「刷新」带 `?refresh=1` |

## 安装

```bash
# 用 plugin_manager install_bundle，target 是包目录的绝对路径（本仓 plugins/aris-wiki）：
# <工作区>/plugins/aris-wiki
```

装完刷新页面，侧栏出现「Aris_Wiki」。`cordis.patch.yml` 把插件插到 `aris-wiki` 这个 id 下。卸载只注销 slot 和几条路由，没有数据要清。

## 结构

```
index.js            宿主半边：/api/aris-wiki/{index,doc,plan,artifacts,file} 只读路由 + 内存索引
lib/plan.mjs        计划数据层：状态判定、阻碍、阶段/步骤/计划项、门禁、时间线、历史轮次
lib/artifacts.mjs   产物扫描与文件读取（safeResolve 防越界）
client.js           客户端半边：Aris_Wiki 图标 + 三页签面板
cordis.patch.yml    插入 aris-wiki 插件
locale/*.json       zh-CN / en 文案
icon.svg            插件图标
```
