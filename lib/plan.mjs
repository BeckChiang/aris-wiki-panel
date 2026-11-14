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

const MAX_META_READ = 256 * 1024;
const HISTORY_RUNS = 20;
const REVIEW_STALE_MIN = 60;
const DONE_SUMMARY_CHARS = 90;

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
    else if (/^-\s*\[[ x]\]/.test(trimmed) && current.items.length < 3) current.items.push(trimmed.replace(/^-\s*\[[ x]\]\s*/, ''));
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

function firstReviewWait(root) {
  const dir = path.join(root, '.aris', 'reviews');
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return null;
  }
  let newest = null;
  for (const name of names) {
    if (!/\.json$/i.test(name)) continue;
    const info = stat(path.join(dir, name));
    if (!info) continue;
    if (!newest || info.mtimeMs > newest.mtimeMs) newest = { name, mtimeMs: info.mtimeMs };
  }
  return newest ? { name: newest.name, at: new Date(newest.mtimeMs).toISOString() } : null;
}

function blockersOf({ state, runtime, budget, totals }) {
  const out = [];
  const push = (severity, kind, text, evidence, human, action, since) => out.push({ severity, kind, text, evidence, human, action, since });

  const block = state && state.block;
  if (block && (block.id || block.reason)) {
    push('error', 'state-block', `流水线被阻塞：${block.reason || block.id}`, `state.block.id=${block.id || '-'}`, true,
      { kind: 'open-pipeline', label: '查看阻塞' }, block.at || null);
  }
  if (runtime && Number(runtime.waiting) > 0) {
    push('warn', 'waiting-review', '等待审查回件', `runtime.waiting=${runtime.waiting}`, false,
      { kind: 'open-mailbox', label: '打开邮箱队列' }, runtime.startedAt || null);
  }
  if (runtime && runtime.gateReason) {
    push('error', 'gate', `门禁未过：${runtime.gateReason}`, 'runtime.gateReason', true,
      { kind: 'open-gate', label: '执行门禁' }, runtime.finishedAt || null);
  }
  if (runtime && (runtime.lastError || Number(runtime.consecutiveErrors) >= 2)) {
    push('error', 'error', `运行出错${runtime.consecutiveErrors ? `（连续 ${runtime.consecutiveErrors} 次）` : ''}：${String(runtime.lastError || '').slice(0, 160)}`,
      'runtime.lastError', false, { kind: 'open-log', label: '看日志' }, runtime.lastErrorAt || null);
  }
  const review = firstReviewWait(state && state.__root ? state.__root : '');
  if (review) {
    const waited = minutesSince(review.at);
    push('info', 'review-pending', '最近一轮审查材料已归档，等待取件人回复', `.aris/reviews/${review.name}`,
      waited != null && waited > REVIEW_STALE_MIN, { kind: 'open-mailbox', label: '打开邮箱队列' }, review.at);
  }
  const gate = (state && state.gates) || {};
  for (const [id, entry] of Object.entries(gate)) {
    if (entry && entry.status === 'pending' && entry.criteria) {
      push('info', 'gate-pending', `${id} 门禁未裁决`, `criteria: ${entry.criteria}`, false,
        { kind: 'open-gate', label: '看判据' }, null);
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

function summarize(pipeline, state, runtime, totals, budget) {
  const stages = stagesOf(state);
  const gates = gatesOf(state);
  const current = stages.findIndex((s) => s.status === 'in_progress');
  const doneCount = stages.filter((s) => s.status === 'done').length;
  const doc = planDoc(pipeline.root);
  const named = stages.map((s) => ({ ...s, title: (doc.stages.get(s.id) || {}).title || '' }));
  const blocks = state && state.block ? 1 : 0;
  const runtimeBlocked = runtime && (runtime.gateReason || String(runtime.status) === 'blocked') ? 1 : 0;
  return {
    id: pipeline.id,
    name: pipeline.name,
    driver: pipeline.driver,
    root: pipeline.root,
    state: (state && state.state) || '',
    status: String((runtime && runtime.status) || (state && state.status) || 'unknown'),
    enabled: pipeline.enabled !== undefined ? pipeline.enabled : null,
    stageIndex: current >= 0 ? current + 1 : doneCount,
    stageTotal: stages.length,
    stages: named,
    gates: { done: gates.filter((g) => g.status === 'done').length, total: gates.length, list: gates },
    budget,
    totals: { runs: totals.runs, cny: totals.cny, todayRuns: totals.todayRuns, todayCny: totals.todayCny },
    lastRun: lastRunOf(runtime),
    nextAt: (runtime && runtime.nextAt) || null,
    startedAt: (runtime && runtime.startedAt) || null,
    blocked: blocks + runtimeBlocked,
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

export function planOf(pipeline, opts = {}) {
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
    return {
      id: stage.id,
      title: meta.title,
      status: stage.status,
      enter: meta.enter,
      exit: meta.exit,
      exitNote: stage.exitNote,
      doneCount: stage.done,
      todoCount: stage.todo,
      doneItems: (entry.done || []).map((text) => ({ full: String(text), summary: trimDone(text), sid: stepIdOf(text) })),
      todoItems: (entry.todo || []).map((text) => ({ full: String(text), summary: trimDone(text), outputs: outputsOf(text), sid: stepIdOf(text) })),
      planItems: meta.items,
    };
  });

  const summary = summarize(pipeline, state, runtime, totals, budget);
  const blockers = blockersOf({ state, runtime, budget, totals });

  const history = runsHistory(pipeline.root, opts.history || HISTORY_RUNS);

  return {
    ok: true,
    pipeline: { name: pipeline.name, id: pipeline.id, root: pipeline.root, driver: pipeline.driver },
    now: {
      status: summary.status,
      state: summary.state,
      runId: (runtime && runtime.runId) || '',
      pid: (runtime && runtime.pid) || null,
      startedAt: (runtime && runtime.startedAt) || null,
      nextAt: (runtime && runtime.nextAt) || null,
      waiting: Number((runtime && runtime.waiting) || 0),
      gateReason: (runtime && runtime.gateReason) || '',
      lastError: (runtime && runtime.lastError) || null,
      consecutiveErrors: Number((runtime && runtime.consecutiveErrors) || 0),
      sessionId: (runtime && runtime.sessionId) || '',
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
  const list = pipelines(workspace);
  const cards = [];
  const errors = [];
  for (const pipeline of list) {
    try {
      const state = readState(pipeline.root, pipeline.driver);
      const runtime = runtimeOf(pipeline.root);
      const totals = costTotals(pipeline.root);
      const budget = budgetOf(pipeline.root, runtime);
      const card = summarize(pipeline, state, runtime, totals, budget);
      const blockers = blockersOf({ state: state ? { ...state, __root: pipeline.root } : null, runtime, budget, totals });
      card.blockers = blockers.length;
      card.human = blockers.some((b) => b.human);
      card.topBlocker = blockers[0] || null;
      card.error = state ? null : '找不到状态文件';
      cards.push(card);
    } catch (error) {
      errors.push({ name: pipeline.name, error: String((error && error.message) || error) });
    }
  }
  const summary = {
    running: cards.filter((c) => c.status === 'running').length,
    total: cards.length,
    todayRuns: cards.reduce((n, c) => n + (c.totals.todayRuns || 0), 0),
    todayCny: cards.reduce((n, c) => n + (c.totals.todayCny || 0), 0),
    totalRuns: cards.reduce((n, c) => n + (c.totals.runs || 0), 0),
    totalCny: cards.reduce((n, c) => n + (c.totals.cny || 0), 0),
    human: cards.filter((c) => c.human).length,
    blocked: cards.reduce((n, c) => n + (c.blockers || 0), 0),
  };
  return { ok: true, summary, pipelines: cards, errors, scannedAt: new Date().toISOString() };
}

export function findPipeline(workspace, name) {
  const list = pipelines(workspace);
  if (!name || name === 'all') return null;
  return list.find((p) => p.name === name || p.id === name) || null;
}
