// Host half of @local/aris-wiki: a read-only index over the ARIS knowledge
// assets scattered on this machine. Nothing here writes to disk, starts a
// process, or creates a new store — it only reads what other tools already
// wrote (mirrors @local/dsh-aris in shape and conventions).
//
//   GET /api/aris-wiki/index            -> [{ id, group, source, title, rel, size, mtime, excerpt }]
//   GET /api/aris-wiki/doc?id=<id>      -> { ok, title, rel, group, source, text, truncated, size, mtime }
//   GET /api/aris-wiki/plan?name=all    -> { ok, summary, pipelines[], errors }
//   GET /api/aris-wiki/plan?name=<name> -> { ok, plan: stages / gates / blockers / history }
//   GET /api/aris-wiki/artifacts?name=<name> -> { ok, main, files, groups, audit }
//   GET /api/aris-wiki/file?name=<name>&rel=<rel> -> text | image | pdf (read-only preview)
//
// All routes require the panel header (same anti-accident convention as
// dsh-aris, own name): x-dsh-aris-wiki: 1
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { allOf, findPipeline, pipelines, planOf } from './lib/plan.mjs';
import { readArtifactFile, scanArtifacts } from './lib/artifacts.mjs';

export const name = '@local/aris-wiki';
export const inject = ['webServer'];

const INDEX_PATH = '/api/aris-wiki/index';
const DOC_PATH = '/api/aris-wiki/doc';
const PLAN_PATH = '/api/aris-wiki/plan';
const ARTS_PATH = '/api/aris-wiki/artifacts';
const FILE_PATH = '/api/aris-wiki/file';
const PANEL_HEADER = 'x-dsh-aris-wiki';

const CACHE_MS = 60_000;
const MAX_ITEMS = 2000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DOC_BYTES = 200 * 1024;
const EXCERPT_CHARS = 200;
const META_BYTES = 24 * 1024;
const MAX_DEPTH = 12;
const MAX_WALK = MAX_ITEMS * 4;
const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg']);

// 分组：上游文档 / 替代矩阵 / 项目文献 / 笔记 / 检索日志
const PROJECT_SUBS = [
  ['literature', 'literature'],
  ['notes', 'notes'],
  ['search_logs', 'search'],
];
const GROUP_LABEL = { docs: '上游文档', mcp: '替代矩阵', literature: '项目文献', notes: '笔记', search: '检索日志' };

// 装在别处（profile 里的软链、或整包复制）时兜底；正常情况下工作区从插件自身位置推导。
const FALLBACK_WORKSPACE = process.env.DSH_WORKSPACE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HERE_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// 缓存：60 秒内复用整份索引；重扫时按 (path,size,mtime) 复用每条的标题与摘要，
// 只对新增/改动的文件重新读盘。这就是「按 mtime 失效」。
const cache = {
  at: 0,
  workspace: '',
  sig: '',
  items: [],
  byId: new Map(),
  byPath: new Map(),
  roots: [],
  files: [],
  stats: { skippedLarge: 0, capped: false, sources: 0 },
};
let inflight = null;

export function clearCache() {
  cache.at = 0;
  cache.workspace = '';
  cache.sig = '';
  cache.items = [];
  cache.byId = new Map();
  cache.byPath = new Map();
  cache.roots = [];
  cache.files = [];
  cache.stats = { skippedLarge: 0, capped: false, sources: 0 };
}

// ---------------------------------------------------------------------------
// 路径解析与白名单

function derivedWorkspace() {
  const parent = path.dirname(HERE_DIR);
  return path.basename(parent) === 'plugins' ? path.dirname(parent) : '';
}

export function resolveWorkspace(config = {}) {
  const configured = String(config.workspace || config.workspaceRoot || '').trim();
  const candidates = [];
  if (configured) candidates.push(path.resolve(configured));
  const derived = derivedWorkspace();
  if (derived) candidates.push(path.resolve(derived));
  candidates.push(FALLBACK_WORKSPACE);
  candidates.push(process.cwd());
  for (const candidate of candidates) {
    try {
      if (fs.statSync(path.join(candidate, '.dsh', 'skills', 'aris', 'references', 'docs')).isDirectory()) return candidate;
    } catch {
      /* try next */
    }
  }
  return candidates[0] || process.cwd();
}

