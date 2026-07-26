'use strict';
/**
 * Rurutia 空转刹车（v2.14.3）
 *
 * 前提：静态画面在合成器里是**零成本**的。实测「全部元素照常画出来、只是把动效暂停」= 0.3% CPU，
 * 而同一批元素满帧跑动效 = 54%。也就是说常驻占用 100% 来自「还在动」，跟画面复杂度无关。
 *
 * 于是三档刹车，从粗到细：
 *   1. 窗口失焦 / 隐藏到 Dock / 最小化  → 整页 CSS 动画挂起（桌面版走 IPC，web 版走 visibilitychange）
 *   2. 观察舱收起                      → 它只是被 translateX 推出屏幕，DOM 还在、动画照跑，得单独摁停
 *   3. 侧栏用量面板折叠                 → 已经是 display:none，浏览器自动停，无需处理
 *
 * 用 animation-play-state 而不是 animation:none —— 前者是暂停，回来接着放，不会把
 * 一次性的 pop / settle 动画掐死在半路。
 *
 * 【两个信号，别混用】主进程推的 win:state 带两个字段：
 *   active  = 有焦点     → 决定 rb-idle 类（**只停动效**）
 *   visible = 真看得见   → 决定 rb-active 事件（**停数据轮询**）
 * 失焦但还看得见（双屏、或窗口摆在旁边）时：动效停、轮询照跑。这样副屏上那块面板画面是静的，
 * 但数字还在动，用户瞥一眼就知道 agent 是不是还活着。只有最小化 / 隐藏到 Dock 才连轮询一起停。
 */
(function () {
  var root = document.documentElement;

  var style = document.createElement('style');
  style.id = 'rb-idle-style';
  style.textContent = [
    'html.rb-idle *, html.rb-idle *::before, html.rb-idle *::after { animation-play-state: paused !important; }',
    '#app:not(.rb-obs-open) #rb-obs *, #app:not(.rb-obs-open) #rb-obs *::before,',
    '#app:not(.rb-obs-open) #rb-obs *::after { animation-play-state: paused !important; }',
  ].join('\n');
  (document.head || root).appendChild(style);

  var animOn = true, pollOn = true;
  // 动效闸：失焦即停（画面静止，但不影响数据）
  function setAnim(on) {
    on = !!on;
    if (on === animOn) return;
    animOn = on;
    root.classList.toggle('rb-idle', !on);
  }
  // 轮询闸：只有真看不见（最小化 / 隐藏到 Dock / 标签页切走）才停
  function setPoll(on) {
    on = !!on;
    if (on === pollOn) return;
    pollOn = on;
    try { document.dispatchEvent(new CustomEvent('rb-active', { detail: on })); } catch (e) { /* 老环境无 CustomEvent 构造器 */ }
  }

  // web 版：标签页切走 / 窗口最小化。浏览器里"失焦但可见"是常态，所以 web 版只认 hidden，
  // 两个闸一起走——切走了确实既没人看画面也没人看数字。
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { setAnim(false); setPoll(false); }
    else if (!window.fanboxEnv || !window.fanboxEnv.isDesktopApp) { setAnim(true); setPoll(true); }
  });

  // 桌面版：两个闸由主进程分别推
  if (window.fanboxWin && typeof window.fanboxWin.onState === 'function') {
    window.fanboxWin.onState(function (s) {
      setAnim(!!(s && s.active));
      setPoll(!!(s && s.visible));
    });
  }
})();
