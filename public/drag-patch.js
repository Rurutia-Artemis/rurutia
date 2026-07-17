/*
 * drag-patch.js — 窗口拖拽兜底（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * 病灶：macOS 上 Electron 的 -webkit-app-region 原生拖拽会间歇性失灵（聚焦窗口的
 *   拖拽区命中缓存过期，上游 bug；典型表现「点一下别的窗口回来能拖一次，松手后又
 *   锁死」——失焦态与聚焦态在 Chromium 里走两条不同的拖拽启动路径，坏的只是聚焦态）。
 * 药方（两层，互不依赖）：
 *   ① 焦点轻推：窗口每次拿到焦点，把 #app 的 app-region 关一帧再恢复，逼 Blink
 *      重算并重发拖拽区域给浏览器进程（DraggableRegionsChanged 会整组替换缓存），
 *      多数情况下原生拖拽就地复活；
 *   ② 手动兜底：在拖拽区按下后，若原生拖拽接管，窗口跟着指针走、clientX/Y 几乎
 *      不变（甚至收不到 move 事件）；若失灵，窗口不动、clientX/Y 位移越来越大。
 *      位移超过阈值即判定失灵，由渲染层接手：把指针相对按下点的屏幕位移经
 *      fanboxWinDrag（preload 桥）发给主进程 setPosition 移窗。
 * 判定「这里是不是拖拽区」直接读 computedStyle 的 app-region，天然跟随
 *   soft-patch/ui-patch/style.css 三处的 drag/no-drag 声明，规则改了这里不用动。
 * 仅桌面主窗生效（web 版 / 独立预览窗没有 fanboxWinDrag 桥，进来即退出）。
 */
(function () {
  'use strict';
  if (!window.fanboxWinDrag) return;

  // ---------- ① 焦点轻推：刷新原生拖拽区缓存 + 状态自愈 ----------
  window.addEventListener('focus', function () {
    // 自愈：preview-maxed 挂在 <html> 上、内嵌预览却根本没显示——这是「预览改道独立窗
    // 但 setPreviewMax(true) 照跑」留下的僵尸状态，会把整窗拖拽区关死（pv-patch 已在
    // 源头吞掉，这里兜历史残留/其它路径）。全屏态的内嵌预览必然可见，误伤不了正主。
    var pv = document.getElementById('preview');
    if (document.documentElement.classList.contains('preview-maxed') && (!pv || pv.classList.contains('hidden'))) {
      document.documentElement.classList.remove('preview-maxed');
    }
    var app = document.getElementById('app');
    if (!app) return;
    app.style.setProperty('-webkit-app-region', 'no-drag');
    requestAnimationFrame(function () { app.style.removeProperty('-webkit-app-region'); });
  });

  // ---------- ② 手动兜底 ----------
  // 判定按下点在拖拽区：沿祖先链找第一个显式声明——no-drag 即否（按钮等控件），
  // drag 即是（#app 顶部 40px 留白带）。#sidebar 本体是 no-drag、但它的 ::before
  // 是左上角 38px 高的固定拖拽条（ui-patch.css #3），按几何特判。
  function inDragRegion(e) {
    var el = e.target;
    if (!(el instanceof Element)) return false;
    for (var n = el; n && n !== document.documentElement; n = n.parentElement) {
      var r = getComputedStyle(n).getPropertyValue('app-region');
      if (r === 'no-drag') {
        if (n.id === 'sidebar' && e.clientY <= 38) {
          var ps = getComputedStyle(n, '::before');
          if (ps.display !== 'none' && ps.getPropertyValue('app-region') === 'drag') return true;
        }
        return false;
      }
      if (r === 'drag') return true;
    }
    return false;
  }

  var st = null; // { id, sx0, sy0, on, raf, mx, my }：按下点屏幕坐标 + 是否已接管
  var THRESHOLD = 5; // 原生拖拽生效时 client 位移≈0；超过它说明窗口没跟手，接管

  function flush() {
    if (!st || !st.on) return;
    st.raf = 0;
    window.fanboxWinDrag.move(st.mx - st.sx0, st.my - st.sy0);
  }
  function stop() {
    if (!st) return;
    if (st.raf) cancelAnimationFrame(st.raf);
    if (st.on) window.fanboxWinDrag.end();
    st = null;
  }

  document.addEventListener('pointerdown', function (e) {
    stop();
    if (e.button !== 0 || e.ctrlKey) return; // 只认左键；ctrl+点按是右键语义
    if (!inDragRegion(e)) return;
    st = { id: e.pointerId, cx: e.clientX, cy: e.clientY, sx0: e.screenX, sy0: e.screenY, on: false, raf: 0, mx: 0, my: 0 };
  }, true);

  document.addEventListener('pointermove', function (e) {
    if (!st || e.pointerId !== st.id) return;
    if (!(e.buttons & 1)) { stop(); return; } // 松手事件丢了也能自愈
    if (!st.on) {
      if (Math.abs(e.clientX - st.cx) + Math.abs(e.clientY - st.cy) < THRESHOLD) return;
      st.on = true;
      window.fanboxWinDrag.start();
    }
    st.mx = e.screenX; st.my = e.screenY;
    if (!st.raf) st.raf = requestAnimationFrame(flush); // 合帧发 IPC，120Hz 指针不刷爆通道
  }, true);

  document.addEventListener('pointerup', stop, true);
  document.addEventListener('pointercancel', stop, true);
  window.addEventListener('blur', stop);
})();
