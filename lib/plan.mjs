// Read-only plan/progress model for @local/aris-wiki.
//
// One ARIS pipeline = one `pipeline/state.json` (+ `.aris-run/`), so every view
// starts from a pipeline and aggregates upwards. Nothing here writes: we only
// stat and read files another tool already produced.
//
//   pipelines(workspace)          -> [{ id, name, root, driver }]
//   summaryOf(pipeline, opts)     -> one card (stage rail + gates + budget + foot)
//   planOf(pipeline)              -> full detail (stages, gates, blockers, history)
//   allOf(workspace, opts)        -> { summary, pipelines: [card...] }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 审稿侧「要人处理」（封顶 / 多轮退回 / 等待人工）与 dsh 面板同一条数据线：
// 这里复用 bin/lib/review-results.mjs，拿不到就退回只读 state（发布副本可能没带 bin/）。
const REVIEW_LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../bin/lib/review-results.mjs');
let collectReviewResults = null;
try {
  ({ collectReviewResults } = await import(pathToFileURL(REVIEW_LIB).href));
} catch {
  collectReviewResults = null;
}

// 最新一份审稿的 MUST / SHOULD 条数（按流水线名归并），用于「审核」列与详情。
function reviewBriefs(workspace) {
  const map = new Map();
  if (!collectReviewResults) return map;
  try {
    const out = collectReviewResults(workspace);
    for (const g of (out && out.groups) || []) {
      if (!g || !g.name || map.has(g.name)) continue;
      map.set(g.name, {
        verdict: (g.latest && g.latest.verdict) || '',
        must: Number(g.mustCount || 0),
        should: Number(g.shouldCount || 0),
      });
    }
  } catch {
    // 读不到就当没有
  }
  return map;
}

function reviewHumanNames(workspace) {
  if (!collectReviewResults) return new Set();
  try {
    const out = collectReviewResults(workspace);
    return new Set(((out && out.humanActions) || []).map((a) => a && a.name).filter(Boolean));
  } catch {
    return new Set();
  }
}

const MAX_META_READ = 256 * 1024;
const HISTORY_RUNS = 20;
const DONE_SUMMARY_CHARS = 90;
// 「等回件」判据与 dsh 流水线保持一致（bin/lib/aris-runner.mjs）：
// 在途审稿 = 邮箱 projects.json 里登记、且 in/<base>.request.md 还在的请求；
// 超时阈值 = max(30, 2 × Kimi 取件周期) 分钟，超了只算告警，不转人工。
// 旧实现看 .aris/reviews/*.json 的 mtime 判人工——那是历史归档，只增不删，必然长期误报。
const REVIEW_WARN_BASE_MIN = 30;
const KIMI_INTERVAL_FALLBACK_MIN = 15;
const LOG_REL_MAX = 3;

// --- tiny fs helpers -------------------------------------------------------

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8').replace(/^\ufeff/, '');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function stat(file) {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
}

function isDir(dir) {
  const info = stat(dir);
  return !!info && info.isDirectory();
}

function slice(obj, keys) {
  const out = {};
  for (const key of keys) out[key] = obj ? obj[key] : undefined;
  return out;
}

// --- registry --------------------------------------------------------------

