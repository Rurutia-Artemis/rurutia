/* 翻箱 FanBox 前端 */
'use strict';

const $ = (s) => document.querySelector(s);
const api = (p) => fetch(p).then((r) => r.json());
const apiPost = (p, body) => fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

// ---------- SVG 图标系统（替代 emoji，统一矢量审美） ----------
const SVG = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  text: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  pdf: '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/>',
  data: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/>',
  json: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 1 2 2 2 2 0 0 1-2 2v5a2 2 0 0 1-2 2h-1"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  // UI 装饰图标（统一矢量，替代散落的 emoji）
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  link: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  term: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  clip: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};
// UI 图标快捷函数（默认 currentColor，随主题文字色自适应）
function ic(name, color, size) { return svgWrap(SVG[name], color || 'currentColor', size || 16, false); }
// ext → 类别 + 颜色
const EXT_KIND = {
  js: ['code', '#e8c95b'], mjs: ['code', '#e8c95b'], cjs: ['code', '#e8c95b'], jsx: ['code', '#5bc9e8'],
  ts: ['code', '#5b9ae8'], tsx: ['code', '#5b9ae8'], py: ['code', '#5b90c9'], go: ['code', '#5bc9d6'],
  rs: ['code', '#d68a5b'], swift: ['code', '#e8825b'], java: ['code', '#d68a5b'], rb: ['code', '#e85b5b'],
  c: ['code', '#7b9ae8'], cpp: ['code', '#7b9ae8'], h: ['code', '#7b9ae8'], php: ['code', '#9a7be8'],
  vue: ['code', '#5bd6a0'], sh: ['code', '#9aa3b2'], bash: ['code', '#9aa3b2'], lua: ['code', '#5b9ae8'],
  html: ['code', '#e87b5b'], htm: ['code', '#e87b5b'], css: ['code', '#5b9ae8'], scss: ['code', '#e85b9a'],
  json: ['json', '#e8c95b'], json5: ['json', '#e8c95b'], yml: ['json', '#d65b9a'], yaml: ['json', '#d65b9a'],
  toml: ['json', '#9a7be8'], ini: ['json', '#9aa3b2'], env: ['json', '#e8c95b'], xml: ['code', '#9aa3b2'],
  md: ['text', '#7bc9e8'], markdown: ['text', '#7bc9e8'], txt: ['text', '#9aa3b2'], log: ['text', '#9aa3b2'],
  csv: ['data', '#5bd6a0'], tsv: ['data', '#5bd6a0'], sql: ['data', '#e8a85b'],
  zip: ['archive', '#e8c95b'], rar: ['archive', '#e8c95b'], '7z': ['archive', '#e8c95b'],
  gz: ['archive', '#e8c95b'], tar: ['archive', '#e8c95b'],
};
const KIND_COLOR = { dir: '#6d8bff', image: '#5bd6a0', video: '#9a7be8', audio: '#e85b9a', pdf: '#e85b5b', text: '#9aa3b2', other: '#7a8294' };
// 缩略图加载失败时的回退图标
window.__svgVideo = svgWrap(SVG.video, KIND_COLOR.video, 34);
window.__svgImg = svgWrap(SVG.image, KIND_COLOR.image, 34);

// 图标配色随皮肤变化
function iconColorFor(e) {
  const ex = (e.name.split('.').pop() || '').toLowerCase();
  const t = state.theme;
  if (t === 'warm') {
    if (e.isDir) return '#c0714f';
    if (['md', 'markdown', 'txt', 'pdf'].includes(ex)) return '#a0895c';
    if (['csv', 'tsv', 'sql'].includes(ex)) return '#8a7a48';
    return '#9b8b6e';
  }
  if (t === 'editorial') {
    if (e.isDir) return '#0a0a0a';
    if (['html', 'htm'].includes(ex)) return '#ff433d';
    if (['md', 'markdown'].includes(ex)) return '#0000ee';
    if (e.kind === 'data' || ['csv', 'tsv'].includes(ex)) return '#00a33e';
    return '#0a0a0a';
  }
  // terminal：暖色多彩，文件夹用中性灰绿不抢 volt
  if (e.isDir) return '#9aa08a';
  if (EXT_KIND[ex]) return EXT_KIND[ex][1];
  return KIND_COLOR[e.kind] || KIND_COLOR.other;
}
function iconSvg(e, size = 22) {
  const color = iconColorFor(e);
  if (e.isDir) return svgWrap(SVG.folder, color, size, true);
  const ex = (e.name.split('.').pop() || '').toLowerCase();
  let shape = SVG[e.kind] || SVG.file;
  if (EXT_KIND[ex]) shape = SVG[EXT_KIND[ex][0]];
  return svgWrap(shape, color, size);
}
function svgWrap(inner, color, size, fill) {
  const isCur = color === 'currentColor';
  const fillVal = fill ? (isCur ? 'currentColor' : color + '22') : 'none';
  const fillOp = (fill && isCur) ? ' fill-opacity="0.15"' : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fillVal}"${fillOp} stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const state = {
  cwd: null, home: null, platform: 'darwin', sep: '/',
  theme: localStorage.getItem('fb_theme') || 'terminal',
  entries: [], project: null, history: [],
  view: localStorage.getItem('fb_view') || 'grid',
  gridSize: localStorage.getItem('fb_gridsize') || 'md',
  sort: localStorage.getItem('fb_sort') || 'name',
  showHidden: localStorage.getItem('fb_hidden') === '1',
  filter: '', selected: null, cursor: -1, cols: 1, visible: [],
  favorites: [], recentOpened: [], recentMode: false,
  previewW: Number(localStorage.getItem('fb_preview_w')) || 480,
};

// ---------- 工具 ----------
function fmtSize(n) {
  if (!n) return '';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}
