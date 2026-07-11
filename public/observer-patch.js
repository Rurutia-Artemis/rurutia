/*
 * observer-patch.js — 观察舱（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * 主窗最右侧一列可开合的「终端工作状态」面板，视觉语言取自 GlintGrid 定稿样例
 * （design-demos/观察舱-glintgrid-样例.html），颜色全部吃皮肤 CSS 变量——换肤即换装，
 * 连大数字的彩虹渐变都是当前皮肤自己的状态色（--err/--yellow/--ok/--info/--accent）拼的。
 *
 * 真数据三路：
 *   · 模块 = 打开的终端 tab（term.sessions，数量自适应：1=独占超大 / 2=竖排 / ≥3=双列），
 *     模块头可点名换绑任意 tab；点模块图标即切到那个终端。
 *   · 格子 = 该终端的实时输出事件（fanboxPty.onData 旁听），按内容轻量分类：
 *     错误(err) / 警告(yellow) / 成功(ok) / 思考(accent) / 一般输出(info)。
 *   · 大数字 = 打开终端对应 Claude Code 会话的未完成任务数（~/.claude/tasks/<会话>/<n>.json，
 *     会话↔终端靠 ~/.claude/projects/<目录名>/<会话>.jsonl 的 cwd 对应），
 *     彩色渗入比例 = 已完成/总任务；全部归零（且确有任务完成）→ 庆祝：辉光 + 格子瀑布翻绿。
 *
 * 资源纪律（用户点名要求最低占用）：
 *   · 持续动效只碰 transform/opacity；辉光是预烘焙渐变的 opacity 切换，绝不连续动画 box-shadow；
 *   · 面板关闭或窗口隐藏 → 全部定时器停摆，pty 旁听只记一个时间戳即返回；
 *   · 任务轮询增量化：/api/list 看 mtime，只重读变过的小 json；
 *   · 数字滚轮用 CSS transition（离散值变化才动，无常驻 rAF）。
 *
 * 布局不入侵：#app 打开时加 padding-right，面板自身 fixed 靠右——不碰 #app 的
 * grid-template-columns（侧栏折叠/拖宽的内联样式一概无关），终端在开合后主动 refit。
 * web 版无终端不装载；?rbobs=demo 用演示数据（无头验收用）。
 */