export function pipelines(workspace) {
  const registry = readJson(path.join(workspace, '.dsh', 'aris-projects.json')) || {};
  const projects = registry.projects && typeof registry.projects === 'object' ? registry.projects : {};
  const out = [];
  for (const value of Object.values(projects)) {
    if (!value || typeof value !== 'object' || !value.root) continue;
    out.push({
      id: String(value.id || value.name || path.basename(String(value.root))),
      name: String(value.name || value.id || path.basename(String(value.root))),
      root: String(value.root),
      driver: String(value.driver || 'auto'),
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

// --- state.json adapters ---------------------------------------------------

const FRRS_STAGES = ['S0_prepare', 'S1_formal', 'S2_data', 'S3_baseline', 'S4a_match', 'S4b_plan', 'S4c_unfold', 'S4d_bridge', 'S5_experiments', 'S6_writing', 'S7_submission'];

function stateFile(root, driver) {
  const candidates = driver === 'aris'
    ? [path.join(root, '.aris', 'state.json')]
    : [path.join(root, 'pipeline', 'state.json'), path.join(root, '.aris', 'state.json')];
  for (const file of candidates) if (stat(file)) return file;
  return null;
}

function readState(root, driver) {
  const file = stateFile(root, driver);
  return file ? readJson(file) : null;
}

function stagesOf(state) {
  const table = (state && (state.states || state.phases)) || {};
  const order = Object.keys(table);
  if (!order.length) return [];
  const out = [];
  for (const id of order) {
    const entry = table[id] || {};
    out.push({
      id,
      status: String(entry.status || 'pending'),
      done: (entry.done || []).length,
      todo: (entry.todo || []).length,
      exitNote: entry.exit_note || '',
    });
  }
  return out;
}

function gatesOf(state) {
  const table = (state && state.gates) || {};
  return Object.keys(table).map((id) => {
    const entry = table[id] || {};
    return {
      id,
      criteria: String(entry.criteria || ''),
      status: String(entry.status || 'pending'),
      decision: String(entry.decision || ''),
      observed: entry.observed || null,
      completed: entry.completed || null,
    };
  });
}

// --- PIPELINE.md (stage titles, enter/exit, first work items) --------------

function planDoc(root) {
  const file = path.join(root, 'pipeline', 'PIPELINE.md');
  const info = stat(file);
  if (!info) return { stages: new Map(), mtimeMs: 0 };
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { stages: new Map(), mtimeMs: 0 };
  }
  const stages = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const head = /^###\s+([A-Za-z0-9_]+)\s*(.*)$/.exec(line);
    if (head) {
      current = { id: head[1], title: head[2].replace(/[（）()]/g, '').trim(), enter: '', exit: '', items: [] };
      stages.set(current.id, current);
      continue;
    }
    if (/^##\s/.test(line)) {
      current = null;
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^进入[:：]/.test(trimmed)) current.enter = trimmed.replace(/^进入[:：]\s*/, '');
    else if (/^退出/.test(trimmed)) current.exit = trimmed.replace(/^退出[^:：]*[:：]?\s*/, '');
    else if (/^-\s*\[[ x]\]/.test(trimmed)) current.items.push(trimmed.replace(/^-\s*\[[ x]\]\s*/, ''));
  }
  return { stages, mtimeMs: info.mtimeMs };
}

// --- runtime / history -----------------------------------------------------

function runtimeOf(root) {
  return readJson(path.join(root, '.aris-run', 'runtime.json'));
}

function runsHistory(root, limit = HISTORY_RUNS) {
  const dir = path.join(root, '.aris-run', 'runs');
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const rows = [];
  for (const name of names) {
    const metaFile = path.join(dir, name, 'meta.json');
    const info = stat(metaFile);
    if (!info) continue;
    rows.push({ name, metaFile, mtimeMs: info.mtimeMs });
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const out = [];
  for (const row of rows.slice(0, limit)) {
    if (row.mtimeMs && fs.statSync(row.metaFile).size > MAX_META_READ) continue;
    const meta = readJson(row.metaFile) || {};
    const last = (meta.lastRun || meta) || {};
    out.push({
      runId: last.runId || path.basename(path.dirname(row.metaFile)),
      start: last.at || last.startedAt || null,
      ms: Number(last.ms || 0),
      steps: Number(last.steps || 0),
      cny: Number(typeof last.cny === 'number' ? last.cny : (last.cny && last.cny.total) || 0) || 0,
      verdict: String(last.verdict || ''),
      exit: last.exit,
      result: String(last.summary || '').trim(),
    });
  }
  return out;
}

function costTotals(root) {
  const file = path.join(root, '.aris-run', 'costs.jsonl');
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { runs: 0, cny: 0, todayRuns: 0, todayCny: 0, spec: [] };
  }
  const today = new Date().toISOString().slice(0, 10);
  let runs = 0;
  let cny = 0;
  let todayRuns = 0;
  let todayCny = 0;
  const spec = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    // costs.jsonl writes cny as an object ({ input, cacheRead, output, total }),
    // the older runs wrote a plain number — accept both.
    const raw = row.cny;
    const amount = typeof raw === 'number' ? raw : Number((raw && raw.total) || row.costCny || 0);
    if (!Number.isFinite(amount)) continue;
    runs += 1;
    cny += amount;
    const at = String(row.finishedAt || row.startedAt || row.at || row.ts || '');
    if (at.slice(0, 10) === today) {
      todayRuns += 1;
      todayCny += amount;
    }
    spec.push({ at, cny: amount, steps: Number(row.steps || 0), runId: row.runId || '' });
  }
  return { runs, cny, todayRuns, todayCny, spec: spec.slice(-40) };
}

// --- blockers --------------------------------------------------------------

function minutesSince(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  return Math.round((Date.now() - t) / 60000);
}

// --- settings / 在途审稿（与 dsh 流水线同源） -------------------------------

function readSettings(workspace) {
  const file = path.join(workspace || '', '.dsh', 'aris-dashboard.json');
  const raw = readJson(file);
  const kimi = (raw && raw.kimi) || {};
  const interval = Number(kimi.intervalMinutes);
  return {
    file,
    present: !!raw,
    mailbox: String((raw && raw.mailbox) || ''),
    kimiIntervalMinutes: interval > 0 ? interval : KIMI_INTERVAL_FALLBACK_MIN,
  };
}

function reviewLimitMin(settings) {
  const kimi = (settings && settings.kimiIntervalMinutes) || KIMI_INTERVAL_FALLBACK_MIN;
  return Math.max(REVIEW_WARN_BASE_MIN, 2 * kimi);
}

// 复刻 bin/lib/aris-runner.mjs 的 pendingReviews：邮箱索引 + 在途请求文件双条件。
function pendingReviews(settings, root) {
  const mailbox = String((settings && settings.mailbox) || '');
  if (!mailbox || !root) return [];
  const index = readJson(path.join(mailbox, 'projects.json'));
  const projects = (index && index.projects) || {};
  const norm = (v) => String(v || '').split('\\').join('/').replace(/\/+$/, '').toLowerCase();
  const lower = norm(root);
  const out = [];
  for (const [base, entry] of Object.entries(projects)) {
    if (!entry) continue;
    if (!stat(path.join(mailbox, 'in', `${base}.request.md`))) continue;
    const target = norm(entry.target_abs || entry.target);
    const sd = norm(entry.state_dir || entry.project);
    const mine = (target && target.startsWith(lower)) || (sd && sd.startsWith(lower));
    if (!mine) continue;
    out.push({ base, target: String(entry.target_abs || entry.target || ''), createdAt: entry.created_at || null });
  }
  return out;
}

// 在途审稿：邮箱明细优先，退回 runtime.waiting（runner 写 nextAt 时同步这个数）。
function reviewWaitOf(settings, root, runtime) {
  const list = pendingReviews(settings, root);
  const waiting = Number((runtime && runtime.waiting) || 0);
  const count = Math.max(list.length, waiting);
  const limitMin = reviewLimitMin(settings);
  if (count <= 0) return { count: 0, since: null, ageMin: null, over: false, limitMin, source: 'none', bases: [] };
  let since = null;
  for (const it of list) {
    const t = Date.parse(it.createdAt || '') || 0;
    if (t && (!since || t < since)) since = t;
  }
  if (!since) {
    const gap = (runtime && runtime.reviewGap) || {};
    since = Date.parse(gap.lastSubmitAt || (runtime && runtime.finishedAt) || (runtime && runtime.startedAt) || '') || null;
  }
  const ageMin = since ? Math.round((Date.now() - since) / 60000) : null;
  return {
    count,
    since: since ? new Date(since).toISOString() : null,
    ageMin,
    over: ageMin != null && ageMin > limitMin,
    limitMin,
    source: list.length ? 'mailbox' : 'runtime',
    bases: list.map((x) => x.base),
  };
}

function fmtMinutes(min) {
  const n = Math.round(Number(min) || 0);
  if (n < 60) return `${n} 分钟`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

function runRelOf(runtime, file) {
  const last = (runtime && runtime.lastRun) || {};
  const runId = last.runId || (runtime && runtime.runId) || '';
  return runId ? path.posix.join('.aris-run', 'runs', String(runId), file) : '';
}

// --- blockers --------------------------------------------------------------

function latestRunStamp(runtime) {
  const last = (runtime && runtime.lastRun) || {};
  return Date.parse(last.finishedAt || last.at || '') || 0;
}

// state.block 只在「之后还没有成功轮次」时才算真阻塞（旧实现只判「有没有」）。
function activeBlock(state, runtime) {
  const block = state && state.block;
  if (!block || !(block.id || block.reason)) return null;
  const at = Date.parse(block.at || '') || 0;
  const last = (runtime && runtime.lastRun) || {};
  if (at && latestRunStamp(runtime) > at && Number(last.exit || 0) === 0) return null;
  return block;
}

// 与 dsh 面板同一条判据：state.status 或任一阶段 = blocked_on_user → 等待人工。
function blockedOnUser(state) {
  if (!state) return false;
  if (String(state.status || '') === 'blocked_on_user') return true;
  const table = state.states || state.phases || {};
  return Object.values(table).some((entry) => entry && String(entry.status || '') === 'blocked_on_user');
}

function blockersOf({ state, runtime, budget, totals, settings, pipelineRoot }) {
  const out = [];
  const push = (severity, kind, text, evidence, human, action, since, extra) =>
    out.push({ severity, kind, text, evidence, human, action, since, ...(extra || {}) });

  const block = activeBlock(state, runtime);
  if (block) {
    if (isHourlyQuotaBlock(block)) {
      push('warn', 'state-quota', `等额度：${block.reason || block.id}`, `state.block.id=${block.id || '-'}`, false,
        { kind: 'open-pipeline', label: '查看阻塞' }, block.at || null);
    } else {
      push('error', 'state-block', `流水线被阻塞：${block.reason || block.id}`, `state.block.id=${block.id || '-'}`, true,
        { kind: 'open-pipeline', label: '查看阻塞' }, block.at || null);
    }
  }
  if (blockedOnUser(state) && !(state && state.block && isHourlyQuotaBlock(state.block))) {
    push('error', 'blocked-on-user', '状态机停在 blocked_on_user：这一步要人裁决后才会继续', `state.status=${state.status || '-'}`, true,
      { kind: 'open-pipeline', label: '看是哪一步' }, (state && state.chain && state.chain.last_wake_end) || null);
  }
  const running = String((runtime && runtime.status) || '') === 'running';
  if (running && runtime.stopping) {
    push('warn', 'stopping', '已登记停止：本轮收尾后不再起轮', `runtime.stopping @ ${runtime.stopRequestedAt || '-'}`, false,
      { kind: 'open-pipeline', label: '看本轮' }, runtime.stopRequestedAt || null);
  }
  if (runtime && runtime.gateReason && !running) {
    push('error', 'gate', `门禁未过：${runtime.gateReason}`, 'runtime.gateReason', true,
      { kind: 'open-gate', label: '看门禁' }, runtime.blockedUntil || null);
  }
  if (runtime && runtime.blockedUntil && Date.parse(runtime.blockedUntil) > Date.now()) {
    const remainMin = Math.max(0, Math.round((Date.parse(runtime.blockedUntil) - Date.now()) / 60000));
    push('warn', 'blocked-until', `预检未过，退避 ${fmtMinutes(remainMin)}后重试`,
      `runtime.blockedUntil=${runtime.blockedUntil}`, false, { kind: 'open-log', label: '看样子' }, runtime.blockedUntil,
      { logRel: '.aris-run/runtime.json' });
  }
  if (runtime && (runtime.lastError || Number(runtime.consecutiveErrors) >= 2)) {
    push('error', 'error', `运行出错${runtime.consecutiveErrors ? `（连续 ${runtime.consecutiveErrors} 次）` : ''}：${String(runtime.lastError || '').slice(0, 160)}`,
      'runtime.lastError', false, { kind: 'open-log', label: '看日志' }, runtime.lastErrorAt || null,
      { logRel: runRelOf(runtime, 'stderr.log') });
  }
  const wait = reviewWaitOf(settings, pipelineRoot, runtime);
  if (wait.count > 0) {
    const detail = wait.ageMin == null ? `在途 ${wait.count} 条` : `在途 ${wait.count} 条，最久已等 ${fmtMinutes(wait.ageMin)}`;
    const limit = `告警阈值 ${fmtMinutes(wait.limitMin)}（max(30, 2×Kimi 取件周期)）`;
    const text = `等审查回件：${detail}${wait.over ? ' —— 已超阈值，Kimi 可能没取件' : ''}`;
    push(wait.over ? 'warn' : 'info', 'review-pending', text,
      `${limit}${wait.bases.length ? ' · ' + wait.bases.join(', ') : ''}`, false,
      { kind: 'open-mailbox', label: '打开邮箱队列' }, wait.since, { over: wait.over, wait });
  }
  const gate = (state && state.gates) || {};
  for (const [id, entry] of Object.entries(gate)) {
    if (entry && entry.status === 'pending' && entry.criteria) {
      push('info', 'gate-pending', `${id} 门禁未裁决：${String(entry.criteria || '').slice(0, 90)}`, `criteria: ${entry.criteria}`, false,
        { kind: 'open-gate', label: '看判据', target: id }, entry.completed || null);
    }
  }
  if (budget && budget.ctxPct >= 0.8) {
    push('warn', 'budget', `最近一轮上下文占上限 ${Math.round(budget.ctxPct * 100)}%`, 'budget.json · context_limit_tokens 200k', false,
      { kind: 'open-settings', label: '看预算' }, null);
  }
  if (totals && totals.runs === 0) {
    push('info', 'never-run', '还没有跑过任何一轮', '.aris-run/costs.jsonl 为空', false, { kind: 'open-pipeline', label: '去启动' }, null);
  }
  const rank = { error: 0, warn: 1, info: 2 };
  out.sort((a, b) => (rank[a.severity] - rank[b.severity]));
  return out;
}
function cnyOf(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return Number(v.total || 0) || 0;
}

function readEventLog(root, limit) {
  const file = path.join(root, '.aris', 'meta', 'events.jsonl');
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return []; }
  const out = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const s2 = line.trim();
    if (!s2) continue;
    let obj = null;
    try { obj = JSON.parse(s2); } catch (e) { continue; }
    out.push(obj);
    if (out.length >= (limit || 400)) break;
  }
  return out;
}

