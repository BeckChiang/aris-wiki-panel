# @local/aris-wiki

DSH 客户端插件：在 Web UI 侧栏加一个「ARIS 知识库」按钮（排在「Dsh_Aris」之后），点开是一个中央面板，
一屏检索和阅读本机的 ARIS 知识资产——现在这些东西散在磁盘上，没人愿意翻。

**只读插件**：不写盘、不新建存储、不 spawn 进程、不装依赖。所有内容都来自其它工具已经写好的文件。

## 数据源（白名单，写死在宿主侧）

| 分组 | 来源 | 规则 |
| --- | --- | --- |
| 上游文档 | `<工作区>/.dsh/skills/aris/references/docs/**/*.md` | 递归；当前 95 篇（该目录共 119 个文件，其余 24 个是 `*.review.json`，不索引） |
| 替代矩阵 | `<工作区>/.dsh/skills/aris/MCP_REPLACEMENTS.md` | 单文件，存在才索引 |
| 项目文献 | `<项目根>/literature/**/*.md` | 项目根来自注册表，目录存在才索引 |
| 笔记 | `<项目根>/notes/**/*.md` | 同上 |
| 检索日志 | `<项目根>/search_logs/**/*.md` | 同上 |

项目注册表按顺序找：

1. `<工作区>/.dsh/aris-projects.json`（dsh-aris / `bin/lib/aris-registry.mjs` 实际写的位置）
2. `~/.dsh/aris-projects.json`（兼容旧位置）

兼容三种写法：裸数组、`{ "projects": [] }`、`{ "projects": { "<id>": {…} } }`。缺失、损坏、目录不存在都静默跳过。

## 边界

- **只读**：只有 `stat` / `readdir` / `read`，没有 `writeFile` / `mkdir` / `unlink` / `spawn`。
- **不新建存储**：没有配置文件、没有索引落盘、没有数据库；一切在内存里，进程重启即消失。
- **不接受前端传路径**：索引条目只暴露 SHA-1 前 16 位的 `id`，`doc?id=` 只认这个 id；
  读盘前仍然用 `resolve + 相对路径前缀` 再校验一次，必须落在白名单根目录内，防穿越。
- **不跟软链**：递归扫描跳过 symbolic link / junction，避免从数据源逃逸。
- **不碰暂停中的流水线**：`Frrs/second` 的项目文件只被读取用于展示，插件不会启动、推进或写入该流水线。

## 上限

| 项 | 值 |
| --- | --- |
| 索引条目 | 2000 条，超出截断并在宿主日志里留痕 |
| 单文件参与索引 | 2 MB，超出跳过 |
| 返回正文 | 200 KB，超出截断并返回 `truncated: true` |
| 摘要 | 正文前 200 字（去 frontmatter、去 Markdown 语法） |
| 递归深度 | 12 层；跳过 `node_modules` / `.git` / `.svn` / `.hg` |

## 缓存

- 整份索引在内存里缓存 **60 秒**；60 秒内直接复用，不再遍历目录。
- 过期重扫时只做 `stat`（列文件），命中 `(path, size, mtime)` 的条目复用上次的标题与摘要，
  只有新增/改动的文件才重新读盘——这就是「按 mtime 失效」。
- 注册表文件的 mtime 参与缓存签名：新登记一个项目后下一次请求就会生效。
- 面板「刷新」按钮带 `?refresh=1`，跳过 60 秒缓存强制重扫。

## HTTP 接口（都有面板头 `x-dsh-aris-wiki: 1`）

```http
GET /api/aris-wiki/index?refresh=1
  -> [{ id, group, source, title, rel, size, mtime, excerpt }]

GET /api/aris-wiki/doc?id=<id>
  -> { ok: true, title, rel, group, source, text, truncated, size, mtime }
```

- 缺面板头 → `403 { ok:false }`；未知 id → `404`；路径越界 → `403`；读盘异常 → `500`。
- `index` 成功时返回**裸数组**；`doc` 成功时返回对象；失败一律 `{ ok:false, error }`。

## 面板

- 搜索框：输入即过滤（前端过滤，索引一次拉全量），匹配标题 / 相对路径 / 来源 / 摘要。
- 分组筛选：全部 / 上游文档 / 替代矩阵 / 项目文献 / 笔记 / 检索日志，带计数。
- 结果列表：标题、分组标签、相对路径、大小、修改时间、两行摘要；按修改时间倒序。
- 阅读区：右侧（窄屏在下方）渲染正文。Markdown 最小渲染——标题、代码块、列表、引用、表格、
  行内 `code` / **粗体** / *斜体* / 链接；未闭合代码块会把剩余内容按代码显示。全部用 React 节点拼，
  不用 `innerHTML`，不引依赖。
- 顶部统计：`共 N 条 · 上游文档 X · 项目文献 Y · 最后更新 YYYY-MM-DD HH:mm`；筛选时追加「当前显示 N 条」。
- 空状态 / 加载中 / 出错都有中文文案，出错可原地重试。
- 视觉沿用 dsh-aris：中性灰 `rgba(127,127,127,α)`、细描边、圆角 8–16px，无第三方样式。

## 安装

```bash
# 用 plugin_manager install_bundle，target 是包目录绝对路径：
# <WORKSPACE>\plugins\aris-wiki
```

装完刷新页面，侧栏出现「ARIS 知识库」。`cordis.patch.yml` 把插件插到 `aris-wiki` 这个 id 下。

## 卸载

```bash
# 用 plugin_manager 卸载 @local/aris-wiki（或从 profile 的 package.json / 插件清单里移除）
```

卸载只会注销两条路由和两个 slot，没有数据要清：插件从不写盘。

## 结构

```
index.js         宿主半边：/api/aris-wiki/index、/api/aris-wiki/doc 两条只读路由 + 内存索引
client.js        客户端半边：sidebar.panellist 图标（order 26）+ main 面板
cordis.patch.yml 插入 aris-wiki 插件
locale/*.json    zh-CN / en 文案
icon.svg         插件图标
```
