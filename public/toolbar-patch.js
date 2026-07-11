/*
 * toolbar-patch.js — 终端工具条折叠（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * 诉求：term-actions 一排 12 颗太挤 → 自选几颗常驻，其余收进「⋯」溢出菜单。
 * 机制要点（为什么不搬 DOM）：
 *   · agent 启动键由 app.js 的 renderAgentButtons() 动态重建，且拿 #agent-config 当插入锚点，
 *     把按钮搬走会断锚 / 产生复制品 —— 所以折叠 = 原地 display:none，菜单里放实时克隆的代理行，
 *     点代理转发 real.click()，真按钮的事件、状态、小红点全程不动。
 *   · agentsPop 弹层锚定在 #agent-config 的矩形上：按钮折叠时点代理后把弹层重锚到 ⋯。
 * 常驻不可折叠：agent 启动键（工具条的门面）与 ✕ 收起。
 * 持久化：localStorage rb_toolbar_pins（要露出的按钮 id 数组，默认只留「新终端」）。
 * 菜单底部：截个图 / 截图快捷键…（shot-patch 提供）/ 自定义工具条…。
 */
(function () {
  'use strict';
  var FOLDABLE = [
    { id: 'agent-config', label: 'Agent 设置' },
    { id: 'term-plain', label: '普通终端' },
    { id: 'term-wechat', label: '微信 ClawBot' },
    { id: 'file-follow', label: '文件跟随' },
    { id: 'term-newtab', label: '新终端' },
    { id: 'term-max', label: '终端铺满' },
    { id: 'term-dock', label: '上下 / 左右布局' },
    { id: 'term-replay', label: '录像回放' },
    { id: 'term-mute', label: '提示音开关' },
  ];
  var DEFAULT_PINS = ['term-newtab'];
  var actions = document.querySelector('.term-actions');
  if (!actions) return;

  function getPins() {
    try {
      var j = JSON.parse(localStorage.getItem('rb_toolbar_pins'));
      if (Array.isArray(j)) return j;
    } catch { /* */ }
    return DEFAULT_PINS.slice();
  }
  function setPins(list) {
    try { localStorage.setItem('rb_toolbar_pins', JSON.stringify(list)); } catch { /* */ }
  }

  // ---------- ⋯ 按钮（放在 ✕ 前面，样式吃 .term-actions button 的现成规则） ----------
  var moreBtn = document.createElement('button');
  moreBtn.id = 'term-more';
  moreBtn.title = '更多工具';
  moreBtn.innerHTML = '<svg class="term-svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg><span class="rb-more-dot hidden"></span>';
  var closeBtn = document.getElementById('term-close');
  if (closeBtn) actions.insertBefore(moreBtn, closeBtn); else actions.appendChild(moreBtn);

  function applyPins() {
    var pins = getPins();
    var foldedCount = 0;
    FOLDABLE.forEach(function (f) {
      var el = document.getElementById(f.id);
      if (!el) return;
      var folded = pins.indexOf(f.id) === -1;
      el.classList.toggle('rb-folded', folded);
      if (folded) foldedCount++;
    });
    moreBtn.classList.toggle('rb-folded', foldedCount === 0); // 全都常驻时 ⋯ 自己也别占位
    syncDot();
  }

  // 微信折叠进菜单后，连接状态小红点镜像到 ⋯ 上，不丢状态感知
  function syncDot() {
    var dot = moreBtn.querySelector('.rb-more-dot');
    var real = document.getElementById('wechat-dot');
    var wc = document.getElementById('term-wechat');
    var show = real && wc && !real.classList.contains('hidden') && wc.classList.contains('rb-folded');
    if (dot) dot.classList.toggle('hidden', !show);
  }
  var realDot = document.getElementById('wechat-dot');
  if (realDot && window.MutationObserver) {
    new MutationObserver(syncDot).observe(realDot, { attributes: true, attributeFilter: ['class'] });
  }

  // ---------- ⋯ 溢出菜单（每次打开现做，克隆的图标永远是最新状态） ----------
  var menu = null;
  function closeMenu() {
    if (!menu) return;
    menu.remove(); menu = null;
    document.removeEventListener('mousedown', onOut, true);
    document.removeEventListener('keydown', onEsc, true);
  }
  function onOut(ev) { if (menu && !menu.contains(ev.target) && !moreBtn.contains(ev.target)) closeMenu(); }
  function onEsc(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); closeMenu(); } }

  function cloneIcon(real) {
    var tmp = document.createElement('span');
    tmp.innerHTML = real.innerHTML;
    tmp.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); }); // 防 id 重复（wechat-dot 等）
    return tmp.innerHTML;
  }

  function openMenu() {
    if (menu) { closeMenu(); return; }
    var pins = getPins();
    menu = document.createElement('div');
    menu.className = 'rb-more-menu';
    var rows = '';
    FOLDABLE.forEach(function (f) {
      var real = document.getElementById(f.id);
      if (!real || pins.indexOf(f.id) !== -1) return;
      var on = real.classList.contains('on');
      rows += '<button class="rb-tm-row" data-for="' + f.id + '"><span class="rb-tm-ic' + (on ? ' on' : '') + '">' + cloneIcon(real) + '</span><span class="rb-tm-lb">' + f.label + '</span></button>';
    });
    var extra = '';
    if (window.fanboxShot && window.fanboxShot.capture) {
      extra += '<button class="rb-tm-row" data-act="shot"><span class="rb-tm-ic">✂</span><span class="rb-tm-lb">截个图（直通终端）</span></button>';
    }
    if (window.rbShotSettings) {
      extra += '<button class="rb-tm-row" data-act="hotkey"><span class="rb-tm-ic">⌘</span><span class="rb-tm-lb">截图快捷键…</span></button>';
    }
    extra += '<button class="rb-tm-row" data-act="custom"><span class="rb-tm-ic">⚙</span><span class="rb-tm-lb">自定义工具条…</span></button>';
    menu.innerHTML = rows + (rows ? '<div class="rb-tm-sep"></div>' : '') + extra;
    document.body.appendChild(menu);
    var r = moreBtn.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom + 6) + 'px';
    menu.style.right = Math.max(8, Math.round(window.innerWidth - r.right - 4)) + 'px';

    menu.querySelectorAll('.rb-tm-row').forEach(function (row) {
      row.onclick = function () {
        var act = row.dataset.act, id = row.dataset.for;
        closeMenu();
        if (act === 'shot') { window.fanboxShot.capture(); return; }
        if (act === 'hotkey') { window.rbShotSettings(); return; }
        if (act === 'custom') { openCustomize(); return; }
        var real = document.getElementById(id);
        if (!real) return;
        real.click();
        // agentsPop 锚定在被折叠的按钮上会飘到左上角：点完把弹层重锚到 ⋯
        if (id === 'agent-config') {
          setTimeout(function () {
            try {
              var pop = (typeof agentsPop !== 'undefined') && agentsPop.el;
              if (pop) {
                var rr = moreBtn.getBoundingClientRect();
                pop.style.top = Math.round(rr.bottom + 6) + 'px';
                pop.style.right = Math.max(8, Math.round(window.innerWidth - rr.right - 8)) + 'px';
              }
            } catch { /* */ }
          }, 0);
        }
      };
    });
    document.addEventListener('mousedown', onOut, true);
    document.addEventListener('keydown', onEsc, true);
  }
  moreBtn.onclick = openMenu;

  // ---------- 自定义面板：勾谁谁常驻 ----------
  function openCustomize() {
    var pins = getPins();
    var ov = document.createElement('div');
    ov.className = 'input-overlay';
    ov.innerHTML = '<div class="input-dialog">' +
      '<div class="input-title">自定义终端工具条</div>' +
      '<div class="rb-tc-list">' +
      FOLDABLE.map(function (f) {
        return '<label class="rb-tc-row"><input type="checkbox" data-id="' + f.id + '"' + (pins.indexOf(f.id) !== -1 ? ' checked' : '') + '><span>' + f.label + '</span></label>';
      }).join('') +
      '</div>' +
      '<div class="rb-hk-hint">勾选 = 常驻工具条 · 其余收进 ⋯ 菜单 · agent 启动键与 ✕ 恒常驻</div>' +
      '<div class="input-actions"><button class="ghost-btn" data-act="cancel">取消</button><button class="primary" data-act="ok">保存</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    var done = function (save) {
      if (save) {
        var list = [];
        ov.querySelectorAll('input[data-id]:checked').forEach(function (cb) { list.push(cb.dataset.id); });
        setPins(list);
        applyPins();
        toast('工具条已更新');
      }
      ov.remove();
    };
    ov.querySelector('[data-act=ok]').onclick = function () { done(true); };
    ov.querySelector('[data-act=cancel]').onclick = function () { done(false); };
    ov.onclick = function (ev) { if (ev.target === ov) done(false); };
  }

  // ---------- 样式（全走皮肤变量） ----------
  var st = document.createElement('style');
  st.textContent = [
    '.term-actions .rb-folded{display:none!important;}',
    '#term-more{position:relative;}',
    '#term-more .rb-more-dot{position:absolute;top:2px;right:2px;width:6px;height:6px;border-radius:50%;background:var(--err,#e66);}',
    '#term-more .rb-more-dot.hidden{display:none;}',
    '.rb-more-menu{position:fixed;z-index:300;min-width:172px;padding:5px;background:var(--panel,#1c1e26);border:1px solid var(--border,#333);border-radius:var(--radius,10px);box-shadow:var(--shadow,0 8px 30px rgba(0,0,0,.4));}',
    '.rb-tm-row{display:flex;align-items:center;gap:9px;width:100%;padding:6px 9px;border:none;background:none;border-radius:7px;color:var(--text,#dde);font-size:12.5px;cursor:pointer;text-align:left;}',
    '.rb-tm-row:hover{background:var(--accent-soft,rgba(128,128,128,.14));}',
    '.rb-tm-ic{flex:0 0 18px;display:inline-flex;align-items:center;justify-content:center;color:var(--text-dim,#99a);position:relative;}',
    '.rb-tm-ic.on{color:var(--accent,#a78bfa);}',
    '.rb-tm-ic svg,.rb-tm-ic .term-svg{width:15px;height:15px;}',
    '.rb-tm-ic img{width:15px;height:15px;}',
    '.rb-tm-lb{flex:1;white-space:nowrap;}',
    '.rb-tm-sep{height:1px;margin:5px 7px;background:var(--border,#333);}',
    '.rb-tc-list{display:flex;flex-direction:column;gap:2px;margin:12px 0 8px;max-height:46vh;overflow-y:auto;}',
    '.rb-tc-row{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:7px;font-size:13px;color:var(--text,#dde);cursor:pointer;}',
    '.rb-tc-row:hover{background:var(--accent-soft,rgba(128,128,128,.14));}',
    '.rb-tc-row input{accent-color:var(--accent,#a78bfa);}',
    // 与 shot-patch 复用同名提示样式；web 版 shot-patch 不加载，这里兜底定义一份
    '.rb-hk-hint{font-size:11px;color:var(--text-dim,#889);margin-bottom:4px;line-height:1.6;}',
  ].join('\n');
  document.head.appendChild(st);

  applyPins();
})();