function timelineOf(input, opts) {
  const limit = (opts && opts.limit) || 80;
  const runs = (input && input.runs) || [];
  const reviews = (input && input.reviews) || [];
  const state = (input && input.state) || {};
  const items = [];
  for (const r of runs) {
    const verdict = r.verdict || '';
    items.push({
      at: r.finishedAt || r.start || '',
      kind: 'run',
      severity: verdict === 'done' ? 'ok' : (r.exit ? 'error' : 'warn'),
      text: '第 ' + String(r.runId || '') + ' 轮 · ' + (verdict || 'end') + (r.exit ? ' exit ' + r.exit : '') + ' · ' + String(r.steps || 0) + ' 步 · ¥' + cnyOf(r.cny).toFixed(2),
      detail: String(r.summary || '').replace(/^RESULT:\s*/, ''),
      ref: 'runs/' + String(r.runId || ''),
    });
  }
  for (const e of reviews) {
    const verdict = e.verdict || '';
    items.push({
      at: e.ts || '',
      kind: 'review',
      severity: verdict === 'accept' ? 'ok' : 'warn',
      text: '审查回件 · ' + (verdict || '-') + (e.score != null ? ' ' + e.score + '/10' : '') + ' · r' + (e.round || '?') + ' · slot' + (e.slot || '?'),
      detail: (e.identity ? e.identity + ' · ' : '') + (e.target || ''),
      ref: e.raw_path || '',
    });
  }
  const gates = (state && state.gates) || {};
  for (const id of Object.keys(gates)) {
    const g = gates[id] || {};
    if (!g.completed) continue;
    items.push({
      at: String(g.completed),
      kind: 'gate',
      severity: g.status === 'fail' ? 'error' : (g.decision ? 'ok' : 'warn'),
      text: '门禁 ' + id + ' · ' + (g.decision || g.status || ''),
      detail: String(g.criteria || ''),
      ref: 'state.gates.' + id,
    });
  }
  items.sort((a, b) => (Date.parse(String(b.at)) || 0) - (Date.parse(String(a.at)) || 0));
  return items.slice(0, limit);
}

