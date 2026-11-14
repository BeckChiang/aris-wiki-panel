// Read-only artifact scanning for @local/aris-wiki.
//
// Copied from plugins/dsh-aris/lib/artifacts.mjs on purpose: aris-wiki must keep
// working when dsh-aris is uninstalled, so no cross-plugin relative imports.
// Same groups, same caps, same traversal guards — only the caller differs.
import fs from 'node:fs';
import path from 'node:path';

const TEXT_EXT = new Set(['.md', '.markdown', '.tex', '.txt', '.json', '.csv', '.log', '.bib', '.yaml', '.yml']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const PDF_EXT = new Set(['.pdf']);
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
};

const MAX_FILES_PER_GROUP = 400;
const MAX_TOTAL_FILES = 1500;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_BINARY_BYTES = 4 * 1024 * 1024;
const MAX_DEPTH = 4;

// 各 driver 的产物地图。新增驱动只需要在这里加一条，不用改前端。
export const DRIVER_GROUPS = {
  frrs: [
    { id: 'paper', label: '论文稿', paths: ['paper2/en', 'paper2/cn'], ext: ['.tex', '.md'] },
    { id: 'figures', label: '图表', paths: ['paper2/figures', 'paper2/en/figures'], ext: ['.png', '.pdf', '.svg', '.jpg', '.jpeg', '.eps'] },
    { id: 'experiments', label: '实验输出', paths: ['dataset_gen/out', 'pipeline/out', 'runs'], ext: ['.json', '.csv', '.md', '.txt', '.log'] },
    { id: 'reviews', label: '审稿意见', paths: ['.aris/reviews'], ext: ['.md', '.json'] },
    { id: 'runs', label: '运行记录', paths: ['.aris-run/runs'], ext: ['.md'] },
    { id: 'slides', label: '幻灯片', paths: ['ppt'], ext: ['.pptx', '.pdf', '.md'] },
  ],
  aris: [
    { id: 'paper', label: '论文稿', paths: ['paper', 'manuscript', 'draft'], ext: ['.tex', '.md'] },
    { id: 'figures', label: '图表', paths: ['figures', 'paper/figures'], ext: ['.png', '.pdf', '.svg', '.jpg', '.jpeg'] },
    { id: 'experiments', label: '实验输出', paths: ['experiments', 'results', 'outputs'], ext: ['.json', '.csv', '.md', '.txt', '.log'] },
    { id: 'reviews', label: '审稿意见', paths: ['.aris/reviews'], ext: ['.md', '.json'] },
    { id: 'runs', label: '运行记录', paths: ['.aris/runs'], ext: ['.md'] },
    { id: 'slides', label: '幻灯片', paths: ['slides', 'talk'], ext: ['.pptx', '.pdf', '.md'] },
  ],
};

// 各 driver 的「主论文」候选，按优先级排列（同一次编译两个目录都有时，取 mtime 最新的那个）。
export const MAIN_PAPER = {
  frrs: ['paper2/en/build/main.pdf', 'paper2/cn/build/main.pdf', 'paper2/en/main.pdf', 'paper2/cn/main.pdf'],
  aris: ['paper/build/main.pdf', 'paper/main.pdf', 'build/main.pdf', 'main.pdf'],
};

const MAIN_TEX = {
  frrs: ['paper2/en/main.tex', 'paper2/cn/main.tex'],
  aris: ['paper/main.tex', 'main.tex'],
};

function statOrNull(base, rel) {
  const abs = safeResolve(base, rel);
  if (!abs) return null;
  try {
    const st = fs.statSync(abs);
    if (!st.isFile()) return null;
    return { rel, name: path.basename(rel), size: st.size, mtime: st.mtime.toISOString() };
  } catch (e) {
    return null;
  }
}

/**
 * 找「当前流水线最主要的论文成品」。面板把它固定置顶，避免成品埋在文件列表里。
 * @returns {null | {rel:string,name:string,size:number,mtime:string,dir:string,label:string,tex:string|null}}
 */
