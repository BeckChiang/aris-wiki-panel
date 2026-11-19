// UI 改版 2026-11：总览表 + 通栏计划页 + 产物左右分栏 + 图表；数据源与只读语义未变
window.__ModuleLoader__.load({
  id: '@local/aris-wiki',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'aris-wiki';
    const HEAD = { 'x-dsh-aris-wiki': '1' };

    // 前端只认得分组 key；文案与宿主侧 GROUP_LABEL 保持一致。
    const GROUPS = [
      { key: 'docs', label: '上游文档' },
      { key: 'mcp', label: '替代矩阵' },
      { key: 'literature', label: '项目文献' },
      { key: 'notes', label: '笔记' },
      { key: 'search', label: '检索日志' },
    ];
    const GLABEL = Object.fromEntries(GROUPS.map((g) => [(g.id || g.key), g.label]));
    const T = {
      title: 'ARIS 知识库',
      all: '全部',
      refresh: '刷新',
      search: '搜索标题、路径或摘要…',
      empty: '没有找到可索引的 Markdown 文件。',
      noMatch: '没有匹配的条目。',
      pick: '从左侧选一篇开始阅读。',
      loading: '正在读取知识库索引…',
      truncated: '正文超过 200KB，已截断显示前半部分。',
    };
    let tr = (key) => T[key] || key;

    const CSS = `/* 沿用 dsh-aris 的排版语言：中性灰 rgba(127,127,127,α)、细描边、圆角 8–16px。
   主区宿主只给一个定高列，不提供滚动容器：把卡片上两级父元素拉成定高弹性列，
   滚动交给列表与阅读区自己。宽度由容器决定：宿主列若带 align-items:center/flex-start，
   子项会退化成 fit-content，卡片就会随内容忽宽忽窄——显式 stretch + width:100%。 */
div:not(.daw):has(> .daw){display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-width:0;width:100%;min-height:0;height:100%}
div:not(.daw):has(> div > .daw){display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;min-width:0;width:100%;min-height:0;height:100%}
.daw{padding:0;margin:0;display:flex;flex-direction:column;gap:0;flex:1 1 auto;align-self:stretch;width:100%;min-width:0;min-height:0;height:100%;box-sizing:border-box;font-size:13px;line-height:1.65;color:var(--tx);background:var(--dsw-alias-bg-base,#fff);overflow:hidden}
.daw{--tx:#111318;--tx2:#5a6270;--tx3:#8b929e;--a:var(--dsw-alias-brand-primary,#2563eb);--a-bg:color-mix(in srgb,var(--dsw-alias-brand-primary,#2563eb) 11%,transparent);--ln:rgba(127,127,127,.20)}
body[data-ds-dark-theme] .daw{--tx:#e6e9ef;--tx2:#9aa3b2;--tx3:#6b7482}
.daw h2{margin:0;font-size:15px;font-weight:600;letter-spacing:.01em;color:var(--tx)}
.daw h3{margin:0;font-size:14px;font-weight:600}
.daw-sub{margin:3px 0 0;font-size:11.5px;color:var(--tx3)}
.daw-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:14px 20px 12px;flex:none;border-bottom:1px solid var(--ln)}
.daw-head>div:first-child{flex:1 1 auto;min-width:220px}
.daw-btn{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:28px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#dcdfe5);background:var(--dsw-alias-bg-base,#fff);color:var(--tx2);font:inherit;font-size:12px;line-height:1;padding:0 10px;white-space:nowrap}
.daw-btn:hover:not(:disabled){border-color:#c8cdd6;background:var(--dsw-alias-bg-base,#fff);color:var(--tx)}
.daw-btn:disabled{opacity:.5;cursor:default}
.daw-stats{font-size:11.5px;color:var(--tx3);padding:0;font-variant-numeric:tabular-nums}
.daw-ctrl{display:flex;flex-direction:column;gap:8px;padding:0}
.daw-search{width:100%;box-sizing:border-box;font:inherit;font-size:13px;line-height:22px;padding:5px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:var(--tx3);outline:none}
.daw-search:focus{border-color:rgba(127,127,127,.75)}
.daw-chips{display:flex;gap:6px;flex-wrap:wrap}
.daw-chip{cursor:pointer;border-radius:999px;border:1px solid var(--ln);background:var(--dsw-alias-bg-base,#fff);color:var(--tx2);font:inherit;font-size:11.5px;line-height:22px;padding:0 9px;height:24px;display:inline-flex;align-items:center}
.daw-chip:hover{border-color:rgba(127,127,127,.6)}
.daw-chip.on{border-color:color-mix(in srgb,var(--a) 35%,transparent);background:var(--a-bg);color:var(--a);font-weight:600}
.daw-docs{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:10px}
.daw-split{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(280px,38%) 1fr;gap:12px}
.daw-list,.daw-reader{min-height:0;overflow-y:auto;overscroll-behavior:contain}
.daw-list{display:flex;flex-direction:column;gap:8px;padding:2px}
.daw-tabs{display:flex;gap:2px;padding:0 14px;border-bottom:1px solid var(--ln);margin:0;flex:none;overflow-x:auto}
.daw-body{flex:1 1 auto;min-height:0;overflow:auto;padding:16px 20px 40px}
.daw-body:has(.daw-docs){display:flex;flex-direction:column;overflow:hidden}
.daw-body:has(.daw-docs)>*{flex:1 1 auto;min-height:0}
.daw-tab{font:inherit;font-size:12.5px;color:var(--tx2);background:none;border:0;border-bottom:2px solid transparent;padding:9px 12px 10px;cursor:pointer;display:flex;gap:6px;align-items:center;margin-bottom:-1px;white-space:nowrap}
.daw-tab:hover{color:var(--tx)}
.daw-tab.on{color:var(--tx);font-weight:600;border-bottom-color:var(--a);background:none}
.daw-tab-n{font-size:10.5px;font-weight:500;color:var(--tx3);background:rgba(127,127,127,.12);border-radius:20px;padding:0 5px;min-width:16px;text-align:center;font-variant-numeric:tabular-nums}
.daw-tab.on .daw-tab-n{color:var(--a);background:var(--a-bg)}
.daw-sec{font-size:11.5px;font-weight:600;letter-spacing:.02em;color:var(--tx2);padding:8px 0 0;border-top:1px solid var(--ln);margin-top:4px}
.daw-sec:first-child{border-top:0;margin-top:0;padding-top:0}
.daw-item{text-align:left;font:inherit;color:var(--tx2);cursor:pointer;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.05))}
.daw-item:hover{border-color:rgba(127,127,127,.5)}
.daw-item.on{border-color:rgba(127,127,127,.7);background:rgba(127,127,127,.13)}
.daw-item-t{font-size:13px;font-weight:600;color:var(--tx);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.daw-item-m{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px;font-size:11px;color:var(--tx3);font-variant-numeric:tabular-nums}
.daw-tag{border:1px solid rgba(127,127,127,.35);border-radius:5px;padding:0 5px;font-size:10.5px;white-space:nowrap;color:var(--tx2)}
.daw-rel{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.daw-item-x{margin-top:5px;font-size:12px;color:var(--tx2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.daw-reader{padding:2px 2px 2px 12px;border-left:1px solid rgba(127,127,127,.18)}
.daw-reader-h{padding:0 0 10px;margin-bottom:10px;border-bottom:1px solid rgba(127,127,127,.18)}
.daw-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--tx3);word-break:break-all;margin-top:2px}
.daw-meta{font-size:11px;color:var(--tx3);margin-top:3px}
.daw-note{margin:0 0 10px;padding:6px 10px;border-radius:8px;border:1px dashed rgba(127,127,127,.45);font-size:12px;color:var(--tx2)}
.daw-empty{display:flex;align-items:center;justify-content:center;min-height:160px;height:100%;padding:24px;text-align:center;font-size:12.5px;color:var(--tx3);border:1px dashed rgba(127,127,127,.3);border-radius:10px}
.daw-err{margin:0 4px;padding:8px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#b42318) 45%,transparent);font-size:12.5px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.daw-md{font-size:13px;line-height:1.7;word-break:break-word}
.daw-md h1,.daw-md h2,.daw-md h3,.daw-md h4{margin:18px 0 8px;line-height:1.35;font-weight:600}
.daw-md h1{font-size:18px}.daw-md h2{font-size:16px}.daw-md h3{font-size:14px}.daw-md h4{font-size:13px}
.daw-md p{margin:8px 0}
.daw-md ul,.daw-md ol{margin:8px 0;padding-left:22px}
.daw-md li{margin:3px 0}
.daw-md a{color:var(--dsw-alias-brand-primary,#2563eb);text-decoration:none}
.daw-md a:hover{text-decoration:underline}
.daw-md code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:1px 4px;border-radius:4px;background:rgba(127,127,127,.14)}
.daw-code{margin:10px 0;padding:10px 12px;border-radius:8px;background:rgba(127,127,127,.1);overflow:auto;max-height:420px}
.daw-code code{background:transparent;padding:0;font-size:12px;line-height:1.6;white-space:pre}
.daw-md blockquote{margin:10px 0;padding:4px 12px;border-left:3px solid rgba(127,127,127,.45);opacity:.85}
.daw-md hr{border:0;border-top:1px solid rgba(127,127,127,.25);margin:14px 0}
.daw-table{border-collapse:collapse;margin:10px 0;font-size:12px;display:block;overflow-x:auto}
.daw-table th,.daw-table td{border:1px solid rgba(127,127,127,.28);padding:4px 8px;text-align:left;vertical-align:top}
.daw-table th{background:rgba(127,127,127,.08);font-weight:600}
@media (max-width:900px){.daw-split{display:flex;flex-direction:column;gap:10px}.daw-list{flex:0 0 auto;max-height:36vh}.daw-reader{flex:1 1 auto;border-left:0;border-top:1px solid rgba(127,127,127,.18);padding:10px 2px 2px}}`;

    function pad2(n) {
      return String(n).padStart(2, '0');
    }
    function ft(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
    function ftFull(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
    function fmtSize(n) {
      const v = Number(n) || 0;
      if (v < 1024) return `${v} B`;
      if (v < 1024 * 1024) return `${(v / 1024).toFixed(v < 10240 ? 1 : 0)} KB`;
      return `${(v / 1048576).toFixed(1)} MB`;
    }

    async function getJson(url) {
      const res = await fetch(url, { headers: HEAD, cache: 'no-store' });
      let body = null;
      try {
        body = await res.json();
      } catch {
        /* non-json */
      }
      if (!res.ok) throw new Error((body && body.error) || `HTTP ${res.status}`);
      return body;
    }

    // 最小 markdown：标题 / 代码块 / 列表 / 引用 / 表格 / 链接，全部用 React 节点拼，
    // 不用 innerHTML、不引依赖。行内语法只支持 `code`、**粗**、*斜*、[文字](链接)、裸链接。
    const RE_FENCE = /^[ \t]{0,3}(```|~~~)/;
    const RE_HEADING = /^[ \t]{0,3}(#{1,6})[ \t]+(.*)$/;
    const RE_LIST = /^([ \t]*)([-*+]|\d+[.)])[ \t]+(.*)$/;
    const RE_QUOTE = /^[ \t]{0,3}>[ \t]?(.*)$/;
    const RE_HR = /^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/;
    const RE_TABLE = /^[ \t]*\|.*\|[ \t]*$/;
    const RE_INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>)]+)/g;

    function isBlockStart(line) {
      return RE_FENCE.test(line) || RE_HEADING.test(line) || RE_LIST.test(line) || RE_QUOTE.test(line) || RE_HR.test(line) || RE_TABLE.test(line);
    }

    function inline(text, base) {
      const source = String(text == null ? '' : text);
      const out = [];
      let last = 0;
      let index = 0;
      let match;
      RE_INLINE.lastIndex = 0;
      while ((match = RE_INLINE.exec(source))) {
        if (match.index > last) out.push(source.slice(last, match.index));
        const key = `${base}-${index++}`;
        if (match[1] !== undefined) out.push(h('code', { key }, match[1]));
        else if (match[2] !== undefined) out.push(h('strong', { key }, match[2]));
        else if (match[3] !== undefined) out.push(h('em', { key }, match[3]));
        else if (match[4] !== undefined) out.push(h('a', { key, href: match[5], target: '_blank', rel: 'noreferrer noopener' }, match[4]));
        else out.push(h('a', { key, href: match[6], target: '_blank', rel: 'noreferrer noopener' }, match[6]));
        last = RE_INLINE.lastIndex;
      }
      if (last < source.length) out.push(source.slice(last));
      return out;
    }

    function splitRow(row) {
      return row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());
    }

    function renderMarkdown(text) {
      const lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
      const nodes = [];
      let i = 0;
      let seq = 0;
      const key = () => `md-${seq++}`;
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
          i += 1;
          continue;
        }
        if (RE_FENCE.test(line)) {
          const marker = RE_FENCE.exec(line)[1];
          const buf = [];
          i += 1;
          while (i < lines.length && !lines[i].trim().startsWith(marker)) {
            buf.push(lines[i]);
            i += 1;
          }
          i += 1;
          nodes.push(h('pre', { key: key(), className: 'daw-code' }, h('code', null, buf.join('\n'))));
          continue;
        }
        const heading = RE_HEADING.exec(line);
        if (heading) {
          const level = Math.min(heading[1].length + 1, 4);
          nodes.push(h(`h${level}`, { key: key() }, inline(heading[2], key())));
          i += 1;
          continue;
        }
        if (RE_HR.test(line)) {
          nodes.push(h('hr', { key: key() }));
          i += 1;
          continue;
        }
        if (RE_QUOTE.test(line)) {
          const buf = [];
          while (i < lines.length && RE_QUOTE.test(lines[i])) {
            buf.push(RE_QUOTE.exec(lines[i])[1]);
            i += 1;
          }
          nodes.push(h('blockquote', { key: key() }, inline(buf.join(' '), key())));
          continue;
        }
        const item = RE_LIST.exec(line);
        if (item) {
          const ordered = /\d/.test(item[2]);
          const lis = [];
          while (i < lines.length) {
            const next = RE_LIST.exec(lines[i]);
            if (!next || /\d/.test(next[2]) !== ordered) break;
            lis.push(h('li', { key: key() }, inline(next[3], key())));
            i += 1;
          }
          nodes.push(h(ordered ? 'ol' : 'ul', { key: key() }, lis));
          continue;
        }
        if (RE_TABLE.test(line)) {
          const rows = [];
          while (i < lines.length && RE_TABLE.test(lines[i])) {
            rows.push(lines[i]);
            i += 1;
          }
          const data = rows.map(splitRow).filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell) || !cell));
          if (data.length) {
            const head = data[0];
            const body = data.slice(1);
            nodes.push(
              h('table', { key: key(), className: 'daw-table' },
                h('thead', null, h('tr', null, head.map((cell, ci) => h('th', { key: ci }, inline(cell, key()))))),
                h('tbody', null, body.map((cells, ri) => h('tr', { key: ri }, cells.map((cell, ci) => h('td', { key: ci }, inline(cell, key()))))))),
            );
          }
          continue;
        }
        const buf = [line.trim()];
        i += 1;
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
          buf.push(lines[i].trim());
          i += 1;
        }
        nodes.push(h('p', { key: key() }, inline(buf.join(' '), key())));
      }
      return nodes.length ? nodes : [h('p', { key: 'md-empty', className: 'daw-path' }, '（正文为空）')];
    }

    function DocsPanel(props) {
      const [items, setItems] = React.useState(null);
      const [err, setErr] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [q, setQ] = React.useState('');
      const [group, setGroup] = React.useState(props.initial || 'all');
      const [kindKey, setKindKey] = React.useState('all');
      const [sel, setSel] = React.useState('');
      const [doc, setDoc] = React.useState(null);
      const [docErr, setDocErr] = React.useState('');
      const [docBusy, setDocBusy] = React.useState(false);
      const seq = React.useRef(0);

      const load = React.useCallback(async (refresh) => {
        setBusy(true);
        setErr('');
        try {
          const body = await getJson(`/api/aris-wiki/index?t=${Date.now()}${refresh ? '&refresh=1' : ''}`);
          if (!Array.isArray(body)) throw new Error((body && body.error) || '索引返回格式不正确');
          setItems(body);
        } catch (e) {
          setErr(String((e && e.message) || e));
        } finally {
          setBusy(false);
        }
      }, []);

      React.useEffect(() => {
        load(false);
      }, [load]);

      const open = React.useCallback(async (id) => {
        const ticket = ++seq.current;
        setSel(id);
        setDoc(null);
        setDocErr('');
        setDocBusy(true);
        try {
          const body = await getJson(`/api/aris-wiki/doc?id=${encodeURIComponent(id)}&t=${Date.now()}`);
          if (ticket !== seq.current) return;
          if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
          setDoc(body);
        } catch (e) {
          if (ticket !== seq.current) return;
          setDocErr(String((e && e.message) || e));
        } finally {
          if (ticket === seq.current) setDocBusy(false);
        }
      }, []);

      const list = items || [];
      // 一级分类＝流水线，二级分类＝文件种类。
      // 旧版宿主返回的条目没有 pipe 字段（宿主未重启时仍跑旧 index.js），这里按 source 兜底，
      // 让分类在两种版本下都成立：source 为 'ARIS'/'ARIS docs' 即共享文档，其余是项目名。
      const pipeKey = (it) =>
        it.pipe || (it.source && it.source !== 'ARIS docs' && it.source !== 'ARIS' ? `src:${it.source}` : 'shared');
      const pipeLabelOf = (it) =>
        it.pipeLabel || (pipeKey(it) === 'shared' ? 'ARIS 共享' : it.source || pipeKey(it));

      const pipes = React.useMemo(() => {
        const map = new Map();
        for (const it of list) {
          const key = pipeKey(it);
          const cur = map.get(key) || { key, label: pipeLabelOf(it), n: 0 };
          cur.n += 1;
          map.set(key, cur);
        }
        return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
      }, [list]);
      const legacyKey=group.startsWith('project:') && props.label ? 'src:'+props.label : '';
      const inPipe = React.useMemo(
        () => list.filter((it) => group === 'all' || pipeKey(it) === group || pipeKey(it) === legacyKey),
        [list, group, legacyKey],
      );
      const kinds = React.useMemo(() => {
        const map = new Map();
        for (const it of inPipe) map.set(it.group, (map.get(it.group) || 0) + 1);
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
      }, [inPipe]);
      const lastMtime = React.useMemo(
        () => list.reduce((max, it) => (it.mtime > max ? it.mtime : max), ''),
        [list],
      );
      const needle = q.trim().toLowerCase();
      const filtered = React.useMemo(
        () =>
          inPipe.filter((it) => {
            if (kindKey !== 'all' && it.group !== kindKey) return false;
            if (!needle) return true;
            return `${it.title} ${it.rel} ${it.source} ${it.excerpt}`.toLowerCase().includes(needle);
          }),
        [inPipe, kindKey, needle],
      );

      const stats = [];
      if (list.length) {
        stats.push(`共 ${list.length} 条`);
        for (const p of pipes) stats.push(`${p.label} ${p.n}`);
        if (lastMtime) stats.push(`最后更新 ${ftFull(lastMtime)}`);
      }
      if ((needle || group !== 'all' || kindKey !== 'all') && filtered.length !== list.length) stats.push(`当前显示 ${filtered.length} 条`);

      const row = (it) =>
        h(
          'button',
          { key: it.id, type: 'button', className: `daw-item${sel === it.id ? ' on' : ''}`, onClick: () => open(it.id), title: it.title },
          h('div', { className: 'daw-item-t' }, it.title),
          h(
            'div',
            { className: 'daw-item-m' },
            h('span', { className: 'daw-tag' }, GLABEL[it.group] || it.group),
            h('span', { className: 'daw-rel' }, it.source && it.source !== 'ARIS docs' ? `${it.source}/${it.rel}` : it.rel),
            h('span', null, fmtSize(it.size)),
            h('span', null, ft(it.mtime)),
          ),
          it.excerpt ? h('div', { className: 'daw-item-x' }, it.excerpt) : null,
        );

      let listBody;
      if (err && !items) listBody = h('div', { className: 'daw-empty' }, '无法读取索引，见上方错误。');
      else if (!items) listBody = h('div', { className: 'daw-empty' }, tr('loading'));
      else if (!list.length) listBody = h('div', { className: 'daw-empty' }, tr('empty'));
      else if (!filtered.length) listBody = h('div', { className: 'daw-empty' }, `${tr('noMatch')}${needle ? `（关键词「${q.trim()}」）` : ''}`);
      else listBody = pipes.map((pipe) => {
        const docs = filtered.filter((item) => pipeKey(item) === pipe.key);
        if (!docs.length) return null;
        return h('details', { key:pipe.key, open:true },
          h('summary', null, pipe.label+' · '+docs.length),
          Array.from(new Set(docs.map((item)=>item.group))).map((kind)=>h('details',{key:kind,open:true},
            h('summary',null,GLABEL[kind]||kind),docs.filter((item)=>item.group===kind).map(row))));
      });

      let reader;
      if (docBusy) reader = h('div', { className: 'daw-empty' }, '正在读取正文…');
      else if (docErr)
        reader = h(
          'div',
          { className: 'daw-empty' },
          h('div', null, `读取失败：${docErr}`),
          h('button', { className: 'daw-btn', type: 'button', style: { marginTop: 10 }, onClick: () => open(sel) }, '重试'),
        );
      else if (doc && filtered.some((it)=>it.id===sel))
        reader = h(
          'div',
          null,
          h(
            'div',
            { className: 'daw-reader-h' },
            h('h3', null, doc.title),
            h('div', { className: 'daw-path' }, `${[doc.pipeLabel, GLABEL[doc.group] || doc.group].filter(Boolean).join(' · ')} · ${doc.source && doc.source !== 'ARIS docs' ? `${doc.source}/${doc.rel}` : doc.rel || ''}`),
            h('div', { className: 'daw-meta' }, [fmtSize(doc.size), ftFull(doc.mtime), doc.truncated ? '已截断' : ''].filter(Boolean).join(' · ')),
          ),
          doc.truncated ? h('div', { className: 'daw-note' }, tr('truncated')) : null,
          h('div', { className: 'daw-md' }, renderMarkdown(doc.text)),
        );
      else reader = h('div', { className: 'daw-empty' }, tr('pick'));

      const chips = [['all', tr('all'), list.length]].concat(pipes.map((p) => [p.key, p.label, p.n]));
      const kindChips = [['all', '全部类型', inPipe.length]].concat(kinds.map(([k, n]) => [k, GLABEL[k] || k, n]));

      return h(
        'div',
        { className: 'daw-docs' },
        h(
          'div',
          { className: 'daw-head' },
          h('p', { className: 'daw-sub' }, '文档索引：上游文档、替代矩阵、项目文献、笔记与检索日志。'),
          h('button', { className: 'daw-btn', type: 'button', disabled: busy, onClick: () => load(true) }, busy ? '刷新中…' : tr('refresh')),
        ),
        stats.length ? h('div', { className: 'daw-stats' }, stats.join(' · ')) : null,
        h('label', {className:'daw-scope'}, '文档范围　',
          h('select',{value:group,onChange:(e)=>{
            const key=e.target.value;
            seq.current++;setDoc(null);setSel('');setDocBusy(false);setDocErr('');
            setGroup(key);setKindKey('all');props.onScope(key);
          }},chips.concat(chips.some(([id])=>id===group)?[]:[[group,props.label||group,0]]).map(([key,label,count])=>h('option',{key,value:key},label+' · '+count)))),
        h(
          'div',
          { className: 'daw-ctrl' },
          h('input', {
            className: 'daw-search',
            type: 'search',
            value: q,
            placeholder: tr('search'),
            spellCheck: false,
            onChange: (e) => setQ(e.target.value),
          }),
        ),
        kindChips.length > 2
          ? h(
              'div',
              { className: 'daw-chips' },
              kindChips.map(([key, label, count]) =>
                h(
                  'button',
                  { key, type: 'button', className: `daw-chip${kindKey === key ? ' on' : ''}`, onClick: () => setKindKey(key) },
                  `${label} ${count}`,
                ),
              ),
            )
          : null,
        err
          ? h(
              'div',
              { className: 'daw-err' },
              h('div', null, `无法连接知识库宿主：${err}`),
              h('button', { className: 'daw-btn', type: 'button', onClick: () => load(false) }, '重试'),
            )
          : null,
        h('div', { className: 'daw-split' }, h('div', { className: 'daw-list' }, listBody), h('div', { className: 'daw-reader' }, reader)),
      );
    }

    const CSS2 = `/* 计划 / 产物：只读看板。数字等宽，卡片不抢注意力。 */
.daw-head-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-left:auto}
.daw-sel{font:inherit;font-size:12.5px;line-height:22px;padding:2px 8px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;outline:none;max-width:220px}
.daw-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;padding:2px 4px}
.daw-kpi{border:1px solid rgba(127,127,127,.18);border-radius:12px;padding:10px 12px}
.daw-kpi-k{font-size:11.5px;color:var(--tx3)}
.daw-kpi-v{font-size:19px;font-weight:600;color:var(--tx);font-variant-numeric:tabular-nums;line-height:1.5}
.daw-kpi-n{font-size:11px;color:var(--tx3);font-variant-numeric:tabular-nums}
.daw-cards{flex:1 1 auto;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:10px;padding:2px 4px 6px;align-content:start}
.daw-card{text-align:left;font:inherit;color:var(--tx2);background:transparent;cursor:pointer;border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:7px;min-width:0}
.daw-card:hover{border-color:rgba(127,127,127,.5);background:rgba(127,127,127,.05)}
.daw-card.human{border-left:3px solid var(--dsw-alias-state-error-primary,#b42318)}
.daw-card-h{display:flex;align-items:center;gap:7px;font-size:13px;color:var(--tx);min-width:0}
.daw-card-h b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.daw-card-r{margin-left:auto;font-size:11.5px;color:var(--tx3);white-space:nowrap;font-variant-numeric:tabular-nums}
.daw-dot{width:8px;height:8px;border-radius:50%;background:rgba(127,127,127,.45);flex:0 0 8px}
.daw-dot.running{background:#0f766e;box-shadow:0 0 0 3px rgba(15,118,110,.18)}
.daw-dot.error,.daw-dot.blocked{background:#b42318}
.daw-badge{font-size:11px;line-height:16px;padding:0 7px;border-radius:999px;border:1px solid rgba(127,127,127,.35);opacity:.85;white-space:nowrap}
.daw-badge.running{color:#0f766e;border-color:rgba(15,118,110,.5)}
.daw-badge.human{color:#b42318;border-color:rgba(180,35,24,.5)}
.daw-rail{display:flex;gap:3px;height:8px;align-items:stretch}
.daw-seg{flex:1 1 auto;border-radius:3px;background:rgba(127,127,127,.22);min-width:6px}
.daw-seg.done{background:#0f766e}
.daw-seg.in_progress{background:#b45309}
.daw-seg.blocked,.daw-seg.failed{background:#b42318}
.daw-meters{display:flex;align-items:center;gap:8px;font-size:11.5px;opacity:.8;flex-wrap:wrap}
.daw-meter{flex:1 1 90px;min-width:70px;display:flex;align-items:center;gap:6px}
.daw-meter>span{font-size:11px;opacity:.7;white-space:nowrap}
.daw-meter>i{flex:1 1 auto;height:6px;border-radius:999px;background:rgba(127,127,127,.2);overflow:hidden;display:block}
.daw-meter>i>b{display:block;height:100%;background:#0f766e}
.daw-mv{font-variant-numeric:tabular-nums;opacity:.7}
.daw-card-f{font-size:11.5px;color:var(--tx3);font-variant-numeric:tabular-nums}
.daw-card-b{font-size:11.5px;opacity:.8;color:var(--dsw-alias-state-warn-primary,#b26a00);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.daw-gates{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;padding:0 4px}
.daw-gate{border:1px solid rgba(127,127,127,.2);border-radius:10px;padding:8px 10px;min-width:0}
.daw-gate.pending{border-style:dashed;border-color:rgba(127,127,127,.4)}
.daw-gate.fail{border-left:3px solid #b42318}
.daw-gate-h{display:flex;align-items:center;gap:6px;font-size:12.5px}
.daw-gate-h .daw-badge{margin-left:auto}
.daw-gate-c{font-size:11.5px;color:var(--tx3);margin-top:3px;word-break:break-word}
.daw-gate-o{font-size:11.5px;color:var(--tx2);margin-top:3px;font-variant-numeric:tabular-nums;word-break:break-word}
.daw-cols{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 4px 6px}
.daw-col{min-height:0;display:flex;flex-direction:column;gap:6px;overflow:auto;border:1px solid rgba(127,127,127,.16);border-radius:12px;padding:8px 10px}
.daw-col-h{font-size:12px;color:var(--tx2);font-weight:600;opacity:1;position:sticky;top:0;background:var(--dsw-alias-bg-base,#fff);padding:2px 0}
.daw-item2{border-top:1px dashed rgba(127,127,127,.18);padding-top:6px;font-size:12.5px}
.daw-item2:first-of-type{border-top:0}
.daw-item2-s{color:var(--tx3);font-size:11.5px;margin-top:2px;font-variant-numeric:tabular-nums}
.daw-blocks{display:flex;flex-direction:column;gap:6px;padding:0 4px}
.daw-block{border:1px solid rgba(127,127,127,.2);border-radius:10px;padding:7px 10px;font-size:12.5px;display:flex;gap:8px;align-items:flex-start}
.daw-block.error{border-left:3px solid #b42318}
.daw-block.warn{border-left:3px solid #b26a00}
.daw-block.info{border-left:3px solid rgba(127,127,127,.45)}
.daw-block-t{flex:1 1 auto;min-width:0}
.daw-block-e{font-size:11px;opacity:.6;font-family:ui-monospace,Menlo,monospace;word-break:break-all;margin-top:2px}
.daw-tbl{border-collapse:collapse;font-size:12px;width:100%;font-variant-numeric:tabular-nums}
.daw-tbl th,.daw-tbl td{border-bottom:1px solid rgba(127,127,127,.16);padding:4px 8px;text-align:left;white-space:nowrap}
.daw-tbl th{color:var(--tx3);font-weight:500}
.daw-tbl td{color:var(--tx2)}
.daw-arts{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(260px,34%) 1fr;gap:12px;padding:0 4px}
.daw-art-l{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:4px}
.daw-art-f{text-align:left;font:inherit;color:var(--tx2);background:transparent;border:0;border-top:1px dashed rgba(127,127,127,.16);padding:5px 4px;cursor:pointer;font-size:12.5px;display:flex;gap:8px;align-items:baseline;min-width:0}
.daw-art-f:hover{background:rgba(127,127,127,.08)}
.daw-art-f.on{background:rgba(127,127,127,.14);font-weight:600}
.daw-art-f>span:first-child{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daw-art-f>span:last-child{font-size:11px;opacity:.55;white-space:nowrap}
.daw-art-v{min-height:0;overflow:auto;border:1px solid rgba(127,127,127,.16);border-radius:12px;padding:8px 10px}
.daw-art-img{max-width:100%;display:block;margin:0 auto}
.daw-main{border:1px solid rgba(127,127,127,.24);border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 4px}
.daw-main-k{font-size:11.5px;color:var(--tx3)}
.daw-main-n{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.daw-main-r{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
@media (max-width:900px){.daw-cols{grid-template-columns:1fr}.daw-arts{grid-template-columns:1fr}}


.daw-seg.click{cursor:pointer;border:0;padding:0}
.daw-seg.on{outline:2px solid currentColor;outline-offset:1px}
.daw-planhead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.daw-planhead-l,.daw-planhead-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.daw-note-i{color:var(--tx3);font-size:11.5px}
.daw-legend{font-size:11.5px;opacity:.65;line-height:1.6}
.daw-sech{display:flex;align-items:center;gap:8px;margin-top:4px}
.daw-sech b{font-size:13px}
.daw-mini{margin-left:auto;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.35);background:transparent;color:var(--tx2);cursor:pointer}
.daw-stages{display:flex;flex-direction:column;gap:4px}
.daw-stage{border:1px solid rgba(127,127,127,.18);border-radius:8px;overflow:hidden}
.daw-stage.cur{border-color:rgba(200,120,0,.55)}
.daw-stage.sel{box-shadow:0 0 0 1px rgba(127,127,127,.25) inset}
.daw-stage-h{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:7px 10px;border:0;background:rgba(127,127,127,.05);color:var(--tx);cursor:pointer;font-size:12px;font-weight:600}
.daw-stage-i{color:var(--tx3);font-variant-numeric:tabular-nums;font-size:11px}
.daw-stage-id{flex:0 0 auto}
.daw-stage-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--tx)}
.daw-stage-n{color:var(--tx3);font-size:11px;white-space:nowrap}
.daw-stage-x{color:var(--tx3);font-size:11px;white-space:nowrap}
.daw-stage-b{padding:8px 12px 10px;display:flex;flex-direction:column;gap:8px}
.daw-crit>div{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.daw-crit{font-size:11.5px;line-height:1.65;color:var(--tx2);display:flex;flex-direction:column;gap:2px}
.daw-crit i{opacity:.55;font-style:normal;margin-right:4px}
.daw-sub-h{font-size:11.5px;color:var(--tx3);margin-bottom:3px}
.daw-planitem{display:flex;gap:6px;font-size:12px;line-height:1.6;padding:1px 0}
.daw-ck{opacity:.45}
.daw-step{display:flex;gap:6px;align-items:baseline;font-size:12px;line-height:1.6;padding:2px 0;border-top:1px dashed rgba(127,127,127,.14)}
.daw-step-n{flex:0 0 34px;opacity:.45;font-size:10.5px;font-variant-numeric:tabular-nums;text-align:right}
.daw-step-id{flex:0 0 auto;font-size:10.5px;padding:0 4px;border-radius:4px;background:rgba(127,127,127,.12)}
.daw-step-t{flex:1 1 auto;min-width:0}
.daw-step.ok .daw-step-t{opacity:.85}
.daw-step.todo .daw-step-t{font-weight:600}
.daw-step-o{flex:0 0 auto;font-size:10.5px;opacity:.5;max-width:40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daw-hist .daw-tbl{margin-top:2px}

.daw-hist .daw-tbl{margin-top:2px}

.daw-tl{display:flex;flex-direction:column;gap:2px;margin-top:4px}
.daw-tl-row{padding:4px 8px;border-left:3px solid rgba(127,127,127,.25);background:rgba(127,127,127,.04);border-radius:0 6px 6px 0}
.daw-tl-row.warn{border-left-color:rgba(200,120,0,.7)}
.daw-tl-row.error{border-left-color:rgba(190,40,40,.8)}
.daw-tl-row.ok{border-left-color:rgba(0,140,110,.6)}
.daw-tl-h{display:flex;gap:8px;align-items:baseline;font-size:12px}
.daw-tl-t{flex:0 0 96px;opacity:.55;font-size:11px;font-variant-numeric:tabular-nums}
.daw-tl-k{flex:0 0 34px;font-size:10.5px;padding:0 5px;border-radius:4px;background:rgba(127,127,127,.14);text-align:center}
.daw-tl-x{flex:1 1 auto;min-width:0}
.daw-tl-d{font-size:11px;opacity:.55;margin-left:104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.daw-arts-wrap{display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-height:0}
.daw-pipes{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.daw-mini.back{margin:0 6px 0 0}
/* 计划详情：状态条 / 分组折叠 / 阻碍动作 / 日志抽屉（新增，勿与上面重复定义） */
.daw-card[role=button]{cursor:pointer}
.daw-card-sub{font-size:11.5px;opacity:.62;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.daw-card-now{font-size:11.5px;opacity:.8;font-variant-numeric:tabular-nums}
.daw-badge.review{color:#b26a00;border-color:rgba(178,106,0,.5)}
.daw-now{display:flex;flex-wrap:wrap;gap:6px 18px;border:1px solid rgba(127,127,127,.18);border-radius:10px;padding:8px 12px;font-size:12px}
.daw-now-i{display:flex;gap:6px;align-items:baseline;min-width:0}
.daw-now-i.wide{flex:1 1 320px}
.daw-now-k{font-size:11px;opacity:.55;white-space:nowrap}
.daw-warn-t{color:var(--dsw-alias-state-warn-primary,#b26a00)}
.daw-secbar{display:flex;align-items:center;gap:6px;margin:2px 0}
.daw-secbar .daw-mini{margin-left:0}
.daw-sec{border:1px solid rgba(127,127,127,.18);border-radius:10px;overflow:hidden}
.daw-sec-h{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:7px 10px;border:0;background:rgba(127,127,127,.05);color:var(--tx2);cursor:pointer;font-size:12.5px}
.daw-sec-h:hover{background:rgba(127,127,127,.1)}
.daw-sec-x{opacity:.6;width:10px;flex:0 0 10px}
.daw-sec-t{flex:0 0 auto}
.daw-sec-n{font-size:11px;opacity:.6;font-variant-numeric:tabular-nums;padding:0 5px;border-radius:999px;background:rgba(127,127,127,.14)}
.daw-sec-b{font-size:11.5px;opacity:.55;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daw-sec-body{padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px}
.daw-grp{border-top:1px dashed rgba(127,127,127,.16);padding-top:4px}
.daw-grp:first-child{border-top:0;padding-top:0}
.daw-grp-h{display:flex;align-items:center;gap:7px;width:100%;text-align:left;border:0;background:transparent;color:var(--tx2);cursor:pointer;font-size:11.5px;padding:3px 0}
.daw-grp-h:hover{opacity:1}
.daw-steps{display:flex;flex-direction:column;gap:1px;padding:2px 0 2px 14px}
.daw-stage-h.cur{background:rgba(200,120,0,.08)}
.daw-step.ext .daw-step-t{color:var(--dsw-alias-state-warn-primary,#b26a00)}
.daw-step-badge{flex:0 0 auto;font-size:10px;padding:0 5px;border-radius:4px;border:1px solid rgba(127,127,127,.35);opacity:.75}
.daw-planitem-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.daw-planitem-k{flex:0 0 auto;font-size:10.5px;opacity:.55;font-variant-numeric:tabular-nums}
.daw-planitem-k.none{opacity:.35}
.daw-planitem.done .daw-planitem-k{color:#0f766e;opacity:.9}
.daw-planitem.done .daw-planitem-t{opacity:.75}
.daw-planitem.doing .daw-ck{color:var(--dsw-alias-state-warn-primary,#b26a00);opacity:1}
.daw-act{flex:0 0 auto;font-size:11.5px;padding:2px 9px;border-radius:999px;border:1px solid rgba(127,127,127,.45);background:transparent;color:var(--tx2);cursor:pointer;white-space:nowrap}
.daw-act:hover{border-color:currentColor}
.daw-act.soft{opacity:.8;border-style:dashed}
.daw-block-k{font-size:10.5px;opacity:.6;font-variant-numeric:tabular-nums}
.daw-tl-k.review{background:rgba(200,120,0,.16)}
.daw-tl-k.run{background:rgba(15,118,110,.16)}
.daw-tl-k.gate{background:rgba(127,127,127,.14)}
.daw-drawer{border:1px solid rgba(127,127,127,.3);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.daw-drawer-h{display:flex;align-items:center;gap:8px;font-size:12.5px}
.daw-drawer-r{font-size:11px;opacity:.6;font-family:ui-monospace,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 auto}
.daw-drawer-h .daw-mini{margin-left:auto}
.daw-pre{margin:0;max-height:320px;overflow:auto;font-size:11.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,monospace;background:rgba(127,127,127,.06);border-radius:8px;padding:8px}
.daw-toast{position:sticky;bottom:0;margin-top:4px;font-size:12px;padding:6px 10px;border-radius:8px;background:rgba(127,127,127,.14);word-break:break-all}
`;
    const CSS3 = `/* 2026-11 改版：总览表 / 通栏计划页 / 产物左右分栏 / 纯 CSS+SVG 图表。
   颜色一律走 rgba(127,127,127,α) 或 color-mix(...,currentColor)：宿主深色主题会把
   currentColor 翻白，状态色跟着变亮，不必再写一份暗色覆盖；表格底用宿主 bg-base。 */
.daw{--daw-line:rgba(127,127,127,.2);--daw-fill:rgba(127,127,127,.06);--daw-fill2:rgba(127,127,127,.13);--daw-ok:color-mix(in srgb,#0d9488 76%,currentColor);--daw-run:color-mix(in srgb,#0284c7 76%,currentColor);--daw-warn:color-mix(in srgb,#d97706 80%,currentColor);--daw-err:color-mix(in srgb,#dc2626 74%,currentColor);--daw-idle:rgba(127,127,127,.5)}
.daw-page{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:0 4px 8px}
.daw-stack{display:flex;flex-direction:column;gap:8px;min-width:0}
.daw-kpis8{grid-template-columns:repeat(auto-fit,minmax(132px,1fr))}
.daw-kpi-v.ok{color:var(--daw-ok)}.daw-kpi-v.run{color:var(--daw-run)}.daw-kpi-v.warn{color:var(--daw-warn)}.daw-kpi-v.err{color:var(--daw-err)}
.daw-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.daw-toolbar .daw-search{flex:1 1 200px;width:auto}
.daw-chip .daw-cn{opacity:.8;margin-left:5px;font-variant-numeric:tabular-nums}
.daw-tgl{display:flex;border:1px solid rgba(127,127,127,.35);border-radius:999px;overflow:hidden;margin-left:auto}
.daw-tgl>button{font:inherit;font-size:11.5px;line-height:18px;padding:2px 10px;border:0;background:transparent;color:inherit;cursor:pointer}
.daw-tgl>button.on{background:rgba(127,127,127,.16);font-weight:600}
.daw-tblwrap{min-height:0;overflow:auto;border:1px solid var(--daw-line);border-radius:12px}
.daw-tbl2{border-collapse:separate;border-spacing:0;width:100%;font-size:12px;font-variant-numeric:tabular-nums}
.daw-tbl2 th{position:sticky;top:0;z-index:2;text-align:left;font-weight:500;font-size:11px;color:var(--tx3);padding:6px 8px;white-space:nowrap;border-bottom:1px solid var(--daw-line);background:var(--dsw-alias-bg-base,#fff)}
.daw-tbl2 td{padding:5px 8px;color:var(--tx2);border-bottom:1px solid rgba(127,127,127,.13);vertical-align:top}
.daw-tbl2 tbody tr:last-child td{border-bottom:0}
.daw-tbl2 th:first-child,.daw-tbl2 td:first-child{position:sticky;left:0;z-index:1;background:var(--dsw-alias-bg-base,#fff)}
.daw-tbl2 th:first-child{z-index:3}
.daw-tbl2 tbody tr.clk{cursor:pointer}
.daw-tbl2 tbody tr.clk:hover td{background:var(--daw-fill)}
.daw-tbl2 tbody tr.on>td{background:var(--daw-fill2)}
.daw-tbl2 td.wrap{white-space:normal;word-break:break-word;min-width:140px;max-width:420px}
.daw-cell2{display:flex;flex-direction:column;gap:1px;line-height:1.35;max-width:280px}
.daw-cell2 small{font-size:10.5px;color:var(--tx3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daw-st{display:flex;align-items:center;gap:6px;white-space:nowrap}
.daw-dot.done{background:var(--daw-ok)}
.daw-dot.in_progress{background:var(--daw-run);box-shadow:0 0 0 3px color-mix(in srgb,var(--daw-run) 22%,transparent)}
.daw-dot.pending{background:rgba(127,127,127,.32)}
.daw-dot.review,.daw-dot.human{background:var(--daw-warn)}
.daw-dot.failed,.daw-dot.error{background:var(--daw-err)}
.daw-dot.paused,.daw-dot.stopped{background:rgba(127,127,127,.5)}
.daw-dot.idle{background:rgba(127,127,127,.42)}
.daw-bnum{display:inline-block;min-width:18px;text-align:center;font-size:11px;line-height:16px;padding:0 5px;border-radius:999px;border:1px solid rgba(127,127,127,.35)}
.daw-bnum.on{color:var(--daw-err);border-color:color-mix(in srgb,var(--daw-err) 55%,transparent);font-weight:600}
.daw-rail.wide{height:10px;gap:4px}
.daw-detail{border:1px solid var(--daw-line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.daw-detail-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}
.daw-detail-h .daw-mini{margin-left:0}
.daw-detail-h .daw-mini:first-of-type{margin-left:auto}
.daw-sc{border:1px solid var(--daw-line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.daw-sc-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.daw-sc-n{font-size:15px;font-weight:600}
.daw-sc-h .daw-note-i:last-child{margin-left:auto}
.daw-sc-kv{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:12px}
.daw-kv{display:flex;gap:6px;align-items:baseline;min-width:0;max-width:100%}
.daw-kv>i{font-style:normal;font-size:11px;color:var(--tx3);white-space:nowrap}
.daw-kv>span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.daw-kv.wide{flex:1 1 320px}
.daw-chartbox{border:1px solid var(--daw-line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
.daw-chartbox-h{display:flex;align-items:center;gap:8px;font-size:11.5px;opacity:.72;flex-wrap:wrap}
.daw-chartbox-h b{font-size:12px}
.daw-chart{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px;align-items:stretch}
.daw-yax{display:flex;flex-direction:column;justify-content:space-between;height:132px;font-size:10px;opacity:.55;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.daw-plot{overflow-x:auto;overflow-y:hidden;height:132px;padding-bottom:2px}
.daw-plot-in{position:relative;display:flex;align-items:flex-end;gap:4px;height:100%;min-width:100%}
.daw-bar{flex:0 0 auto;width:var(--bw,14px);height:100%;display:flex;align-items:flex-end;position:relative}
.daw-bar>i{display:block;width:100%;min-height:2px;border-radius:2px 2px 0 0;background:color-mix(in srgb,var(--daw-run) 62%,transparent)}
.daw-bar.hi>i{background:color-mix(in srgb,var(--daw-warn) 72%,transparent)}
.daw-bar:hover>i{background:color-mix(in srgb,var(--daw-run) 92%,transparent)}
.daw-avg{position:absolute;left:0;right:0;border-top:1px dashed var(--daw-warn);pointer-events:none;z-index:1}
.daw-avg b{position:absolute;right:0;top:-15px;font-size:10px;font-weight:500;color:var(--daw-warn);white-space:nowrap;background:var(--dsw-alias-bg-base,#fff);padding:0 3px}
.daw-chart-s{font-size:11px;opacity:.6;font-variant-numeric:tabular-nums}
.daw-tid{font-family:ui-monospace,Menlo,monospace;font-size:11px;opacity:.7}
.daw-donut{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.daw-lg{display:flex;flex-direction:column;gap:3px;font-size:11.5px;min-width:140px}
.daw-lg-i{display:flex;align-items:center;gap:6px;white-space:nowrap}
.daw-sw{width:9px;height:9px;border-radius:2px;flex:0 0 9px}
.daw-cols3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.daw-col.b{max-height:340px}
.daw-col.b .daw-empty,.daw-stage-b .daw-empty{min-height:0;padding:10px;border:0}
.daw-split3{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:var(--daw-splitw,360px) 10px minmax(0,1fr)}
.daw-split3.narrow{grid-template-columns:minmax(0,1fr)}
.daw-splitbar{position:relative;border:0;background:transparent;padding:0;cursor:col-resize}
.daw-splitbar:before{content:"";position:absolute;top:0;bottom:0;left:4px;width:2px;border-radius:1px;background:var(--daw-line)}
.daw-splitbar:hover:before,.daw-splitbar.on:before{background:rgba(127,127,127,.5)}
.daw-split3.narrow .daw-splitbar{display:none}
.daw-ftable{min-height:0;overflow:auto;border:1px solid var(--daw-line);border-radius:10px}
.daw-prev{min-height:0;overflow:auto;border:1px solid var(--daw-line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.daw-prev-h{font-size:13px;font-weight:600;word-break:break-all}
.daw-prev-m{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--tx3);font-variant-numeric:tabular-nums}
.daw-prev-p{font-family:ui-monospace,Menlo,monospace;font-size:11px;color:var(--tx3);word-break:break-all}
.daw-prev-page{width:100%;max-width:300px;aspect-ratio:3/4;border:1px solid var(--daw-line);border-radius:6px;background:rgba(127,127,127,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:11.5px;opacity:.68;text-align:center;padding:14px}
.daw-prev-img{max-width:100%;max-height:420px;display:block;border-radius:6px;border:1px solid var(--daw-line)}
.daw-prev-pdf{flex:1 1 auto;width:100%;min-height:420px;height:min(72vh,680px);border:1px solid var(--daw-line);border-radius:8px;display:block;background:#fff}
.daw-prev-text{font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.75;background:rgba(127,127,127,.05);border-radius:8px;padding:10px 12px;white-space:pre-wrap;word-break:break-word;max-height:360px;overflow:auto;margin:0}
.daw-prev-f{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:6px;align-items:center}
.daw-err2{border:1px solid var(--daw-line);border-left:3px solid var(--daw-err);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:12.5px}
.daw-err2 pre{margin:0;max-height:160px;overflow:auto;font-size:11px;line-height:1.55;opacity:.7;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,Menlo,monospace}
@media (max-width:900px){.daw-cols3{grid-template-columns:minmax(0,1fr)}.daw-cell2{max-width:180px}.daw-tgl{margin-left:0}}
`;
    const CSS4 = `
.daw .daw-scope{display:block;padding:7px 14px;color:var(--tx2)}.daw .daw-scope select{min-height:32px;height:auto;line-height:1.5;border:1px solid var(--daw-line);border-radius:7px;color:var(--tx);background:var(--daw-bg,var(--dsw-alias-bg-base));padding:3px 8px}
body[data-ds-dark-theme] .daw select{color-scheme:dark}.daw-list summary,.daw-scope summary{cursor:pointer;padding:5px;font-weight:600}.daw-list details details{padding-left:10px}
@media(min-width:901px){.daw .daw-split{display:flex}.daw .daw-list{width:260px;min-width:170px;max-width:62%;resize:horizontal;overflow:auto}.daw .daw-reader{flex:1;min-width:0}}

.daw-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.daw-sub-h{font-size:11px;opacity:.6;margin:6px 0 3px;letter-spacing:.02em}
.daw-ck{width:12px;flex:0 0 12px;opacity:.7;font-family:ui-monospace,Menlo,monospace}
.daw-stage-i{font-family:ui-monospace,Menlo,monospace;font-size:10.5px;opacity:.5;margin-right:5px}
.daw-stage-b{display:flex;flex-direction:column;gap:2px;padding:8px 10px 10px 12px;border-left:2px solid var(--daw-line);margin:2px 0 6px 6px}
.daw-tl-k{font-size:10.5px;opacity:.6}
.daw-tl-k.error{color:var(--daw-err)}.daw-tl-k.warn{color:var(--daw-warn)}.daw-tl-k.info{color:var(--tx3)}
.daw-drawer-r{font-family:ui-monospace,Menlo,monospace;font-size:10.5px;opacity:.55;word-break:break-all;flex:1 1 auto}
.daw-tbl2 tr.grp>td{background:rgba(127,127,127,.07);font-size:11px;opacity:.85;font-weight:600;padding:4px 8px}
.daw-tbl2 td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.daw-skel{display:flex;flex-direction:column;gap:7px;padding:4px 0}
.daw-skel i{display:block;height:8px;border-radius:3px;background:rgba(127,127,127,.16);animation:daw-pulse 1.4s ease-in-out infinite}
.daw-skel i:nth-child(3n+2){width:88%}.daw-skel i:nth-child(3n){width:72%}.daw-skel i:nth-child(4n){width:94%}
@keyframes daw-pulse{0%,100%{opacity:.55}50%{opacity:1}}
.daw-hint{font-size:11px;color:var(--tx3)}
@media (max-width:900px){.daw-chips{margin-left:0}}
`;

    // 状态词汇与数据层 statusOf() 一致（也等于 dsh 面板 stateOf 的那一套），
    // 两处看到的字必须一样，否则又变成两份互相矛盾的结论。
    const ST = {
      running: '正在运行',
      stopping: '停止中',
      review: '等待审核',
      human: '等待人工',
      idle: '待命',
      paused: '已暂停',
      stopped: '已停止',
      error: '出错',
      blocked: '被阻塞',
      done: '已完成',
      in_progress: '进行中',
      pending: '未开始',
      failed: '失败',
    };
    const stText = (s) => ST[s] || s || '未知';
    const stOf = (obj) => (obj && (obj.statusKey || obj.status)) || 'unknown';
    const sevIcon = (sev) => (sev === 'error' ? '✕' : sev === 'warn' ? '!' : 'i');
    const fmtDur = (min) => {
      const n = Math.round(Number(min));
      if (!Number.isFinite(n) || n < 0) return '-';
      if (n < 60) return n + ' 分钟';
      const hh = Math.floor(n / 60);
      const mm = n % 60;
      return mm ? hh + ' 小时 ' + mm + ' 分' : hh + ' 小时';
    };

    // 可折叠分区：计划详情里每个内容组都走它，默认只展开「当前阶段 / 阻碍」。
    function Section(props) {
      const open = !!props.open;
      return h(
        'div',
        { className: 'daw-sec' + (open ? ' open' : ''), id: props.id },
        h(
          'button',
          { type: 'button', className: 'daw-sec-h', onClick: props.onToggle, 'aria-expanded': open },
          h('span', { className: 'daw-sec-x' }, open ? '▾' : '▸'),
          h('b', { className: 'daw-sec-t' }, props.title),
          props.count != null ? h('span', { className: 'daw-sec-n' }, String(props.count)) : null,
          props.brief ? h('span', { className: 'daw-sec-b' }, props.brief) : null,
          props.extra || null,
        ),
        open ? h('div', { className: 'daw-sec-body' }, props.children) : null,
      );
    }

    // 阻碍上的动作按钮。open-log / open-gate / open-pipeline 是真的能点的；
    // open-mailbox / open-settings 要跨到 Aris_Dsh 面板，没有公开 API（需求待定问题①），
    // 所以降级成「复制路径 + 提示去 Aris_Dsh」，不做点了没反应的假按钮。
    function ActionBtn(props) {
      const action = props.action;
      if (!action) return null;
      const soft = action.kind === 'open-mailbox' || action.kind === 'open-settings';
      return h(
        'button',
        {
          type: 'button',
          className: 'daw-act' + (soft ? ' soft' : ''),
          title: soft ? '复制路径，去 Aris_Dsh 面板操作' : action.label,
          onClick: (event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            props.onRun(action);
          },
        },
        action.label,
      );
    }
    const pct = (n) => `${Math.round(Math.max(0, Math.min(1, Number(n) || 0)) * 100)}%`;
    const money = (n) => `¥${(Number(n) || 0).toFixed(2)}`;

    function Rail(props) {
      const stages = props.stages || [];
      if (!stages.length) return h('div', { className: 'daw-rail' });
      return h(
        'div',
        { className: 'daw-rail' },
        stages.map((s, i) =>
          h('button', {
            key: s.id,
            type: 'button',
            className: 'daw-seg ' + (s.status || 'pending') + (props.activeId === s.id ? ' on' : '') + (props.onPick ? ' click' : ''),
            title: (i + 1) + '. ' + s.id + ' · ' + stText(s.status) + (s.title ? ' · ' + s.title : '') + (s.doneCount != null ? ' · 已执行 ' + s.doneCount + ' · 待做 ' + s.todoCount : ''),
            onClick: props.onPick
              ? (event) => {
                  if (event && event.stopPropagation) event.stopPropagation();
                  if (event && event.preventDefault) event.preventDefault();
                  props.onPick(s);
                }
              : undefined,
          }),
        ),
      );
    }

    function Kpi(props) {
      return h(
        'div',
        { className: 'daw-kpi' },
        h('div', { className: 'daw-kpi-k' }, props.k),
        h('div', { className: 'daw-kpi-v' + (props.cls ? ' ' + props.cls : '') }, props.v),
        props.note ? h('div', { className: 'daw-kpi-n' }, props.note) : null,
      );
    }

    function nowLineOf(c) {
      const nd = c.nowDoing || {};
      if (nd.running) {
        return '本轮 ' + ft(nd.startedAt) + ' 起 · 已跑 ' + fmtDur(nd.elapsedMin) + ' · ' + nd.steps + '/' + (nd.callsMax || '-') + ' 步 · 上下文 ' + pct(nd.ctxPct);
      }
      if (nd.startedAt) return '上一轮 ' + ft(nd.startedAt) + ' 起 · ' + fmtDur(nd.elapsedMin) + ' · ' + nd.steps + ' 步';
      return '还没有执行记录';
    }

    // 卡片本体不能用 <button> 包 <button>：内层 rail 的按钮在 button 里是非法嵌套，
    // 浏览器把点击算给外层，rail 就看起来「点不动」。改成 div + role=button。
    function PipeCard(props) {
      const c = props.card;
      const budget = c.budget || { ctxPct: 0, steps: 0 };
      const st = stOf(c);
      const pend = c.pending || { count: 0 };
      return h(
        'div',
        {
          className: 'daw-card' + (c.human ? ' human' : ''),
          role: 'button',
          tabIndex: 0,
          onClick: () => props.onPick(c.name),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              props.onPick(c.name);
            }
          },
        },
        h(
          'div',
          { className: 'daw-card-h' },
          h('span', { className: 'daw-dot ' + st }),
          h('b', null, c.name),
          h('span', { className: 'daw-badge ' + st }, c.statusLabel || stText(st)),
          c.human ? h('span', { className: 'daw-badge human' }, '需人工') : null,
          pend.count ? h('span', { className: 'daw-badge review' }, '等回件 ' + pend.count) : null,
        ),
        h(
          'div',
          { className: 'daw-card-sub' },
          (c.stageIndex || 0) + '/' + (c.stageTotal || 0) + ' · ' + (c.stageTitle || c.stageId || '-') + (c.state ? ' · ' + c.state : ''),
        ),
        h(Rail, { stages: c.stages || [], onPick: (s) => props.onPick(c.name, s.id) }),
        h('div', { className: 'daw-card-now' }, nowLineOf(c)),
        h(
          'div',
          { className: 'daw-meters' },
          h('div', { className: 'daw-meter' }, h('span', null, '上下文'), h('i', null, h('b', { style: { width: pct(budget.ctxPct) } }))),
          h('span', { className: 'daw-mv' }, pct(budget.ctxPct)),
          h('div', { className: 'daw-meter' }, h('span', null, '步数'), h('i', null, h('b', { style: { width: pct(budget.steps / 60) } }))),
          h('span', { className: 'daw-mv' }, String(budget.steps || 0)),
        ),
        h(
          'div',
          { className: 'daw-card-f' },
          '轮 ' + c.totals.runs + ' · ' + money(c.totals.cny) + ' · 门禁 ' + c.gates.done + '/' + c.gates.total +
            (c.blockers ? ' · 阻碍 ' + c.blockers : '') +
            (c.nextAt && c.statusKey !== 'running' ? ' · 下轮 ' + ft(c.nextAt) : ''),
        ),
        c.topBlocker
          ? h('div', { className: 'daw-card-b' }, sevIcon(c.topBlocker.severity) + ' ' + c.topBlocker.text)
          : null,
        c.error ? h('div', { className: 'daw-card-b' }, c.error) : null,
      );
    }

    // ---- 2026-11 新增：图表（纯 HTML+CSS / 纯 SVG，不引第三方库） ----
    const PALETTE = ['rgba(2,132,199,.85)', 'rgba(13,148,136,.85)', 'rgba(217,119,6,.85)', 'rgba(220,38,38,.8)', 'rgba(124,58,237,.6)', 'rgba(127,127,127,.55)'];

    const moneyShort = (n) => {
      const v = Number(n) || 0;
      if (Math.abs(v) >= 100) return '¥' + Math.round(v);
      return '¥' + v.toFixed(2);
    };

    // 阶段 id 前缀推导父子层级：S3 → S3.2 → S3.2.1（没有点号的 id 全部算第一层）。

    // 表格/图表里的圆点：把数据层的状态词收敛成 CSS 里定义过的那几个类。
    const dotCls = (status) => {
      const k = String(status || '');
      if (k === 'done') return 'done';
      if (k === 'in_progress') return 'in_progress';
      if (k === 'review' || k === 'human') return k;
      if (k === 'failed' || k === 'error' || k === 'blocked') return 'error';
      if (k === 'paused' || k === 'stopped') return 'paused';
      if (k === 'running' || k === 'stopping') return 'running';
      return 'pending';
    };

    const kv = (k, v, wide) =>
      h('div', { className: 'daw-kv' + (wide ? ' wide' : '') }, h('i', null, k), h('span', null, v == null || v === '' ? '—' : String(v)));

    function BarChart(props) {
      const items = (props.items || []).filter((it) => it && Number.isFinite(Number(it.value)));
      if (!items.length) return h('div', { className: 'daw-empty' }, props.empty || '没有数据。');
      const fmt = typeof props.fmt === 'function' ? props.fmt : moneyShort;
      const vals = items.map((it) => Number(it.value));
      const total = vals.reduce((a, b) => a + b, 0);
      const top = Math.max.apply(null, vals);
      const avg = total / vals.length;
      const max = Math.max(top, 0.0001);
      const bw = Math.max(4, Math.min(16, Number(props.barWidth) || 14));
      return h(
        'div',
        { className: 'daw-chartbox' },
        h('div', { className: 'daw-chartbox-h' }, h('b', null, props.title || '柱状图'), props.note ? h('span', null, props.note) : null),
        h(
          'div',
          { className: 'daw-chart' },
          h('div', { className: 'daw-yax' }, [max, max / 2, 0].map((t, i) => h('span', { key: 'y' + i }, fmt(t)))),
          h(
            'div',
            { className: 'daw-plot' },
            h(
              'div',
              { className: 'daw-plot-in', style: { '--bw': bw + 'px' } },
              h('i', { className: 'daw-avg', style: { top: 100 - (avg / max) * 100 + '%' } }, h('b', null, '均 ' + fmt(avg))),
              items.map((it, i) =>
                h(
                  'div',
                  {
                    key: 'b' + i,
                    className: 'daw-bar' + (Number(it.value) === top && top > 0 ? ' hi' : ''),
                    title: (it.title || it.label || '') + '：' + fmt(it.value),
                  },
                  h('i', { style: { height: Math.max(2, (Number(it.value) / max) * 100) + '%' } }),
                ),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'daw-chart-s' },
          '合计 ' + fmt(total) + ' · 均值 ' + fmt(avg) + ' · 最高 ' + fmt(top) + ' · 共 ' + items.length + ' 项',
        ),
      );
    }

    function Donut(props) {
      const segs = (props.segs || []).filter((s) => Number(s.value) > 0);
      if (!segs.length) return h('div', { className: 'daw-note-i' }, '还没有可归集的结论。');
      const total = segs.reduce((a, s) => a + Number(s.value), 0);
      const R = 38;
      const C = 2 * Math.PI * R;
      let acc = 0;
      return h(
        'div',
        { className: 'daw-donut' },
        h(
          'svg',
          { viewBox: '0 0 100 100', width: 116, height: 116, role: 'img', 'aria-label': props.title || '分布图' },
          h('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: 'rgba(127,127,127,.16)', strokeWidth: 16 }),
          segs.map((s, i) => {
            const len = (Number(s.value) / total) * C;
            const color = s.color || PALETTE[i % PALETTE.length];
            const arc = h('circle', {
              key: 'a' + i,
              cx: 50,
              cy: 50,
              r: R,
              fill: 'none',
              stroke: color,
              strokeWidth: 16,
              strokeDasharray: len + ' ' + (C - len),
              strokeDashoffset: -acc,
              transform: 'rotate(-90 50 50)',
            });
            acc += len;
            return arc;
          }),
        ),
        h(
          'div',
          { className: 'daw-lg' },
          segs.map((s, i) =>
            h(
              'div',
              { key: 'l' + i, className: 'daw-lg-i' },
              h('span', { className: 'daw-sw', style: { background: s.color || PALETTE[i % PALETTE.length] } }),
              h('span', null, String(s.label)),
              h('b', null, String(s.value)),
              h('span', { style: { opacity: 0.55 } }, ' · ' + Math.round((Number(s.value) / total) * 100) + '%'),
            ),
          ),
        ),
      );
    }

    // 页签级错误边界：某个页签渲染抛错只废这一块，其余页签照常，且能原地重试。
    class TabBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { err: null, seq: 0 };
        this.retry = this.retry.bind(this);
      }
      static getDerivedStateFromError(err) {
        return { err: err || new Error('渲染失败') };
      }
      componentDidCatch(err, info) {
        try {
          console.error('[aris-wiki] tab render failed', err, info);
        } catch (e) {
          /* 忽略 */
        }
      }
      retry() {
        this.setState((prev) => ({ err: null, seq: (prev.seq || 0) + 1 }));
      }
      render() {
        if (this.state.err) {
          const err = this.state.err;
          return h(
            'div',
            { className: 'daw-err2' },
            h('b', null, '这个页签渲染失败，其余页签不受影响'),
            this.props.label ? h('div', { className: 'daw-note-i' }, '页签：' + this.props.label) : null,
            h('pre', null, String((err && (err.stack || err.message)) || err)),
            h('div', null, h('button', { type: 'button', className: 'daw-btn', onClick: this.retry }, '重试')),
          );
        }
        return h(React.Fragment, { key: this.state.seq }, this.props.children);
      }
    }

    const OV_FILTERS = [
      { key: 'all', label: '全部' },
      { key: 'running', label: '在跑' },
      { key: 'human', label: '需人工' },
      { key: 'stopped', label: '已停止' },
    ];
    const STOPPED_KEYS = ['stopped', 'paused', 'error', 'blocked', 'idle', 'done'];

    const verdictSegs = (pipes) => {
      const map = {};
      (pipes || []).forEach((c) => {
        const v = (c.lastRun && c.lastRun.verdict) || '';
        if (!v) return;
        map[v] = (map[v] || 0) + 1;
      });
      return Object.keys(map)
        .map((k) => ({ label: k, value: map[k] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    };

    const reviewText = (c) => {
      const pend = c.pending || { count: 0 };
      const lr = c.lastRun || {};
      if (pend.count) return '在途 ' + pend.count;
      if (lr.verdict) return '上轮运行 · '+String(lr.verdict);
      return '未送审';
    };

    // 总览：八格 KPI + 筛选 + 一张总表，点行在表格下方展开详情（不是行内展开）。
    function OverviewTab(props) {
      const all = props.planAll;
      const [filter, setFilter] = React.useState('all');
      const [q, setQ] = React.useState('');
      const [view, setView] = React.useState('table');
      const [pick, setPick] = React.useState('');
      const [results,setResults]=React.useState({});
      React.useEffect(()=>{
        if(!all)return;
        let alive=true;
        const queue=(all.pipelines||[]).filter((p)=>!props.scope||p.name===props.scope).slice();
        const read=async()=>{
          while(alive && queue.length){
            const p=queue.shift();
            try{
              const data=await getJson('/api/aris-wiki/plan?name='+encodeURIComponent(p.name));
              const event=(data.timeline||[]).filter((e)=>e.kind==='review').sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
              if(alive)setResults((prev)=>({...prev,[p.name]:event?String(event.text||'—').replace(/^审查回件\s*·\s*/, '').replace(/\b(accept|revise|reject)\b/g,(k)=>({accept:'通过',revise:'需修改',reject:'退回'})[k]):'—'}));
            }catch(e){if(alive)setResults((prev)=>({...prev,[p.name]:'读取失败'}))}
          }
        };
        for(let i=0,count=Math.min(3,queue.length);i<count;i++)read();
        return ()=>{alive=false};
      },[all,props.scope]);
      if (!all) return h('div', { className: 'daw-empty' }, tr('loading'));
      const sum = all.summary || {};
      const pipes = (all.pipelines || []).filter((p)=>!props.scope||p.name===props.scope);
      const ql = String(q || '').trim().toLowerCase();
      const inFilter = (c) => {
        const k = stOf(c);
        if (filter === 'running') return k === 'running' || k === 'stopping';
        if (filter === 'human') return !!c.human;
        if (filter === 'stopped') return STOPPED_KEYS.indexOf(k) >= 0;
        return true;
      };
      const hit = (c) => {
        if (!ql) return true;
        const hay = [c.name, c.id, c.driver, c.statusLabel, c.stageId, c.stageTitle, c.state, c.human ? '需人工' : '', c.topBlocker ? c.topBlocker.text : '']
          .join(' ')
          .toLowerCase();
        return hay.indexOf(ql) >= 0;
      };
      const rows = pipes.filter((c) => inFilter(c) && hit(c));
      const counts = {
        all: pipes.length,
        running: pipes.filter((c) => stOf(c) === 'running' || stOf(c) === 'stopping').length,
        human: pipes.filter((c) => !!c.human).length,
        stopped: pipes.filter((c) => STOPPED_KEYS.indexOf(stOf(c)) >= 0).length,
      };
      const sel = rows.filter((c) => c.name === pick)[0] || null;

      const rowsJsx = rows.map((c) => {
        const st = stOf(c);
        const pend = c.pending || { count: 0 };
        const tot = c.totals || { runs: 0, cny: 0, todayRuns: 0, todayCny: 0 };
        const on = sel && sel.name === c.name;
        return h(
          'tr',
          { key: c.id || c.name, className: 'clk' + (on ? ' on' : ''), onClick: () => setPick(on ? '' : c.name) },
          h(
            'td',
            null,
            h(
              'div',
              { className: 'daw-st' },
              h('span', { className: 'daw-dot ' + dotCls(st) }),
              h('span', null, c.statusLabel || stText(st)),
              c.human ? h('span', { className: 'daw-badge human' }, '人工') : null,
            ),
          ),
          h(
            'td',
            null,
            h('div', { className: 'daw-cell2' }, h('b', null, c.name), h('small', null, (c.driver || 'aris') + (c.state ? ' · ' + c.state : ''))),
          ),
          h(
            'td',
            null,
            h(
              'div',
              { className: 'daw-cell2' },
              h(Rail, { stages: c.stages || [], activeId: c.stageId }),
              h('small', null, (c.stageIndex || 0) + '/' + (c.stageTotal || 0) + ' · ' + (c.stageTitle || c.stageId || '-')),
            ),
          ),
          h(
            'td',
            null,
            h(
              'div',
              { className: 'daw-cell2' },
              h('span', null, nowLineOf(c)),
              h('small', null, (c.stageId || '-') + ' · ' + (c.nextAt ? '下轮 ' + ft(c.nextAt) : '无下轮')),
            ),
          ),
          h('td', null, (c.gates ? c.gates.done : 0) + '/' + (c.gates ? c.gates.total : 0)),
          h('td', null, c.blockers ? h('span', { className: 'daw-bnum on' }, String(c.blockers)) : h('span', { className: 'daw-bnum' }, '0')),
          h('td', null, reviewText(c),h('div',{className:'daw-note-i'},'最近回件 · '+(results[c.name]||'…'))),
          h(
            'td',
            null,
            h('div', { className: 'daw-cell2' }, h('span', null, money(tot.todayCny)), h('small', null, '累计 ' + money(tot.cny) + ' · ' + tot.runs + ' 轮')),
          ),
          h('td', null, st === 'running' ? '在跑' : c.nextAt ? ft(c.nextAt) : '—'),
        );
      });

      const detail = sel
        ? (() => {
            const st = stOf(sel);
            const pend = sel.pending || { count: 0 };
            const tot = sel.totals || { runs: 0, cny: 0, todayRuns: 0, todayCny: 0 };
            return h(
              'div',
              { className: 'daw-detail' },
              h(
                'div',
                { className: 'daw-detail-h' },
                h('span', { className: 'daw-dot ' + dotCls(st) }),
                h('b', null, sel.name),
                h('span', { className: 'daw-badge' }, sel.driver || 'aris'),
                h('span', { className: 'daw-badge ' + st }, sel.statusLabel || stText(st)),
                sel.human ? h('span', { className: 'daw-badge human' }, '需人工') : null,
                h('button', { type: 'button', className: 'daw-mini', onClick: () => props.onOpen(sel.name, 'plan') }, '打开完整计划 →'),
                h('button', { type: 'button', className: 'daw-mini', onClick: () => props.onOpen(sel.name, 'arts') }, '看产物'),
                h('button', { type: 'button', className: 'daw-mini', onClick: () => setPick('') }, '收起'),
              ),
              h(Rail, {
                stages: sel.stages || [],
                activeId: sel.stageId,
                onPick: () => props.onOpen(sel.name, 'plan'),
              }),
              h(
                'div',
                { className: 'daw-sc-kv' },
                kv('阶段', (sel.stageIndex || 0) + '/' + (sel.stageTotal || 0) + ' · ' + (sel.stageTitle || sel.stageId || '-')),
                kv('现在', nowLineOf(sel), true),
                kv('门禁', (sel.gates ? sel.gates.done : 0) + '/' + (sel.gates ? sel.gates.total : 0)),
                kv('回件', pend.count ? '在途 ' + pend.count + (pend.over ? ' · 超阈值' : '') : '无在途审稿'),
                kv('阻碍', String(sel.blockers || 0)),
                kv('审核', reviewText(sel)), kv('最近审核结果',results[sel.name]||'…'),
                kv('成本', '今日 ' + money(tot.todayCny) + ' · 累计 ' + money(tot.cny)),
                kv('轮次', tot.runs + ' 轮（今日 ' + (tot.todayRuns || 0) + '）'),
                kv('下轮', sel.nextAt ? ft(sel.nextAt) : '—'),
                kv('驱动', sel.driver || 'aris'),
                kv('状态', sel.state || stText(st)),
              ),
              sel.topBlocker ? h('div', { className: 'daw-note-i' }, sevIcon(sel.topBlocker.severity) + ' 首要阻碍：' + sel.topBlocker.text) : null,
              sel.error ? h('div', { className: 'daw-err2' }, '归集错误：' + String(sel.error)) : null,
            );
          })()
        : null;

      return h(
        'div',
        { className: 'daw-page' },
        props.scope?h('div',{className:'daw-note-i'},'全局运行统计'):null,
        h(
          'div',
          { className: 'daw-kpis daw-kpis8' },
          h(Kpi, { k: '在跑', v: (sum.running || 0) + ' / ' + (sum.total || 0), note: '流水线 ' + (sum.total || 0) + ' 条', cls: 'run' }),
          h(Kpi, { k: '需人工', v: String(sum.human || 0), note: '阻碍 ' + (sum.blocked || 0) + ' 条', cls: sum.human ? 'err' : '' }),
          h(Kpi, { k: '等审核', v: String(sum.review || 0), note: '在途审稿', cls: 'warn' }),
          h(Kpi, { k: '等回件', v: String(sum.waiting || 0), note: '审稿未回', cls: 'warn' }),
          h(Kpi, { k: '今日轮数', v: String(sum.todayRuns || 0), note: '今日成本 ' + money(sum.todayCny) }),
          h(Kpi, { k: '今日成本', v: money(sum.todayCny), note: '当日累计', cls: 'ok' }),
          h(Kpi, { k: '累计', v: (sum.totalRuns || 0) + ' 轮', note: '累计 ' + money(sum.totalCny) }),
          h(Kpi, { k: '阻碍', v: String(sum.blocked || 0), note: '需人工 ' + (sum.human || 0), cls: sum.blocked ? 'err' : '' }),
        ),
        h(
          'div',
          { className: 'daw-toolbar' },
          h(
            'div',
            { className: 'daw-chips' },
            OV_FILTERS.map((f) =>
              h(
                'button',
                { key: f.key, type: 'button', className: 'daw-chip' + (filter === f.key ? ' on' : ''), onClick: () => setFilter(f.key) },
                f.label,
                h('span', { className: 'daw-cn' }, String(counts[f.key])),
              ),
            ),
          ),
          h('input', { className: 'daw-search', placeholder: '搜流水线 / 驱动 / 阶段 / 阻碍…', value: q, onChange: (e) => setQ(e.target.value) }),
          h(
            'div',
            { className: 'daw-tgl' },
            [
              ['table', '表格'],
              ['cards', '卡片'],
            ].map((pair) => h('button', { key: pair[0], type: 'button', className: view === pair[0] ? 'on' : '', onClick: () => setView(pair[0]) }, pair[1])),
          ),
        ),
        view === 'cards'
          ? rows.length
            ? h('div', { className: 'daw-cards' }, rows.map((c) => h(PipeCard, { key: c.id || c.name, card: c, onPick: (n) => props.onOpen(n, 'plan') })))
            : h('div', { className: 'daw-empty' }, '没有匹配的流水线。')
          : h(
              'div',
              { className: 'daw-tblwrap' },
              h(
                'table',
                { className: 'daw-tbl2', style: { minWidth: '1180px' } },
                h(
                  'thead',
                  null,
                  h('tr', null, ['状态', '流水线', '阶段', '现在', '门禁', '阻碍', '审核', '成本（今日 / 累计）', '下轮'].map((t) => h('th', { key: t }, t))),
                ),
                h(
                  'tbody',
                  null,
                  rowsJsx.length ? rowsJsx : h('tr', null, h('td', { colSpan: 9 }, h('div', { className: 'daw-empty' }, '没有匹配的流水线。'))),
                ),
              ),
            ),
        detail,
        (all.errors || []).length ? h('div', { className: 'daw-note' }, all.errors.map((e) => e.name + '：' + e.error).join('；')) : null,
        h(
          'div',
          { className: 'daw-note' },
          '只读：数据来自各流水线的 state.json / runtime.json / costs.jsonl / meta.json。点行看详情，点「打开完整计划」进那一条；启停与门禁在 Aris_Dsh 面板。',
        ),
      );
    }

    // 计划详情：状态卡 → 阻碍（通栏表）→ 门禁（通栏表）→ 总计划（阶段树 + 11 阶段表）
    // → 当前阶段三栏步骤 → 最近轮次（成本柱状图 + 表）→ 时间线。各分节默认折叠。
    function PlanDetail(props) {
      const d = props.detail;
      const [openSec, setOpenSec] = React.useState({});
      const [openStage, setOpenStage] = React.useState({});
      const [sel, setSel] = React.useState('');
      const [log, setLog] = React.useState(null);
      const [toast, setToast] = React.useState('');
      const timer = React.useRef(0);

      const stages = (d && d.plan && d.plan.stages) || [];
      const gates = (d && d.plan && d.plan.gates) || [];
      const blockers = (d && d.blockers) || [];
      const curStage =
        stages.filter((s) => s.status === 'in_progress')[0] ||
        stages.filter((s) => s.status === 'done').slice(-1)[0] ||
        stages[0] ||
        null;

      const say = (msg) => {
        setToast(String(msg || ''));
        try {
          clearTimeout(timer.current);
        } catch (e) {
          /* 忽略 */
        }
        timer.current = setTimeout(() => setToast(''), 2600);
      };

      // 换流水线 / 重新扫描后回到「全部收起」；从总览点某行进来时直接展开那一段。
      React.useEffect(() => {
        if (!d) return;
        const target = (props.focusStage && stages.filter((s) => s.id === props.focusStage)[0]) || null;
        if (target) {
          setOpenSec({ stages: true, cur: true });
          setOpenStage({ [target.id]: true });
          setSel(target.id);
        } else {
          setOpenSec({});
          setOpenStage({});
          setSel(curStage ? curStage.id : '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [d && d.scannedAt, props.focusStage]);

      // 日志抽屉：走只读的 file 路由读 .aris-run/runs/<runId>/*.log|final.txt。
      const logRel = log && log.rel;
      React.useEffect(() => {
        if (!logRel || !d) return undefined;
        let alive = true;
        const name = (d.pipeline && d.pipeline.name) || '';
        getJson('/api/aris-wiki/file?name=' + encodeURIComponent(name) + '&rel=' + encodeURIComponent(logRel) + '&t=' + Date.now())
          .then((body) => {
            if (!alive) return;
            if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
            setLog((prev) => ({ ...(prev || {}), rel: logRel, text: String(body.text || ''), busy: false, err: '' }));
          })
          .catch((e) => {
            if (alive) setLog((prev) => ({ ...(prev || {}), rel: logRel, text: '', busy: false, err: String((e && e.message) || e) }));
          });
        return () => {
          alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [logRel, d && d.pipeline && d.pipeline.name]);

      const copyText = (text) => {
        const value = String(text || '');
        if (!value) return Promise.resolve(false);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard
              .writeText(value)
              .then(() => true)
              .catch(() => false);
          }
        } catch (e) {
          /* 落到下面的兜底 */
        }
        try {
          const ta = document.createElement('textarea');
          ta.value = value;
          ta.setAttribute('readonly', 'readonly');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand && document.execCommand('copy');
          ta.remove();
          return Promise.resolve(!!ok);
        } catch (e) {
          return Promise.resolve(false);
        }
      };

      const scrollTo = (id) => {
        try {
          const el = document.getElementById(id);
          if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
        } catch (e) {
          /* 忽略 */
        }
      };

      const runAction = (action) => {
        if (!action || !d) return;
        const paths = d.paths || {};
        if (action.kind === 'open-log') {
          const rel = action.logRel || paths.logRel || '';
          if (!rel) {
            say('这条阻碍没有可读日志');
            return;
          }
          setLog({ rel, title: action.label || '日志', text: '', busy: true, err: '' });
          return;
        }
        if (action.kind === 'open-gate') {
          setOpenSec((prev) => ({ ...prev, gates: true }));
          const gid = action.target || '';
          setTimeout(() => scrollTo(gid ? 'daw-gate-' + gid : 'daw-sec-gates'), 60);
          say(gid ? '已展开门禁并定位到 ' + gid : '已展开门禁');
          return;
        }
        if (action.kind === 'open-pipeline') {
          scrollTo('daw-top');
          if (curStage) {
            setSel(curStage.id);
            setOpenSec((prev) => ({ ...prev, stages: true }));
            setOpenStage((prev) => ({ ...prev, [curStage.id]: true }));
          }
          say('已定位到当前阶段');
          return;
        }
        // open-mailbox / open-settings 要跳到 Aris_Dsh 面板，跨面板 API 尚未确定，
        // 降级：复制路径 + 明确告诉人去哪个面板操作，不做点了没反应的假按钮。
        const target = action.kind === 'open-mailbox' ? paths.mailbox : paths.settingsFile;
        copyText(target).then((ok) => say(ok ? '已复制路径，去 Aris_Dsh 面板操作：' + target : '请手动打开：' + target));
      };

      if (props.err) return h('div', { className: 'daw-empty' }, '读取计划失败：' + props.err);
      if (!d) return h('div', { className: 'daw-empty' }, tr('loading'));

      const now = d.now || {};
      const nd = now.nowDoing || {};
      const pend = now.pending || { count: 0 };
      const budget = d.budget || {};
      const totals = d.totals || { runs: 0, cny: 0, todayRuns: 0, todayCny: 0, wakes: 0 };
      const doneN = stages.filter((s) => s.status === 'done').length;
      const curN = stages.filter((s) => s.status === 'in_progress').length;
      const gDone = gates.filter((g) => g.status === 'done').length;
      const gPend = gates.filter((g) => g.status === 'pending').length;
      const hb = blockers.filter((b) => b.human).length;
      const hist = d.history || [];
      const tline = d.timeline || [];
      const scanAt = d.scannedAt || '';
      const paths = d.paths || {};

      const toggleSec = (key) => setOpenSec((prev) => ({ ...prev, [key]: !prev[key] }));
      const toggleStage = (id) => setOpenStage((prev) => ({ ...prev, [id]: !prev[id] }));
      const openAll = (on) => {
        const next = {};
        ['blocks', 'gates', 'stages', 'cur', 'hist', 'timeline'].forEach((k) => {
          next[k] = on;
        });
        setOpenSec(next);
        if (on) {
          const o = {};
          stages.forEach((s) => {
            o[s.id] = true;
          });
          setOpenStage(o);
        } else {
          setOpenStage({});
        }
      };

      const planRow = (it) =>
        h(
          'div',
          { key: 'p' + it.index, className: 'daw-planitem ' + (it.state || 'planned') },
          h('span', { className: 'daw-ck' }, it.state === 'done' ? '☑' : it.state === 'doing' ? '◐' : '☐'),
          h('span', { className: 'daw-planitem-t' }, it.text),
          it.sids && it.sids.length
            ? h('span', { className: 'daw-planitem-k', title: '对应状态机步骤：' + it.sids.join('、') }, it.sids.length + ' 步')
            : h('span', { className: 'daw-planitem-k none' }, '未开工'),
        );

      const stepRow = (it, kind, n) =>
        h(
          'div',
          { key: kind + (it.sid || it.full || n) + n, className: 'daw-step ' + kind },
          h('span', { className: 'daw-step-n' }, n),
          it.sid ? h('code', { className: 'daw-step-id' }, it.sid) : null,
          h('span', { className: 'daw-step-t', title: it.full || it.summary }, it.summary),
          it.alsoTodo ? h('span', { className: 'daw-step-badge' }, '仍挂在待做') : null,
          it.outputs && it.outputs.length ? h('span', { className: 'daw-step-o' }, it.outputs.join(' · ')) : null,
        );

      // 阶段体内的全部内容都直接展开（折叠交给上层的阶段行），不去掉任何一组。
      const stageBody = (s) => {
        const steps = s.steps || {};
        const done = steps.done || [];
        const todo = steps.todo || [];
        const external = steps.external || [];
        const planItems = s.planItems || [];
        return h(
          'div',
          { className: 'daw-stage-b' },
          s.enter || s.exit || s.exitNote
            ? h(
                'div',
                { className: 'daw-crit' },
                s.enter ? h('div', null, h('i', null, '进入 '), s.enter) : null,
                s.exit ? h('div', null, h('i', null, '退出 '), s.exit) : null,
                s.exitNote ? h('div', null, h('i', null, '备注 '), s.exitNote) : null,
              )
            : null,
          planItems.length
            ? h(
                'div',
                null,
                h('div', { className: 'daw-sub-h' }, '计划项（PIPELINE.md）· ' + planItems.length),
                h('div', { className: 'daw-steps' }, planItems.map(planRow)),
              )
            : null,
          todo.length
            ? h(
                'div',
                null,
                h('div', { className: 'daw-sub-h' }, '待做（自己能干）· ' + todo.length),
                h('div', { className: 'daw-steps' }, todo.map((it, k) => stepRow(it, 'todo', String(k + 1)))),
              )
            : null,
          external.length
            ? h(
                'div',
                null,
                h('div', { className: 'daw-sub-h' }, '等外部回件 · ' + external.length),
                h('div', { className: 'daw-steps' }, external.map((it, k) => stepRow(it, 'ext', String(k + 1)))),
              )
            : null,
          done.length
            ? h(
                'div',
                null,
                h('div', { className: 'daw-sub-h' }, '已完成步骤 · ' + done.length),
                h('div', { className: 'daw-steps' }, done.map((it, k) => stepRow(it, 'ok', String(k + 1)))),
              )
            : null,
          !planItems.length && !done.length && !todo.length && !external.length ? h('div', { className: 'daw-empty' }, '这个阶段还没有记录。') : null,
        );
      };

      // 11 阶段表：一行一阶段，点行展开同一阶段的明细（表格下方追加一行，不破坏列宽）。
      const stageRows = stages.map((s, i) => {
        const isOpen = !!openStage[s.id];
        const planItems = s.planItems || [];
        const clip = (t, n) => { const x = String(t || '').replace(/\s+/g, ' '); return x.length > (n || 46) ? x.slice(0, n || 46) + '…' : x; };
        const donePlans = planItems.filter((it) => it.state === 'done').length;
        const steps = s.steps || {};
        return h(
          React.Fragment,
          { key: s.id },
          h(
            'tr',
            { id: 'daw-stage-' + s.id, className: 'clk' + (sel === s.id ? ' on' : '') + (s.status === 'in_progress' ? ' cur' : ''), onClick: () => { setSel(s.id); toggleStage(s.id); } },
            h('td', null, h('span', { className: 'daw-stage-i' }, String(i + 1).padStart(2, '0') + ' '), h('code', { className: 'daw-tid' }, s.id)),
            h('td', { className: 'wrap' }, h('div', { className: 'daw-st' }, h('span', { className: 'daw-dot ' + dotCls(s.status) }), h('b', null, s.title || ''))),
            h('td', null, h('span', { className: 'daw-badge' }, stText(s.status))),
            h('td', null, '计划 ' + donePlans + '/' + planItems.length + ' · 已执行 ' + (steps.done || []).length + ' · 待做 ' + (steps.todo || []).length),
            h('td', { className: 'wrap', title: s.enter || '' }, clip(s.enter) || '—'),
            h('td', { className: 'wrap', title: [s.exit, s.exitNote].filter(Boolean).join(' · ') }, clip([s.exit, s.exitNote].filter(Boolean).join(' · ')) || '—'),
          ),
          isOpen ? h('tr', { key: s.id + '-b' }, h('td', { colSpan: 6, style: { padding: 0 } }, stageBody(s))) : null,
        );
      });

      const col = (label, list, kind) =>
        h(
          'div',
          { className: 'daw-col b' },
          h('div', { className: 'daw-col-h' }, label + ' · ' + list.length),
          list.length
            ? h('div', { className: 'daw-steps' }, list.map((it, k) => stepRow(it, kind, String(k + 1))))
            : h('div', { className: 'daw-note-i' }, '没有。'),
        );

      const statusCard = h(
        'div',
        { className: 'daw-sc', id: 'daw-top' },
        h(
          'div',
          { className: 'daw-sc-h' },
          h('b', { className: 'daw-sc-n' }, (d.pipeline && d.pipeline.name) || props.name || ''),
          h('span', { className: 'daw-badge' }, (d.pipeline && d.pipeline.driver) || 'aris'),
          h('span', { className: 'daw-badge ' + stOf(now) }, now.statusLabel || stText(stOf(now))),
          d.human ? h('span', { className: 'daw-badge human' }, '需人工') : null,
          pend.count ? h('span', { className: 'daw-badge review' }, '等回件 ' + pend.count) : null,
          h('span', { className: 'daw-note-i' }, '只读'),
          h('span', { className: 'daw-note-i' }, 'runId ' + (now.runId || '未运行') + (now.pid ? ' · pid ' + now.pid : '')),
        ),
        h(Rail, { stages: stages, activeId: sel || (curStage && curStage.id) }),
        h(
          'div',
          { className: 'daw-sc-kv' },
          kv('阶段', (now.stageIndex || 0) + '/' + (now.stageTotal || 0) + ' · ' + (now.stageTitle || now.stageId || '-') + (now.state ? ' · ' + now.state : '')),
          kv(
            '现在',
            nd.running
              ? '本轮 ' + ft(nd.startedAt) + ' 起 · 已跑 ' + fmtDur(nd.elapsedMin) + ' · 步数 ' + nd.steps + '/' + (nd.callsMax || '-') + ' · 上下文 ' + pct(nd.ctxPct)
              : nd.startedAt
                ? '上一轮 ' + ft(nd.startedAt) + ' 开始，历时 ' + fmtDur(nd.elapsedMin) + ' · 步数 ' + nd.steps + ' · 上下文 ' + pct(nd.ctxPct)
                : '还没有执行记录',
            true,
          ),
          kv('上下文', pct(budget.ctxPct != null ? budget.ctxPct : nd.ctxPct) + ' · 步数 ' + (budget.steps != null ? budget.steps : nd.steps || 0)),
          kv('回件', pend.count ? '在途 ' + pend.count + ' 条 · 最久 ' + fmtDur(pend.ageMin) + (pend.over ? ' · 超阈值' : '') : '无在途审稿'),
          kv('门禁', gDone + '/' + gates.length + (gPend ? '（待做 ' + gPend + '）' : '')),
          kv('累计', '轮 ' + totals.runs + ' · ' + money(totals.cny)),
          kv('今日', totals.todayRuns + ' 轮 · ' + money(totals.todayCny)),
          kv('唤醒', String(totals.wakes || 0) + ' 次'),
          kv('下轮', now.nextAt ? ft(now.nextAt) : '—'),
          kv('扫描', scanAt ? ftFull(scanAt) : '—'),
          kv('根目录', paths.root || '—', true),
          d.narrative ? kv('叙述', String(d.narrative), true) : null,
        ),
      );

      return h(
        'div',
        { className: 'daw-stack' },
        statusCard,
        h(
          'div',
          { className: 'daw-secbar' },
          h('button', { type: 'button', className: 'daw-mini', onClick: () => openAll(true) }, '展开全部'),
          h('button', { type: 'button', className: 'daw-mini', onClick: () => openAll(false) }, '收起全部'),
          h('span', { className: 'daw-note-i' }, '共 ' + stages.length + ' 阶段（完成 ' + doneN + ' · 进行 ' + curN + ' · 未开始 ' + (stages.length - doneN - curN) + '）'),
        ),
        h(
          Section,
          {
            title: '阻碍',
            count: blockers.length,
            brief: blockers.length ? (hb ? '其中 ' + hb + ' 条需人工' : '都不需要人') : '没有阻碍',
            open: !!openSec.blocks,
            onToggle: () => toggleSec('blocks'),
            id: 'daw-sec-blocks',
          },
          blockers.length
            ? h(
                'div',
                { className: 'daw-tblwrap' },
                h(
                  'table',
                  { className: 'daw-tbl2', style: { minWidth: '920px' } },
                  h('thead', null, h('tr', null, ['严重度', '类型', '需人工', '说明', '证据', '动作'].map((t) => h('th', { key: t }, t)))),
                  h(
                    'tbody',
                    null,
                    blockers.map((b, i) =>
                      h(
                        'tr',
                        { key: 'b' + i },
                        h(
                          'td',
                          null,
                          h('span', { className: 'daw-badge ' + (b.severity === 'error' ? 'human' : b.severity === 'warn' ? 'review' : '') }, sevIcon(b.severity) + ' ' + String(b.severity || 'info')),
                        ),
                        h('td', null, String(b.kind || '—')),
                        h('td', null, b.human ? '是' : '否'),
                        h('td', { className: 'wrap' }, String(b.text || '')),
                        h('td', { className: 'wrap' }, b.evidence ? String(b.evidence) : '—'),
                        h('td', null, b.action ? h(ActionBtn, { action: b.action, onRun: runAction }) : '—'),
                      ),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'daw-empty' }, '没有阻碍。'),
        ),
        h(
          Section,
          {
            title: '门禁',
            count: gates.length,
            brief: gDone + ' 已裁 · ' + gPend + ' 待做',
            open: !!openSec.gates,
            onToggle: () => toggleSec('gates'),
            id: 'daw-sec-gates',
          },
          gates.length
            ? h(
                'div',
                { className: 'daw-tblwrap' },
                h(
                  'table',
                  { className: 'daw-tbl2', style: { minWidth: '860px' } },
                  h('thead', null, h('tr', null, ['门禁', '状态', '裁决', '判据', '实测', '完成于'].map((t) => h('th', { key: t }, t)))),
                  h(
                    'tbody',
                    null,
                    gates.map((g) =>
                      h(
                        'tr',
                        { key: g.id, id: 'daw-gate-' + g.id },
                        h('td', null, h('code', { className: 'daw-tid' }, g.id)),
                        h('td', null, h('span', { className: 'daw-badge' }, g.status === 'done' ? '已裁' : g.status === 'pending' ? '待做' : String(g.status))),
                        h('td', null, g.decision ? String(g.decision) : '—'),
                        h('td', { className: 'wrap' }, g.criteria || '—'),
                        h('td', { className: 'wrap' }, g.observed ? (typeof g.observed === 'string' ? g.observed : JSON.stringify(g.observed)) : '—'),
                        h('td', null, g.completed ? ft(g.completed) : '—'),
                      ),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'daw-empty' }, '这条流水线没有登记门禁。'),
        ),
        h(
          Section,
          {
            title: '总计划',
            count: stages.length,
            brief: '11 阶段表；点行展开条件 / 计划项 / 待做 / 已完成',
            open: !!openSec.stages,
            onToggle: () => toggleSec('stages'),
            id: 'daw-sec-stages',
          },
          h(
            'div',
            { className: 'daw-stack' },
            h(
              'div',
              { className: 'daw-tblwrap' },
              h(
                'table',
                { className: 'daw-tbl2', style: { minWidth: '900px' } },
                h('thead', null, h('tr', null, ['阶段', '标题', '状态', '完成', '进入条件', '退出'].map((t) => h('th', { key: t }, t)))),
                h('tbody', null, stages.length ? stageRows : h('tr', null, h('td', { colSpan: 6 }, h('div', { className: 'daw-empty' }, '没有阶段数据。')))),
              ),
            ),
          ),
        ),
        h(
          Section,
          {
            title: '当前阶段',
            brief: curStage ? curStage.id + ' · ' + (curStage.title || '') : '没有阶段数据',
            open: !!openSec.cur,
            onToggle: () => toggleSec('cur'),
            id: 'daw-sec-cur',
          },
          curStage
            ? h(
                'div',
                { className: 'daw-stack' },
                h(
                  'div',
                  { className: 'daw-cols3' },
                  col('已完成步骤', (curStage.steps && curStage.steps.done) || [], 'ok'),
                  col('待办步骤', (curStage.steps && curStage.steps.todo) || [], 'todo'),
                  col('外部等待', (curStage.steps && curStage.steps.external) || [], 'ext'),
                ),
                curStage.enter || curStage.exit || curStage.exitNote
                  ? h(
                      'div',
                      { className: 'daw-crit' },
                      curStage.enter ? h('div', null, h('i', null, '进入 '), curStage.enter) : null,
                      curStage.exit ? h('div', null, h('i', null, '退出 '), curStage.exit) : null,
                      curStage.exitNote ? h('div', null, h('i', null, '备注 '), curStage.exitNote) : null,
                    )
                  : null,
                (curStage.planItems || []).length
                  ? h(
                      'div',
                      null,
                      h('div', { className: 'daw-sub-h' }, '计划项（PIPELINE.md）· ' + curStage.planItems.length),
                      h('div', { className: 'daw-steps' }, curStage.planItems.map(planRow)),
                    )
                  : null,
                h('div', { className: 'daw-note-i' }, '点「总计划」里的同一行可展开这一阶段的完整明细（条件 / 计划项 / 已完成步骤都在里面）。'),
              )
            : h('div', { className: 'daw-empty' }, '没有阶段数据'),
        ),
        h(
          Section,
          {
            title: '最近轮次',
            count: Math.min(8, hist.length),
            brief: '每轮成本柱状图 + 步数 / 成本 / 结论',
            open: !!openSec.hist,
            onToggle: () => toggleSec('hist'),
            id: 'daw-sec-hist',
          },
          hist.length
            ? h(
                'div',
                { className: 'daw-stack' },
                h(BarChart, {
                  title: '每轮成本',
                  note: '细柱 ≤16px · 虚线=均值 · 轮次多时横向滚动',
                  items: hist.map((it) => ({
                    label: String(it.runId).slice(-5),
                    value: Number(it.cny) || 0,
                    title: '#' + String(it.runId).slice(-13) + ' · ' + ft(it.start),
                  })),
                  fmt: moneyShort,
                }),
                h(
                  'div',
                  { className: 'daw-tblwrap' },
                  h(
                    'table',
                    { className: 'daw-tbl2', style: { minWidth: '760px' } },
                    h('thead', null, h('tr', null, ['轮次', '开始', '步数', '成本', '结论', '退出码'].map((t) => h('th', { key: t }, t)))),
                    h(
                      'tbody',
                      null,
                      hist.slice(0, 8).map((it) =>
                        h(
                          'tr',
                          { key: it.runId },
                          h('td', { title: it.runId }, String(it.runId).slice(-13)),
                          h('td', null, ft(it.start)),
                          h('td', null, String(it.steps)),
                          h('td', null, money(it.cny)),
                          h('td', null, it.verdict || '—'),
                          h('td', null, it.exit != null && it.exit !== '' ? String(it.exit) : '—'),
                        ),
                      ),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'daw-empty' }, '还没有执行记录。'),
        ),
        h(
          Section,
          {
            title: '进展时间线',
            count: tline.length,
            brief: '轮次 / 审查回件 / 门禁裁决，按时间倒序',
            open: !!openSec.timeline,
            onToggle: () => toggleSec('timeline'),
            id: 'daw-sec-timeline',
          },
          tline.length
            ? h(
                'div',
                { className: 'daw-tblwrap' },
                h(
                  'table',
                  { className: 'daw-tbl2', style: { minWidth: '720px' } },
                  h('thead', null, h('tr', null, ['时间', '类型', '严重度', '内容'].map((t) => h('th', { key: t }, t)))),
                  h(
                    'tbody',
                    null,
                    tline.map((it, i) =>
                      h(
                        'tr',
                        { key: 'tl' + i },
                        h('td', null, ft(it.at)),
                        h('td', null, it.kind === 'run' ? '轮次' : it.kind === 'review' ? '审查' : it.kind === 'gate' ? '门禁' : String(it.kind || '—')),
                        h('td', null, h('span', { className: 'daw-tl-k ' + (it.severity || '') }, it.severity || '—')),
                        h('td', { className: 'wrap' }, String(it.text || '') + (it.detail ? ' · ' + it.detail : '')),
                      ),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'daw-empty' }, '没有时间线记录。'),
        ),
        log
          ? h(
              'div',
              { className: 'daw-drawer' },
              h(
                'div',
                { className: 'daw-drawer-h' },
                h('b', null, log.title || '日志'),
                h('code', { className: 'daw-drawer-r' }, log.rel || ''),
                h('button', { type: 'button', className: 'daw-mini', onClick: () => setLog(null) }, '关闭'),
              ),
              log.busy ? h('div', { className: 'daw-note-i' }, '正在读取…') : null,
              log.err ? h('div', { className: 'daw-err2' }, '读取失败：' + log.err) : null,
              !log.busy && !log.err ? h('pre', { className: 'daw-pre' }, log.text || '（空文件）') : null,
            )
          : null,
        toast ? h('div', { className: 'daw-toast' }, toast) : null,
      );
    }

    function PlanTab(props) {
      const pipes = props.pipes || [];
      const [sel, setSel] = React.useState(props.initial || '');
      const [focus, setFocus] = React.useState('');
      const [detail, setDetail] = React.useState(null);
      const [err, setErr] = React.useState('');
      const name = sel || (pipes[0] && pipes[0].name) || '';

      // 总览里「打开完整计划 →」带过来的名字。
      React.useEffect(() => {
        if (!props.initial || props.initial === sel) return;
        setSel(props.initial);
        setFocus('');
      }, [props.initial]);

      React.useEffect(() => {
        if (!name) {
          setDetail(null);
          setErr('');
          return undefined;
        }
        let alive = true;
        setDetail(null);
        setErr('');
        getJson('/api/aris-wiki/plan?name=' + encodeURIComponent(name) + '&t=' + Date.now())
          .then((body) => {
            if (!alive) return;
            if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
            setDetail(body);
          })
          .catch((e) => alive && setErr(String((e && e.message) || e)));
        return () => {
          alive = false;
        };
      }, [name]);

      return h(
        'div',
        { className: 'daw-page' },
        name
          ? h(PlanDetail, { detail: detail, err: err, focusStage: focus, name: name })
          : h('div', { className: 'daw-empty' }, '还没有登记任何 ARIS 流水线。'),
      );
    }

    // 产物：左侧文件表（限高内滚 + 表头吸顶 + 点行选中）+ 右侧预览；中间分隔条可拖。
    const IMG_RE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;
    const splitKey = 'daw-arts-split';
    const readSplit = () => {
      try {
        const v = parseInt(localStorage.getItem(splitKey) || '', 10);
        if (Number.isFinite(v)) return Math.min(760, Math.max(240, v));
      } catch (e) {
        /* 忽略 */
      }
      return 360;
    };

    function ArtsTab(props) {
      const pipes = props.pipes || [];
      const [name, setName] = React.useState(props.initial || (pipes[0] && pipes[0].name) || '');
      const [data, setData] = React.useState(null);
      const [err, setErr] = React.useState('');
      const [sel, setSel] = React.useState('');
      const [pv, setPv] = React.useState(null);
      const [w, setW] = React.useState(readSplit);
      const [dragging, setDragging] = React.useState(false);
      const [narrow, setNarrow] = React.useState(false);
      const [toast, setToast] = React.useState('');
      const wrapRef = React.useRef(null);
      const timer = React.useRef(0);

      const say = (msg) => {
        setToast(String(msg || ''));
        try {
          clearTimeout(timer.current);
        } catch (e) {
          /* 忽略 */
        }
        timer.current = setTimeout(() => setToast(''), 2200);
      };

      React.useEffect(() => {
        if (!props.initial || props.initial === name) return;
        setName(props.initial);
        setSel('');
        setPv(null);
      }, [props.initial]);

      // 窄屏（<900px）退单列；窗口缩放时跟着变。
      React.useEffect(() => {
        const onResize = () => setNarrow(window.innerWidth < 900);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      React.useEffect(() => {
        if (!name) {
          setData(null);
          return undefined;
        }
        let alive = true;
        setData(null);
        setErr('');
        getJson('/api/aris-wiki/artifacts?name=' + encodeURIComponent(name) + '&t=' + Date.now())
          .then((body) => {
            if (!alive) return;
            if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
            setData(body);
            const first = body.main && body.main.rel ? body.main.rel : '';
            setSel(first);
          })
          .catch((e) => alive && setErr(String((e && e.message) || e)));
        return () => {
          alive = false;
        };
      }, [name]);

      // 预览：只读地拿一份文件内容（文本截断 / 二进制走 dataUrl）。
      React.useEffect(() => {
        if (!sel || !name) {
          setPv(null);
          return undefined;
        }
        let alive = true;
        setPv({ rel: sel, loading: true });
        getJson('/api/aris-wiki/file?name=' + encodeURIComponent(name) + '&rel=' + encodeURIComponent(sel) + '&t=' + Date.now())
          .then((body) => {
            if (!alive) return;
            if (!body) throw new Error('空响应');
            if (body.error) throw new Error(String(body.error));
            setPv({ rel: sel, ...body, loading: false });
          })
          .catch((e) => alive && setPv({ rel: sel, loading: false, error: String((e && e.message) || e) }));
        return () => {
          alive = false;
        };
      }, [sel, name]);

      // 拖分隔条：宽度写进 localStorage，双击复位。
      React.useEffect(() => {
        if (!dragging) return undefined;
        const move = (e) => {
          const box = wrapRef.current && wrapRef.current.getBoundingClientRect ? wrapRef.current.getBoundingClientRect() : null;
          if (!box) return;
          setW(Math.min(760, Math.max(240, Math.round(e.clientX - box.left))));
        };
        const up = () => {
          setDragging(false);
          setW((v) => {
            try {
              localStorage.setItem(splitKey, String(v));
            } catch (e) {
              /* 忽略 */
            }
            return v;
          });
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
        };
      }, [dragging]);

      const resetSplit = () => {
        setW(360);
        try {
          localStorage.removeItem(splitKey);
        } catch (e) {
          /* 忽略 */
        }
        say('已复位分栏宽度');
      };

      const copyText = (text) => {
        const value = String(text || '');
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(
              () => say('已复制路径'),
              () => say('复制失败：' + value),
            );
            return;
          }
        } catch (e) {
          /* 落到兜底 */
        }
        try {
          const ta = document.createElement('textarea');
          ta.value = value;
          ta.setAttribute('readonly', 'readonly');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand && document.execCommand('copy');
          ta.remove();
          say('已复制路径');
        } catch (e) {
          say('请手动复制：' + value);
        }
      };

      const openFile = () => {
        const cur = pv || {};
        try {
          if (cur.dataUrl) {
            const win = window.open(cur.dataUrl, '_blank');
            if (!win) say('浏览器拦截了新窗口，请允许弹窗');
            return;
          }
          if (cur.text != null) {
            const url = URL.createObjectURL(new Blob([String(cur.text)], { type: 'text/plain;charset=utf-8' }));
            const win = window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            if (!win) say('浏览器拦截了新窗口，请允许弹窗');
            return;
          }
        } catch (e) {
          say('打开失败：' + String((e && e.message) || e));
          return;
        }
        say('还没有可打开的内容');
      };

      const files = [];
      ((data && data.groups) || []).forEach((g) => {
        (g.files || []).forEach((f) => {
          files.push({ ...f, gid: g.id, glabel: g.label || g.id });
        });
      });
      const selFile = files.filter((f) => f.rel === sel)[0] || null;
      const tot = (data && data.totals) || { files: 0, bytes: 0 };
      const mainPaper = data && data.main;

      const previewBody = () => {
        if (!pv || pv.loading) {
          return h('div', { className: 'daw-skel' }, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => h('i', { key: 's' + i })));
        }
        if (pv.error) return h('div', { className: 'daw-err2' }, '预览失败：' + pv.error);
        if (pv.dataUrl) {
          if (/^application\/pdf/i.test(pv.mime || '') || /\.pdf$/i.test(pv.rel || '')) {
            return h('iframe', {
              className: 'daw-prev-pdf',
              src: pv.dataUrl,
              title: pv.rel || 'PDF 预览',
            });
          }
          if (/^image\//i.test(pv.mime || '') || IMG_RE.test(pv.rel || '')) {
            return h('img', { className: 'daw-prev-img', src: pv.dataUrl, alt: pv.rel || '图片产物' });
          }
          return h('div', { className: 'daw-prev-page' }, h('b', null, '二进制文件'), h('span', null, String(pv.mime || '未知类型')), h('span', null, '点「打开原文件」查看'));
        }
        const text = String(pv.text == null ? '' : pv.text);
        return h(
          'div',
          null,
          h('pre', { className: 'daw-prev-text' }, text || '（空文件）'),
          pv.truncated ? h('div', { className: 'daw-hint' }, '文件较长，面板只显示前一段；完整内容点「打开原文件」。') : null,
        );
      };

      return h(
        'div',
        { className: 'daw-page' },
        h(
          'div',
          { className: 'daw-toolbar' },
          h('span', { className: 'daw-note-i' }, data ? '根目录 ' + (data.root || '—') : ''),
        ),
        err ? h('div', { className: 'daw-err2' }, '读取产物失败：' + err) : null,
        data
          ? h(
              'div',
              { className: 'daw-stack' },
              h(
                'div',
                { className: 'daw-kpis' },
                h(Kpi, { k: '文件', v: String(tot.files || 0), note: '分组 ' + ((data.groups || []).length + ' 组') }),
                h(Kpi, { k: '体积', v: fmtSize(tot.bytes), note: '扫描 ' + (data.generatedAt ? ft(data.generatedAt) : '—') }),
                h(Kpi, { k: '丢弃', v: String((data.warnings || []).length), note: '超限 / 读失败提示' }),
                h(Kpi, { k: '主稿', v: mainPaper ? mainPaper.label || mainPaper.tex || '已定位' : '无', note: mainPaper ? fmtSize(mainPaper.size) : '没找到主稿' }),
              ),
              mainPaper && mainPaper.rel
                ? h(
                    'div',
                    { className: 'daw-sc' },
                    h(
                      'div',
                      { className: 'daw-sc-h' },
                      h('b', { className: 'daw-sc-n' }, mainPaper.name || mainPaper.rel),
                      h('span', { className: 'daw-badge' }, '主稿'),
                      mainPaper.tex ? h('span', { className: 'daw-badge' }, 'TeX') : null,
                      h('span', { className: 'daw-note-i' }, fmtSize(mainPaper.size) + ' · ' + ft(mainPaper.mtime)),
                      h('button', { type: 'button', className: 'daw-mini', onClick: () => { setSel(mainPaper.rel); } }, '在预览里打开'),
                    ),
                    h('div', { className: 'daw-prev-p' }, mainPaper.rel),
                  )
                : null,
              h(
                'div',
                { className: 'daw-split3' + (narrow ? ' narrow' : ''), ref: wrapRef, style: { '--daw-splitw': w + 'px' } },
                h(
                  'div',
                  { className: 'daw-ftable' },
                  h(
                    'table',
                    { className: 'daw-tbl2', style: { minWidth: '420px' } },
                    h('thead', null, h('tr', null, ['分类 / 路径', '大小', '修改时间'].map((t) => h('th', { key: t }, t)))),
                    h(
                      'tbody',
                      null,
                      files.length
                        ? (data.groups || []).reduce((acc, g) => {
                            if (!(g.files || []).length) {
                              acc.push(
                                h(
                                  'tr',
                                  { key: 'g0' + g.id, className: 'grp' },
                                  h('td', { colSpan: 3 }, (g.label || g.id) + ' · 0 个文件' + (g.searched === false ? '（没扫这个目录）' : '')),
                                ),
                              );
                              return acc;
                            }
                            acc.push(h('tr', { key: 'g1' + g.id, className: 'grp' }, h('td', { colSpan: 3 }, (g.label || g.id) + ' · ' + g.count + ' 个 · ' + fmtSize(g.bytes))));
                            g.files.forEach((f) =>
                              acc.push(
                                h(
                                  'tr',
                                  {
                                    key: g.id + f.rel,
                                    className: 'clk' + (sel === f.rel ? ' on' : ''),
                                    onClick: () => setSel(f.rel),
                                    title: f.rel,
                                  },
                                  h('td', null, h('div', { className: 'daw-cell2' }, h('b', null, f.name), h('small', null, f.rel))),
                                  h('td', { className: 'num' }, fmtSize(f.size)),
                                  h('td', { className: 'num' }, ft(f.mtime)),
                                ),
                              ),
                            );
                            return acc;
                          }, [])
                        : h('tr', null, h('td', { colSpan: 3 }, h('div', { className: 'daw-empty' }, '这条流水线还没有产物。'))),
                    ),
                  ),
                ),
                narrow ? null : h('button', {
                  type: 'button',
                  className: 'daw-splitbar' + (dragging ? ' on' : ''),
                  title: '拖动调整宽度，双击复位',
                  onMouseDown: (e) => {
                    e.preventDefault();
                    setDragging(true);
                  },
                  onDoubleClick: resetSplit,
                }),
                h(
                  'div',
                  { className: 'daw-prev' },
                  h('div', { className: 'daw-prev-h' }, selFile ? selFile.name : sel ? String(sel).split('/').pop() : '选一个文件看预览'),
                  selFile
                    ? h(
                        'div',
                        { className: 'daw-prev-m' },
                        h('span', null, fmtSize(selFile.size)),
                        h('span', null, ft(selFile.mtime)),
                        selFile.glabel ? h('span', null, selFile.glabel) : null,
                        h('button', { type: 'button', className: 'daw-mini', onClick: resetSplit, title: '双击分隔条也能复位' }, '复位分栏'),
                      )
                    : null,
                  sel ? h('div', { className: 'daw-prev-p' }, sel) : h('div', { className: 'daw-hint' }, '左边点一行，这里显示大小 / 时间 / 路径与内容。'),
                  sel ? previewBody() : null,
                  h(
                    'div',
                    { className: 'daw-prev-f' },
                    h('button', { type: 'button', className: 'daw-btn', disabled: !sel, onClick: openFile }, '打开原文件'),
                    h('button', { type: 'button', className: 'daw-btn', disabled: !sel, onClick: () => copyText(sel) }, '复制路径'),
                    h('span', { className: 'daw-hint' }, '只读：不写、不删、不改产物'),
                  ),
                ),
              ),
              (data.warnings || []).length ? h('div', { className: 'daw-note' }, '扫描提示：' + data.warnings.join('；')) : null,
              h('div', { className: 'daw-note-i' }, '产物来自 ' + (data.driver || 'aris') + ' 驱动；表格在限高容器里内滚，表头吸顶。'),
            )
          : err
            ? null
            : h('div', { className: 'daw-empty' }, tr('loading')),
        toast ? h('div', { className: 'daw-toast' }, toast) : null,
      );
    }

    const TABS = [
      ['overview', '总览'],
      ['plan', '计划'],
      ['arts', '产物'],
      ['docs', '文档'],
    ];

    function WikiPanel() {
      const [tab, setTab] = React.useState('overview');
      const [planAll, setPlanAll] = React.useState(null);
      const [err, setErr] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      // 从总览跳进计划/产物时带上的流水线名 + 序号（同一名字连点也能重新定位）。
      const [focus, setFocus] = React.useState({ name: '', seq: 0 });

      const load = React.useCallback(() => {
        setBusy(true);
        setErr('');
        getJson('/api/aris-wiki/plan?name=all&t=' + Date.now())
          .then((body) => {
            if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
            setPlanAll(body);
          })
          .catch((e) => setErr(String((e && e.message) || e)))
          .then(() => setBusy(false));
      }, []);

      React.useEffect(() => {
        load();
      }, [load]);

      const pipes = (planAll && planAll.pipelines) || [];
      const onOpen = (name, next) => {
        selectRange(name || '');
        setTab(next || 'plan');
      };
      const selected=pipes.find((p)=>p.name===focus.name);
      const initial=selected?selected.name:'';
      const single=tab==='plan'||tab==='arts';
      const current=initial||(single&&pipes.length?pipes[0].name:'');
      const [docRange,setDocRange]=React.useState('all');
      const selectRange=(name)=>{
        const p=pipes.find((p)=>p.name===name);
        setDocRange(p?'project:'+p.id:'all');
        setFocus({name,seq:Date.now()});
      };
      const counts = {
        overview: pipes.length,
        plan: pipes.length,
      };

      const body =
        tab === 'overview'
          ? h(OverviewTab, { planAll: planAll, onOpen: onOpen, scope:initial })
          : tab === 'plan'
            ? h(PlanTab, { key:current, pipes: pipes, initial: current })
            : tab === 'arts'
              ? h(ArtsTab, { key:current, pipes: pipes, initial: current })
              : h(DocsPanel,{initial:docRange,label:initial,onScope:(key)=>{
                setDocRange(key);const p=pipes.find((p)=>'project:'+p.id===key||'src:'+p.name===key);
                setFocus((prev)=>({...prev,name:p?p.name:''}));
              }});

      const label = (TABS.filter((p) => p[0] === tab)[0] || [tab, tab])[1];

      return h(
        'div',
        { className: 'daw' },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('style', { dangerouslySetInnerHTML: { __html: CSS2 } }),
        h('style', { dangerouslySetInnerHTML: { __html: CSS3 } }),
        h('style', { dangerouslySetInnerHTML: { __html: CSS4 } }),
        h(
          'div',
          { className: 'daw-head' },
          h(
            'div',
            null,
            h('h2', { className: 'daw-title' }, T.title || 'Aris_Wiki'),
            h('div', { className: 'daw-sub' }, '只读：计划与进展、论文产物、知识库文档。写操作（启停 / 门禁 / 编译）在 Aris_Dsh。'),
          ),
          h(
            'div',
            { className: 'daw-head-r' },
            planAll && planAll.scannedAt ? h('span', { className: 'daw-note-i' }, '扫描 ' + ft(planAll.scannedAt)) : null,
            h('span', { className: 'daw-note-i' }, '只读'),
            h('button', { type: 'button', className: 'daw-btn', disabled: busy, onClick: load }, busy ? '刷新中…' : tr('refresh')),
          ),
        ),
        h(
          'div',
          { className: 'daw-tabs' },
          TABS.map((pair) =>
            h(
              'button',
              { key: pair[0], type: 'button', className: 'daw-tab' + (tab === pair[0] ? ' on' : ''), onClick: () => setTab(pair[0]) },
              pair[1],
              counts[pair[0]] ? h('span', { className: 'daw-tab-n' }, String(counts[pair[0]])) : null,
            ),
          ),
        ),
        tab!=='docs'?h('label',{className:'daw-scope'},'流水线范围　',
          h('select',{value:current,onChange:(e)=>selectRange(e.target.value)},
            single?null:h('option',{value:''},'全部流水线'),
            pipes.map((p)=>h('option',{key:p.name,value:p.name},p.name)))):null,
        err
          ? h(
              'div',
              { className: 'daw-err' },
              h('span', null, '无法连接知识库宿主：' + err + '（宿主重载后才有 /plan、/artifacts 路由）'),
              h('button', { type: 'button', className: 'daw-btn', onClick: load }, '重试'),
            )
          : null,
        // 每个页签各自兜底：一个页签渲染抛错不牵连其它页签，且能原地重试。
        h('div', { className: 'daw-body' }, h(TabBoundary, { key: tab + '-' + focus.seq, label: label }, body)),
      );
    }


    function WikiIcon(props) {
      const active = Boolean(props && props.active);
      const size = (props && props.size) || 24;
      const stroke = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor';
      return h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke,
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', opacity: active ? 1 : 0.72 },
        },
        h('path', { d: 'M4 4.8c2.2-1 4.4-1 6.6 0v12.4c-2.2-1-4.4-1-6.6 0z' }),
        h('path', { d: 'M13.4 4.8c1.4-.64 2.8-.85 4.2-.64' }),
        h('circle', { cx: 16.4, cy: 12.4, r: 3.2 }),
        h('path', { d: 'M18.8 14.8 21 17' }),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        try {
          const bound = ctx.locale.bind(NS);
          if (typeof bound === 'function') tr = (key) => {
            const text = bound(key);
            return text && text !== key ? text : T[key] || key;
          };
        } catch {
          /* keep the built-in fallback */
        }
        ctx.slots.inject('main', () =>
          ctx.slots.inject('sidebar.panellist', () => {
            // 侧栏标题写死：locale thunk 在本机取不到词条，会退化成键名 "title"。
            const stopIcon = ctx.slots.register(
              { name: 'sidebar.panellist', id: 'aris-wiki', order: 21, label: () => 'Aris_Wiki', locale: NS },
              (props) => h(WikiIcon, props),
            );
            const stopPanel = ctx.slots.register({ name: 'main', key: 'aris-wiki', locale: NS }, () => h(WikiPanel));
            return () => {
              try {
                stopPanel && stopPanel();
              } catch {
                /* ignore */
              }
              try {
                stopIcon && stopIcon();
              } catch {
                /* ignore */
              }
            };
          }),
        );
      },
    };
  },
});