// --- card / detail ---------------------------------------------------------

function budgetOf(root, runtime) {
  const file = path.join(root, 'pipeline', 'budget.json');
  const cfg = readJson(file) || {};
  const ab = cfg.ab || {};
  const last = (runtime && runtime.lastRun) || {};
  const steps = Number(last.steps || 0);
  const input = Number((last.usage && last.usage.input) || 0);
  const ctxLimit = Number(ab.context_limit_tokens || 200000);
  return {
    // steps ≈ model turns of the last round; the hard 40-call budget counts
    // model calls per wake, which we cannot read back, so show steps instead
    // of pretending they are the same number.
    steps,
    callsMax: Number(ab.max_model_calls_per_wake || 40),
    warn: Number(ab.warn_model_calls || 32),
    ctxPct: ctxLimit ? Math.min(1, input / ctxLimit) : 0,
    cfgVersion: cfg.version || 0,
  };
}

function lastRunOf(runtime) {
  const last = (runtime && runtime.lastRun) || null;
  if (!last) return null;
  return {
    runId: last.runId || '', at: last.at || null, ms: Number(last.ms || 0), steps: Number(last.steps || 0),
    cny: Number(typeof last.cny === 'number' ? last.cny : (last.cny && last.cny.total) || 0) || 0,
    verdict: String(last.verdict || ''), summary: String(last.summary || ''),
  };
}