function isInside(root, target) {
  const rel = path.relative(path.resolve(root), path.resolve(target));
  return !!rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

function isAllowed(index, abs) {
  const target = path.resolve(abs);
  if (index.files.some((file) => file.toLowerCase() === target.toLowerCase())) return true;
  return index.roots.some((root) => isInside(root, target));
}

async function isDirectory(target) {
  try {
    return (await fsp.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(target) {
  try {
    return (await fsp.stat(target)).isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 数据源：白名单根目录写死在宿主侧，前端只能拿到 id，不能传路径。

function registryCandidates(workspace) {
  return [
    path.join(workspace, '.dsh', 'aris-projects.json'),
    path.join(os.homedir(), '.dsh', 'aris-projects.json'),
  ];
}

// 兼容三种历史写法：数组 / { projects: [] } / { projects: { id: entry } }。
async function readProjectRoots(workspace) {
  for (const file of registryCandidates(workspace)) {
    let raw;
    try {
      raw = JSON.parse(await fsp.readFile(file, 'utf8'));
    } catch {
      continue;
    }
    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && Array.isArray(raw.projects)) list = raw.projects;
    else if (raw && raw.projects && typeof raw.projects === 'object') {
      list = Object.entries(raw.projects).map(([id, value]) => ({ id, ...(value || {}) }));
    }
    const seen = new Set();
    const roots = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const value = item.root || item.project || (item.stateDir ? path.dirname(String(item.stateDir)) : '');
      if (!value) continue;
      let root;
      try {
        root = path.resolve(String(value));
      } catch {
        continue;
      }
      const key = root.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const fallback = path.basename(root) || 'project';
      roots.push({
        id: String(item.id || fallback),
        name: String(item.name || fallback),
        root,
      });
    }
    let mtime = 0;
    try {
      mtime = (await fsp.stat(file)).mtimeMs || 0;
    } catch {
      /* ignore */
    }
    return { file, mtime, roots };
  }
  return { file: '', mtime: 0, roots: [] };
}

async function planSources(workspace) {
  const sources = [];
  // 1. 上游文档：<ws>/.dsh/skills/aris/references/docs/**/*.md
  const arisDir = path.join(workspace, '.dsh', 'skills', 'aris');
  const docsDir = path.join(arisDir, 'references', 'docs');
  if (await isDirectory(docsDir)) {
    sources.push({
      key: 'docs',
      group: 'docs',
      pipe: 'shared',
      pipeLabel: 'ARIS 共享',
      source: 'ARIS docs',
      root: docsDir,
      mode: 'tree',
    });
  }
  // 2. 替代矩阵：<ws>/.dsh/skills/aris/MCP_REPLACEMENTS.md（存在才索引）
  const mcpFile = path.join(arisDir, 'MCP_REPLACEMENTS.md');
  if (await isFile(mcpFile)) {
    sources.push({
      key: 'mcp',
      group: 'mcp',
      pipe: 'shared',
      pipeLabel: 'ARIS 共享',
      source: 'ARIS',
      root: path.dirname(mcpFile),
      mode: 'file',
      file: mcpFile,
    });
  }
  // 3. 可选项目目录：注册表里登记且真实存在的根，只读扫 literature/notes/search_logs
  const registry = await readProjectRoots(workspace);
  for (const project of registry.roots) {
    for (const [sub, group] of PROJECT_SUBS) {
      const dir = path.join(project.root, sub);
      if (await isDirectory(dir)) {
        sources.push({
          key: `project:${project.id}:${sub}`,
          group,
          pipe: `project:${project.id}`,
          pipeLabel: project.name,
          source: project.name,
          root: dir,
          mode: 'tree',
        });
      }
    }
  }
  return { sources, registryFile: registry.file, registryMtime: registry.mtime };
}

async function walkMarkdown(root) {
  const out = [];
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length && out.length < MAX_WALK) {
    const { dir, depth } = queue.shift();
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (out.length >= MAX_WALK) break;
      const abs = path.join(dir, entry.name);
      // 不跟软链/重解析点，避免从数据源逃逸出去
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (depth + 1 <= MAX_DEPTH && !SKIP_DIRS.has(entry.name)) queue.push({ dir: abs, depth: depth + 1 });
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.md$/i.test(entry.name)) continue;
      out.push(abs);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// markdown → 纯文本（摘要与标题用，不是渲染器）

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function splitFrontmatter(text) {
  const raw = stripBom(String(text || ''));
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
  if (match) return { front: match[1], body: raw.slice(match[0].length) };
  return { front: '', body: raw };
}

function stripFences(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ');
}

function inlinePlain(text) {
  return String(text)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function plainText(body) {
  let text = inlinePlain(body);
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
  text = text.replace(/^[ \t]{0,3}>[ \t]?/gm, '');
  text = text.replace(/^[ \t]{0,3}([-*+]|\d+[.)])[ \t]+/gm, '');
  text = text.replace(/^[ \t]*\|?[ \t:|-]{3,}\|?[ \t]*$/gm, ' ');
  text = text.replace(/^[ \t]*([-*_][ \t]*){3,}$/gm, ' ');
  text = text.replace(/[ \t]*\|[ \t]*/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

function frontTitle(front) {
  if (!front) return '';
  const match = /^title[ \t]*:[ \t]*(.+)$/im.exec(front);
  if (!match) return '';
  return String(match[1]).trim().replace(/^["']|["']$/g, '').trim();
}

function firstHeading(body) {
  const match = /^[ \t]{0,3}#{1,6}[ \t]+(.+?)\.?[ \t]*$/m.exec(body);
  return match ? match[1].replace(/[ \t]+#+[ \t]*$/, '').trim() : '';
}

function prettyName(abs) {
  return path
    .basename(abs, path.extname(abs))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || path.basename(abs);
}

function deriveTitle(raw, abs) {
  const { front, body } = splitFrontmatter(raw);
  const fromFront = frontTitle(front);
  if (fromFront) return fromFront.slice(0, 160);
  const heading = firstHeading(stripFences(body));
  if (heading) {
    const clean = inlinePlain(heading).replace(/\s+/g, ' ').trim();
    if (clean) return clean.slice(0, 160);
  }
  return prettyName(abs);
}

function deriveExcerpt(raw) {
  const { body } = splitFrontmatter(raw);
  return plainText(stripFences(body)).slice(0, EXCERPT_CHARS);
}

// ---------------------------------------------------------------------------
// 读盘

async function readPrefix(abs, bytes) {
  const length = Math.max(1, Math.min(Number(bytes) || 1, MAX_DOC_BYTES + 1));
  const handle = await fsp.open(abs, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    let text = buffer.subarray(0, bytesRead).toString('utf8');
    // 多字节字符被切断时末尾会出现 U+FFFD；丢掉它，不让半个字进界面。
    if (bytesRead >= length && text.endsWith('\uFFFD')) text = text.slice(0, -1);
    return text;
  } finally {
    await handle.close();
  }
}

async function readMeta(abs, size) {
  const raw = await readPrefix(abs, Math.min(size, META_BYTES));
  return { title: deriveTitle(raw, abs), excerpt: deriveExcerpt(raw) };
}

function hashId(key) {
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

function relOf(source, abs) {
  if (source.mode === 'file') return path.basename(abs);
  return path.relative(source.root, abs).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// 索引

function snapshot(cached) {
  return {
    workspace: cache.workspace,
    items: cache.items,
    byId: cache.byId,
    roots: cache.roots,
    files: cache.files,
    stats: cache.stats,
    scannedAt: cache.at,
    cached: !!cached,
  };
}

async function loadIndex(workspace, options = {}) {
  const plan = await planSources(workspace);
  const sig = plan.sources.map((s) => `${s.key}|${s.root}|${s.file || ''}`).join('~') + `@${Math.round(plan.registryMtime)}`;
  const startedAt = Date.now();
  if (!options.force && cache.at && cache.workspace === workspace && cache.sig === sig && startedAt - cache.at < CACHE_MS) {
    return snapshot(true);
  }

  const byPath = new Map();
  const byId = new Map();
  const items = [];
  const seen = new Set();
  const roots = [];
  const files = [];
  let skippedLarge = 0;
  let capped = false;

  outer: for (const source of plan.sources) {
    let candidates;
    if (source.mode === 'file') {
      files.push(path.resolve(source.file));
      candidates = [source.file];
    } else {
      roots.push(path.resolve(source.root));
      candidates = await walkMarkdown(source.root);
    }
    for (const candidate of candidates) {
      if (items.length >= MAX_ITEMS) {
        capped = true;
        break outer;
      }
      const abs = path.resolve(candidate);
      const key = abs.toLowerCase();
      if (seen.has(key)) continue;
      let info;
      try {
        info = await fsp.stat(abs);
      } catch {
        continue;
      }
      if (!info.isFile()) continue;
      if (info.size > MAX_FILE_BYTES) {
        skippedLarge += 1;
        continue;
      }
      seen.add(key);
      const id = hashId(key);
      const previous = cache.byPath.get(key);
      let meta;
      if (previous && previous.size === info.size && previous.mtimeMs === info.mtimeMs) {
        meta = { title: previous.title, excerpt: previous.excerpt };
      } else {
        try {
          meta = await readMeta(abs, info.size);
        } catch {
          continue;
        }
      }
      const entry = {
        id,
        group: source.group,
        pipe: source.pipe || 'shared',
        pipeLabel: source.pipeLabel || 'ARIS 共享',
        source: source.source,
        title: meta.title,
        rel: relOf(source, abs),
        size: info.size,
        mtime: new Date(info.mtimeMs).toISOString(),
        excerpt: meta.excerpt,
      };
      items.push(entry);
      byId.set(id, { abs, item: entry });
      byPath.set(key, { size: info.size, mtimeMs: info.mtimeMs, title: meta.title, excerpt: meta.excerpt });
    }
  }

  // 最近改过的排前面；同一时间按标题，列表才稳定。
  items.sort((a, b) => (a.mtime === b.mtime ? a.title.localeCompare(b.title) : a.mtime < b.mtime ? 1 : -1));

  cache.at = startedAt;
  cache.workspace = workspace;
  cache.sig = sig;
  cache.items = items;
  cache.byId = byId;
  cache.byPath = byPath;
  cache.roots = roots;
  cache.files = files;
  cache.stats = { skippedLarge, capped, sources: plan.sources.length };
  return snapshot(false);
}

export async function buildIndex(options = {}) {
  const workspace = resolveWorkspace(options);
  if (options.force) clearCache();
  if (inflight && inflight.workspace === workspace) return inflight.promise;
  const promise = loadIndex(workspace, options);
  inflight = { workspace, promise };
  promise
    .catch(() => {})
    .finally(() => {
      if (inflight && inflight.promise === promise) inflight = null;
    });
  return promise;
}

export async function readDoc(id, options = {}) {
  const index = await buildIndex(options);
  const hit = index.byId.get(String(id || ''));
  if (!hit) return { ok: false, status: 404, error: '没有这个条目，索引可能已刷新' };
  if (!isAllowed(index, hit.abs)) return { ok: false, status: 403, error: '路径不在白名单根目录内' };
  let info;
  try {
    info = await fsp.stat(hit.abs);
  } catch {
    return { ok: false, status: 404, error: '文件已不存在' };
  }
  if (!info.isFile()) return { ok: false, status: 404, error: '目标不是文件' };
  const truncated = info.size > MAX_DOC_BYTES;
  let raw;
  try {
    raw = await readPrefix(hit.abs, Math.min(info.size, MAX_DOC_BYTES));
  } catch (error) {
    return { ok: false, status: 500, error: `读取失败：${String((error && error.message) || error)}` };
  }
  if (truncated) {
    const cut = raw.lastIndexOf('\n');
    if (cut > 0) raw = raw.slice(0, cut);
  }
  const { body } = splitFrontmatter(raw);
  return {
    ok: true,
    title: hit.item.title,
    rel: hit.item.rel,
    group: hit.item.group,
    pipe: hit.item.pipe,
    pipeLabel: hit.item.pipeLabel,
    source: hit.item.source,
    text: body,
    truncated,
    size: info.size,
    mtime: new Date(info.mtimeMs).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// HTTP

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

export function apply(ctx, config = {}) {
  const logger = ctx && ctx.logger;

  const indexHandler = async (req, res) => {
    if (req.headers[PANEL_HEADER] !== '1') return json(res, 403, { ok: false, error: '缺少面板请求标记' });
    try {
      const url = new URL(req.url || INDEX_PATH, 'http://localhost');
      const index = await buildIndex({ ...config, force: url.searchParams.get('refresh') === '1' });
      // 规格就是「返回条目数组」：成功时是裸数组，失败时才是 { ok:false }。
      json(res, 200, index.items);
    } catch (error) {
      logger?.error?.(`[aris-wiki] index 失败：${messageOf(error)}`);
      json(res, 500, { ok: false, error: messageOf(error) });
    }
  };

  const docHandler = async (req, res) => {
    if (req.headers[PANEL_HEADER] !== '1') return json(res, 403, { ok: false, error: '缺少面板请求标记' });
    try {
      const url = new URL(req.url || DOC_PATH, 'http://localhost');
      const result = await readDoc(url.searchParams.get('id') || '', { ...config });
      if (!result.ok) return json(res, result.status || 404, { ok: false, error: result.error });
      json(res, 200, {
        ok: true,
        title: result.title,
        rel: result.rel,
        group: result.group,
        source: result.source,
        text: result.text,
        truncated: result.truncated,
        size: result.size,
        mtime: result.mtime,
      });
    } catch (error) {
      logger?.error?.(`[aris-wiki] doc 失败：${messageOf(error)}`);
      json(res, 500, { ok: false, error: messageOf(error) });
    }
  };

  const planHandler = async (req, res) => {
    if (req.headers[PANEL_HEADER] !== '1') return json(res, 403, { ok: false, error: '缺少面板请求标记' });
    if (req.method && req.method !== 'GET') return json(res, 405, { ok: false, error: '只接受 GET' });
    try {
      const url = new URL(req.url || PLAN_PATH, 'http://localhost');
      const workspace = resolveWorkspace(config);
      const name = String(url.searchParams.get('name') || 'all');
      if (!name || name === 'all') return json(res, 200, allOf(workspace));
      const target = findPipeline(workspace, name);
      if (!target) return json(res, 404, { ok: false, error: `没有登记这条流水线：${name}` });
      const detail = planOf(target, { history: Number(url.searchParams.get('history')) || undefined });
      json(res, detail.ok ? 200 : 404, detail);
    } catch (error) {
      logger?.error?.(`[aris-wiki] plan 失败：${messageOf(error)}`);
      json(res, 500, { ok: false, error: messageOf(error) });
    }
  };

  const artsHandler = async (req, res) => {
    if (req.headers[PANEL_HEADER] !== '1') return json(res, 403, { ok: false, error: '缺少面板请求标记' });
    if (req.method && req.method !== 'GET') return json(res, 405, { ok: false, error: '只接受 GET' });
    try {
      const url = new URL(req.url || ARTS_PATH, 'http://localhost');
      const workspace = resolveWorkspace(config);
      const name = String(url.searchParams.get('name') || '');
      const target = name ? findPipeline(workspace, name) : pipelines(workspace)[0];
      if (!target) return json(res, 404, { ok: false, error: name ? `没有登记这条流水线：${name}` : '还没有登记任何流水线' });
      const out = scanArtifacts(target.root, target.driver);
      out.pipeline = { name: target.name, id: target.id, root: target.root, driver: target.driver };
      json(res, 200, out);
    } catch (error) {
      logger?.error?.(`[aris-wiki] artifacts 失败：${messageOf(error)}`);
      json(res, 500, { ok: false, error: messageOf(error) });
    }
  };

  const fileHandler = async (req, res) => {
    if (req.headers[PANEL_HEADER] !== '1') return json(res, 403, { ok: false, error: '缺少面板请求标记' });
    if (req.method && req.method !== 'GET') return json(res, 405, { ok: false, error: '只接受 GET' });
    try {
      const url = new URL(req.url || FILE_PATH, 'http://localhost');
      const workspace = resolveWorkspace(config);
      const name = String(url.searchParams.get('name') || '');
      const target = name ? findPipeline(workspace, name) : pipelines(workspace)[0];
      if (!target) return json(res, 404, { ok: false, error: '还没有登记任何流水线' });
      const result = readArtifactFile(target.root, String(url.searchParams.get('rel') || ''));
      json(res, result.ok ? 200 : 404, result);
    } catch (error) {
      logger?.error?.(`[aris-wiki] file 失败：${messageOf(error)}`);
      json(res, 500, { ok: false, error: messageOf(error) });
    }
  };

  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: INDEX_PATH, handler: indexHandler }),
    'aris-wiki: index route',
  );
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: DOC_PATH, handler: docHandler }),
    'aris-wiki: doc route',
  );
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: PLAN_PATH, handler: planHandler }),
    'aris-wiki: plan route',
  );
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: ARTS_PATH, handler: artsHandler }),
    'aris-wiki: artifacts route',
  );
  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: FILE_PATH, handler: fileHandler }),
    'aris-wiki: artifact file route',
  );

  logger?.info?.(`[aris-wiki] 已挂载 ${INDEX_PATH}（分组：${Object.values(GROUP_LABEL).join(' / ')}）、${DOC_PATH}、${PLAN_PATH}、${ARTS_PATH}、${FILE_PATH}`);
}