function fmtTime(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const diff = Date.now() - ms;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// 跨平台路径处理：用服务端返回的分隔符
function dirOf(p) { const i = p.lastIndexOf(state.sep); return i > 0 ? p.slice(0, i) : p; }
function baseOf(p) { const parts = p.split(state.sep).filter(Boolean); return parts[parts.length - 1] || p; }
function tilde(p) { return state.home && p.startsWith(state.home) ? '~' + p.slice(state.home.length) : p; }
function isFav(path) { return state.favorites.some((f) => f.path === path); }
function toast(msg, isErr) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), 2200);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- 导航 ----------
async function navigate(p, pushHistory = true) {
  try {
    const data = await api('/api/list?path=' + encodeURIComponent(p));
    if (data.error) { toast('无法打开：' + data.error, true); return; }
    if (pushHistory && state.cwd) state.history.push(state.cwd);
    state.cwd = data.path;
    state.entries = data.entries;
    state.project = data.project;
    state.breadcrumb = data.breadcrumb;
    state.parent = data.parent;
    state.recentMode = false;
    state.filter = '';
    state.cursor = -1;
    $('#quick-filter').value = '';
    render();
    renderRootsActive();
  } catch (e) { toast('打开失败', true); }
}
function goBack() { if (state.history.length) navigate(state.history.pop(), false); }
function goUp() { if (state.parent && state.parent !== state.cwd) navigate(state.parent); }

// ---------- 渲染 ----------
function render() {
  renderBreadcrumb();
  renderFiles();
  $('#btn-back').disabled = !state.history.length;
}
function renderBreadcrumb() {
  const bc = $('#breadcrumb');
  bc.innerHTML = '';
  if (state.recentMode) { bc.innerHTML = `<span class="crumb last">${ic('clock', 'currentColor', 15)} 最近修改的文件</span>`; return; }
  (state.breadcrumb || []).forEach((c, i, arr) => {
    if (i > 0) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '›'; bc.appendChild(s); }
    const el = document.createElement('span');
    el.className = 'crumb' + (i === arr.length - 1 ? ' last' : '');
    if (c.name === '/') el.innerHTML = ic('monitor', 'currentColor', 15);
    else el.textContent = c.name;
    el.onclick = () => navigate(c.path);
    bc.appendChild(el);
  });
  if (state.project) {
    const b = document.createElement('span');
    b.className = 'proj-badge';
    b.textContent = state.project.toUpperCase() + ' 项目';
    bc.appendChild(b);
  }
}
function visibleEntries() {
  let list = state.entries.slice();
  if (!state.showHidden) list = list.filter((e) => !e.hidden);
  if (state.filter) { const f = state.filter.toLowerCase(); list = list.filter((e) => e.name.toLowerCase().includes(f)); }
  const dirFirst = (a, b) => (a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : 0);
  if (state.sort === 'mtime') list.sort((a, b) => dirFirst(a, b) || b.mtime - a.mtime);
  else if (state.sort === 'size') list.sort((a, b) => dirFirst(a, b) || b.size - a.size);
  else list.sort((a, b) => dirFirst(a, b) || a.name.localeCompare(b.name, 'zh', { numeric: true }));
  return list;
}
function renderFiles() {
  const area = $('#file-area');
  const list = visibleEntries();
  state.visible = list;
  const dirs = list.filter((e) => e.isDir).length;
  $('#dir-meta').textContent = `${dirs} 个文件夹 · ${list.length - dirs} 个文件`;
  if (!list.length) {
    area.innerHTML = `<div class="empty-state"><div class="big">${ic('inbox', 'currentColor', 48)}</div>${state.filter ? '没有匹配的文件' : '这个文件夹是空的'}</div>`;
    return;
  }
  if (state.view === 'grid') {
    const grid = document.createElement('div');
    grid.className = 'grid size-' + state.gridSize;
    list.forEach((e, i) => grid.appendChild(gridItem(e, i)));
    area.innerHTML = '';
    area.appendChild(grid);
    measureCols();
  } else {
    const wrap = document.createElement('div');
    wrap.className = 'list';
    const head = document.createElement('div');
    head.className = 'row list-head';
    head.innerHTML = `<div></div><div>名称</div><div>修改时间</div><div>大小</div><div></div>`;
    wrap.appendChild(head);
    list.forEach((e, i) => wrap.appendChild(listRow(e, i)));
    area.innerHTML = '';
    area.appendChild(wrap);
    state.cols = 1;
  }
  highlightCursor();
}
function measureCols() {
  const items = $('#file-area').querySelectorAll('.item');
  if (!items.length) { state.cols = 1; return; }
  const top0 = items[0].offsetTop;
  let c = 0;
  for (const it of items) { if (it.offsetTop === top0) c++; else break; }
  state.cols = Math.max(1, c);
}
function favBtn(e) {
  const on = isFav(e.path);
  return `<span class="fav-btn ${on ? 'on' : ''}" title="收藏">${svgWrap(SVG.star, 'currentColor', 15, on)}</span>`;
}
function thumbHtml(e) {
  if (e.kind === 'image') return `<img class="thumb" loading="lazy" src="/api/raw?path=${encodeURIComponent(e.path)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'svg-icon',innerHTML:window.__svgImg}))">`;
  if (e.kind === 'video') {
    // 抽帧失败（编码不支持/黑帧）时回退到彩色 video 图标，避免网格里出现黑块
    return `<video class="thumb" muted preload="metadata" src="/api/raw?path=${encodeURIComponent(e.path)}#t=0.5" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'svg-icon',innerHTML:window.__svgVideo}))"></video>`;
  }
  return `<span class="svg-icon">${iconSvg(e, state.gridSize === 'lg' ? 44 : 34)}</span>`;
}
function gridItem(e, i) {
  const el = document.createElement('div');
  el.className = 'item' + (e.hidden ? ' hidden-file' : '') + (state.selected === e.path ? ' selected' : '');
  el.dataset.idx = i;
  el.innerHTML = `<div class="icon">${thumbHtml(e)}</div><div class="fname">${escapeHtml(e.name)}</div>${favBtn(e)}`;
  bindItem(el, e);
  return el;
}
function listRow(e, i) {
  const el = document.createElement('div');
  el.className = 'row' + (e.hidden ? ' hidden-file' : '') + (state.selected === e.path ? ' selected' : '');
  el.dataset.idx = i;
  el.innerHTML = `<div class="icon">${e.kind === 'image' ? `<img class="thumb-sm" loading="lazy" src="/api/raw?path=${encodeURIComponent(e.path)}">` : `<span class="svg-icon">${iconSvg(e, 18)}</span>`}</div>
    <div class="fname">${escapeHtml(e.name)}</div>
    <div class="meta">${fmtTime(e.mtime)}</div>
    <div class="meta">${e.isDir ? '' : fmtSize(e.size)}</div>
    ${favBtn(e)}`;
  bindItem(el, e);
  return el;
}
function bindItem(el, e) {
  el.onclick = (ev) => {
    if (ev.target.closest('.fav-btn')) { ev.stopPropagation(); toggleFav(e); return; }
    state.cursor = Number(el.dataset.idx);
    onItemClick(e);
  };
  el.ondblclick = (ev) => { if (ev.target.closest('.fav-btn')) return; onItemOpen(e); };
  el.oncontextmenu = (ev) => { state.cursor = Number(el.dataset.idx); showContextMenu(ev, e); };
}
function onItemClick(e) {
  state.selected = e.path;
  if (e.isDir) { navigate(e.path); return; }
  openPreview(e);
  renderFiles();
}
function onItemOpen(e) { if (e.isDir) navigate(e.path); else openWith(e.path, 'default'); }