// 状态判定与 dsh 面板（plugins/dsh-aris/client.js 的 stateOf）同一套顺序与词汇，
// 两处看到的「正在运行 / 等待人工 / 等待审核」必须一致，否则又是两条互相矛盾的结论。
// 与 dsh 面板同一条口径：blocked_on_user 若是「GPT 小时额度用尽」引起的，等额度即可自动续跑，
// 不算人工；带 attempts n/m、「物理送审额度」字样的仍是硬封顶，继续算人工。
const HOURLY_QUOTA_RE = /额度|quota|429|限流|rate.?limit/i;
const PHYSICAL_CAP_RE = /物理送审|attempts\s*\d+\s*\/\s*\d+|review_physical_cap/i;
function isHourlyQuotaBlock(block) {
  if (!block || typeof block !== 'object') return false;
  const reason = String(block.reason || '');
  if (/^cap-/.test(reason)) return false;
  const text = [reason, block.summary, block.title, block.id].filter(Boolean).join(' ');
  if (PHYSICAL_CAP_RE.test(text)) return false;
  return HOURLY_QUOTA_RE.test(text);
}

function statusOf(state, runtime, enabled, pendingCount) {
  const rt = String((runtime && runtime.status) || '');
  if (state && state.block && isHourlyQuotaBlock(state.block)) return { key: 'quota', label: '等额度' };
  if (rt === 'error') return { key: 'error', label: '出错' };
  if ((state && state.block) || blockedOnUser(state)) return { key: 'human', label: '需人工' };
  if (rt === 'running' && runtime.stopping) return { key: 'stopping', label: '停止中' };
  if (rt === 'running') return { key: 'running', label: '正在运行' };
  if (enabled === false) return { key: 'stopped', label: '已停止' };
  if (pendingCount > 0) return { key: 'review', label: '等待审核' };
  if (rt === 'paused') return { key: 'paused', label: '已暂停' };
  return { key: 'idle', label: '待命' };
}

