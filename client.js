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
.daw{padding:18px 18px 14px;margin:0;display:flex;flex-direction:column;gap:10px;flex:1 1 auto;align-self:stretch;width:100%;min-width:0;min-height:0;height:100%;box-sizing:border-box;font-size:13px;line-height:1.65;color:var(--dsw-alias-label-primary,inherit);background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));border-radius:16px;box-shadow:0 2px 14px rgba(0,0,0,.06);overflow:hidden}
.daw h2{margin:0;font-size:16px;font-weight:600;letter-spacing:.01em}
.daw h3{margin:0;font-size:14px;font-weight:600}
.daw-sub{margin:2px 0 0;font-size:12.5px;opacity:.62}
.daw-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;padding:0 4px 10px;border-bottom:1px solid rgba(127,127,127,.18)}
.daw-head>div:first-child{flex:1 1 auto;min-width:220px}
.daw-btn{cursor:pointer;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;font:inherit;font-size:12.5px;line-height:20px;padding:3px 12px}
.daw-btn:hover:not(:disabled){border-color:rgba(127,127,127,.65);background:rgba(127,127,127,.08)}
.daw-btn:disabled{opacity:.5;cursor:default}
.daw-stats{font-size:12px;opacity:.72;padding:0 4px;font-variant-numeric:tabular-nums}
.daw-ctrl{display:flex;flex-direction:column;gap:8px;padding:0 4px}
.daw-search{width:100%;box-sizing:border-box;font:inherit;font-size:13px;line-height:22px;padding:5px 10px;border-radius:8px;border:1px solid rgba(127,127,127,.4);background:transparent;color:inherit;outline:none}
.daw-search:focus{border-color:rgba(127,127,127,.75)}
.daw-chips{display:flex;gap:6px;flex-wrap:wrap}
.daw-chip{cursor:pointer;border-radius:999px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;font:inherit;font-size:12px;line-height:18px;padding:2px 10px}
.daw-chip:hover{border-color:rgba(127,127,127,.6)}
.daw-chip.on{border-color:rgba(127,127,127,.75);background:rgba(127,127,127,.16);font-weight:600}
.daw-docs{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:10px}
.daw-split{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(280px,38%) 1fr;gap:12px}
.daw-list,.daw-reader{min-height:0;overflow-y:auto;overscroll-behavior:contain}
.daw-list{display:flex;flex-direction:column;gap:8px;padding:2px}
.daw-tabs{display:flex;gap:4px;flex-wrap:wrap;align-items:flex-end;border-bottom:1px solid rgba(127,127,127,.22);margin:6px 0 10px}
.daw-tab{font:inherit;font-size:12.5px;color:inherit;background:transparent;border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;padding:6px 10px;cursor:pointer;display:flex;gap:6px;align-items:center;opacity:.68;margin-bottom:-1px}
.daw-tab:hover{opacity:1}
.daw-tab.on{opacity:1;font-weight:600;border-color:rgba(127,127,127,.28);background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.08))}
.daw-tab-n{font-size:11px;opacity:.62;font-variant-numeric:tabular-nums}
.daw-sec{font-size:11.5px;font-weight:600;letter-spacing:.02em;opacity:.62;padding:6px 2px 0;border-top:1px solid rgba(127,127,127,.18);margin-top:4px}
.daw-sec:first-child{border-top:0;margin-top:0;padding-top:0}
.daw-item{text-align:left;font:inherit;color:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.22));border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.05))}
.daw-item:hover{border-color:rgba(127,127,127,.5)}
.daw-item.on{border-color:rgba(127,127,127,.7);background:rgba(127,127,127,.13)}
.daw-item-t{font-size:13px;font-weight:600;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.daw-item-m{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px;font-size:11px;opacity:.62;font-variant-numeric:tabular-nums}
.daw-tag{border:1px solid rgba(127,127,127,.35);border-radius:5px;padding:0 5px;font-size:10.5px;white-space:nowrap}
.daw-rel{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.daw-item-x{margin-top:5px;font-size:12px;opacity:.7;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.daw-reader{padding:2px 2px 2px 12px;border-left:1px solid rgba(127,127,127,.18)}
.daw-reader-h{padding:0 0 10px;margin-bottom:10px;border-bottom:1px solid rgba(127,127,127,.18)}
.daw-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;opacity:.6;word-break:break-all;margin-top:2px}
.daw-meta{font-size:11px;opacity:.55;margin-top:3px}
.daw-note{margin:0 0 10px;padding:6px 10px;border-radius:8px;border:1px dashed rgba(127,127,127,.45);font-size:12px;opacity:.85}
.daw-empty{display:flex;align-items:center;justify-content:center;min-height:160px;height:100%;padding:24px;text-align:center;font-size:12.5px;opacity:.6;border:1px dashed rgba(127,127,127,.3);border-radius:10px}
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

    function DocsPanel() {
      const [items, setItems] = React.useState(null);
      const [err, setErr] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const [q, setQ] = React.useState('');
      const [group, setGroup] = React.useState('all');
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
      const inPipe = React.useMemo(
        () => list.filter((it) => group === 'all' || pipeKey(it) === group),
        [list, group],
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
      else if (kindKey === 'all' && kinds.length > 1) {
        // 未筛类型时按文件种类分节，节内仍按时间倒序
        const nodes = [];
        for (const [k, n] of kinds) {
          const its = filtered.filter((it) => it.group === k);
          if (!its.length) continue;
          nodes.push(h('div', { key: `sec-${k}`, className: 'daw-sec' }, `${GLABEL[k] || k} · ${n}`));
          for (const it of its) nodes.push(row(it));
        }
        listBody = nodes;
      } else listBody = filtered.map(row);

      let reader;
      if (docBusy) reader = h('div', { className: 'daw-empty' }, '正在读取正文…');
      else if (docErr)
        reader = h(
          'div',
          { className: 'daw-empty' },
          h('div', null, `读取失败：${docErr}`),
          h('button', { className: 'daw-btn', type: 'button', style: { marginTop: 10 }, onClick: () => open(sel) }, '重试'),
        );
      else if (doc)
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
        h(
          'div',
          { className: 'daw-tabs' },
          chips.map(([key, label, count]) =>
            h(
              'button',
              { key, type: 'button', className: `daw-tab${group === key ? ' on' : ''}`, onClick: () => { setGroup(key); setKindKey('all'); } },
              h('span', null, label),
              h('span', { className: 'daw-tab-n' }, String(count)),
            ),
          ),
        ),
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
.daw-kpi-k{font-size:11.5px;opacity:.6}
.daw-kpi-v{font-size:19px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.5}
.daw-kpi-n{font-size:11px;opacity:.55;font-variant-numeric:tabular-nums}
.daw-cards{flex:1 1 auto;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:10px;padding:2px 4px 6px;align-content:start}
.daw-card{text-align:left;font:inherit;color:inherit;background:transparent;cursor:pointer;border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:7px;min-width:0}
.daw-card:hover{border-color:rgba(127,127,127,.5);background:rgba(127,127,127,.05)}
.daw-card.human{border-left:3px solid var(--dsw-alias-state-error-primary,#b42318)}
.daw-card-h{display:flex;align-items:center;gap:7px;font-size:13px;min-width:0}
.daw-card-h b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.daw-card-r{margin-left:auto;font-size:11.5px;opacity:.6;white-space:nowrap;font-variant-numeric:tabular-nums}
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
.daw-card-f{font-size:11.5px;opacity:.66;font-variant-numeric:tabular-nums}
.daw-card-b{font-size:11.5px;opacity:.8;color:var(--dsw-alias-state-warning-primary,#b26a00);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.daw-gates{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;padding:0 4px}
.daw-gate{border:1px solid rgba(127,127,127,.2);border-radius:10px;padding:8px 10px;min-width:0}
.daw-gate.pending{border-style:dashed;border-color:rgba(127,127,127,.4)}
.daw-gate.fail{border-left:3px solid #b42318}
.daw-gate-h{display:flex;align-items:center;gap:6px;font-size:12.5px}
.daw-gate-h .daw-badge{margin-left:auto}
.daw-gate-c{font-size:11.5px;opacity:.7;margin-top:3px;word-break:break-word}
.daw-gate-o{font-size:11.5px;margin-top:3px;font-variant-numeric:tabular-nums;word-break:break-word}
.daw-cols{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 4px 6px}
.daw-col{min-height:0;display:flex;flex-direction:column;gap:6px;overflow:auto;border:1px solid rgba(127,127,127,.16);border-radius:12px;padding:8px 10px}
.daw-col-h{font-size:12px;opacity:.62;position:sticky;top:0;background:var(--dsw-alias-bg-base,#fff);padding:2px 0}
.daw-item2{border-top:1px dashed rgba(127,127,127,.18);padding-top:6px;font-size:12.5px}
.daw-item2:first-of-type{border-top:0}
.daw-item2-s{opacity:.62;font-size:11.5px;margin-top:2px;font-variant-numeric:tabular-nums}
.daw-blocks{display:flex;flex-direction:column;gap:6px;padding:0 4px}
.daw-block{border:1px solid rgba(127,127,127,.2);border-radius:10px;padding:7px 10px;font-size:12.5px;display:flex;gap:8px;align-items:flex-start}
.daw-block.error{border-left:3px solid #b42318}
.daw-block.warn{border-left:3px solid #b26a00}
.daw-block.info{border-left:3px solid rgba(127,127,127,.45)}
.daw-block-t{flex:1 1 auto;min-width:0}
.daw-block-e{font-size:11px;opacity:.6;font-family:ui-monospace,Menlo,monospace;word-break:break-all;margin-top:2px}
.daw-tbl{border-collapse:collapse;font-size:12px;width:100%;font-variant-numeric:tabular-nums}
.daw-tbl th,.daw-tbl td{border-bottom:1px solid rgba(127,127,127,.16);padding:4px 8px;text-align:left;white-space:nowrap}
.daw-tbl th{opacity:.6;font-weight:500}
.daw-arts{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(260px,34%) 1fr;gap:12px;padding:0 4px}
.daw-art-l{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:4px}
.daw-art-f{text-align:left;font:inherit;color:inherit;background:transparent;border:0;border-top:1px dashed rgba(127,127,127,.16);padding:5px 4px;cursor:pointer;font-size:12.5px;display:flex;gap:8px;align-items:baseline;min-width:0}
.daw-art-f:hover{background:rgba(127,127,127,.08)}
.daw-art-f.on{background:rgba(127,127,127,.14);font-weight:600}
.daw-art-f>span:first-child{flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daw-art-f>span:last-child{font-size:11px;opacity:.55;white-space:nowrap}
.daw-art-v{min-height:0;overflow:auto;border:1px solid rgba(127,127,127,.16);border-radius:12px;padding:8px 10px}
.daw-art-img{max-width:100%;display:block;margin:0 auto}
.daw-main{border:1px solid rgba(127,127,127,.24);border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 4px}
.daw-main-k{font-size:11.5px;opacity:.6}
.daw-main-n{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.daw-main-r{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
@media (max-width:900px){.daw-cols{grid-template-columns:1fr}.daw-arts{grid-template-columns:1fr}}


.daw-seg.click{cursor:pointer;border:0;padding:0}
.daw-seg.on{outline:2px solid currentColor;outline-offset:1px}
.daw-planhead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.daw-planhead-l,.daw-planhead-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.daw-note-i{opacity:.6;font-size:11.5px}
.daw-legend{font-size:11.5px;opacity:.65;line-height:1.6}
.daw-sech{display:flex;align-items:center;gap:8px;margin-top:4px}
.daw-sech b{font-size:13px}
.daw-mini{margin-left:auto;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;cursor:pointer}
.daw-stages{display:flex;flex-direction:column;gap:4px}
.daw-stage{border:1px solid rgba(127,127,127,.18);border-radius:8px;overflow:hidden}
.daw-stage.cur{border-color:rgba(200,120,0,.55)}
.daw-stage.sel{box-shadow:0 0 0 1px rgba(127,127,127,.25) inset}
.daw-stage-h{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:7px 10px;border:0;background:rgba(127,127,127,.05);color:inherit;cursor:pointer;font-size:12px}
.daw-stage-i{opacity:.5;font-variant-numeric:tabular-nums;font-size:11px}
.daw-stage-id{flex:0 0 auto}
.daw-stage-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.8}
.daw-stage-n{opacity:.55;font-size:11px;white-space:nowrap}
.daw-stage-x{opacity:.5;font-size:11px;white-space:nowrap}
.daw-stage-b{padding:8px 12px 10px;display:flex;flex-direction:column;gap:8px}
.daw-crit{font-size:11.5px;line-height:1.65;opacity:.85;display:flex;flex-direction:column;gap:2px}
.daw-crit i{opacity:.55;font-style:normal;margin-right:4px}
.daw-sub-h{font-size:11.5px;opacity:.6;margin-bottom:3px}
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
.daw-warn-t{color:var(--dsw-alias-state-warning-primary,#b26a00)}
.daw-secbar{display:flex;align-items:center;gap:6px;margin:2px 0}
.daw-secbar .daw-mini{margin-left:0}
.daw-sec{border:1px solid rgba(127,127,127,.18);border-radius:10px;overflow:hidden}
.daw-sec-h{display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:7px 10px;border:0;background:rgba(127,127,127,.05);color:inherit;cursor:pointer;font-size:12.5px}
.daw-sec-h:hover{background:rgba(127,127,127,.1)}
.daw-sec-x{opacity:.6;width:10px;flex:0 0 10px}
.daw-sec-t{flex:0 0 auto}
.daw-sec-n{font-size:11px;opacity:.6;font-variant-numeric:tabular-nums;padding:0 5px;border-radius:999px;background:rgba(127,127,127,.14)}
.daw-sec-b{font-size:11.5px;opacity:.55;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daw-sec-body{padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px}
.daw-grp{border-top:1px dashed rgba(127,127,127,.16);padding-top:4px}
.daw-grp:first-child{border-top:0;padding-top:0}
.daw-grp-h{display:flex;align-items:center;gap:7px;width:100%;text-align:left;border:0;background:transparent;color:inherit;cursor:pointer;font-size:11.5px;opacity:.85;padding:3px 0}
.daw-grp-h:hover{opacity:1}
.daw-steps{display:flex;flex-direction:column;gap:1px;padding:2px 0 2px 14px}
.daw-stage-h.cur{background:rgba(200,120,0,.08)}
.daw-step.ext .daw-step-t{color:var(--dsw-alias-state-warning-primary,#b26a00)}
.daw-step-badge{flex:0 0 auto;font-size:10px;padding:0 5px;border-radius:4px;border:1px solid rgba(127,127,127,.35);opacity:.75}
.daw-planitem-t{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.daw-planitem-k{flex:0 0 auto;font-size:10.5px;opacity:.55;font-variant-numeric:tabular-nums}
.daw-planitem-k.none{opacity:.35}
.daw-planitem.done .daw-planitem-k{color:#0f766e;opacity:.9}
.daw-planitem.done .daw-planitem-t{opacity:.75}
.daw-planitem.doing .daw-ck{color:var(--dsw-alias-state-warning-primary,#b26a00);opacity:1}
.daw-act{flex:0 0 auto;font-size:11.5px;padding:2px 9px;border-radius:999px;border:1px solid rgba(127,127,127,.45);background:transparent;color:inherit;cursor:pointer;white-space:nowrap}
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
        h('div', { className: 'daw-kpi-v' }, props.v),
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

    function PlanOverview(props) {
      const all = props.planAll;
      if (!all) return h('div', { className: 'daw-empty' }, tr('loading'));
      const sum = all.summary || {};
      return h(
        'div',
        { className: 'daw-plan' },
        h(
          'div',
          { className: 'daw-kpis' },
          h(Kpi, { k: '在跑', v: `${sum.running || 0} / ${sum.total || 0}`, note: `今日 ${sum.todayRuns || 0} 轮 · ${money(sum.todayCny)}` }),
          h(Kpi, { k: '累计', v: `${sum.totalRuns || 0} 轮`, note: money(sum.totalCny) }),
          h(Kpi, { k: '需人工', v: String(sum.human || 0), note: `阻碍 ${sum.blocked || 0} 条` }),
          h(Kpi, { k: '等回件', v: String(sum.waiting || 0), note: sum.review ? `${sum.review} 条流水线在等审核` : '没有在途审稿' }),
        ),
        (all.pipelines || []).length
          ? h('div', { className: 'daw-cards' }, all.pipelines.map((c) => h(PipeCard, { key: c.id || c.name, card: c, onPick: props.onPick })))
          : h('div', { className: 'daw-empty' }, '还没有登记任何 ARIS 流水线。'),
        (all.errors || []).length ? h('div', { className: 'daw-note' }, all.errors.map((e) => `${e.name}: ${e.error}`).join('；')) : null,
        h('div', { className: 'daw-note' }, '只读：数据来自各流水线的 state.json / runtime.json / costs.jsonl / meta.json。点卡片进详情，点阶段条定位到那一段；启停与门禁在 Aris_Dsh 面板。'),
      );
    }

    function PlanDetail(props) {
      const d = props.detail;
      const [openSec, setOpenSec] = React.useState({ cur: true, stages: true, blocks: true, gates: true });
      const [openStage, setOpenStage] = React.useState({});
      const [openGrp, setOpenGrp] = React.useState({});
      const [sel, setSel] = React.useState('');
      const [log, setLog] = React.useState(null);
      const [toast, setToast] = React.useState('');
      const timer = React.useRef(0);

      const stages = (d && d.plan && d.plan.stages) || [];
      const gates = (d && d.plan && d.plan.gates) || [];
      const blockers = (d && d.blockers) || [];
      const curStage =
        stages.find((s) => s.status === 'in_progress') ||
        stages.filter((s) => s.status === 'done').slice(-1)[0] ||
        stages[0] ||
        null;

      const say = (msg) => {
        setToast(String(msg || ''));
        try {
          clearTimeout(timer.current);
        } catch (e) {
          // 忽略
        }
        timer.current = setTimeout(() => setToast(''), 2600);
      };

      // 进详情时：默认只展开「当前阶段 / 阻碍 / 门禁」，其余收起；
      // 从概览点阶段条进来时直接定位到那一段（这曾是手册里承诺、代码里没做到的行为）。
      React.useEffect(() => {
        if (!d) return;
        setOpenSec({ cur: true, stages: true, blocks: blockers.length > 0, gates: gates.length > 0 });
        const focusId = props.focusStage;
        const target = (focusId && stages.find((s) => s.id === focusId)) || curStage;
        if (!target) return;
        setSel(target.id);
        setOpenStage({ [target.id]: true });
        setOpenGrp({
          [target.id + ':plan']: true,
          [target.id + ':todo']: true,
          [target.id + ':external']: true,
        });
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
            return navigator.clipboard.writeText(value).then(() => true).catch(() => false);
          }
        } catch (e) {
          // 落到下面的兜底
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
          // 忽略
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
            setOpenStage({ [curStage.id]: true });
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
      const doneN = stages.filter((s) => s.status === 'done').length;
      const curN = stages.filter((s) => s.status === 'in_progress').length;

      const toggleSec = (key) => setOpenSec((prev) => ({ ...prev, [key]: !prev[key] }));
      const toggleStage = (id) => setOpenStage((prev) => ({ ...prev, [id]: !prev[id] }));
      const isGrpOpen = (key, fallback) => (openGrp[key] === undefined ? !!fallback : !!openGrp[key]);
      const toggleGrp = (key, fallback) => setOpenGrp((prev) => ({ ...prev, [key]: !isGrpOpen(key, fallback) }));

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

      // 阶段体内按「条件 / 计划项 / 待做 / 等回件 / 已完成」分组，每组都能单独折叠。
      const stageBody = (s) => {
        const steps = s.steps || {};
        const done = steps.done || [];
        const todo = steps.todo || [];
        const external = steps.external || [];
        const planItems = s.planItems || [];
        const pick = (k) => s.id + ':' + k;
        const grp = (k, label, list, fallback, render) => {
          if (!list || !list.length) return null;
          const openGrpNow = isGrpOpen(pick(k), fallback);
          return h(
            'div',
            { className: 'daw-grp' + (openGrpNow ? ' open' : '') },
            h(
              'button',
              { type: 'button', className: 'daw-grp-h', onClick: () => toggleGrp(pick(k), fallback) },
              h('span', { className: 'daw-sec-x' }, openGrpNow ? '▾' : '▸'),
              h('b', null, label),
              h('span', { className: 'daw-sec-n' }, String(list.length)),
            ),
            openGrpNow ? render() : null,
          );
        };
        return h(
          'div',
          { className: 'daw-stage-b' },
          s.enter || s.exit || s.exitNote
            ? grp(
                'crit',
                '进入 / 退出条件',
                [1],
                false,
                () =>
                  h(
                    'div',
                    { className: 'daw-crit' },
                    s.enter ? h('div', null, h('i', null, '进入 '), s.enter) : null,
                    s.exit ? h('div', null, h('i', null, '退出 '), s.exit) : null,
                    s.exitNote ? h('div', null, h('i', null, '备注 '), s.exitNote) : null,
                  ),
              )
            : null,
          grp('plan', '计划项（PIPELINE.md）', planItems, true, () =>
            h('div', { className: 'daw-steps' }, planItems.map(planRow)),
          ),
          grp('todo', '待做（自己能干）', todo, true, () =>
            h('div', { className: 'daw-steps' }, todo.map((it, k) => stepRow(it, 'todo', String(k + 1)))),
          ),
          grp('external', '等外部回件', external, true, () =>
            h('div', { className: 'daw-steps' }, external.map((it, k) => stepRow(it, 'ext', String(k + 1)))),
          ),
          grp('done', '已完成步骤', done, false, () =>
            h('div', { className: 'daw-steps' }, done.map((it, k) => stepRow(it, 'ok', String(k + 1)))),
          ),
          !planItems.length && !done.length && !todo.length && !external.length
            ? h('div', { className: 'daw-empty' }, '这个阶段还没有记录。')
            : null,
        );
      };

      const stageHead = (s, always) => {
        const idx = stages.indexOf(s) + 1;
        const isOpen = always ? openStage[s.id] !== false : !!openStage[s.id];
        const steps = s.steps || {};
        const planItems = s.planItems || [];
        const donePlans = planItems.filter((it) => it.state === 'done').length;
        return h(
          'button',
          {
            type: 'button',
            className: 'daw-stage-h' + (s.status === 'in_progress' ? ' cur' : ''),
            onClick: () => (always ? toggleStage(s.id) : toggleStage(s.id)),
            'aria-expanded': isOpen,
          },
          h('span', { className: 'daw-stage-i' }, String(idx).padStart(2, '0')),
          h('span', { className: 'daw-dot ' + (s.status || 'pending') }),
          h('b', { className: 'daw-stage-id' }, s.id),
          h('span', { className: 'daw-stage-t' }, s.title || ''),
          h('span', { className: 'daw-badge' }, stText(s.status)),
          h('span', { className: 'daw-stage-n' }, '计划 ' + donePlans + '/' + planItems.length + ' · 待做 ' + (steps.todo || []).length),
          h('span', { className: 'daw-stage-x' }, isOpen ? '收起' : '展开'),
        );
      };

      const stageBlock = (s, always) => {
        const isOpen = always ? openStage[s.id] !== false : !!openStage[s.id];
        return h(
          'div',
          { key: s.id, className: 'daw-stage' + (s.status === 'in_progress' ? ' cur' : '') + (sel === s.id ? ' sel' : '') },
          stageHead(s, always),
          isOpen ? stageBody(s) : null,
        );
      };

      const statusLine = h(
        'div',
        { className: 'daw-now' },
        h(
          'div',
          { className: 'daw-now-i' },
          h('span', { className: 'daw-now-k' }, '状态'),
          h('span', { className: 'daw-badge ' + stOf(now) }, now.statusLabel || stText(stOf(now))),
        ),
        h(
          'div',
          { className: 'daw-now-i' },
          h('span', { className: 'daw-now-k' }, '阶段'),
          h('span', null, (now.stageIndex || 0) + '/' + (now.stageTotal || 0) + ' · ' + (now.stageTitle || now.stageId || '-') + (now.state ? ' · ' + now.state : '')),
        ),
        h(
          'div',
          { className: 'daw-now-i wide' },
          h('span', { className: 'daw-now-k' }, '现在'),
          h(
            'span',
            null,
            nd.running
              ? '本轮 ' + ft(nd.startedAt) + ' 起 · 已跑 ' + fmtDur(nd.elapsedMin) + ' · 步数 ' + nd.steps + '/' + (nd.callsMax || '-') + ' · 上下文 ' + pct(nd.ctxPct)
              : nd.startedAt
                ? '上一轮 ' + ft(nd.startedAt) + ' 开始，历时 ' + fmtDur(nd.elapsedMin) + ' · 步数 ' + nd.steps + ' · 上下文 ' + pct(nd.ctxPct)
                : '还没有执行记录',
          ),
        ),
        h(
          'div',
          { className: 'daw-now-i' },
          h('span', { className: 'daw-now-k' }, '回件'),
          h('span', { className: pend.over ? 'daw-warn-t' : null }, pend.count ? '在途 ' + pend.count + ' 条 · 最久 ' + fmtDur(pend.ageMin) + (pend.over ? ' · 超阈值' : '') : '无在途审稿'),
        ),
        h(
          'div',
          { className: 'daw-now-i' },
          h('span', { className: 'daw-now-k' }, '成本'),
          h(
            'span',
            null,
            '轮 ' + d.totals.runs + ' · ' + money(d.totals.cny) + ' · 今日 ' + d.totals.todayRuns + ' 轮 ' + money(d.totals.todayCny) +
              (now.nextAt && stOf(now) !== 'running' ? ' · 下轮 ' + ft(now.nextAt) : ''),
          ),
        ),
      );

      return h(
        'div',
        { className: 'daw-plan' },
        h(
          'div',
          { className: 'daw-planhead', id: 'daw-top' },
          h(
            'div',
            { className: 'daw-planhead-l' },
            h('b', null, d.pipeline.name),
            h('button', { type: 'button', className: 'daw-mini back', onClick: props.onBack }, '← 返回计划列表'),
            d.human ? h('span', { className: 'daw-badge human' }, '需人工') : null,
          ),
          h(
            'div',
            { className: 'daw-planhead-r' },
            h('span', { className: 'daw-note-i' }, 'runId ' + (now.runId || '未运行') + (now.pid ? ' · pid ' + now.pid : '')),
          ),
        ),
        statusLine,
        h(
          'div',
          { className: 'daw-secbar' },
          h('button', { type: 'button', className: 'daw-mini', onClick: () => setOpenSec({ cur: true, stages: true, blocks: true, gates: true, timeline: true, hist: true }) }, '展开全部'),
          h('button', { type: 'button', className: 'daw-mini', onClick: () => setOpenSec({}) }, '全部收起'),
          h('span', { className: 'daw-note-i' }, '共 ' + stages.length + ' 阶段（完成 ' + doneN + ' · 进行 ' + curN + ' · 未开始 ' + (stages.length - doneN - curN) + '）'),
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
          curStage ? h('div', { className: 'daw-stages' }, stageBlock(curStage, true)) : h('div', { className: 'daw-empty' }, '没有阶段数据'),
        ),
        h(
          Section,
          {
            title: '阻碍',
            count: blockers.length,
            brief: blockers.length ? (blockers.filter((b) => b.human).length ? '其中 ' + blockers.filter((b) => b.human).length + ' 条需人工' : '都不需要人') : '没有阻碍',
            open: !!openSec.blocks,
            onToggle: () => toggleSec('blocks'),
            id: 'daw-sec-blocks',
          },
          blockers.length
            ? h(
                'div',
                { className: 'daw-blocks' },
                blockers.map((b, i) =>
                  h(
                    'div',
                    { key: 'b' + i, className: 'daw-block ' + b.severity },
                    h(
                      'div',
                      { className: 'daw-block-t' },
                      h('div', null, h('span', { className: 'daw-block-k' }, sevIcon(b.severity) + ' ' + b.kind + (b.human ? ' · 需人工' : '')), '：' + b.text),
                      b.evidence ? h('div', { className: 'daw-block-e' }, b.evidence) : null,
                    ),
                    b.action ? h(ActionBtn, { action: b.action, onRun: runAction }) : null,
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
            brief: gates.filter((g) => g.status === 'done').length + ' 已裁 · ' + gates.filter((g) => g.status === 'pending').length + ' 待做',
            open: !!openSec.gates,
            onToggle: () => toggleSec('gates'),
            id: 'daw-sec-gates',
          },
          gates.length
            ? h(
                'div',
                { className: 'daw-gates' },
                gates.map((g) =>
                  h(
                    'div',
                    {
                      key: g.id,
                      id: 'daw-gate-' + g.id,
                      className: 'daw-gate ' + (g.status === 'fail' ? 'fail' : g.status === 'pending' ? 'pending' : ''),
                    },
                    h(
                      'div',
                      { className: 'daw-gate-h' },
                      h('b', null, g.id),
                      h('span', { className: 'daw-badge' }, g.status === 'done' ? '已裁' : g.status === 'pending' ? '待做' : g.status),
                      g.decision ? h('span', { className: 'daw-badge' }, String(g.decision)) : null,
                    ),
                    h('div', { className: 'daw-gate-c' }, g.criteria || ''),
                    g.observed ? h('div', { className: 'daw-gate-o' }, typeof g.observed === 'string' ? g.observed : JSON.stringify(g.observed)) : null,
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
            brief: '点阶段标题展开它的条件 / 计划项 / 待做 / 已完成',
            open: !!openSec.stages,
            onToggle: () => toggleSec('stages'),
            id: 'daw-sec-stages',
          },
          h('div', { className: 'daw-stages' }, stages.map((s) => stageBlock(s, false))),
        ),
        h(
          Section,
          {
            title: '进展时间线',
            count: (d.timeline || []).length,
            brief: '轮次 / 审查回件 / 门禁裁决，按时间倒序',
            open: !!openSec.timeline,
            onToggle: () => toggleSec('timeline'),
            id: 'daw-sec-timeline',
          },
          (d.timeline || []).length
            ? h(
                'div',
                { className: 'daw-tl' },
                d.timeline.map((it, i) =>
                  h(
                    'div',
                    { key: 'tl' + i, className: 'daw-tl-row ' + (it.severity || '') },
                    h(
                      'div',
                      { className: 'daw-tl-h' },
                      h('span', { className: 'daw-tl-t' }, ft(it.at)),
                      h('span', { className: 'daw-tl-k ' + (it.kind || '') }, it.kind === 'run' ? '轮次' : it.kind === 'review' ? '审查' : it.kind === 'gate' ? '门禁' : it.kind || '-'),
                      h('span', { className: 'daw-tl-x' }, it.text),
                    ),
                    it.detail ? h('div', { className: 'daw-tl-d', title: it.detail }, it.detail) : null,
                  ),
                ),
              )
            : h('div', { className: 'daw-empty' }, '没有时间线记录。'),
        ),
        h(
          Section,
          {
            title: '最近轮次',
            count: Math.min(8, (d.history || []).length),
            brief: '每轮步数 / 成本 / 结果',
            open: !!openSec.hist,
            onToggle: () => toggleSec('hist'),
            id: 'daw-sec-hist',
          },
          (d.history || []).length
            ? h(
                'table',
                { className: 'daw-tbl' },
                h('thead', null, h('tr', null, ['轮次', '开始', '步数', '成本', '结果'].map((t) => h('th', { key: t }, t)))),
                h(
                  'tbody',
                  null,
                  d.history.slice(0, 8).map((it) =>
                    h(
                      'tr',
                      { key: it.runId },
                      h('td', { title: it.runId }, String(it.runId).slice(-13)),
                      h('td', null, ft(it.start)),
                      h('td', null, String(it.steps)),
                      h('td', null, money(it.cny)),
                      h('td', null, (it.verdict || '-') + (it.exit ? ' (exit ' + it.exit + ')' : '')),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'daw-empty' }, '还没有执行记录。'),
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
              log.busy ? h('div', { className: 'daw-empty' }, '正在读取…') : null,
              log.err ? h('div', { className: 'daw-empty' }, '读取失败：' + log.err) : null,
              !log.busy && !log.err ? h('pre', { className: 'daw-pre' }, log.text || '（空文件）') : null,
            )
          : null,
        toast ? h('div', { className: 'daw-toast' }, toast) : null,
      );
    }

    function PlanTab(props) {
      const [sel, setSel] = React.useState('');
      const [focus, setFocus] = React.useState('');
      const [detail, setDetail] = React.useState(null);
      const [err, setErr] = React.useState('');

      React.useEffect(() => {
        if (!sel) {
          setDetail(null);
          setErr('');
          return undefined;
        }
        let alive = true;
        setDetail(null);
        setErr('');
        getJson('/api/aris-wiki/plan?name=' + encodeURIComponent(sel) + '&t=' + Date.now())
          .then((body) => {
            if (!alive) return;
            if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
            setDetail(body);
          })
          .catch((e) => alive && setErr(String((e && e.message) || e)));
        return () => {
          alive = false;
        };
      }, [sel]);

      if (!sel) return h(PlanOverview, { planAll: props.planAll, onPick: (n, stage) => { setSel(n); setFocus(stage || ''); } });
      return h('div', { className: 'daw-cards', style: { gridTemplateColumns: '1fr' } }, h(PlanDetail, { detail, err, focusStage: focus, onBack: () => { setSel(''); setFocus(''); } }));
    }

    function ArtsTab(props) {
      const [data, setData] = React.useState(null);
      const [err, setErr] = React.useState('');
      const [rel, setRel] = React.useState('');
      const [file, setFile] = React.useState(null);
      const pipes = props.pipes || [];
      const [pick, setPick] = React.useState('');
      const name = pick || ((pipes[0] && pipes[0].name) || '');
      const load = React.useCallback(async () => {
        setErr('');
        try {
          const body = await getJson(`/api/aris-wiki/artifacts?${name ? `name=${encodeURIComponent(name)}&` : ''}t=${Date.now()}`);
          if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
          setData(body);
        } catch (e) {
          setErr(String((e && e.message) || e));
        }
      }, [name]);
      React.useEffect(() => {
        load();
        setRel('');
        setFile(null);
      }, [load]);
      const open = React.useCallback(
        async (target) => {
          setRel(target);
          setFile(null);
          try {
            const body = await getJson(`/api/aris-wiki/file?name=${encodeURIComponent(name || (data && data.pipeline && data.pipeline.name) || '')}&rel=${encodeURIComponent(target)}&t=${Date.now()}`);
            if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
            setFile(body);
          } catch (e) {
            setFile({ ok: false, error: String((e && e.message) || e) });
          }
        },
        [data, name],
      );

      if (err) return h('div', { className: 'daw-empty' }, `读取产物失败：${err}`);
      if (!data) return h('div', { className: 'daw-empty' }, tr('loading'));
      const groups = data.groups || [];
      const main = data.main;
      const files = groups.filter((g) => !rel || true).flatMap((g) => g.files || []);
      let view;
      if (!rel) view = h('div', { className: 'daw-empty' }, '从左侧选一个文件预览。');
      else if (!file) view = h('div', { className: 'daw-empty' }, '正在读取…');
      else if (file.ok === false) view = h('div', { className: 'daw-empty' }, String(file.error || '读取失败'));
      else if (file.dataUrl && /^image\//.test(file.mime || '')) view = h('img', { className: 'daw-art-img', src: file.dataUrl, alt: rel });
      else if (file.dataUrl && (file.mime || '').includes('pdf')) view = h('iframe', { src: file.dataUrl, style: { width: '100%', height: '100%', minHeight: 420, border: 0 } });
      else view = h('div', { className: 'daw-md' }, renderMarkdown(file.text || ''));
      return h(
        'div',
        { className: 'daw-arts-wrap' },
        h(
          'div',
          { className: 'daw-pipes' },
          h('span', { className: 'daw-note-i' }, '流水线'),
          pipes.map((p) =>
            h(
              'button',
              {
                key: p.id || p.name,
                type: 'button',
                className: 'daw-chip' + (name === p.name ? ' on' : ''),
                onClick: () => {
                  setPick(p.name);
                  setRel('');
                  setFile(null);
                },
              },
              p.name,
            ),
          ),
          h('span', { className: 'daw-note-i' }, '只读；编译与写操作在 Aris_Dsh'),
        ),
        h(
          'div',
          { className: 'daw-arts' },
        h(
          'div',
          { className: 'daw-art-l' },
          main
            ? h(
                'div',
                { className: 'daw-main' },
                h(
                  'div',
                  null,
                  h('div', { className: 'daw-main-k' }, `主论文${main.label ? ' · ' + main.label : ''}`),
                  h('div', { className: 'daw-main-n' }, main.name),
                  h('div', { className: 'daw-main-k' }, `${fmtSize(main.size)} · ${ftFull(main.mtime)}`),
                ),
                h(
                  'div',
                  { className: 'daw-main-r' },
                  h('button', { className: 'daw-btn', type: 'button', onClick: () => open(main.rel) }, '打开 PDF'),
                  main.tex ? h('button', { className: 'daw-btn', type: 'button', onClick: () => open(main.tex) }, '看源码') : null,
                ),
              )
            : h('div', { className: 'daw-note' }, '这条流水线还没有可打开的 PDF（编译在 Aris_Dsh 面板）。'),
          groups.map((g) =>
            h(
              'div',
              { key: (g.id || g.key) },
              h('div', { className: 'daw-sec' }, `${g.label || (g.id || g.key)} · ${(g.files || []).length}`),
              (g.files || []).slice(0, 120).map((f) =>
                h(
                  'button',
                  { key: (g.id || g.key) + f.rel, type: 'button', className: `daw-art-f${rel === f.rel ? ' on' : ''}`, onClick: () => open(f.rel), title: f.rel },
                  h('span', null, f.name || f.rel),
                  h('span', null, fmtSize(f.size)),
                ),
              ),
            ),
          ),
          files.length ? null : h('div', { className: 'daw-empty' }, '没有扫描到产物文件。'),
        ),
        h('div', { className: 'daw-art-v' }, view),
        ),
      );
    }

    const TABS = [
      ['plan', '计划'],
      ['arts', '产物'],
      ['docs', '文档'],
    ];

    function WikiPanel() {
      const [tab, setTab] = React.useState('plan');
      const [planAll, setPlanAll] = React.useState(null);
      const [err, setErr] = React.useState('');
      const [busy, setBusy] = React.useState(false);

      const load = React.useCallback(async () => {
        setBusy(true);
        setErr('');
        try {
          const body = await getJson(`/api/aris-wiki/plan?name=all&t=${Date.now()}`);
          if (!body || body.ok === false) throw new Error((body && body.error) || '读取失败');
          setPlanAll(body);
        } catch (e) {
          setErr(String((e && e.message) || e));
        } finally {
          setBusy(false);
        }
      }, []);

      React.useEffect(() => {
        load();
      }, [load]);

      const pipes = (planAll && planAll.pipelines) || [];
      return h(
        'div',
        { className: 'daw' },
        h('style', { dangerouslySetInnerHTML: { __html: CSS } }),
        h('style', { dangerouslySetInnerHTML: { __html: CSS2 } }),
        h(
          'div',
          { className: 'daw-head' },
          h(
            'div',
            null,
            h('h2', null, 'Aris_Wiki'),
            h('p', { className: 'daw-sub' }, '只读：计划与进展、论文产物、知识库文档。写操作（启停 / 门禁 / 编译）在 Aris_Dsh。'),
          ),
          h(
            'div',
            { className: 'daw-head-r' },
            h('button', { className: 'daw-btn', type: 'button', disabled: busy, onClick: load }, busy ? '刷新中…' : tr('refresh')),
          ),
        ),
        h(
          'div',
          { className: 'daw-tabs' },
          TABS.map(([key, label]) =>
            h('button', { key, type: 'button', className: `daw-tab${tab === key ? ' on' : ''}`, onClick: () => setTab(key) }, h('span', null, label)),
          ),
        ),
        err
          ? h(
              'div',
              { className: 'daw-err' },
              h('div', null, `无法连接知识库宿主：${err}（宿主重载后才有 /plan、/artifacts 路由）`),
              h('button', { className: 'daw-btn', type: 'button', onClick: load }, '重试'),
            )
          : null,
        tab === 'plan'
          ? h(PlanTab, { planAll })
          : tab === 'arts'
            ? h(ArtsTab, { pipes })
            : h(DocsPanel),
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
          if (typeof bound === 'function') tr = (key) => bound(key) || T[key] || key;
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