// ---------- 主区键盘导航 ----------
function highlightCursor() {
  const area = $('#file-area');
  area.querySelectorAll('.cursor').forEach((x) => x.classList.remove('cursor'));
  if (state.cursor < 0) return;
  const el = area.querySelector(`[data-idx="${state.cursor}"]`);
  if (el) { el.classList.add('cursor'); el.scrollIntoView({ block: 'nearest' }); }
}
function moveCursor(d) {
  if (!state.visible.length) return;
  if (state.cursor < 0) state.cursor = 0;
  else state.cursor = Math.min(state.visible.length - 1, Math.max(0, state.cursor + d));
  highlightCursor();
}
function cursorEnter(editor) {
  const e = state.visible[state.cursor];
  if (!e) return;
  if (editor && !e.isDir) { openWith(e.path, 'editor'); return; }
  state.selected = e.path;
  if (e.isDir) navigate(e.path);
  else { openPreview(e); renderFiles(); }
}

// ---------- 预览 ----------
async function openPreview(e) {
  $('#preview').classList.remove('hidden');
  $('#app').classList.add('has-preview');
  applyPreviewWidth();
  $('#preview-title').textContent = e.name;
  const body = $('#preview-body');
  body.innerHTML = '<div class="cmdk-loading">加载中…</div>';
  renderPreviewActions(e);
  const k = e.kind;
  if (k === 'image') {
    body.innerHTML = `<img class="pv-img" src="/api/raw?path=${encodeURIComponent(e.path)}" title="点击放大">`;
    body.querySelector('.pv-img').onclick = () => lightbox(e.path);
  } else if (k === 'video') {
    body.innerHTML = `<video controls src="/api/raw?path=${encodeURIComponent(e.path)}"></video>`;
  } else if (k === 'audio') {
    body.innerHTML = `<div class="preview-meta"><span>${fmtSize(e.size)}</span></div><audio controls src="/api/raw?path=${encodeURIComponent(e.path)}"></audio>`;
  } else if (k === 'pdf') {
    body.innerHTML = `<iframe class="iframe-preview" src="/api/raw?path=${encodeURIComponent(e.path)}"></iframe>`;
  } else if (k === 'text') {
    renderTextPreview(await api('/api/read?path=' + encodeURIComponent(e.path)));
  } else {
    body.innerHTML = `<div class="empty-state"><div class="big">${iconSvg(e, 48)}</div>这个文件类型无法预览<br><br>${fmtSize(e.size)}</div>`;
  }
}
function renderTextPreview(data) {
  const body = $('#preview-body');
  const meta = `<div class="preview-meta"><span>${data.ext || 'txt'}</span><span>${fmtSize(data.size)}</span><span>${fmtTime(data.mtime)}</span></div>`;
  const ex = (data.ext || '').toLowerCase();
  if ((ex === 'md' || ex === 'markdown') && !window.__noMarked && window.marked) {
    body.innerHTML = meta + `<div class="md-body">${window.marked.parse(data.content || '')}</div>`;
    if (window.hljs) body.querySelectorAll('pre code').forEach((b) => { try { window.hljs.highlightElement(b); } catch {} });
  } else if (ex === 'csv' || ex === 'tsv') {
    body.innerHTML = meta + csvTable(data.content || '', ex === 'tsv' ? '\t' : ',');
  } else if (ex === 'html' || ex === 'htm') {
    renderHtmlPreview(data, meta);
  } else {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    if (ex) code.className = 'language-' + ex;
    code.textContent = data.content || '';
    pre.appendChild(code);
    body.innerHTML = meta;
    body.appendChild(pre);
    if (window.hljs && !window.__noHljs) { try { window.hljs.highlightElement(code); } catch {} }
  }
}
function csvTable(text, delim) {
  const rows = text.split('\n').filter((r) => r.trim()).slice(0, 500).map((r) => r.split(delim));
  if (!rows.length) return '<div class="empty-state">空表格</div>';
  let h = '<div class="csv-wrap"><table class="csv-table"><thead><tr>';
  rows[0].forEach((c) => { h += `<th>${escapeHtml(c)}</th>`; });
  h += '</tr></thead><tbody>';
  for (let i = 1; i < rows.length; i++) {
    h += '<tr>';
    rows[i].forEach((c) => { h += `<td>${escapeHtml(c)}</td>`; });
    h += '</tr>';
  }
  h += '</tbody></table></div>';
  return h;
}
function renderHtmlPreview(data, meta) {
  const body = $('#preview-body');
  body.innerHTML = meta +
    `<div class="pv-toolbar"><button id="html-toggle" class="ghost-btn">查看源码</button><button id="html-browser" class="ghost-btn">${ic('globe', 'currentColor', 13)} 浏览器打开（看完整交互）</button></div>` +
    `<iframe class="iframe-preview" sandbox="allow-scripts allow-same-origin" srcdoc="${escapeHtml(data.content || '')}"></iframe>`;
  let src = false;
  $('#html-browser').onclick = () => openWith(data.path, 'default');
  $('#html-toggle').onclick = () => {
    src = !src;
    if (src) {
      const pre = document.createElement('pre');
      pre.innerHTML = `<code class="language-html">${escapeHtml(data.content || '')}</code>`;
      body.querySelector('.iframe-preview').replaceWith(pre);
      if (window.hljs) pre.querySelectorAll('code').forEach((b) => { try { window.hljs.highlightElement(b); } catch {} });
      $('#html-toggle').textContent = '渲染预览';
    } else { renderHtmlPreview(data, meta); }
  };
}
function renderPreviewActions(e) {
  const box = $('#preview-actions');
  box.innerHTML = '';
  const fav = isFav(e.path);
  [
    { icon: ic('link', 'currentColor', 14), label: '默认应用打开', cls: 'primary', fn: () => openWith(e.path, 'default') },
    ...(e.kind === 'text' ? [{ icon: ic('text', 'currentColor', 14), label: '编辑', fn: () => enterEditMode(e) }] : []),
    { icon: ic('term', 'currentColor', 14), label: '在编辑器打开', fn: () => openWith(e.path, 'editor') },
    { icon: ic('folder', 'currentColor', 14), label: '在 Finder 显示', fn: () => openWith(e.path, 'reveal') },
    { icon: ic('clip', 'currentColor', 14), label: '复制路径', fn: () => copyPath(e.path) },
    { icon: svgWrap(SVG.star, 'currentColor', 14, fav), label: fav ? '已收藏' : '收藏', fn: () => toggleFav(e) },
  ].forEach((a) => {
    const b = document.createElement('button');
    b.innerHTML = `${a.icon}<span>${a.label}</span>`;
    if (a.cls) b.className = a.cls;
    b.onclick = a.fn;
    box.appendChild(b);
  });
}
function closePreview() {
  $('#preview').classList.add('hidden');
  $('#app').classList.remove('has-preview');
  state.selected = null;
  renderFiles();
}
function lightbox(path) {
  const ov = document.createElement('div');
  ov.className = 'lightbox';
  ov.innerHTML = `<img src="/api/raw?path=${encodeURIComponent(path)}"><div class="lb-hint">点击空白处关闭 · 滚轮缩放</div>`;
  let scale = 1;
  const img = ov.querySelector('img');
  ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
  ov.onwheel = (ev) => { ev.preventDefault(); scale = Math.min(8, Math.max(0.2, scale - ev.deltaY * 0.002)); img.style.transform = `scale(${scale})`; };
  document.body.appendChild(ov);
}
function applyPreviewWidth() {
  if ($('#app').classList.contains('has-preview')) {
    $('#app').style.gridTemplateColumns = `248px 1fr ${state.previewW}px`;
  }
}