function summarize(pipeline, state, runtime, totals, budget, settings) {
  const stages = stagesOf(state);
  const gates = gatesOf(state);
  const current = stages.findIndex((s) => s.status === 'in_progress');
  const doneCount = stages.filter((s) => s.status === 'done').length;
  const doc = planDoc(pipeline.root);
  const named = stages.map((s) => ({ ...s, title: (doc.stages.get(s.id) || {}).title || '' }));
  const running = String((runtime && runtime.status) || '') === 'running';
  const wait = reviewWaitOf(settings, pipeline.root, runtime);
  const status = statusOf(state, runtime, pipeline.enabled, wait.count);
  const lastRun = lastRunOf(runtime);
  const startIso = running ? (runtime && runtime.startedAt) || null : (lastRun && lastRun.at) || null;
  const startMs = Date.parse(startIso || '') || 0;
  const currentStage = current >= 0 ? named[current] : named.filter((s) => s.status === 'done').slice(-1)[0] || null;
  return {
    id: pipeline.id,
    name: pipeline.name,
    driver: pipeline.driver,
    root: pipeline.root,
    state: (state && state.state) || '',
    status: String((runtime && runtime.status) || (state && state.status) || 'unknown'),
    statusKey: status.key,
    statusLabel: status.label,
    enabled: pipeline.enabled !== undefined ? pipeline.enabled : null,
    stageIndex: current >= 0 ? current + 1 : doneCount,
    stageTotal: stages.length,
    stageId: currentStage ? currentStage.id : '',
    stageTitle: currentStage ? currentStage.title : '',
    stages: named,
    gates: { done: gates.filter((g) => g.status === 'done').length, total: gates.length, list: gates },
    budget,
    totals: { runs: totals.runs, cny: totals.cny, todayRuns: totals.todayRuns, todayCny: totals.todayCny },
    lastRun,
    nextAt: (runtime && runtime.nextAt) || null,
    startedAt: (runtime && runtime.startedAt) || null,
    nowDoing: {
      running,
      startedAt: startIso,
      elapsedMin: startMs ? Math.max(0, Math.round((Date.now() - startMs) / 60000)) : null,
      steps: (lastRun && lastRun.steps) || budget.steps || 0,
      callsMax: budget.callsMax,
      ctxPct: budget.ctxPct,
      runId: (runtime && runtime.runId) || (lastRun && lastRun.runId) || '',
    },
    pending: wait,
    blocked: (state && state.block ? 1 : 0) + (runtime && (runtime.gateReason || String(runtime.status) === 'blocked') ? 1 : 0),
  };
}

function stepIdOf(text) {
  const m = /^\s*([A-Za-z]{1,3}\d+[A-Za-z]?(?:[.][A-Za-z0-9]+)*)/.exec(String(text || ''));
  return m ? m[1] : '';
}

function trimDone(text) {
  const one = String(text || '').replace(/\s+/g, ' ').trim();
  const cut = one.search(/[。；;]/);
  const head = cut > 10 ? one.slice(0, cut) : one;
  return head.length > DONE_SUMMARY_CHARS ? head.slice(0, DONE_SUMMARY_CHARS) + '…' : head;
}

const STEP_EXTERNAL = /送审|待回复|待回件|已入队|review_/i;

function stepOf(text, state) {
  const full = String(text || '');
  return { sid: stepIdOf(full), full, summary: trimDone(full), outputs: state === 'todo' ? outputsOf(full) : [], state };
}