export function findMainPaper(root, driver) {
  const base = path.resolve(root || '');
  const list = MAIN_PAPER[driver] || MAIN_PAPER.aris;
  const hits = [];
  list.forEach((rel, i) => { const st = statOrNull(base, rel); if (st) hits.push({ ...st, rank: i }); });
  if (!hits.length) return null;
  hits.sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)) || a.rank - b.rank);
  const top = hits[0];
  const dir = top.rel.split('/')[0] === 'paper2' ? top.rel.split('/').slice(0, 2).join('/') : path.dirname(top.rel).split(path.sep).join('/');
  const texList = MAIN_TEX[driver] || MAIN_TEX.aris;
  const texOrder = [...texList.filter((r) => r.indexOf(dir + '/') === 0), ...texList];
  const tex = texOrder.map((rel) => statOrNull(base, rel)).find(Boolean) || null;
  const label = /\/en\//.test('/' + top.rel) ? '英文稿' : /\/cn\//.test('/' + top.rel) ? '中文稿' : '论文成品';
  return { rel: top.rel, name: top.name, size: top.size, mtime: top.mtime, dir, label, tex: tex ? tex.rel : null };
}

export function kindOf(ext) {
  if (TEXT_EXT.has(ext)) return 'text';
  if (IMAGE_EXT.has(ext)) return 'image';
  if (PDF_EXT.has(ext)) return 'pdf';
  return 'other';
}

function safeResolve(root, rel) {
  const abs = path.resolve(root, rel);
  const base = path.resolve(root);
  if (abs !== base && !abs.startsWith(base + path.sep)) return null;
  return abs;
}

function walk(dir, depth, opts, out) {
  if (depth > MAX_DEPTH || out.length >= opts.limit) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    if (out.length >= opts.limit) return;
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '__pycache__') continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(abs, depth + 1, opts, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (opts.ext.length && !opts.ext.includes(ext)) continue;
    let st;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    out.push({
      rel: path.relative(opts.root, abs).split(path.sep).join('/'),
      name: ent.name,
      ext,
      kind: kindOf(ext),
      size: st.size,
      mtime: st.mtime.toISOString(),
    });
  }
}

/**
 * @param {string} root 流水线根目录
 * @param {string} driver frrs | aris
 * @returns {{ok:boolean,root:string,driver:string,groups:Array,totals:object,warnings:string[],generatedAt:string}}
 */