// ---------- 操作 ----------
async function openWith(p, withApp) {
  const r = await apiPost('/api/open', { path: p, with: withApp });
  if (r.ok) {
    const used = r.with;
    if (used === 'reveal') toast('已在文件管理器中显示');
    else if (used === 'terminal') toast('已在终端打开此目录');
    else if (used === 'editor') toast('已在编辑器打开');
    else if (withApp === 'editor' && used === 'default') toast('未找到 code 命令，已用默认应用打开');
    else toast('已打开');
    loadFavorites();
  } else toast('打开失败：' + (r.error || ''), true);
}
async function copyPath(p) {
  try { await navigator.clipboard.writeText(p); toast('已复制路径'); }
  catch { toast('复制失败（浏览器限制），路径：' + p, true); }
}
async function toggleFav(e) {
  const r = await apiPost('/api/favorites', { path: e.path, name: e.name, isDir: e.isDir });
  state.favorites = r.favorites;
  renderFavs();
  if (!$('#preview').classList.contains('hidden') && state.selected === e.path) renderPreviewActions(e);
  renderFiles();
  toast(isFav(e.path) ? '已收藏' : '已取消收藏');
}

// ---------- 文件操作（编辑 / 重命名 / 废纸篓 / 新建）----------
// 重拉当前目录但保留筛选词，操作后刷新视图
async function refresh() {
  if (!state.cwd || state.recentMode) return;
  const data = await api('/api/list?path=' + encodeURIComponent(state.cwd));
  if (data.error) return;
  state.entries = data.entries;
  state.project = data.project;
  state.breadcrumb = data.breadcrumb;
  renderBreadcrumb();
  renderFiles();
}
// 文本原地编辑
async function enterEditMode(e) {
  $('#preview').classList.remove('hidden');
  $('#app').classList.add('has-preview');
  applyPreviewWidth();
  state.selected = e.path;
  $('#preview-title').textContent = e.name;
  renderPreviewActions(e);
  const body = $('#preview-body');
  body.innerHTML = '<div class="cmdk-loading">加载中…</div>';
  const data = await api('/api/read?path=' + encodeURIComponent(e.path));
  if (data.tooLarge) { toast('文件太大，暂不支持原地编辑', true); openPreview(e); return; }
  body.innerHTML =
    `<div class="editor-bar"><button id="ed-save" class="primary">保存</button><button id="ed-cancel" class="ghost-btn">取消</button><span class="editor-hint">⌘S 保存 · Esc 取消</span></div>` +
    `<textarea id="ed-area" class="editor-area" spellcheck="false"></textarea>`;
  const ta = $('#ed-area');
  ta.value = data.content || '';
  ta.focus();
  const save = async () => {
    const r = await apiPost('/api/write', { path: e.path, content: ta.value });
    if (r.error) { toast('保存失败：' + r.error, true); return; }
    toast('已保存');
    await refresh();
    openPreview(state.entries.find((x) => x.path === e.path) || e);
  };
  $('#ed-save').onclick = save;
  $('#ed-cancel').onclick = () => openPreview(e);
  ta.addEventListener('keydown', (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key === 's') { ev.preventDefault(); save(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); openPreview(e); }
    ev.stopPropagation(); // 别冒泡到主区键盘导航
  });
}
async function doRename(e) {
  const name = await inputDialog('重命名', e.name, '输入新名称');
  if (!name || name === e.name) return;
  const r = await apiPost('/api/rename', { path: e.path, newName: name });
  if (r.error) { toast('重命名失败：' + r.error, true); return; }
  toast('已重命名');
  if (state.selected === e.path) state.selected = r.path;
  await refresh();
}
async function doTrash(e) {
  const r = await apiPost('/api/trash', { path: e.path });
  if (r.error) { toast('删除失败：' + r.error + '（首次需在弹窗里允许控制 Finder）', true); return; }
  toast('已移到废纸篓，可从废纸篓恢复');
  if (state.selected === e.path) closePreview();
  await refresh();
}
async function doCreate(type) {
  const name = await inputDialog(type === 'dir' ? '新建文件夹' : '新建文件', '', type === 'dir' ? '文件夹名称' : '文件名（带扩展名，如 note.md）');
  if (!name) return;
  const r = await apiPost('/api/create', { path: state.cwd, name, type });
  if (r.error) { toast('新建失败：' + r.error, true); return; }
  toast(type === 'dir' ? '已新建文件夹' : '已新建文件');
  await refresh();
  // 新建文件顺手打开编辑
  if (type === 'file') { const ne = state.entries.find((x) => x.path === r.path); if (ne && ne.kind === 'text') enterEditMode(ne); }
}
// 通用输入弹窗（替代原生 prompt，配合皮肤）
function inputDialog(title, value = '', placeholder = '') {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'input-overlay';
    ov.innerHTML = `<div class="input-dialog"><div class="input-title">${escapeHtml(title)}</div>
      <input class="input-field" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" spellcheck="false">
      <div class="input-actions"><button class="ghost-btn" data-act="cancel">取消</button><button class="primary" data-act="ok">确定</button></div></div>`;
    document.body.appendChild(ov);
    const inp = ov.querySelector('.input-field');
    inp.focus();
    inp.select();
    const done = (v) => { ov.remove(); resolve(v); };
    ov.querySelector('[data-act=ok]').onclick = () => done(inp.value.trim());
    ov.querySelector('[data-act=cancel]').onclick = () => done(null);
    ov.onclick = (ev) => { if (ev.target === ov) done(null); };
    inp.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); done(inp.value.trim()); }
      else if (ev.key === 'Escape') { ev.preventDefault(); done(null); }
    });
  });
}
// 右键上下文菜单
function closeContextMenu() { const m = $('#context-menu'); if (m) m.remove(); }
function showContextMenu(ev, e) {
  ev.preventDefault();
  closeContextMenu();
  const items = [];
  if (e.isDir) items.push({ label: '打开', fn: () => navigate(e.path) });
  else items.push({ label: '预览', fn: () => { state.selected = e.path; openPreview(e); renderFiles(); } });
  if (e.kind === 'text') items.push({ label: '编辑文本', fn: () => enterEditMode(e) });
  items.push({ label: '在编辑器打开', fn: () => openWith(e.path, 'editor') });
  items.push({ label: '在 Finder 显示', fn: () => openWith(e.path, 'reveal') });
  items.push({ label: '复制路径', fn: () => copyPath(e.path) });
  items.push({ sep: true });
  items.push({ label: isFav(e.path) ? '取消收藏' : '收藏', fn: () => toggleFav(e) });
  items.push({ label: '重命名…', fn: () => doRename(e) });
  items.push({ label: '移到废纸篓', danger: true, fn: () => doTrash(e) });
  const menu = document.createElement('div');
  menu.id = 'context-menu';
  menu.className = 'context-menu';
  items.forEach((it) => {
    if (it.sep) { const s = document.createElement('div'); s.className = 'ctx-sep'; menu.appendChild(s); return; }
    const b = document.createElement('div');
    b.className = 'ctx-item' + (it.danger ? ' danger' : '');
    b.textContent = it.label;
    b.onclick = () => { closeContextMenu(); it.fn(); };
    menu.appendChild(b);
  });
  document.body.appendChild(menu);
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.min(ev.clientX, window.innerWidth - mw - 8) + 'px';
  menu.style.top = Math.min(ev.clientY, window.innerHeight - mh - 8) + 'px';
}

