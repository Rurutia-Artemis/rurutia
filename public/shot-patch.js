/*
 * shot-patch.js — 截图直通车·热键版 渲染层（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * 主进程热键截图落盘后推 shot:insert → 这里用 app.js 的 term.insertPath()
 * 把路径自动插进当前终端（CC/Codex 读图路径已在直通卡流程验证过），
 * 顺手弹一张现有直通卡：想「标注圈重点」或「收进素材」保底有入口。
 * 快捷键录入面板（最多两组组合键）：window.rbShotSettings() 打开，
 * toolbar-patch.js 的 ⋯ 菜单里有入口。录入即注册即持久化。
 * 依赖经典脚本共享全局作用域：term / toast / shotTray / escapeHtml 直取自 app.js。
 * 仅桌面版生效（web 版无 fanboxShot 桥）。
 */
(function () {
  'use strict';
  var shot = window.fanboxShot;
  if (!shot || !shot.onInsert) return; // web 版 / 旧 preload：整个补丁不生效

  // ---------- 截完自动插入 ----------
  shot.onInsert(function (m) {
    try {
      if (typeof term === 'undefined' || !term.available() || !term.sessions.length) {
        toast('终端还没开：截图存在直通卡里，可拖进任何地方', true);
      } else {
        term.insertPath(m.path);
        toast('截图已插入当前终端 · 48 小时后自动清理');
      }
      // 直通卡兜底：标注 / 收进素材 / 再拖拽都从这走
      if (typeof shotTray !== 'undefined') shotTray.show(m);
    } catch (e) { console.warn('[shot-patch] 插入失败：', e); }
  });

  // ---------- 快捷键录入面板（最多 MAX 组） ----------
  var MAX = 2;
  var GLYPH = { Command: '⌘', Control: '⌃', Alt: '⌥', Shift: '⇧' };
  function pretty(acc) {
    if (!acc) return '未设置';
    var parts = acc.split('+');
    var key = parts.pop();
    return parts.map(function (p) { return GLYPH[p] || p; }).join('') + key;
  }
  // 键盘事件 → Electron accelerator。要求至少含 ⌘/⌃/⌥ 之一（纯 ⇧ 太容易误触）。
  function accFromEvent(ev) {
    var c = ev.code || '';
    var key = null;
    if (/^Key[A-Z]$/.test(c)) key = c.slice(3);
    else if (/^Digit\d$/.test(c)) key = c.slice(5);
    else if (/^F\d{1,2}$/.test(c)) key = c;
    else if (c === 'Space') key = 'Space';
    else if (/^Arrow(Up|Down|Left|Right)$/.test(c)) key = c.replace('Arrow', '');
    else if (c === 'Backquote') key = '`';
    else if (c === 'Minus') key = '-';
    else if (c === 'Equal') key = '=';
    if (!key) return null; // 只按了修饰键，等主键
    if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) return { error: '组合里至少要有 ⌘ / ⌃ / ⌥ 其中一个' };
    var mods = [];
    if (ev.metaKey) mods.push('Command');
    if (ev.ctrlKey) mods.push('Control');
    if (ev.altKey) mods.push('Alt');
    if (ev.shiftKey) mods.push('Shift');
    return { acc: mods.concat(key).join('+') };
  }

  window.rbShotSettings = async function () {
    var cur = [];
    try { var r = await shot.getKeys(); cur = (r && r.keys) || []; } catch { /* */ }
    var slots = [cur[0] || null, cur[1] || null];
    var recording = -1;

    var ov = document.createElement('div');
    ov.className = 'input-overlay';
    ov.innerHTML = '<div class="input-dialog">' +
      '<div class="input-title">截图直通车 · 快捷键</div>' +
      '<div class="rb-hk-rows">' +
      [0, 1].map(function (i) {
        return '<div class="rb-hk-row"><span class="rb-hk-no">组合 ' + (i + 1) + '</span>' +
          '<button class="rb-hk-slot" data-i="' + i + '"></button>' +
          '<button class="rb-hk-clear" data-i="' + i + '" title="清空">✕</button></div>';
      }).join('') +
      '</div>' +
      '<div class="rb-hk-hint">点槽位后直接按组合键录入 · 最多 ' + MAX + ' 组 · 需含 ⌘/⌃/⌥ · 全局生效</div>' +
      '<div class="input-actions"><button class="ghost-btn" data-act="cancel">取消</button><button class="primary" data-act="ok">保存</button></div>' +
      '</div>';
    document.body.appendChild(ov);

    function paint() {
      ov.querySelectorAll('.rb-hk-slot').forEach(function (b) {
        var i = +b.dataset.i;
        b.textContent = recording === i ? '按下组合键…' : pretty(slots[i]);
        b.classList.toggle('recording', recording === i);
        b.classList.toggle('empty', !slots[i] && recording !== i);
      });
    }
    ov.querySelectorAll('.rb-hk-slot').forEach(function (b) {
      b.onclick = function () { recording = +b.dataset.i; paint(); };
    });
    ov.querySelectorAll('.rb-hk-clear').forEach(function (b) {
      b.onclick = function () { slots[+b.dataset.i] = null; recording = -1; paint(); };
    });

    function onKey(ev) {
      if (recording < 0) { if (ev.key === 'Escape') done(false); return; }
      ev.preventDefault(); ev.stopPropagation();
      if (ev.key === 'Escape') { recording = -1; paint(); return; }
      var got = accFromEvent(ev);
      if (!got) return; // 还只按着修饰键
      if (got.error) { toast(got.error, true); return; }
      // 两个槽位撞车：另一槽相同则清掉它
      var other = 1 - recording;
      if (slots[other] === got.acc) slots[other] = null;
      slots[recording] = got.acc;
      recording = -1;
      paint();
    }
    document.addEventListener('keydown', onKey, true);

    function done(save) {
      document.removeEventListener('keydown', onKey, true);
      ov.remove();
      if (!save) return;
      var list = slots.filter(Boolean);
      shot.setKeys(list).then(function (r) {
        if (!r) return;
        if (r.ok) toast(list.length ? '快捷键已生效：' + list.map(pretty).join(' 和 ') : '已恢复默认 ⌘⇧2');
        else {
          var bad = (r.result || []).filter(function (x) { return !x.ok; }).map(function (x) { return pretty(x.key) + '（' + x.error + '）'; });
          toast('部分快捷键没注册上：' + bad.join('、'), true);
        }
      }).catch(function () { toast('保存失败', true); });
    }
    ov.querySelector('[data-act=ok]').onclick = function () { done(true); };
    ov.querySelector('[data-act=cancel]').onclick = function () { done(false); };
    ov.onclick = function (ev) { if (ev.target === ov) done(false); };
    paint();
  };

  // 面板样式：贴现有 .input-dialog 体系，颜色全走皮肤变量
  var st = document.createElement('style');
  st.textContent = [
    '.rb-hk-rows{display:flex;flex-direction:column;gap:8px;margin:14px 0 6px;}',
    '.rb-hk-row{display:flex;align-items:center;gap:8px;}',
    '.rb-hk-no{font-size:12px;color:var(--text-dim,#889);flex:0 0 44px;}',
    '.rb-hk-slot{flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--border,#333);background:var(--bg,#111);color:var(--text,#dde);font-size:14px;cursor:pointer;text-align:center;letter-spacing:1px;}',
    '.rb-hk-slot.recording{border-color:var(--accent,#a78bfa);color:var(--accent,#a78bfa);animation:rbhk-blink 1s infinite;}',
    '.rb-hk-slot.empty{color:var(--text-faint,#667);}',
    '.rb-hk-clear{flex:0 0 auto;border:none;background:none;color:var(--text-dim,#889);cursor:pointer;font-size:12px;padding:4px 6px;border-radius:6px;}',
    '.rb-hk-clear:hover{color:var(--text,#dde);background:var(--accent-soft,rgba(128,128,128,.15));}',
    '.rb-hk-hint{font-size:11px;color:var(--text-dim,#889);margin-bottom:4px;line-height:1.6;}',
    '@keyframes rbhk-blink{50%{opacity:.55;}}',
  ].join('\n');
  document.head.appendChild(st);
})();