export function scanArtifacts(root, driver, opts = {}) {
  const base = path.resolve(root || '');
  const warnings = [];
  if (!root || !fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    return { ok: false, root: base, driver, main: null, groups: [], totals: { files: 0, bytes: 0 }, warnings: ['根目录不存在'], generatedAt: new Date().toISOString() };
  }
  const map = DRIVER_GROUPS[driver] || DRIVER_GROUPS.aris;
  const wantGroup = opts.group ? String(opts.group) : null;
  let total = 0;
  const groups = [];
  for (const g of map) {
    if (wantGroup && g.id !== wantGroup) continue;
    const files = [];
    const seen = new Set();
    for (const rel of g.paths) {
      const abs = safeResolve(base, rel);
      if (!abs || !fs.existsSync(abs)) continue;
      const limit = Math.min(MAX_FILES_PER_GROUP, MAX_TOTAL_FILES - total);
      if (limit <= 0) break;
      const found = [];
      walk(abs, 0, { root: base, ext: g.ext, limit }, found);
      for (const f of found) {
        if (seen.has(f.rel)) continue;
        seen.add(f.rel);
        files.push(f);
      }
    }
    files.sort((a, b) => String(b.mtime).localeCompare(String(a.mtime)));
    if (!files.length) {
      warnings.push(`「${g.label}」没找到文件（查过 ${g.paths.join(' / ')}）`);
    }
    total += files.length;
    groups.push({
      id: g.id,
      label: g.label,
      searched: g.paths,
      count: files.length,
      bytes: files.reduce((n, f) => n + f.size, 0),
      files,
    });
  }
  return {
    ok: true,
    root: base,
    driver,
    main: findMainPaper(base, driver),
    groups,
    totals: { files: total, bytes: groups.reduce((n, g) => n + g.bytes, 0) },
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 读一个文件用于预览。文本返回 text，图片/PDF 返回 base64 data URL。
 */
export function readArtifactFile(root, rel, opts = {}) {
  const base = path.resolve(root || '');
  const abs = safeResolve(base, rel);
  if (!abs) return { ok: false, error: '路径越界，已拒绝' };
  let st;
  try {
    st = fs.statSync(abs);
  } catch {
    return { ok: false, error: `文件不存在：${rel}` };
  }
  if (!st.isFile()) return { ok: false, error: '不是文件' };
  const ext = path.extname(abs).toLowerCase();
  const kind = kindOf(ext);
  const maxText = opts.maxText || MAX_TEXT_BYTES;
  const maxBin = opts.maxBinary || MAX_BINARY_BYTES;
  const meta = { ok: true, rel: String(rel).split(path.sep).join('/'), name: path.basename(abs), kind, ext, size: st.size, mtime: st.mtime.toISOString() };

  if (kind === 'text') {
    const buf = fs.readFileSync(abs);
    const text = buf.subarray(0, maxText).toString('utf8').replace(/^\uFEFF/, '');
    return { ...meta, text, truncated: buf.length > maxText };
  }
  if (kind === 'image' || kind === 'pdf') {
    if (st.size > maxBin) return { ...meta, error: `文件 ${(st.size / 1048576).toFixed(1)}MB 超过预览上限 ${(maxBin / 1048576).toFixed(0)}MB`, oversized: true };
    const b64 = fs.readFileSync(abs).toString('base64');
    return { ...meta, mime: MIME[ext] || 'application/octet-stream', dataUrl: `data:${MIME[ext] || 'application/octet-stream'};base64,${b64}` };
  }
  return { ...meta, error: `该类型（${ext || '无扩展名'}）不支持预览` };
}

// ---------------------------------------------------------------------------
// 「整理」而不只是「列出」
// ---------------------------------------------------------------------------

const RE_INCLUDEGRAPHICS = /\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g;
const RE_GRAPHICSPATH = /\\graphicspath\{((?:\{[^}]*\})+)\}/g;

function collectByExt(root, relDirs, exts, limit = 400) {
  const out = [];
  for (const rel of relDirs) {
    const abs = safeResolve(root, rel);
    if (!abs || !fs.existsSync(abs)) continue;
    walk(abs, 0, { root, ext: exts, limit }, out);
  }
  return out;
}

/** 中文按字、英文按词粗算体量，用来一眼看出哪章还是空壳。 */
function textWeight(s) {
  const cjk = (s.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (s.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  return { cjk, words, score: cjk + words };
}

/**
 * 论文体检：图引用有没有断、哪些图没被引用、各章是不是空壳。
 */
export function auditPaper(root, driver) {
  const base = path.resolve(root || '');
  const map = DRIVER_GROUPS[driver] || DRIVER_GROUPS.aris;
  const paperDirs = (map.find((g) => g.id === 'paper') || { paths: [] }).paths;
  const figDirs = (map.find((g) => g.id === 'figures') || { paths: [] }).paths;

  const texFiles = collectByExt(base, paperDirs, ['.tex', '.md'], 300);
  const figFiles = collectByExt(base, figDirs, ['.png', '.pdf', '.svg', '.jpg', '.jpeg', '.eps'], 600);
  const figNames = new Set(figFiles.map((f) => path.basename(f.name, path.extname(f.name)).toLowerCase()));
  const figFull = new Set(figFiles.map((f) => f.rel.toLowerCase()));

  const refs = [];
  const chapters = [];
  for (const f of texFiles) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(base, f.rel), 'utf8');
    } catch {
      continue;
    }
    const w = textWeight(text);
    chapters.push({ rel: f.rel, bytes: f.size, chars: text.length, cjk: w.cjk, words: w.words, score: w.score, empty: w.score < 200 });
    if (path.extname(f.name).toLowerCase() !== '.tex') continue;
    for (const m of text.matchAll(RE_INCLUDEGRAPHICS)) {
      const raw = m[1].trim().replace(/\\/g, '/');
      // 宏定义里的占位（\includegraphics{#2}）不是真引用，跳过
      if (!raw || raw.includes('#') || raw.startsWith('/')) continue;
      refs.push({ rel: f.rel, target: raw, base: path.basename(raw).toLowerCase() });
    }
  }
  for (const f of texFiles) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(base, f.rel), 'utf8');
    } catch {
      continue;
    }
    for (const m of text.matchAll(RE_GRAPHICSPATH)) {
      // graphicspath 只是搜索路径，不影响判定：这里只做记录
      void m;
    }
  }

  const missing = [];
  const usedBases = new Set();
  for (const r of refs) {
    const hit = figNames.has(r.base) || figFull.has(('' + r.base));
    if (hit) usedBases.add(r.base);
    else missing.push(r);
  }
  const unused = figFiles.filter((f) => !usedBases.has(path.basename(f.name, path.extname(f.name)).toLowerCase()));

  chapters.sort((a, b) => a.rel.localeCompare(b.rel));
  return {
    ok: true,
    figures: figFiles.length,
    figureRefs: refs.length,
    missing: missing.slice(0, 100),
    unused: unused.slice(0, 100).map((f) => ({ rel: f.rel, size: f.size })),
    chapters,
    emptyChapters: chapters.filter((c) => c.empty && /\.tex$/.test(c.rel)).map((c) => c.rel),
    generatedAt: new Date().toISOString(),
  };
}