// ---------- 侧边栏 ----------
async function loadRoots() {
  const data = await api('/api/roots');
  state.home = data.home;
  state.platform = data.platform;
  state.sep = data.sep || '/';
  const ul = $('#roots-list');
  ul.innerHTML = '';
  data.roots.forEach((r) => {
    const li = document.createElement('li');
    li.dataset.path = r.path;
    li.innerHTML = `<span class="ico">${svgWrap(SVG.folder, 'currentColor', 16, true)}</span><span class="label">${r.name}</span>`;
    li.onclick = () => navigate(r.path);
    ul.appendChild(li);
  });
}
function renderRootsActive() {
  $('#roots-list').querySelectorAll('li').forEach((li) => li.classList.toggle('active', li.dataset.path === state.cwd));
}
async function loadFavorites() {
  const data = await api('/api/favorites');
  state.favorites = data.favorites || [];
  state.recentOpened = data.recentOpened || [];
  renderFavs();
  renderRecentOpened();
}
function renderFavs() {
  const ul = $('#favs-list');
  ul.innerHTML = '';
  if (!state.favorites.length) { ul.innerHTML = '<div class="nav-empty">悬停文件点 ☆ 即可收藏</div>'; return; }
  state.favorites.forEach((f) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="ico">${svgWrap(f.isDir ? SVG.folder : SVG.file, 'currentColor', 16, f.isDir)}</span><span class="label" title="${escapeHtml(f.path)}">${escapeHtml(f.name)}</span><span class="unfav" title="移除">✕</span>`;
    li.onclick = (ev) => {
      if (ev.target.classList.contains('unfav')) { toggleFav(f); return; }
      if (f.isDir) navigate(f.path);
      else navigate(dirOf(f.path)).then(() => { const e = state.entries.find((x) => x.path === f.path); if (e) { state.selected = f.path; openPreview(e); renderFiles(); } });
    };
    ul.appendChild(li);
  });
}
function renderRecentOpened() {
  const ul = $('#recent-opened-list');
  ul.innerHTML = '';
  if (!state.recentOpened.length) { ul.innerHTML = '<div class="nav-empty">打开过的文件会出现在这里</div>'; return; }
  state.recentOpened.slice(0, 8).forEach((p) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="ico">${svgWrap(SVG.file, 'currentColor', 16)}</span><span class="label">${escapeHtml(baseOf(p))}</span>`;
    li.title = p;
    li.onclick = () => openWith(p, 'default');
    ul.appendChild(li);
  });
}

// ---------- 最近修改 ----------
async function showRecent() {
  state.recentMode = true;
  state.cols = 1;
  state.cursor = -1;
  $('#file-area').innerHTML = '<div class="cmdk-loading">扫描最近修改的文件…</div>';
  renderBreadcrumb();
  const data = await api('/api/recent?root=' + encodeURIComponent(state.cwd || state.home));
  const wrap = document.createElement('div');
  wrap.className = 'list';
  const head = document.createElement('div');
  head.className = 'row list-head';
  head.innerHTML = `<div></div><div>名称</div><div>修改时间</div><div>大小</div><div></div>`;
  wrap.appendChild(head);
  state.visible = data.results;
  data.results.forEach((e, i) => {
    const row = listRow(e, i);
    row.querySelector('.fname').innerHTML = `${escapeHtml(e.name)} <span class="row-dir">· ${escapeHtml(tilde(e.dir || dirOf(e.path)))}</span>`;
    wrap.appendChild(row);
  });
  const area = $('#file-area');
  area.innerHTML = '';
  if (!data.results.length) area.innerHTML = `<div class="empty-state"><div class="big">${ic('clock', 'currentColor', 48)}</div>没找到最近修改的文件</div>`;
  else { area.appendChild(wrap); highlightCursor(); if (data.truncated) area.insertAdjacentHTML('beforeend', truncNote()); }
}
function truncNote() {
  return `<div class="trunc-note">⚠ 文件太多，结果可能不完整。进入更具体的子目录可看到全部。</div>`;
}