// 计划项 ↔ 步骤：**不按序号硬对**（PIPELINE.md 的条目顺序与状态机步骤号并不一一对应，
// 实测 S4b 第 1 条是 GMM 策略、第 3 条才轮到 1a 做的判据掩码预编译）。
// 改用最长公共子串：步骤文本里含计划项里 ≥5 个连续汉字/字母才认，且一条步骤只认一个计划项。
function commonLen(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (!s || !t) return 0;
  let best = 0;
  for (let i = 0; i < s.length; i += 1) {
    for (let j = 0; j < t.length; j += 1) {
      let k = 0;
      while (i + k < s.length && j + k < t.length && s[i + k] === t[j + k]) k += 1;
      if (k > best) best = k;
    }
  }
  return best;
}

function linkPlanItems(items, steps) {
  const best = items.map(() => ({ score: 0, sids: [] }));
  const claimed = new Map();
  for (const step of steps) {
    if (!step.sid) continue;
    let pick = -1;
    let pickScore = 0;
    items.forEach((item, i) => {
      const score = commonLen(item, step.full);
      if (score > pickScore) {
        pickScore = score;
        pick = i;
      }
    });
    if (pick < 0 || pickScore < 5) continue;
    const key = step.sid;
    const prev = claimed.get(key);
    if (prev && prev.score > pickScore) continue;
    if (prev && prev.item !== pick) best[prev.item].sids = best[prev.item].sids.filter((s) => s !== key);
    claimed.set(key, { item: pick, score: pickScore });
    best[pick].score = Math.max(best[pick].score, pickScore);
    best[pick].sids.push(key);
    best[pick].states = (best[pick].states || []).concat([step.state]);
  }
  return best;
}

export function planOf(pipeline, opts = {}) {
  const settings = opts.settings || readSettings(opts.workspace || '');
  const state = readState(pipeline.root, pipeline.driver);
  if (!state) {
    return { ok: false, error: `找不到状态文件：${pipeline.root}`, pipeline: { name: pipeline.name, root: pipeline.root, driver: pipeline.driver } };
  }
  state.__root = pipeline.root;
  const runtime = runtimeOf(pipeline.root);
  const totals = costTotals(pipeline.root);
  const budget = budgetOf(pipeline.root, runtime);
  const doc = planDoc(pipeline.root);
  const gates = gatesOf(state);

  const stages = stagesOf(state).map((stage) => {
    const entry = (state.states || state.phases || {})[stage.id] || {};
    const meta = doc.stages.get(stage.id) || { title: '', enter: '', exit: '', items: [] };
    const done = (entry.done || []).map((text) => stepOf(text, 'done'));
    const todoRaw = (entry.todo || []).map((text) => stepOf(text, 'todo'));
    // done 与 todo 不是互斥集合（state.json 里同一 sid 会两边都出现）：只显示一次，
    // 在已完成那条上标「状态机仍挂在待做」，别让人以为有两件事。
    const doneSids = new Set(done.map((s) => s.sid).filter(Boolean));
    const todoSids = new Set(todoRaw.map((s) => s.sid).filter(Boolean));
    for (const step of done) if (step.sid && todoSids.has(step.sid)) step.alsoTodo = true;
    const rest = todoRaw.filter((s) => !(s.sid && doneSids.has(s.sid)));
    // 送审 / 待回复这类在等外部回件的步骤单独成组，和「自己能干」的待做分开。
    const external = rest.filter((s) => STEP_EXTERNAL.test(s.full));
    const todo = rest.filter((s) => !STEP_EXTERNAL.test(s.full));
    const all = done.concat(rest);
    const links = linkPlanItems(meta.items, all);
    const planItems = meta.items.map((text, i) => {
      const link = links[i] || { sids: [], states: [], score: 0 };
      const sids = [...new Set(link.sids)];
      const states = link.states || [];
      const doneN = states.filter((st) => st === 'done').length;
      return {
        text,
        index: i + 1,
        sids,
        state: !sids.length ? 'planned' : doneN && doneN >= states.length ? 'done' : 'doing',
        score: link.score || 0,
      };
    });
    return {
      id: stage.id,
      title: meta.title,
      status: stage.status,
      enter: meta.enter,
      exit: meta.exit,
      exitNote: stage.exitNote,
      doneCount: done.length,
      todoCount: todo.length,
      steps: { done, todo, external, advanced: done.filter((s) => s.alsoTodo) },
      doneItems: done,
      todoItems: todo,
      planItems,
    };
  });

  const summary = summarize(pipeline, state, runtime, totals, budget, settings);
  const blockers = blockersOf({ state, runtime, budget, totals, settings, pipelineRoot: pipeline.root });
  const wait = summary.pending || reviewWaitOf(settings, pipeline.root, runtime);

  const history = runsHistory(pipeline.root, opts.history || HISTORY_RUNS);

  return {
    ok: true,
    pipeline: { name: pipeline.name, id: pipeline.id, root: pipeline.root, driver: pipeline.driver },
    now: {
      status: summary.status,
      statusKey: summary.statusKey,
      statusLabel: summary.statusLabel,
      state: summary.state,
      stageId: summary.stageId,
      stageTitle: summary.stageTitle,
      stageIndex: summary.stageIndex,
      stageTotal: summary.stageTotal,
      runId: (runtime && runtime.runId) || '',
      pid: (runtime && runtime.pid) || null,
      startedAt: (runtime && runtime.startedAt) || null,
      finishedAt: (runtime && runtime.finishedAt) || null,
      nextAt: (runtime && runtime.nextAt) || null,
      waiting: Number((runtime && runtime.waiting) || 0),
      pending: wait,
      gateReason: (runtime && runtime.gateReason) || '',
      lastError: (runtime && runtime.lastError) || null,
      consecutiveErrors: Number((runtime && runtime.consecutiveErrors) || 0),
      sessionId: (runtime && runtime.sessionId) || '',
      nowDoing: summary.nowDoing,
    },
    paths: {
      root: pipeline.root,
      mailbox: settings.mailbox || '',
      settingsFile: settings.file || '',
      logRel: runRelOf(runtime, 'final.txt'),
      stderrRel: runRelOf(runtime, 'stderr.log'),
      metaRel: runRelOf(runtime, 'meta.json'),
    },
    totals: { runs: totals.runs, cny: totals.cny, todayRuns: totals.todayRuns, todayCny: totals.todayCny, wakes: Number((state.chain && state.chain.today) || 0) },
    budget,
    narrative: state.narrative_adjustment || '',
    plan: { stages, gates },
    blockers,
    human: blockers.some((b) => b.human),
    history,
    timeline: timelineOf({ runs: history, reviews: readEventLog(pipeline.root, 400), state }, { limit: opts.timeline || 120 }),
    sparkline: totals.spec,
    scannedAt: new Date().toISOString(),
  };
}