(function () {
  'use strict';
  var DEMO = /rbobs=demo/.test(location.search);
  if (!window.fanboxPty && !DEMO) return;
  if (/[?&]pv=/.test(location.search)) return; // 独立预览窗里不装

  var PANEL_W = 380;
  var OPEN_KEY = 'rb_obs_open';
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AGENT_BINS = ['claude', 'codex', 'grok', 'hermes', 'openclaw', 'kimi', 'opencode', 'pi', 'codebuddy', 'qodercli'];

  // ---------- 样式：全走皮肤变量 ----------
  var st = document.createElement('style');
  st.textContent = [
    '#app { transition: padding-right 340ms cubic-bezier(.77,0,.175,1); }',
    '#app.rb-obs-open { padding-right: ' + PANEL_W + 'px; }',
    '#rb-obs { position: fixed; z-index: 45; top: 0; right: 0; bottom: 0; width: ' + PANEL_W + 'px;',
    '  display: flex; flex-direction: column; overflow: hidden;',
    '  background: var(--bg); border-left: 1px solid var(--border); color: var(--text);',
    '  transform: translateX(100%); transition: transform 340ms cubic-bezier(.77,0,.175,1);',
    '  -webkit-app-region: no-drag; }',
    '.desktop #rb-obs { top: 40px; }', // 让出顶部整条窗口拖拽区
    '#app.rb-obs-open #rb-obs { transform: none; }',
    // 顶部五色跑马灯（皮肤状态色）
    '.ro-track { position: absolute; top: 0; right: 0; left: 0; height: 3px; overflow: hidden; background: var(--panel); }',
    '.ro-train { position: absolute; top: 0; left: -22%; display: flex; width: 26%; height: 100%; animation: ro-train 8s steps(80) infinite; }',
    '.ro-train i { flex: 1; }',
    '.ro-train i:nth-child(1) { background: var(--err); }',
    '.ro-train i:nth-child(2) { background: var(--yellow); }',
    '.ro-train i:nth-child(3) { background: var(--ok); }',
    '.ro-train i:nth-child(4) { background: var(--info); }',
    '.ro-train i:nth-child(5) { background: var(--accent); }',
    '.ro-head { display: flex; align-items: center; gap: 9px; flex: 0 0 46px; padding: 3px 10px 0 15px; border-bottom: 1px solid var(--border); }',
    '.ro-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 9px var(--ok); animation: ro-breathe 2.4s steps(24) infinite; flex: 0 0 auto; }',
    '.ro-eyebrow { color: var(--text-dim); font: 9px/1 var(--font-mono, monospace); letter-spacing: .12em; text-transform: uppercase; }',
    '.ro-x { display: grid; width: 26px; height: 26px; place-items: center; margin-left: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--panel); color: var(--text-dim); cursor: pointer; font-size: 11px; transition: transform 140ms cubic-bezier(.23,1,.32,1), background 160ms ease, color 160ms ease; }',
    '.ro-x:hover { background: var(--accent-soft, var(--panel)); color: var(--text); }',
    '.ro-x:active { transform: scale(.94); }',
    // 大数字区
    '.ro-hero { position: relative; flex: 0 0 auto; padding: 22px 18px 6px; }',
    '.ro-label { margin: 0 0 11px 4px; color: var(--text-dim); font: 15px/1 var(--font-mono, monospace); letter-spacing: .12em; }',
    '.ro-bloom { position: absolute; inset: -18px -26px; opacity: 0; pointer-events: none; mix-blend-mode: screen; filter: blur(16px); transition: opacity 900ms ease;',
    '  background: radial-gradient(ellipse 60% 90% at 22% 55%, color-mix(in srgb, var(--err) 46%, transparent), transparent 60%),',
    '  radial-gradient(ellipse 55% 85% at 52% 45%, color-mix(in srgb, var(--ok) 40%, transparent), transparent 62%),',
    '  radial-gradient(ellipse 55% 90% at 82% 55%, color-mix(in srgb, var(--accent) 46%, transparent), transparent 60%); }',
    '.ro-hero.complete .ro-bloom { opacity: .75; animation: ro-bloom 3.2s ease-in-out .9s infinite; }',
    '.ro-num { position: relative; display: inline-block; font-size: 92px; font-weight: 600; line-height: 1; letter-spacing: -.05em; font-variant-numeric: tabular-nums; transition: font-size 340ms cubic-bezier(.23,1,.32,1); }',
    '.ro-num-inner { display: inline-block; }',
    '.ro-hero.complete .ro-num-inner { animation: ro-settle 520ms cubic-bezier(.23,1,.32,1); }',
    '.ro-odo { position: relative; display: inline-flex; }',
    '.ro-layer { display: inline-flex; height: 1em; overflow: hidden; }',
    '.ro-layer.white { position: absolute; inset: 0; color: var(--text); clip-path: inset(0 0 0 0); transition: clip-path 600ms ease; }',
    '.ro-layer.rainbow strong { color: transparent;',
    '  background: linear-gradient(100deg, var(--err) 0%, var(--yellow) 22%, var(--ok) 44%, var(--info) 66%, var(--accent) 86%, var(--err) 100%);',
    '  background-size: 64px 100%; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;',
    '  animation: ro-flow 5.6s linear infinite; }',
    '.ro-hero.complete .ro-layer.rainbow strong { animation-duration: 2.4s; }',
    '.ro-digit { display: inline-block; vertical-align: top; width: .6em; height: 1em; overflow: hidden; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.ro-digit.off, .ro-sep.off { width: 0; opacity: 0; }',
    '.ro-sep { display: inline-block; vertical-align: top; width: .3em; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.ro-reel { display: block; transition: transform 680ms cubic-bezier(.23,1,.32,1); will-change: transform; }',
    '.ro-reel strong, .ro-sep strong { display: block; height: 1em; line-height: 1; font-weight: 600; }',
    '.ro-sep strong { transform: translateY(-.1em); }', // Maple Mono 的逗号偏低，1em 裁切盒里视觉下坠，微抬回来

    '.ro-trend { margin-top: 13px; color: var(--text-dim); font: 12.5px/1.5 var(--font-mono, monospace); }',
    '.ro-trend b { color: var(--ok); font-weight: 500; }',
    // 模块区
    '.ro-flow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 34px 14px 12px; min-height: 0; overflow-y: auto; align-content: start; }',
    '.ro-flow.cols-1 { grid-template-columns: 1fr; }',
    '.ro-flow::-webkit-scrollbar { width: 0; }',
    '.ro-mod { min-width: 0; padding: 10px 11px 11px; border: 1px solid var(--border); border-radius: 13px; background: var(--panel); }',
    '.ro-mod-head { display: flex; align-items: center; gap: 7px; margin-bottom: 9px; }',
    '.ro-st { width: 6px; height: 6px; border-radius: 50%; background: var(--text-faint); flex: 0 0 auto; }',
    '.ro-st.working { background: var(--ok); box-shadow: 0 0 8px var(--ok); animation: ro-breathe 2.4s steps(24) infinite; }',
    '.ro-st.waiting { background: var(--yellow); box-shadow: 0 0 8px var(--yellow); }',
    '.ro-st.exited { background: var(--err); }',
    '.ro-pick { display: flex; align-items: center; gap: 5px; min-width: 0; border: none; background: none; padding: 2px 4px; margin: -2px 0; border-radius: 6px; color: var(--text); font-size: 12px; font-weight: 650; cursor: pointer; transition: background 160ms ease, transform 140ms cubic-bezier(.23,1,.32,1); }',
    '.ro-pick:hover { background: var(--accent-soft, rgba(128,128,128,.12)); }',
    '.ro-pick:active { transform: scale(.97); }',
    '.ro-pick small { color: var(--text-faint); font-size: 9px; }',
    '.ro-pick .ro-nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ro-cnt { margin-left: auto; color: var(--text-dim); font: 13px/1 var(--font-mono, monospace); flex: 0 0 auto; }',
    '.ro-mod.done .ro-cnt { color: var(--ok); }',
    '.ro-mod.waiting { border-color: color-mix(in srgb, var(--yellow) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--yellow) 18%, transparent), 0 0 20px color-mix(in srgb, var(--yellow) 10%, transparent); }',
    '.ro-grid { display: grid; gap: 6px; }',
    '.ro-cell { aspect-ratio: 1; border: 1px solid var(--border); border-radius: 5px; background: var(--bg); transform: translateZ(0); transition: transform 200ms cubic-bezier(.23,1,.32,1), background-color 320ms ease, border-color 320ms ease, box-shadow 320ms ease; }',
    ['err', 'yellow', 'accent', 'ok', 'info'].map(function (t) {
      var v = 'var(--' + t + ')';
      return '.ro-cell.' + t + ' { color: ' + v + '; border-color: color-mix(in srgb, ' + v + ' 78%, transparent); background: color-mix(in srgb, ' + v + ' 66%, transparent); }';
    }).join('\n'),
    '.ro-cell.chasing { outline: 1px solid currentColor; outline-offset: 1px; transform: translateY(-2px) scale(1.08); box-shadow: 0 0 12px -1px currentColor; }',
    '.ro-cell.pop { animation: ro-pop 340ms cubic-bezier(.23,1,.32,1); }',
    '.ro-empty { grid-column: 1 / -1; padding: 30px 10px; color: var(--text-faint); font: 12px/1.8 var(--font-mono, monospace); text-align: center; }',
    '.ro-foot { margin-top: auto; display: flex; align-items: center; gap: 10px; flex: 0 0 auto; padding: 11px 16px; border-top: 1px solid var(--border); color: var(--text-faint); font: 9.5px/1.5 var(--font-mono, monospace); }',
    '.ro-legend { display: flex; gap: 9px; }',
    '.ro-legend i { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border-radius: 2px; background: currentColor; }',
    '.ro-foot .sp { flex: 1; }',
    // 换绑菜单：origin-aware
    '.ro-menu { position: fixed; z-index: 120; min-width: 170px; padding: 5px; border: 1px solid var(--border); border-radius: 11px; background: var(--panel); box-shadow: var(--shadow, 0 18px 60px rgba(0,0,0,.4)); transform-origin: top left; transform: scale(.97); opacity: 0; transition: transform 150ms cubic-bezier(.23,1,.32,1), opacity 150ms cubic-bezier(.23,1,.32,1); }',
    '.ro-menu.open { transform: scale(1); opacity: 1; }',
    '.ro-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: none; border-radius: 7px; background: none; color: var(--text); font-size: 11.5px; text-align: left; cursor: pointer; transition: background 140ms ease; }',
    '.ro-menu button:hover { background: var(--accent-soft, rgba(128,128,128,.12)); }',
    '.ro-menu button .sq { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }',
    '.ro-menu button .now { margin-left: auto; color: var(--ok); font: 8px/1 var(--font-mono, monospace); }',
    '@keyframes ro-breathe { 0%,100% { opacity: 1; } 50% { opacity: .45; } }',
    '@keyframes ro-train { to { left: 100%; } }',
    '@keyframes ro-flow { to { background-position: 64px 0; } }',
    '@keyframes ro-bloom { 0%,100% { opacity: .75; } 50% { opacity: .5; } }',
    '@keyframes ro-settle { 0% { transform: scale(1.035); } 100% { transform: scale(1); } }',
    '@keyframes ro-pop { 0% { transform: scale(.82); } 62% { transform: scale(1.10); } 100% { transform: scale(1); } }',
    '@media (prefers-reduced-motion: reduce) { .ro-train, .ro-dot, .ro-st, .ro-cell.pop, .ro-hero.complete .ro-num-inner { animation: none !important; } #rb-obs, #app { transition-duration: 1ms; } }',
  ].join('\n');
  document.head.appendChild(st);

  // ---------- DOM ----------
  var app = document.getElementById('app');
  if (!app) return;
  var aside = document.createElement('aside');
  aside.id = 'rb-obs';
  aside.innerHTML =
    '<div class="ro-track"><div class="ro-train"><i></i><i></i><i></i><i></i><i></i></div></div>' +
    '<header class="ro-head"><span class="ro-dot"></span><span class="ro-eyebrow">Live · 终端工作状态</span>' +
    '<button class="ro-x" title="收起观察舱（终端 ⋯ 菜单可再打开）">✕</button></header>' +
    '<div class="ro-hero"><span class="ro-bloom"></span><div class="ro-label">未完成任务</div>' +
    '<span class="ro-num-inner"><span class="ro-num"><span class="ro-odo"></span></span></span>' +
    '<div class="ro-trend">—</div></div>' +
    '<div class="ro-flow"></div>' +
    '<footer class="ro-foot"><span class="ro-legend">' +
    '<span style="color:var(--ok)"><i></i>成功</span><span style="color:var(--yellow)"><i></i>警告</span>' +
    '<span style="color:var(--err)"><i></i>错误</span><span style="color:var(--info)"><i></i>输出</span>' +
    '</span><span class="sp"></span><span>只观察 · 不接管</span></footer>';
  app.appendChild(aside);
  var flow = aside.querySelector('.ro-flow');
  var hero = aside.querySelector('.ro-hero');
  var trendEl = aside.querySelector('.ro-trend');

  // ---------- 开合（关闭 = 零成本） ----------
  function isOpen() { return app.classList.contains('rb-obs-open'); }
  function setOpen(on) {
    app.classList.toggle('rb-obs-open', !!on);
    try { localStorage.setItem(OPEN_KEY, on ? '1' : '0'); } catch (e) { /* */ }
    if (on) { startAll(); } else { stopAll(); }
    // 面板推开/收回改变主区宽度：终端网格要 refit（过渡中补一次，结束再一次）
    var refit = function () { try { if (typeof term !== 'undefined' && term.fitActive) term.fitActive(); } catch (e) { /* */ } };
    setTimeout(refit, 180); setTimeout(refit, 380);
  }
  aside.querySelector('.ro-x').onclick = function () { setOpen(false); };
  window.rbObserver = { toggle: function () { setOpen(!isOpen()); }, open: function () { setOpen(true); }, isOpen: isOpen };

  // ---------- 会话源 ----------
  var demoSessions = DEMO ? [
    { id: 'd1', title: 'Rurubox', cwd: '/tmp/Rurubox' }, { id: 'd2', title: 'Build', cwd: '/tmp/Build' },
    { id: 'd3', title: 'Tests', cwd: '/tmp/Tests' }, { id: 'd4', title: 'Server', cwd: '/tmp/Server' },
    { id: 'd5', title: 'Codex', cwd: '/tmp/Codex' }, { id: 'd6', title: 'zsh', cwd: '/tmp/zsh' },
  ] : null;
  function sessionsNow() {
    if (DEMO) return demoSessions;
    try { return (typeof term !== 'undefined' && term.sessions) ? term.sessions.filter(function (s) { return !s.dead; }) : []; } catch (e) { return []; }
  }
  var baseName = function (p) { return String(p || '').replace(/\/$/, '').split('/').pop() || 'shell'; };
  function nameOf(s) { return s.title || baseName(s.cwd || s.startDir) || '终端'; }
  function hueOf(s) {
    try { if (!DEMO && typeof term !== 'undefined' && term.hueOf) return term.hueOf(s.cwd || s.startDir); } catch (e) { /* */ }
    var str = String(s.id), h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  // ---------- 活动旁听（面板关着时只记时间戳） ----------
  var act = {}; // sid -> { last, pend:[], proc, cells:[], ptr, open:任务数, done:任务数 }
  function actOf(sid) { return act[sid] || (act[sid] = { last: 0, pend: [], proc: '', cells: null, ptr: 0, open: null, done: 0 }); }
  function classify(chunk) {
    var s = String(chunk).slice(0, 400);
    if (/error|failed|✗|✘|exception|fatal/i.test(s)) return 'err';
    if (/warn/i.test(s)) return 'yellow';
    if (/✓|✔|passed|success|committed| done/i.test(s)) return 'ok';
    if (/✻|thinking|esc to interrupt/i.test(s)) return 'accent';
    return 'info';
  }
  if (!DEMO && window.fanboxPty && window.fanboxPty.onData) {
    window.fanboxPty.onData(function (m) {
      var a = actOf(m.id);
      a.last = Date.now();
      if (!isOpen() || document.hidden) return;
      if (a.pend.length < 4) a.pend.push(classify(m.data));
    });
  }

  // ---------- 模块渲染（数量自适应 + 可换绑） ----------
  var overrides = {}; // 槽位 -> sid（用户手选）
  var mods = []; // { sid, el, cells:[], cols }
  var lastKey = '';
  function layoutFor(n) {
    return n === 1 ? { one: true, cols: 6, rows: 4 } : n === 2 ? { one: true, cols: 8, rows: 3 } : { one: false, cols: 6, rows: 5 };
  }
  function pickSessions() {
    var ss = sessionsNow();
    var byId = {}; ss.forEach(function (s) { byId[s.id] = s; });
    var chosen = [], used = {};
    for (var slot = 0; slot < Math.min(6, ss.length); slot++) {
      var want = overrides[slot] && byId[overrides[slot]] && !used[overrides[slot]] ? byId[overrides[slot]] : null;
      if (!want) { for (var i = 0; i < ss.length; i++) { if (!used[ss[i].id]) { want = ss[i]; break; } } }
      if (!want) break;
      used[want.id] = 1; chosen.push(want);
    }
    return chosen;
  }
  function rebuildModules() {
    var chosen = pickSessions();
    var L = layoutFor(Math.max(1, chosen.length));
    flow.classList.toggle('cols-1', !!L.one);
    mods = [];
    if (!chosen.length) {
      flow.innerHTML = '<div class="ro-empty">还没有打开的终端<br>开个终端跑 agent，这里就活了</div>';
      lastKey = 'empty';
      return;
    }
    flow.innerHTML = '';
    chosen.forEach(function (s, slot) {
      var a = actOf(s.id);
      var total = L.cols * L.rows;
      if (!a.cells || a.cells.length !== total) { a.cells = new Array(total).fill(null); a.ptr = 0; }
      var el = document.createElement('div');
      el.className = 'ro-mod';
      el.innerHTML = '<div class="ro-mod-head"><span class="ro-st"></span>' +
        '<button class="ro-pick" title="点名字换绑窗口 · 点图标切到该终端"><span class="ro-nm"></span><small>▾</small></button>' +
        '<span class="ro-cnt">—</span></div>' +
        '<div class="ro-grid" style="grid-template-columns:repeat(' + L.cols + ',1fr)">' + new Array(total + 1).join('<i class="ro-cell"></i>') + '</div>';
      el.querySelector('.ro-nm').textContent = nameOf(s);
      el.querySelector('.ro-nm').style.color = 'hsl(' + hueOf(s) + ' 62% 58%)';
      el.querySelector('.ro-pick').onclick = function (ev) { openMenu(ev, slot); };
      flow.appendChild(el);
      var m = { sid: s.id, el: el, cellEls: [].slice.call(el.querySelectorAll('.ro-cell')), cols: L.cols };
      // 回放该会话已积累的格子状态（重建布局不丢历史）
      a.cells.forEach(function (tone, i) { if (tone && m.cellEls[i]) m.cellEls[i].classList.add(tone); });
      mods.push(m);
    });
  }
  function sessionsKey() {
    return pickSessions().map(function (s) { return s.id; }).join(',') + '|' + JSON.stringify(overrides);
  }

  // 换绑菜单
  var menu = null;
  function closeMenu() {
    if (!menu) return; var m = menu; menu = null;
    m.classList.remove('open'); setTimeout(function () { m.remove(); }, 160);
    document.removeEventListener('mousedown', onOut, true);
  }
  function onOut(ev) { if (menu && !menu.contains(ev.target)) closeMenu(); }
  function openMenu(ev, slot) {
    ev.stopPropagation();
    if (menu) { closeMenu(); return; }
    var ss = sessionsNow();
    menu = document.createElement('div');
    menu.className = 'ro-menu';
    menu.innerHTML = ss.map(function (s) {
      return '<button data-sid="' + s.id + '"><span class="sq" style="background:hsl(' + hueOf(s) + ' 62% 48%)"></span>' +
        '<span>' + String(nameOf(s)).replace(/[<>&]/g, '') + '</span>' +
        (mods[slot] && mods[slot].sid === s.id ? '<span class="now">当前</span>' : '') + '</button>';
    }).join('');
    document.body.appendChild(menu);
    var r = ev.currentTarget.getBoundingClientRect();
    menu.style.left = Math.min(window.innerWidth - 190, r.left) + 'px';
    menu.style.top = (r.bottom + 5) + 'px';
    requestAnimationFrame(function () { if (menu) menu.classList.add('open'); });
    menu.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { overrides[slot] = b.dataset.sid; closeMenu(); refreshSessions(true); };
    });
    document.addEventListener('mousedown', onOut, true);
  }
  function refreshSessions(force) {
    var key = sessionsKey();
    if (force || key !== lastKey) { lastKey = key; rebuildModules(); }
  }

  // ---------- 格子事件消化 + 巡场 ----------
  function drainTick() {
    mods.forEach(function (m) {
      var a = actOf(m.sid);
      var tone = a.pend.shift();
      if (DEMO) tone = Math.random() < .55 ? ['info', 'ok', 'accent', 'yellow', 'err'][Math.floor(Math.random() * 5)] : null;
      if (!tone) return;
      var i = a.ptr % a.cells.length;
      a.cells[i] = tone; a.ptr++;
      var c = m.cellEls[i];
      if (!c) return;
      c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'pop');
      c.classList.add(tone);
      if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
    });
  }
  function chaseTick() {
    mods.forEach(function (m, i) {
      var prev = m.el.querySelector('.ro-cell.chasing');
      if (prev) prev.classList.remove('chasing');
      var step = Math.floor(Date.now() / 640) + i * 5;
      var c = m.cellEls[step % m.cellEls.length];
      if (c) c.classList.add('chasing');
    });
  }

  // ---------- 状态（工作中 / 等回话 / 空闲） ----------
  function statusTick() {
    var now = Date.now();
    mods.forEach(function (m) {
      var a = actOf(m.sid);
      var stEl = m.el.querySelector('.ro-st');
      var working = now - a.last < 4000;
      var agent = AGENT_BINS.indexOf(String(a.proc).toLowerCase()) !== -1;
      var cls = working ? 'working' : (agent ? 'waiting' : 'idle');
      if (DEMO) cls = ['working', 'working', 'waiting', 'idle', 'working', 'idle'][mods.indexOf(m)] || 'idle';
      stEl.className = 'ro-st ' + cls;
      stEl.title = cls === 'working' ? '工作中' : cls === 'waiting' ? (a.proc + ' 在等你回话') : '空闲';
      m.el.classList.toggle('waiting', cls === 'waiting');
      var cnt = m.el.querySelector('.ro-cnt');
      cnt.textContent = a.open == null ? '—' : (a.open === 0 && a.done > 0 ? '✓ 0' : String(a.open));
      m.el.classList.toggle('done', a.open === 0 && a.done > 0);
    });
  }
  function procTick() {
    if (DEMO || !window.fanboxPty || !window.fanboxPty.proc) return;
    mods.forEach(function (m) {
      window.fanboxPty.proc(m.sid).then(function (r) {
        if (r && r.ok) actOf(m.sid).proc = String(r.proc || '').split('/').pop().replace(/^-/, '').toLowerCase();
      }).catch(function () { /* */ });
    });
  }

  // ---------- 任务数（~/.claude/tasks ↔ 终端 cwd 归属） ----------
  var mungeCwd = function (cwd) { return String(cwd || '').replace(/[^A-Za-z0-9]/g, '-'); };
  var projCache = {};  // 目录名 -> { sids:[], t }
  var taskDirSet = { set: null, t: 0 };
  var fileCache = {};  // 任务文件 path -> { mtime, open, done }
  var prevTotal = null;
  var celebrated = false;
  function listDir(p) {
    return api('/api/list?path=' + encodeURIComponent(p)).then(function (d) { return (d && d.entries) || []; }).catch(function () { return []; });
  }
  async function tasksTick() {
    if (DEMO) { demoTaskTick(); return; }
    try {
      var now = Date.now();
      if (!taskDirSet.set || now - taskDirSet.t > 30000) {
        var t = await listDir('~/.claude/tasks');
        taskDirSet = { set: new Set(t.map(function (e) { return e.name; })), t: now };
      }
      var totals = { open: 0, done: 0 };
      for (var mi = 0; mi < mods.length; mi++) {
        var m = mods[mi];
        var s = sessionsNow().find(function (x) { return x.id === m.sid; });
        if (!s) continue;
        var cwd = s.cwd || s.startDir || '';
        var dirName = mungeCwd(cwd);
        var pc = projCache[dirName];
        if (!pc || now - pc.t > 60000) {
          var entries = await listDir('~/.claude/projects/' + dirName);
          var sids = entries.filter(function (e) { return /\.jsonl$/.test(e.name) && now - (e.mtime || 0) < 12 * 3600e3; })
            .map(function (e) { return e.name.replace(/\.jsonl$/, ''); });
          pc = projCache[dirName] = { sids: sids, t: now };
        }
        var open = null, done = 0, reads = 0;
        for (var si = 0; si < pc.sids.length; si++) {
          var sid = pc.sids[si];
          if (!taskDirSet.set.has(sid)) continue;
          var files = await listDir('~/.claude/tasks/' + sid);
          for (var fi = 0; fi < files.length; fi++) {
            var f = files[fi];
            if (!/\.json$/.test(f.name)) continue;
            var fc = fileCache[f.path];
            if (!fc || fc.mtime !== f.mtime) {
              if (reads++ > 40) continue; // 单轮读盘上限，剩下的下一轮补
              var d = await api('/api/read?path=' + encodeURIComponent(f.path)).catch(function () { return null; });
              var one = { mtime: f.mtime, open: 0, done: 0 };
              try {
                var j = JSON.parse((d && d.content) || '{}');
                if (j && j.status) { if (j.status === 'completed') one.done = 1; else one.open = 1; }
              } catch (e) { /* 非任务 json，忽略 */ }
              fc = fileCache[f.path] = one;
            }
            open = (open || 0) + fc.open; done += fc.done;
          }
        }
        var a = actOf(m.sid);
        a.open = open; a.done = done;
        if (open != null) { totals.open += open; totals.done += done; }
      }
      var any = mods.some(function (mm) { return actOf(mm.sid).open != null; });
      paintTasks(any ? totals.open : null, totals.done);
    } catch (e) { /* 数据层失败不打扰界面 */ }
  }

  // ---------- 大数字滚轮 ----------
  var DIGITS = 6;
  var odo = aside.querySelector('.ro-odo');
  function buildLayer(cls) {
    var layer = document.createElement('span');
    layer.className = 'ro-layer ' + cls;
    for (var k = DIGITS - 1; k >= 0; k--) {
      if (k === 2) { var sp = document.createElement('span'); sp.className = 'ro-sep'; sp.innerHTML = '<strong>,</strong>'; layer.appendChild(sp); }
      var d = document.createElement('span');
      d.className = 'ro-digit'; d.dataset.k = k;
      var reel = '<span class="ro-reel">';
      for (var n = 0; n <= 10; n++) reel += '<strong>' + (n % 10) + '</strong>';
      d.innerHTML = reel + '</span>';
      layer.appendChild(d);
    }
    odo.appendChild(layer);
    return layer;
  }
  var layerRainbow = buildLayer('rainbow');
  var layerWhite = buildLayer('white');
  var numEl = aside.querySelector('.ro-num');
  function paintTasks(open, done) {
    var n = Math.max(0, Math.min(999999, open == null ? 0 : open));
    var fs = n >= 100000 ? 66 : n >= 10000 ? 80 : 92;
    numEl.style.fontSize = fs + 'px';
    [layerRainbow, layerWhite].forEach(function (layer) {
      layer.querySelectorAll('.ro-digit').forEach(function (d) {
        var k = +d.dataset.k;
        var D = Math.floor(n / Math.pow(10, k)) % 10;
        d.querySelector('.ro-reel').style.transform = 'translateY(' + (-D) + 'em)';
        d.classList.toggle('off', n < Math.pow(10, k) && k > 0);
      });
      var sep = layer.querySelector('.ro-sep');
      if (sep) sep.classList.toggle('off', n < 1000);
    });
    // 彩色渗入比例 = 已完成占比（前 6% 保持纯白）
    var totalAll = n + done;
    var completion = totalAll > 0 ? done / totalAll : 0;
    var colorProgress = Math.pow(Math.max(0, (completion - .06) / .94), 1.18);
    layerWhite.style.clipPath = 'inset(0 ' + (colorProgress * 100).toFixed(2) + '% 0 0)';
    aside.querySelector('.ro-bloom').style.opacity = '';
    var zeroWin = n === 0 && done > 0;
    if (!zeroWin) aside.querySelector('.ro-bloom').style.opacity = (colorProgress * .25).toFixed(3);
    hero.classList.toggle('complete', zeroWin);
    trendEl.innerHTML = open == null && done === 0
      ? '还没检测到 agent 任务 · 终端里的 Claude Code 建了任务就会出现'
      : (zeroWin ? '<b>✓ 全部解决</b> · ' + done + ' 项完成' : '<b>↓ ' + done + '</b> 已完成 · live');
    if (zeroWin && prevTotal > 0 && !celebrated) { celebrated = true; cascade(); }
    if (n > 0) celebrated = false;
    prevTotal = n;
  }
  function cascade() {
    mods.forEach(function (m, mi) {
      m.cellEls.forEach(function (c, ci) {
        var delay = reduceMotion ? 0 : mi * 60 + (Math.floor(ci / m.cols) + ci % m.cols) * 30;
        setTimeout(function () {
          c.classList.remove('err', 'yellow', 'accent', 'info', 'pop');
          c.classList.add('ok');
          if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
          actOf(m.sid).cells[ci] = 'ok';
        }, delay);
      });
    });
  }

  // 演示模式的任务倒数（无头验收用）：份额分给各模块，计数不再是「—」
  var demoLeft = 4581;
  var DEMO_SHARE = [.30, .22, .18, .12, .12, .06];
  function demoTaskTick() {
    demoLeft = Math.max(0, demoLeft - Math.ceil(demoLeft * .04));
    if (demoLeft < 6) demoLeft = 0;
    var done = 4581 - demoLeft;
    mods.forEach(function (m, i) {
      var a = actOf(m.sid);
      a.open = Math.round(demoLeft * (DEMO_SHARE[i] || .1));
      a.done = Math.round(done * (DEMO_SHARE[i] || .1));
    });
    paintTasks(demoLeft, done);
    return demoLeft;
  }

  // ---------- 引擎开关（关闭/隐藏 = 零成本） ----------
  var timers = [];
  function startAll() {
    if (timers.length) return;
    refreshSessions(true);
    timers = [
      setInterval(function () { refreshSessions(false); }, 2000),
      setInterval(chaseTick, 640),
      setInterval(drainTick, 700),
      setInterval(statusTick, 1000),
      setInterval(procTick, 5000),
      setInterval(tasksTick, 8000),
    ];
    statusTick(); procTick(); tasksTick();
  }
  function stopAll() { timers.forEach(clearInterval); timers = []; closeMenu(); }
  document.addEventListener('visibilitychange', function () {
    if (!isOpen()) return;
    if (document.hidden) stopAll(); else startAll();
  });

  // 初始状态：记住上次开合；演示模式默认打开
  var saved = null;
  try { saved = localStorage.getItem(OPEN_KEY); } catch (e) { /* */ }
  if (DEMO || saved === '1') setOpen(true);
})();