// ---------- 命令面板 ----------
const cmdk = {
  results: [], active: 0, timer: null, scopeAll: true,
  open() {
    $('#cmdk').classList.remove('hidden');
    this.updateScopeLabel();
    const inp = $('#cmdk-input');
    inp.value = '';
    inp.focus();
    $('#cmdk-results').innerHTML = '<div class="cmdk-loading">输入开始搜索 · 文件名模糊匹配，「内容:」搜全文</div>';
    this.results = [];
    this.active = 0;
  },
  close() { $('#cmdk').classList.add('hidden'); },
  toggleScope() { this.scopeAll = !this.scopeAll; this.updateScopeLabel(); this.search($('#cmdk-input').value); },
  root() { return this.scopeAll ? state.home : (state.cwd || state.home); },
  updateScopeLabel() {
    $('#cmdk-scope').textContent = this.scopeAll ? '全机（主目录及以下）' : '当前目录 ' + tilde(state.cwd || state.home);
    $('#scope-toggle').textContent = this.scopeAll ? '⤢ 全机' : '▢ 当前目录';
    $('#scope-toggle').classList.toggle('on', this.scopeAll);
  },
  search(q) {
    clearTimeout(this.timer);
    if (!q.trim()) { $('#cmdk-results').innerHTML = '<div class="cmdk-loading">输入开始搜索</div>'; return; }
    const isContent = /^(内容[:：]|content:)/i.test(q);
    $('#cmdk-results').innerHTML = '<div class="cmdk-loading">搜索中…</div>';
    this.timer = setTimeout(async () => {
      const root = this.root();
      let data, term;
      if (isContent) {
        term = q.replace(/^(内容[:：]|content:)/i, '').trim();
        data = await api(`/api/grep?q=${encodeURIComponent(term)}&root=${encodeURIComponent(root)}`);
        this.results = data.results.map((r) => ({ ...r, content: true }));
      } else {
        term = q.trim();
        data = await api(`/api/search?q=${encodeURIComponent(term)}&root=${encodeURIComponent(root)}`);
        this.results = data.results;
      }
      this.truncated = data.truncated;
      this.isContent = isContent;
      this.term = term;
      this.active = 0;
      this.renderResults();
    }, 150);
  },
  renderResults() {
    const ul = $('#cmdk-results');
    if (!this.results.length) { ul.innerHTML = '<div class="cmdk-loading">没有结果</div>'; return; }
    ul.innerHTML = '';
    this.results.forEach((r, i) => {
      const li = document.createElement('li');
      if (i === this.active) li.className = 'active';
      let hits = '';
      if (r.content && r.hits) hits = r.hits.map((h) => `<div class="r-hit">L${h.line}: ${hlTerm(h.text, this.term)}</div>`).join('');
      li.innerHTML = `<span class="r-icon">${iconSvg(r, 18)}</span>
        <div class="r-main">
          <div class="r-name">${this.isContent ? escapeHtml(r.name) : hlFuzzy(r.name, this.term)}</div>
          <div class="r-path">${escapeHtml(tilde(r.path))}</div>${hits}
        </div>`;
      li.onclick = () => this.choose(i, false);
      ul.appendChild(li);
    });
    if (this.truncated) ul.insertAdjacentHTML('beforeend', `<div class="cmdk-loading">⚠ 结果可能不完整，换更具体的关键词或缩小到当前目录</div>`);
    this.scrollActive();
  },
  move(d) { if (!this.results.length) return; this.active = (this.active + d + this.results.length) % this.results.length; this.renderResults(); },
  scrollActive() { const el = $('#cmdk-results').children[this.active]; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); },
  choose(i, editor) {
    const r = this.results[i];
    if (!r) return;
    this.close();
    // ⌘↵ 对文件夹也走编辑器——找到项目名直接在 VS Code/编辑器整包打开（vibe coding 核心流）
    if (editor) { openWith(r.path, 'editor'); return; }
    if (r.isDir) { navigate(r.path); return; }
    navigate(dirOf(r.path)).then(() => {
      const entry = state.entries.find((e) => e.path === r.path) || { ...r };
      state.selected = r.path;
      openPreview(entry);
      renderFiles();
    });
  },
};
function hlFuzzy(name, q) {
  if (!q) return escapeHtml(name);
  const lower = name.toLowerCase(); const ql = q.toLowerCase();
  let qi = 0, out = '';
  for (let i = 0; i < name.length; i++) {
    if (qi < ql.length && lower[i] === ql[qi]) { out += `<mark>${escapeHtml(name[i])}</mark>`; qi++; }
    else out += escapeHtml(name[i]);
  }
  return out;
}
function hlTerm(text, term) {
  if (!term) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + term.length)) + '</mark>' + escapeHtml(text.slice(idx + term.length));
}

// ---------- 首次引导 ----------
function maybeShowGuide() {
  if (localStorage.getItem('fb_guided')) return;
  const ov = document.createElement('div');
  ov.className = 'guide-overlay';
  ov.innerHTML = `<div class="guide-card">
    <div class="guide-logo">${svgWrap(SVG.box, 'currentColor', 46, true)}</div>
    <h2>欢迎用翻箱 FanBox</h2>
    <p>vibe coding 攒了一堆文件却找不回？三步上手：</p>
    <ul>
      <li><b>⌘K</b> 全局搜索文件和文件夹，记得名字片段就能找到；<b>⌘↵</b> 把找到的项目直接在编辑器整包打开；输入 <code>内容:关键词</code> 搜文件里的字</li>
      <li><b>单击</b> 文件即在右侧预览（图片、代码、Markdown、网页成品都能看），<b>双击</b> 用系统打开</li>
      <li>用 <b>↑↓←→</b> 键盘选文件，<b>回车</b> 打开；悬停文件点 <b>☆</b> 收藏常用的</li>
    </ul>
    <button id="guide-ok">开始使用</button>
  </div>`;
  document.body.appendChild(ov);
  $('#guide-ok').onclick = () => { localStorage.setItem('fb_guided', '1'); ov.remove(); };
}