function outputsOf(text) {
  const out = [];
  const re = /(runs\/[\w.\-+/]+|[\w.\-]+\/(?:[\w.\-]+\/)*[\w.\-]+\.(?:py|json|md|tex|pdf|log|png))|(?:→|->)\s*`([^`]+)`/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const value = m[1] || m[2];
    if (value && out.length < 4) out.push(value);
  }
  return out;
}

export function allOf(workspace, opts = {}) {
  const settings = opts.settings || readSettings(workspace);
  const list = pipelines(workspace);
  const cards = [];
  const errors = [];
  const humanNames = reviewHumanNames(workspace);
  const briefs = reviewBriefs(workspace);
  for (const pipeline of list) {
    try {
      const state = readState(pipeline.root, pipeline.driver);
      const runtime = runtimeOf(pipeline.root);
      const totals = costTotals(pipeline.root);
      const budget = budgetOf(pipeline.root, runtime);
      const card = summarize(pipeline, state, runtime, totals, budget, settings);
      const blockers = blockersOf({ state, runtime, budget, totals, settings, pipelineRoot: pipeline.root });
      card.blockers = blockers.length;
      card.topBlocker = blockers[0] || null;
      card.human = blockers.some((b) => b.human);
      card.review = briefs.get(pipeline.name) || null;
      if (humanNames.has(pipeline.name)) {
        card.human = true;
        card.statusKey = 'human';
        card.statusLabel = '需人工';
      }
      card.error = state ? null : '找不到状态文件';
      cards.push(card);
    } catch (error) {
      errors.push({ name: pipeline.name, error: String((error && error.message) || error) });
    }
  }
  const summary = {
    running: cards.filter((c) => c.statusKey === 'running' || c.statusKey === 'stopping').length,
    total: cards.length,
    todayRuns: cards.reduce((n, c) => n + (c.totals.todayRuns || 0), 0),
    todayCny: cards.reduce((n, c) => n + (c.totals.todayCny || 0), 0),
    totalRuns: cards.reduce((n, c) => n + (c.totals.runs || 0), 0),
    totalCny: cards.reduce((n, c) => n + (c.totals.cny || 0), 0),
    human: cards.filter((c) => c.human).length,
    blocked: cards.reduce((n, c) => n + (c.blockers || 0), 0),
    review: cards.filter((c) => c.statusKey === 'review').length,
    waiting: cards.reduce((n, c) => n + Number((c.pending && c.pending.count) || 0), 0),
  };
  return { ok: true, summary, pipelines: cards, errors, settings: { mailbox: settings.mailbox, kimiIntervalMinutes: settings.kimiIntervalMinutes }, scannedAt: new Date().toISOString() };
}

export function findPipeline(workspace, name) {
  const list = pipelines(workspace);
  if (!name || name === 'all') return null;
  return list.find((p) => p.name === name || p.id === name) || null;
}
