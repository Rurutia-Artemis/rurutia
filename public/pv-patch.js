/*
 * pv-patch.js — 独立预览窗口 渲染层（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * 诉求：点开 MD 等可读文件别定死在主窗上方，弹一个能拖走、⌘W 关掉的真窗口。
 * 一份脚本两种身份：
 *   主窗：把「点开可读文件（text/pdf）」默认改为弹独立窗（localStorage rb_pv_default，默认开）；
 *        ⌥点击 = 临时用相反方式；预览头部加 ↗ 按钮（左键弹窗，右键切换默认行为）。
 *        重渲染（换肤刷新同一文件）、文件跟随、程序化恢复不弹窗——只有「刚有点击/按键」的
 *        用户动作才弹，其余一律走原内嵌逻辑。
 *   预览窗（?pv=路径）：纯预览模式——#preview 铺满整窗，复用 app.js 全套渲染/编辑器；
 *        preload 只给 fanboxEnv（按 web 版零桥降级），关闭按钮/⌘W 直接关窗。
 * 依赖经典脚本共享全局作用域：openPreview / renderPreviewActions / state / follow / api / toast。
 */
(function () {
  'use strict';
  var PV_PATH = null;
  try { PV_PATH = new URLSearchParams(location.search).get('pv'); } catch { /* */ }

  var rawOpen = window.openPreview;
  if (typeof rawOpen !== 'function') return; // app.js 没加载成，别碰

  if (PV_PATH) { pvWindowMode(PV_PATH); return; }
  mainWindowMode();

  // ================= 预览窗身份 =================
  function pvWindowMode(fp) {
    document.documentElement.classList.add('pv-mode');
    injectPvCss();

    // 只认自己这一个文件：init() 里「恢复上次选中」等一切其他 openPreview 全拦掉
    window.openPreview = function (e) {
      return (e && e.path === fp) ? rawOpen(e) : Promise.resolve();
    };

    document.addEventListener('keydown', function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && !ev.altKey && String(ev.key).toLowerCase() === 'w') {
        ev.preventDefault(); window.close();
      }
    });

    var boot = async function () {
      var dir = fp.replace(/\/[^/]*$/, '') || '/';
      var e = null;
      try {
        var d = await api('/api/list?path=' + encodeURIComponent(dir));
        e = ((d && d.entries) || []).find(function (x) { return x.path === fp; }) || null;
      } catch { /* */ }
      if (!e) {
        document.title = '文件打不开';
        document.body.innerHTML = '<div style="padding:40px;font:14px/1.8 sans-serif;color:#aab">文件不存在或不可读：<br>' + fp + '</div>';
        document.documentElement.classList.add('pv-ready');
        return;
      }
      document.title = e.name;
      state.selected = e.path; // 换肤重渲染等路径靠它识别当前文件
      await rawOpen(e);
      var x = document.getElementById('preview-close');
      if (x) { x.onclick = function () { window.close(); }; x.dataset.tip = '关闭窗口 ⌘W'; }
      // 编辑没保存就关窗：原生拦一下（md/代码有自动保存守卫，这是最后兜底）
      window.addEventListener('beforeunload', function (ev) {
        try {
          if (typeof currentEditor !== 'undefined' && currentEditor && currentEditor.isDirty()) {
            ev.preventDefault(); ev.returnValue = '';
          }
        } catch { /* */ }
      });
      document.documentElement.classList.add('pv-ready');
    };
    if (document.readyState !== 'loading') setTimeout(boot, 60);
    else document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 60); });
  }

  function injectPvCss() {
    var st = document.createElement('style');
    st.textContent = [
      // 开屏防闪：预览就位前整页隐身，底色仍走皮肤
      'html.pv-mode #app{opacity:0;}',
      'html.pv-ready #app{opacity:1;transition:opacity .12s ease;}',
      // 预览铺满整窗（照抄 #preview.is-max 的配方），其余板块一律不见
      'html.pv-mode #preview{position:fixed;inset:0;z-index:55;flex-basis:auto!important;width:auto!important;height:auto!important;border:none;}',
      'html.pv-mode #sidebar,html.pv-mode #sidebar-resizer,html.pv-mode #terminal-panel,html.pv-mode #terminal-resizer,html.pv-mode #preview-resizer{display:none!important;}',
      // 独立窗里「全屏放大」没意义（本来就铺满），藏掉防止点出破相
      'html.pv-mode #preview-maxbtn{display:none!important;}',
      // 首次引导弹窗别在预览窗里冒出来（共享 localStorage 一般不弹，重置引导后兜底）
      'html.pv-mode .guide-overlay{display:none!important;}',
    ].join('\n');
    document.head.appendChild(st);
  }

  // ================= 主窗身份 =================
  function mainWindowMode() {
    if (!window.fanboxWin || !window.fanboxWin.openPv) return; // web 版 / 旧 preload：维持原状

    var lastGesture = 0, lastAlt = false, shownPath = null;
    var mark = function (ev) { lastGesture = Date.now(); lastAlt = !!ev.altKey; };
    document.addEventListener('pointerdown', mark, true);
    document.addEventListener('keydown', mark, true);

    var READABLE = { text: 1, pdf: 1 };
    var wantPop = function () { try { return localStorage.getItem('rb_pv_default') !== '0'; } catch { return true; } };
    var poppedAt = 0; // 最近一次改道去独立窗的时刻（吞掉紧跟的 setPreviewMax(true) 用）

    window.openPreview = function (e) {
      try {
        var pvEl = document.getElementById('preview');
        var rerender = pvEl && !pvEl.classList.contains('hidden') && shownPath === (e && e.path);
        var followOn = (typeof follow !== 'undefined') && follow.on;
        var pop = lastAlt ? !wantPop() : wantPop(); // ⌥点击 = 临时用相反方式
        if (e && !e.isDir && READABLE[e.kind] && pop && !rerender && !followOn && Date.now() - lastGesture < 800) {
          window.fanboxWin.openPv(e.path);
          poppedAt = Date.now();
          hintOnce();
          return Promise.resolve();
        }
      } catch { /* 判断出错就保守走内嵌 */ }
      shownPath = e && e.path;
      return rawOpen(e);
    };

    // 【主窗拖拽锁死的元凶】openTermPath 点开 md/html 后会习惯性 setPreviewMax(true)——
    // 预览已改道独立窗时内嵌预览根本没开，preview-maxed 却挂上 <html>，
    // CSS `.desktop.preview-maxed #app { app-region: no-drag }` 把主窗拖拽区整个静默关死。
    // 改道后短窗内的 setPreviewMax(true) 一律吞掉；内嵌流程（默认关弹窗 / ⌥反向）不受影响。
    var rawMax = window.setPreviewMax;
    if (typeof rawMax === 'function') {
      window.setPreviewMax = function (on) {
        if (on && Date.now() - poppedAt < 800) return;
        return rawMax(on);
      };
    }

    // 内嵌预览头部加 ↗：左键=本文件弹独立窗；右键=切换默认打开方式
    var rawActions = window.renderPreviewActions;
    if (typeof rawActions === 'function') {
      window.renderPreviewActions = function (e) {
        rawActions(e);
        try {
          if (!e || e.isDir || !READABLE[e.kind]) return;
          var box = document.getElementById('preview-actions');
          if (!box || box.querySelector('.rb-pop-btn')) return;
          var b = document.createElement('button');
          b.className = 'icon-only rb-pop-btn';
          b.dataset.tip = '在独立窗口打开（右键：切换默认打开方式）';
          b.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/><path d="M13 4h7v7"/><path d="M20 4 11 13"/></svg>';
          b.onclick = function () { window.fanboxWin.openPv(e.path); };
          b.oncontextmenu = function (ev) {
            ev.preventDefault();
            var on = wantPop();
            try { localStorage.setItem('rb_pv_default', on ? '0' : '1'); } catch { /* */ }
            toast(on ? '已改回：点开文件在内嵌面板预览（⌥点击临时弹窗）' : '已设为：点开文件弹独立窗口（⌥点击临时内嵌）');
          };
          if (box.children.length > 1) box.insertBefore(b, box.children[1]); // 排在全屏按钮后面
          else box.appendChild(b);
        } catch { /* */ }
      };
    }

    function hintOnce() {
      try {
        if (localStorage.getItem('rb_pv_hint') === '1') return;
        localStorage.setItem('rb_pv_hint', '1');
        toast('已在独立窗口打开 · ⌥点击=临时内嵌 · 想改默认：预览里 ↗ 按钮右键');
      } catch { /* */ }
    }
  }
})();