// ---------- 预览面板拖拽调宽 ----------
function bindResizer() {
  const handle = $('#preview-resizer');
  let dragging = false;
  handle.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); document.body.style.userSelect = 'none'; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = Math.min(window.innerWidth - 500, Math.max(320, window.innerWidth - e.clientX));
    state.previewW = Math.round(w);
    applyPreviewWidth();
  });
  window.addEventListener('mouseup', () => { if (dragging) { dragging = false; document.body.style.userSelect = ''; localStorage.setItem('fb_preview_w', state.previewW); } });
}

// 终端面板拖拽调整大小（底部拖高度 / 右侧拖宽度）
function bindTerminalResizer() {
  const handle = $('#terminal-resizer');
  let dragging = false;
  handle.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); document.body.style.userSelect = 'none'; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const panel = $('#terminal-panel');
    const rect = $('#main-body').getBoundingClientRect();
    if (term.dock === 'bottom') {
      const h = Math.min(rect.height - 120, Math.max(120, rect.bottom - e.clientY));
      panel.style.height = Math.round(h) + 'px';
    } else {
      const w = Math.min(rect.width - 200, Math.max(240, rect.right - e.clientX));
      panel.style.width = Math.round(w) + 'px';
    }
    term.fitActive();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false; document.body.style.userSelect = '';
    const panel = $('#terminal-panel');
    if (term.dock === 'bottom') localStorage.setItem('fb_term_h', parseInt(panel.style.height, 10) || 280);
    else localStorage.setItem('fb_term_w', parseInt(panel.style.width, 10) || 480);
  });
}

// ---------- 事件绑定 ----------
function bindEvents() {
  $('#btn-back').onclick = goBack;
  $('#btn-up').onclick = goUp;
  $('#preview-close').onclick = closePreview;
  $('#cmdk-trigger').onclick = () => cmdk.open();
  $('#btn-recent').onclick = showRecent;
  $('#btn-terminal').onclick = () => term.toggle();
  $('#term-newtab').onclick = () => term.newTab();
  $('#term-dock').onclick = () => term.setDock(term.dock === 'bottom' ? 'right' : 'bottom');
  $('#term-close').onclick = () => term.close();
  bindTerminalResizer();
  $('#btn-new-dir').onclick = () => doCreate('dir');
  $('#btn-new-file').onclick = () => doCreate('file');
  document.addEventListener('click', (e) => { if (!e.target.closest('#context-menu')) closeContextMenu(); });
  window.addEventListener('blur', closeContextMenu);
  $('#scope-toggle').onclick = () => cmdk.toggleScope();

  $('#toggle-hidden').checked = state.showHidden;
  $('#toggle-hidden').onchange = (e) => { state.showHidden = e.target.checked; localStorage.setItem('fb_hidden', state.showHidden ? '1' : '0'); renderFiles(); };
  $('#quick-filter').oninput = (e) => { state.filter = e.target.value; state.cursor = -1; renderFiles(); };

  $('#sort-seg').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.sort === state.sort);
    b.onclick = () => { state.sort = b.dataset.sort; localStorage.setItem('fb_sort', state.sort); $('#sort-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); renderFiles(); };
  });
  $('#view-seg').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === state.view);
    b.onclick = () => { state.view = b.dataset.view; localStorage.setItem('fb_view', state.view); $('#view-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); updateGridSizeVisibility(); renderFiles(); };
  });
  $('#gridsize-seg').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === state.gridSize);
    b.onclick = () => { state.gridSize = b.dataset.size; localStorage.setItem('fb_gridsize', state.gridSize); $('#gridsize-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b)); renderFiles(); };
  });
  updateGridSizeVisibility();

  $('#cmdk-input').oninput = (e) => cmdk.search(e.target.value);
  $('#cmdk').onclick = (e) => { if (e.target.id === 'cmdk') cmdk.close(); };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#context-menu')) { closeContextMenu(); return; }
    const cmdkOpen = !$('#cmdk').classList.contains('hidden');
    const lbOpen = !!document.querySelector('.lightbox');
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); cmdkOpen ? cmdk.close() : cmdk.open(); return; }
    if (cmdkOpen) {
      if (e.key === 'Escape') cmdk.close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); cmdk.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdk.move(-1); }
      else if (e.key === 'Tab') { e.preventDefault(); cmdk.toggleScope(); }
      else if (e.key === 'Enter') { e.preventDefault(); cmdk.choose(cmdk.active, e.metaKey || e.ctrlKey); }
      return;
    }
    if (lbOpen) { if (e.key === 'Escape') document.querySelector('.lightbox').remove(); return; }
    const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (e.key === 'Escape' && !$('#preview').classList.contains('hidden')) { closePreview(); return; }
    if (e.key === '/' && !inInput) { e.preventDefault(); $('#quick-filter').focus(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === '[') { e.preventDefault(); goBack(); return; }
    if (inInput) return;
    // 主区键盘导航
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(state.cols); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(-state.cols); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); moveCursor(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveCursor(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); cursorEnter(e.metaKey || e.ctrlKey); }
    else if (e.key === 'Backspace') { e.preventDefault(); goUp(); }
  });
}
function updateGridSizeVisibility() {
  $('#gridsize-seg').style.display = state.view === 'grid' ? '' : 'none';
}

// ---------- 主题 / 皮肤 ----------
function applyTheme(skin, rerender = true) {
  if (!['terminal', 'warm', 'editorial'].includes(skin)) skin = 'terminal';
  state.theme = skin;
  document.documentElement.dataset.theme = skin;
  localStorage.setItem('fb_theme', skin);
  const link = document.getElementById('hljs-theme');
  if (link) link.href = 'https://cdn.jsdelivr.net/npm/highlight.js@11/styles/' + (skin === 'terminal' ? 'github-dark' : 'github') + '.min.css';
  document.querySelectorAll('#theme-switch .theme-seg button').forEach((b) => b.classList.toggle('active', b.dataset.skin === skin));
  if (typeof term !== 'undefined' && term.sessions.length) term.retheme();
  if (rerender && state.entries.length) {
    renderFiles();
    // 预览里的代码高亮配色随皮肤切换，重渲染当前选中项
    if (state.selected && !$('#preview').classList.contains('hidden')) {
      const e = state.entries.find((x) => x.path === state.selected);
      if (e) openPreview(e);
    }
  }
}

