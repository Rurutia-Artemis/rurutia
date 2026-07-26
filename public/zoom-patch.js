'use strict';
/**
 * Rurutia 界面缩放（v2.15.0）
 *
 * 起因：同一台 Mac 换着接不同显示器，界面大小跟着系统 DPI 走。接 1080P 时各处控件显得肥，
 * 想整体调小、把地方让给终端；接 5K 时又不需要缩。每换一次线手动调一遍太蠢。
 *
 * 做法：
 *   1. 用 Electron 原生 zoomFactor 缩**整个界面**（含终端），一步到位、不用把 style.css 里
 *      成百上千个 px 改成 rem——那种改法工作量大、容易漏、还会和上游 diff 打架。
 *   2. 但整体缩放会把终端字号一起缩小，而终端字号是你要单独把控的（缩 UI 是为了给终端腾地方，
 *      不是为了让终端字变小）。所以缩放后按反比把 xterm 的 fontSize 补回去，
 *      净效果 = 外壳变小、终端字号不变、可视行数变多。
 *   3. **按屏幕分辨率分别记忆**：localStorage 里以「宽x高」为键存档位，插上哪台显示器就自动
 *      切到那台的档，换线不用重调。
 *
 * 只在桌面版生效（web 版没有 zoomFactor 通道，浏览器自己有 ⌘+/-）。
 */
(function () {
  if (!window.fanboxEnv || !window.fanboxEnv.isDesktopApp) return;
  if (!window.fanboxWin || typeof window.fanboxWin.setZoom !== 'function') return;

  var STEPS = [0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1];
  var KEY = 'rb_zoom_by_screen';

  function screenKey() {
    try { return Math.round(screen.width) + 'x' + Math.round(screen.height); } catch (e) { return 'default'; }
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function save(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* 隐私模式等，存不了就只当次生效 */ }
  }
  function current() {
    var v = load()[screenKey()];
    return (typeof v === 'number' && STEPS.indexOf(v) !== -1) ? v : 1;
  }

  // 终端字号反比补偿：缩放到 0.8 时把 xterm fontSize 提到 13/0.8≈16，屏幕上看仍是 13px，
  // 但外壳小了、同样高度能多放几行。sess._fontSize 是 app.js 里 ⌘+/⌘- 用的那个值，
  // 我们只在用户没手动调过字号时补偿，手动调过的以用户为准。
  var BASE_FONT = 13;
  function applyTermFont(z) {
    try {
      if (typeof term === 'undefined' || !term.sessions) return;
      var want = Math.max(10, Math.min(24, Math.round(BASE_FONT / z)));
      term.sessions.forEach(function (s) {
        if (s._zoomManaged === false) return;      // 用户手动调过字号，别覆盖
        s._zoomManaged = true;
        s._fontSize = want;
        if (s.xterm) s.xterm.options.fontSize = want;
      });
      requestAnimationFrame(function () {
        term.sessions.forEach(function (s) { try { s.fit && s.fit.fit(); } catch (e) { /* */ } });
        // 字号变了要清图集，且必须所有标签同一 tick 一起清（2.6.1 的教训：图集在同字号标签间共享）
        term.sessions.forEach(function (s) { try { s.webgl && s.webgl.clearTextureAtlas && s.webgl.clearTextureAtlas(); } catch (e) { /* */ } });
      });
    } catch (e) { /* 终端还没起来，下次 apply 会补 */ }
  }

  var zoom = current();
  function apply(z, persist) {
    zoom = z;
    window.fanboxWin.setZoom(z);
    applyTermFont(z);
    if (persist) { var m = load(); m[screenKey()] = z; save(m); }
    paint();
  }

  // ---------- 选择器：挂在侧栏皮肤开关旁边 ----------
  var style = document.createElement('style');
  style.textContent = [
    '.rb-zoom { display: flex; align-items: center; gap: 7px; padding: 0 8px 8px; }',
    '.rb-zoom-label { color: var(--text-faint); font-size: 11px; flex: none; }',
    '.rb-zoom-seg { margin-left: auto; display: inline-flex; gap: 3px; }',
    '.rb-zoom-seg button { padding: 3px 6px; border: 1px solid var(--border); border-radius: 6px; background: none;',
    '  color: var(--text-faint); font: 600 9.5px/1 var(--font-mono, monospace); cursor: pointer;',
    '  transition: color 160ms ease, background 160ms ease, border-color 160ms ease; }',
    '.rb-zoom-seg button:hover { color: var(--text-dim); }',
    '.rb-zoom-seg button.on { color: var(--accent-ink, #fff); background: var(--accent); border-color: transparent; }',
    '.rb-zoom-cur { color: var(--text-dim); font: 600 10px/1 var(--font-mono, monospace); min-width: 30px; text-align: right; }',
  ].join('\n');
  document.head.appendChild(style);

  var box = document.createElement('div');
  box.className = 'rb-zoom';
  box.innerHTML = '<span class="rb-zoom-label" title="只影响界面外壳，终端字号会自动补偿保持不变；每台显示器分别记忆">界面缩放</span>' +
    '<span class="rb-zoom-seg"><button data-d="-1" title="缩小">−</button>' +
    '<button data-d="0" title="恢复 100%">100%</button>' +
    '<button data-d="1" title="放大">+</button></span>' +
    '<span class="rb-zoom-cur"></span>';

  function paint() {
    box.querySelector('.rb-zoom-cur').textContent = Math.round(zoom * 100) + '%';
    box.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.d === '0' && zoom === 1);
    });
  }
  box.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () {
      var d = +b.dataset.d;
      if (d === 0) return apply(1, true);
      var i = STEPS.indexOf(zoom);
      if (i === -1) i = STEPS.indexOf(1);
      apply(STEPS[Math.max(0, Math.min(STEPS.length - 1, i + d))], true);
    };
  });

  function mount() {
    var sw = document.getElementById('theme-switch');
    if (!sw || !sw.parentNode) return false;
    sw.parentNode.insertBefore(box, sw);
    return true;
  }
  if (!mount()) {
    var tries = 0;
    var t = setInterval(function () { if (mount() || ++tries > 40) clearInterval(t); }, 150);
  }

  // 换显示器 / 分辨率变了：切到那台屏自己的档
  window.addEventListener('resize', function () {
    var want = current();
    if (want !== zoom) apply(want, false);
  });

  // 开机应用一次（终端可能还没起来，onData 之后再补一次字号）
  apply(zoom, false);
  setTimeout(function () { applyTermFont(zoom); }, 1500);

  window.rbZoom = { get: function () { return zoom; }, set: function (z) { apply(z, true); } };
})();
