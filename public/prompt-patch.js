/*
 * prompt-patch.js — 终端提示符（starship）选择器，独立于皮肤单独选。
 * ------------------------------------------------------------------
 * 两段式：
 *   · 整套主题（base，单选）：药丸 / 帕斯特尔 / 东京夜 / Gruvbox 彩虹 / Nerd / Jetpack / Pure / 极简 / 两行 / 纯文本。
 *     段落齐全的标「全套」。
 *   · 叠加修饰（mods，可多选 · 并行）：隐藏语言版本 / 纯文本符号 / 关时间 / 关耗时 / 去前导空行。
 * 选中 → window.fanboxPrompt.set(base, mods) → 主进程把「主题 + 修饰」合并写进 active.toml；
 *   STARSHIP_CONFIG 永远指 active.toml，starship 每渲染一次都重读 → 正在跑的终端下个回车即变样。
 * 持久化 key `fb_starship`（JSON {base, mods}），与皮肤的 `fb_skin` 互不干扰。
 * 仅桌面 App + macOS（starship 注入生效的平台）出现；web / 非 mac 不渲染。
 * 补丁式、零侵入：唯一改动是 index.html 加一行 <script>，复用 themes-patch.js 注入的 .fbx-skin-* 样式。
 */
(function () {
  'use strict';

  var env = window.fanboxEnv;
  if (!env || !env.isDesktopApp || env.platform !== 'darwin' || !window.fanboxPrompt) return;

  // id 必须和 vendor/starship/prompts/<id>.toml、main.js 的 PROMPT_BASES / PROMPT_MODS 完全对应。
  var BASES = [
    // 整套药丸（powerline 风格，段落齐全）= 全套
    { id: 'powerline',       name: '药丸 · 摩卡',   full: true,  prev: ' dir  ❯' },
    { id: 'pastel',          name: '帕斯特尔',     full: true,  prev: ' dir  ❯' },
    { id: 'tokyo-night',     name: '东京夜',       full: true,  prev: ' dir  ❯' },
    { id: 'gruvbox-rainbow', name: 'Gruvbox 彩虹', full: true,  prev: ' dir  ❯' },
    { id: 'nord',            name: 'Nord 极地',    full: true,  prev: ' dir  ❯' },
    { id: 'dracula',         name: 'Dracula',      full: true,  prev: ' dir  ❯' },
    { id: 'rose-pine',       name: 'Rosé Pine',    full: true,  prev: ' dir  ❯' },
    { id: 'everforest',      name: 'Everforest',   full: true,  prev: ' dir  ❯' },
    { id: 'kanagawa',        name: 'Kanagawa',     full: true,  prev: ' dir  ❯' },
    { id: 'latte',           name: '拿铁浅色',     full: true,  prev: ' dir  ❯' },
    // 轻量布局
    { id: 'flat',            name: '扁平彩字',     full: false, prev: 'dir ❯' },
    { id: 'jetpack',         name: 'Jetpack 座舱', full: false, prev: '╭dir⏎╰❯' },
    { id: 'pure',            name: 'Pure 简约',    full: false, prev: 'dir⏎❯' },
    { id: 'minimal',         name: '极简单行',     full: false, prev: 'dir ❯' },
    { id: 'two-line',        name: '两行',         full: false, prev: 'dir⏎❯' },
    { id: 'plain',           name: '纯文本',       full: false, prev: 'dir >' },
  ];
  var MODS = [
    { id: 'no-langs',      name: '隐藏语言版本' },
    { id: 'plain-symbols', name: '纯文本符号（去图标）' },
    { id: 'no-time',       name: '关掉时间' },
    { id: 'no-duration',   name: '关掉命令耗时' },
    { id: 'no-blank',      name: '去前导空行' },
  ];
  var DEFAULT_BASE = 'powerline';

  function baseById(id) { for (var i = 0; i < BASES.length; i++) if (BASES[i].id === id) return BASES[i]; return null; }

  // 当前选择
  var cur = { base: DEFAULT_BASE, mods: {} };
  function loadSaved() {
    try {
      var raw = localStorage.getItem('fb_starship');
      if (!raw) return;
      if (raw[0] === '{') {
        var o = JSON.parse(raw);
        if (baseById(o.base)) cur.base = o.base;
        (o.mods || []).forEach(function (m) { cur.mods[m] = 1; });
      } else if (baseById(raw)) { cur.base = raw; } // 兼容早期版本存的纯字符串 id
    } catch (e) { /* 坏数据就用默认 */ }
  }
  function modList() { return Object.keys(cur.mods); }
  function persist() {
    try { localStorage.setItem('fb_starship', JSON.stringify({ base: cur.base, mods: modList() })); } catch (e) { /* */ }
  }
  function apply() {
    try { window.fanboxPrompt.set(cur.base, modList()); } catch (e) { /* 主进程未就绪不挡 UI */ }
    persist();
    updateActive();
  }

  /* ---------- CSS：提示符预览 + 两段式弹层 + 全套标签 + 修饰勾选 ---------- */
  function injectCSS() {
    if (document.getElementById('fbx-prompt-css')) return;
    var css = [
      '#prompt-switch{position:relative;margin-top:8px;}',
      '.fbx-pprev{display:inline-flex;align-items:center;min-width:50px;padding:2px 6px;border-radius:4px;',
      '  background:var(--bg-2);border:1px solid var(--border);color:var(--text-dim);',
      '  font-family:var(--font-fname);font-size:11px;line-height:1.4;white-space:nowrap;}',
      '#fbx-prompt-pop{grid-template-columns:1fr;gap:3px;}',
      '.fbx-psec{font-size:10.5px;color:var(--text-faint);letter-spacing:.04em;padding:6px 4px 2px;}',
      '.fbx-psec:first-child{padding-top:2px;}',
      '.fbx-full{margin-left:auto;font-size:9.5px;padding:1px 5px;border-radius:999px;',
      '  background:var(--accent-soft);color:var(--accent);border:1px solid var(--accent);}',
      '.fbx-swatch .fbx-ck{display:inline-flex;width:14px;justify-content:center;color:var(--text-faint);}',
      '.fbx-swatch.active .fbx-ck{color:var(--accent);}',
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'fbx-prompt-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 选择器：紧挨皮肤选择器之后插一个同款下拉 ---------- */
  var pop, current, host;

  function buildSwitcher() {
    var skinHost = document.getElementById('theme-switch');
    if (!skinHost || document.getElementById('prompt-switch')) return;

    host = document.createElement('div');
    host.className = 'theme-switch';
    host.id = 'prompt-switch';

    var label = document.createElement('div');
    label.className = 'theme-switch-label';
    label.textContent = '提示符';
    label.title = '终端命令行提示符样式，独立于皮肤。整套主题选一个，叠加修饰可多选。切换后正在运行的终端按回车即生效。';
    host.appendChild(label);

    current = document.createElement('button');
    current.id = 'fbx-prompt-current';
    current.className = 'fbx-skin-current';
    host.appendChild(current);

    pop = document.createElement('div');
    pop.id = 'fbx-prompt-pop';
    pop.className = 'fbx-skin-pop hidden';

    sec('整套主题 · 选一个');
    BASES.forEach(function (b) {
      var el = swatch();
      el.dataset.base = b.id;
      el.innerHTML = '<span class="fbx-pprev">' + b.prev + '</span><span class="fbx-nm">' + b.name + '</span>' +
        (b.full ? '<span class="fbx-full">全套</span>' : '');
      el.addEventListener('click', function () { cur.base = b.id; apply(); });
      pop.appendChild(el);
    });

    sec('叠加修饰 · 可多选并行');
    MODS.forEach(function (m) {
      var el = swatch();
      el.dataset.mod = m.id;
      el.innerHTML = '<span class="fbx-ck">' + (cur.mods[m.id] ? '✓' : '·') + '</span><span class="fbx-nm">' + m.name + '</span>';
      el.addEventListener('click', function () {
        if (cur.mods[m.id]) delete cur.mods[m.id]; else cur.mods[m.id] = 1;
        apply();
      });
      pop.appendChild(el);
    });

    host.appendChild(pop);

    current.addEventListener('click', function (ev) { ev.stopPropagation(); pop.classList.toggle('hidden'); });
    document.addEventListener('click', function (ev) { if (!host.contains(ev.target)) pop.classList.add('hidden'); });

    if (skinHost.nextSibling) skinHost.parentNode.insertBefore(host, skinHost.nextSibling);
    else skinHost.parentNode.appendChild(host);
  }
  function sec(text) { var d = document.createElement('div'); d.className = 'fbx-psec'; d.textContent = text; pop.appendChild(d); }
  function swatch() { var b = document.createElement('button'); b.className = 'fbx-swatch'; return b; }

  // 多选修饰时弹层保持打开，靠这个就地刷新高亮 / 勾选，不重建 DOM（不丢滚动位置）
  function updateActive() {
    var b = baseById(cur.base) || baseById(DEFAULT_BASE);
    if (current) {
      var n = modList().length;
      current.innerHTML = '<span class="fbx-pprev">' + b.prev + '</span><span class="fbx-nm">' + b.name +
        (n ? ' +' + n : '') + '</span><span class="fbx-caret">▾</span>';
    }
    if (!pop) return;
    pop.querySelectorAll('.fbx-swatch[data-base]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.base === cur.base);
    });
    pop.querySelectorAll('.fbx-swatch[data-mod]').forEach(function (el) {
      var on = !!cur.mods[el.dataset.mod];
      el.classList.toggle('active', on);
      var ck = el.querySelector('.fbx-ck'); if (ck) ck.textContent = on ? '✓' : '·';
    });
  }

  function install() {
    injectCSS();
    loadSaved();
    buildSwitcher();
    apply(); // 启动即把当前选择合并进 active.toml + 刷新高亮
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