// ---------- 内嵌终端（仅桌面 app；浏览器版优雅降级）----------
const term = {
  sessions: [], seq: 0, active: null,
  dock: localStorage.getItem('fb_term_dock') || 'bottom',
  available() { return !!(window.fanboxPty && window.Terminal && !window.__noXterm); },
  theme() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, f) => (cs.getPropertyValue(n).trim() || f);
    return {
      background: v('--bg', '#0b0c0a'), foreground: v('--text', '#f2f2ea'),
      cursor: v('--accent', '#cdf24b'), cursorAccent: v('--bg', '#0b0c0a'),
      selectionBackground: v('--accent-soft', '#cdf24b33'),
    };
  },
  toggle() {
    if (!this.available()) { if (state.cwd) openWith(state.cwd, 'terminal'); return; } // 浏览器降级到系统终端
    const hidden = $('#terminal-panel').classList.contains('hidden');
    hidden ? this.open() : this.close();
  },
  open() {
    $('#terminal-panel').classList.remove('hidden');
    $('#terminal-resizer').classList.remove('hidden');
    this.applyDock();
    if (!this.sessions.length) this.newTab();
    else this.fitActive();
    $('#btn-terminal').classList.add('active');
  },
  close() {
    $('#terminal-panel').classList.add('hidden');
    $('#terminal-resizer').classList.add('hidden');
    $('#btn-terminal').classList.remove('active');
  },
  applyDock() {
    const mb = $('#main-body');
    mb.classList.toggle('dock-bottom', this.dock === 'bottom');
    mb.classList.toggle('dock-right', this.dock === 'right');
    const panel = $('#terminal-panel');
    if (this.dock === 'bottom') { panel.style.height = (Number(localStorage.getItem('fb_term_h')) || 280) + 'px'; panel.style.width = ''; }
    else { panel.style.width = (Number(localStorage.getItem('fb_term_w')) || 480) + 'px'; panel.style.height = ''; }
    this.fitActive();
  },
  setDock(d) { this.dock = d; localStorage.setItem('fb_term_dock', d); this.applyDock(); },
  async newTab() {
    const id = 't' + (++this.seq);
    const host = document.createElement('div');
    host.className = 'xterm-instance';
    $('#xterm-host').appendChild(host);
    const FitCtor = window.FitAddon ? (window.FitAddon.FitAddon || window.FitAddon) : null;
    const xterm = new window.Terminal({
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace',
      fontSize: 13, lineHeight: 1.2, cursorBlink: true, theme: this.theme(), scrollback: 5000,
    });
    const fit = FitCtor ? new FitCtor() : null;
    if (fit) xterm.loadAddon(fit);
    xterm.open(host);
    if (fit) try { fit.fit(); } catch { /* */ }
    const sess = { id, xterm, fit, host, title: baseOf(state.cwd || '') || 'shell' };
    this.sessions.push(sess);
    this.activate(id);
    const r = await window.fanboxPty.spawn({ id, cwd: state.cwd, cols: xterm.cols, rows: xterm.rows });
    if (!r.ok) { xterm.write('\r\n  \x1b[31m终端启动失败：' + (r.error || '') + '\x1b[0m\r\n'); }
    xterm.onData((d) => window.fanboxPty.input(id, d));
    xterm.onResize(({ cols, rows }) => window.fanboxPty.resize(id, cols, rows));
    this.renderTabs();
  },
  activate(id) {
    this.active = id;
    this.sessions.forEach((s) => s.host.classList.toggle('show', s.id === id));
    this.renderTabs();
    const s = this.sessions.find((x) => x.id === id);
    if (s) { this.fitActive(); setTimeout(() => s.xterm.focus(), 0); }
  },
  closeTab(id) {
    const i = this.sessions.findIndex((x) => x.id === id);
    if (i < 0) return;
    const s = this.sessions[i];
    try { window.fanboxPty.kill(id); } catch { /* */ }
    try { s.xterm.dispose(); } catch { /* */ }
    s.host.remove();
    this.sessions.splice(i, 1);
    if (!this.sessions.length) { this.close(); return; }
    if (this.active === id) this.activate(this.sessions[Math.max(0, i - 1)].id);
    else this.renderTabs();
  },
  fitActive() {
    const s = this.sessions.find((x) => x.id === this.active);
    if (!s || !s.fit) return;
    requestAnimationFrame(() => { try { s.fit.fit(); } catch { /* */ } });
  },
  renderTabs() {
    const bar = $('#term-tabs');
    bar.innerHTML = '';
    this.sessions.forEach((s) => {
      const t = document.createElement('div');
      t.className = 'term-tab' + (s.id === this.active ? ' active' : '');
      t.innerHTML = `${ic('term', 'currentColor', 12)}<span>${escapeHtml(s.title)}</span><span class="tab-x" title="关闭">✕</span>`;
      t.onclick = (e) => { if (e.target.classList.contains('tab-x')) { this.closeTab(s.id); return; } this.activate(s.id); };
      bar.appendChild(t);
    });
  },
  retheme() { const th = this.theme(); this.sessions.forEach((s) => { s.xterm.options.theme = th; }); },
};
// pty 数据回流（全局一次）
if (window.fanboxPty) {
  window.fanboxPty.onData(({ id, data }) => { const s = term.sessions.find((x) => x.id === id); if (s) s.xterm.write(data); });
  window.fanboxPty.onExit(({ id }) => { const s = term.sessions.find((x) => x.id === id); if (s) s.xterm.write('\r\n\x1b[90m[进程已退出，按 ✕ 关闭或回车重开]\x1b[0m\r\n'); });
}

// ---------- 启动 ----------
async function init() {
  applyTheme(state.theme, false);
  bindEvents();
  bindResizer();
  document.querySelectorAll('#theme-switch .theme-seg button').forEach((b) => { b.onclick = () => applyTheme(b.dataset.skin); });
  await loadRoots();
  await loadFavorites();
  await navigate(state.home, false);
  maybeShowGuide();
}
init();
