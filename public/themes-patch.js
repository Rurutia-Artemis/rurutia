/*
 * themes-patch.js — 追加 18 套「色所」高级感配色作为可选皮肤
 * ------------------------------------------------------------------
 * 设计目标：补丁式、零侵入。对原仓库的唯一改动是 index.html 末尾加一行
 *   <script src="/themes-patch.js"></script>（放在 /app.js 之后）。
 * 本文件自带 CSS 注入、自带皮肤选择器、用猴子补丁扩展 app.js 里的
 *   applyTheme / term.themes / mona.themeFor —— 经典 <script> 之间共享
 *   全局作用域，所以这里能直接读到 app.js 顶层的 state/term/mona/applyTheme。
 * 持久化用独立 key `fb_skin`，不与 app.js 自己的 `fb_theme` 抢占。
 * 配色不写死，只存 3 个原始色值，运行时按「偏还原但可读」规则推导整套界面变量。
 */
(function () {
  'use strict';

  /* ---------- 18 套配色（每套 3 个海报原始色 + 是否深色 + 中文名）---------- */
  // 浅色组：c1=底色(浅) c2=强调色(艳) c3=文字色(深)
  // 深色组：c3=底色(近黑) c1=强调色(霓虹1) c2=次强调(霓虹2)
  var PALETTES = [
    // —— 第一篇 · 浅底海报系 ——
    { id: 'memphis',  name: '新孟菲斯',   dark: false, c1: '#FFD3B6', c2: '#FF6F91', c3: '#3A4D9F' },
    { id: 'museum',   name: '现代博物',   dark: false, c1: '#F9F5EB', c2: '#C97B63', c3: '#22356F' },
    { id: 'acid',     name: '酸性时尚',   dark: false, c1: '#FFF176', c2: '#E83E8C', c3: '#2D4CC8' },
    { id: 'future',   name: '未来社区',   dark: false, c1: '#D8FFF1', c2: '#A855F7', c3: '#1F2A44' },
    { id: 'tropical', name: '热带运动',   dark: false, c1: '#FFD6A5', c2: '#00B894', c3: '#355C7D' },
    { id: 'disco',    name: '电子舞厅',   dark: false, c1: '#F4D9FF', c2: '#42C2FF', c3: '#6A4C93' },
    { id: 'rowing',   name: '赛艇俱乐部', dark: false, c1: '#FFF3C4', c2: '#3D5AF1', c3: '#356859' },
    { id: 'glass',    name: '玻璃城市',   dark: false, c1: '#DDF4FF', c2: '#7FD1B9', c3: '#334EAC' },
    { id: 'jelly',    name: '数字果冻',   dark: false, c1: '#FFE5EC', c2: '#4D7CFE', c3: '#4B2E83' },
    // —— 第二篇 · 暗底霓虹系 ——（Grid 海报上 #0057FF/翡翠绿 系印刷错，这里用真绿）
    { id: 'grid',  name: '电路板', dark: true, c1: '#FFD23F', c2: '#00B86B', c3: '#151515' },
    { id: 'pixel', name: '像素光', dark: true, c1: '#FF4081', c2: '#00E676', c3: '#141414' },
    { id: 'axis',  name: '工业轴', dark: true, c1: '#FF8F00', c2: '#00ACC1', c3: '#171717' },
    { id: 'void',  name: '虚空',   dark: true, c1: '#7C4DFF', c2: '#64DD17', c3: '#0F0F0F' },
    { id: 'mode',  name: '霓虹夜', dark: true, c1: '#FF2D55', c2: '#4F46E5', c3: '#161616' },
    { id: 'unit',  name: '电光紫', dark: true, c1: '#A100FF', c2: '#00D9FF', c3: '#101010' },
    { id: 'flux',  name: '熔岩橙', dark: true, c1: '#FF6B35', c2: '#2F80ED', c3: '#111111' },
    { id: 'core',  name: '深海核', dark: true, c1: '#009688', c2: '#FFB300', c3: '#181818' },
    { id: 'form',  name: '翡翠林', dark: true, c1: '#00C853', c2: '#FF7043', c3: '#121212' },
  ];

  // 原生 3 套皮肤（app.js 自带）：按用户要求不在选择器里展示，仅保留 id 识别用于兜底，不重定义其样式
  var BUILTINS = [];
  var BUILTIN_IDS = { warm: 1, terminal: 1, editorial: 1 };

  var DEFAULT_SKIN = 'pixel'; // 默认主题：像素光

  // 个别主题的精修覆盖（在通用推导之上微调）
  var OVERRIDES = {
    // 酸性时尚：原柠檬黄 #FFF176 太亮刺眼、正文可读性低 —— 压成更深更耐看的金黄，文字加到近黑
    acid: {
      '--bg': '#E9D24A',
      '--bg-2': '#F4E89B',
      '--bg-3': '#E7C06A',
      '--panel': '#ECD968',
      '--border': '#D9B84A',
      '--text': '#15173A',
      '--text-dim': '#4a4a4a',
      '--text-faint': '#6f6a4a',
    },
  };

  /* ---------- 色彩工具 ---------- */
  function clamp(n) { return n < 0 ? 0 : n > 255 ? 255 : Math.round(n); }
  function toRgb(h) {
    h = h.replace('#', '');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function toHex(c) {
    var s = function (n) { return ('0' + clamp(n).toString(16)).slice(-2); };
    return '#' + s(c.r) + s(c.g) + s(c.b);
  }
  function mix(h1, h2, t) {
    var a = toRgb(h1), b = toRgb(h2);
    return toHex({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
  }
  function lighten(h, t) { return mix(h, '#ffffff', t); }
  function darken(h, t) { return mix(h, '#000000', t); }
  function alpha(h, a) { return h + ('0' + Math.round(a * 255).toString(16)).slice(-2); }
  function lum(h) { var c = toRgb(h); return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }
  // 强调色上文字的对比色：亮/中等亮度(含霓虹)一律黑字（更还原海报、对比也更高），仅很暗的色才白字
  function ink(h) { return lum(h) > 0.36 ? '#0b0c0a' : '#ffffff'; }

  /* ---------- 由 3 个原始色推导整套界面变量（偏还原但可读）---------- */
  function buildVars(p) {
    if (p.dark) {
      // 关键：底色不再是纯黑，而是「掺了霓虹的黑」——每套各有色温、辨识度强
      var t = p.c1, t2 = p.c2, base = '#0c0c0e';
      var bg = mix(base, t, 0.09);
      return {
        '--bg': bg,
        '--bg-2': mix(lighten(bg, 0.05), t, 0.06),
        '--bg-3': mix(lighten(bg, 0.10), t, 0.11),
        '--panel': mix(lighten(bg, 0.02), t, 0.05),
        '--border': mix(lighten(bg, 0.13), t, 0.32), // 边框带霓虹，界面有「线条感」
        '--rule': mix(lighten(bg, 0.09), t, 0.22),
        '--text': mix('#ffffff', t, 0.06),
        '--text-dim': mix('#f4f4f5', bg, 0.45),
        '--text-faint': mix('#f4f4f5', bg, 0.68),
        '--accent': t,
        '--accent-soft': alpha(t, 0.16),
        '--accent-ink': ink(t),
        '--green': t2,            // 次霓虹色当 success/状态色，让第二个色也露脸
        '--yellow': '#e6c07b',
        '--radius': '6px',
        '--shadow': '0 16px 50px ' + alpha(t, 0.12) + ', 0 8px 30px rgba(0,0,0,0.55)',
        '--font-display': 'ui-monospace, "SF Mono", Menlo, monospace',
        '--font-fname': 'ui-monospace, "SF Mono", Menlo, monospace',
      };
    }
    var lbg = p.c1, lac = p.c2, ltx = p.c3, dtx = darken(ltx, 0.5);
    return {
      '--bg': lbg,
      '--bg-2': lighten(lbg, 0.5),
      '--bg-3': mix(lbg, lac, 0.12),               // 卡片/悬停往强调色靠，艳色露出来
      '--panel': mix(lighten(lbg, 0.18), lac, 0.05),
      '--border': mix(lbg, lac, 0.22),             // 分割线带强调色
      '--rule': mix(lbg, ltx, 0.16),
      '--text': dtx,
      '--text-dim': mix(dtx, lbg, 0.4),
      '--text-faint': mix(dtx, lbg, 0.6),
      '--accent': lac,
      '--accent-soft': alpha(lac, 0.14),
      '--accent-ink': ink(lac),
      '--green': '#3fa45a',
      '--yellow': '#c2893a',
      '--radius': '10px',
      '--shadow': '0 12px 40px ' + alpha(ltx, 0.14),
      '--font-display': 'var(--font-ui)',
      '--font-fname': 'var(--font-ui)',
    };
  }

  /* ---------- 把 18 套主题写成 CSS 注入 <head> ---------- */
  function injectThemeCSS() {
    var css = '';
    PALETTES.forEach(function (p) {
      var v = buildVars(p), body = '';
      if (OVERRIDES[p.id]) { var o = OVERRIDES[p.id]; for (var ok in o) v[ok] = o[ok]; }
      for (var k in v) body += k + ':' + v[k] + ';';
      css += '[data-theme="' + p.id + '"]{' + body + '}\n';
      var sel = '[data-theme="' + p.id + '"]';
      if (p.dark) {
        // 暗色组：顶部一层该主题霓虹色的光晕，从近黑里透出色温，每套各不相同
        css += sel + ' body{background-image:radial-gradient(120% 75% at 50% -8%,' +
          alpha(p.c1, 0.16) + ' 0%,' + alpha(p.c2, 0.07) + ' 38%,transparent 66%);background-attachment:fixed;}\n';
      } else {
        // 浅色组：微弱纸纹，和原生 warm/editorial 观感一致
        css += sel + ' body{background-image:radial-gradient(rgba(120,100,70,0.05) 1px,transparent 1px);background-size:4px 4px;}\n';
      }
    });
    var st = document.createElement('style');
    st.id = 'fbx-themes-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 让终端 / 编辑器跟着换色（复用最接近的现有主题，低风险）---------- */
  function extendTermAndMonaco() {
    try {
      if (typeof term !== 'undefined' && term.themes) {
        PALETTES.forEach(function (p) {
          // 每套皮肤一套终端配色：背景/前景/光标/选区取该皮肤推导色（与面板同底、无缝衔接），
          // ANSI 16 色按明暗复用 terminal/warm 基底（保证彩色输出可读）。这样终端背景真正跟着皮肤走。
          var v = buildVars(p);
          if (OVERRIDES[p.id]) { var o = OVERRIDES[p.id]; for (var ok in o) v[ok] = o[ok]; }
          var base = p.dark ? term.themes.terminal : term.themes.warm;
          var t = {};
          for (var k in base) t[k] = base[k];
          t.background = v['--bg'];
          t.foreground = v['--text'];
          t.cursor = v['--accent'];
          t.cursorAccent = v['--bg'];
          t.selectionBackground = alpha(v['--accent'], 0.28);
          term.themes[p.id] = t;
        });
      }
    } catch (e) { /* 终端在浏览器版可能不存在，忽略 */ }
    try {
      if (typeof mona !== 'undefined' && mona.themeFor) {
        PALETTES.forEach(function (p) {
          mona.themeFor[p.id] = p.dark ? 'fb-dark' : 'fb-paper';
        });
      }
    } catch (e) { /* monaco 懒加载，忽略 */ }
  }

  /* ---------- 应用主题（覆盖 app.js 的 applyTheme，去掉只认 3 套的白名单）---------- */
  function isDark(skin) {
    if (skin === 'terminal') return true;
    if (skin === 'warm' || skin === 'editorial') return false;
    var p = byId(skin);
    return p ? p.dark : false;
  }
  function byId(id) {
    for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === id) return PALETTES[i];
    return null;
  }
  function applySkin(skin) {
    if (!BUILTIN_IDS[skin] && !byId(skin)) skin = DEFAULT_SKIN; // 未知值兜底
    try { state.theme = skin; } catch (e) { /* */ }
    document.documentElement.dataset.theme = skin;
    try { localStorage.setItem('fb_skin', skin); } catch (e) { /* */ }
    var link = document.getElementById('hljs-theme');
    if (link) link.href = '/vendor/hljs/styles/' + (isDark(skin) ? 'github-dark' : 'github') + '.min.css';
    updateActive(skin);
    try { if (typeof term !== 'undefined' && term.sessions && term.sessions.length) term.retheme(); } catch (e) { /* */ }
    try { if (typeof mona !== 'undefined') mona.retheme(); } catch (e) { /* */ }
    // 补回原版 applyTheme 的 rerender：让文件列表 / 预览的代码高亮也随皮肤即时刷新
    try {
      if (typeof renderFiles === 'function' && typeof state !== 'undefined' && state.entries && state.entries.length) {
        renderFiles();
        var pv = document.getElementById('preview');
        if (state.selected && pv && !pv.classList.contains('hidden') && typeof openPreview === 'function') {
          var ent = state.entries.find(function (x) { return x.path === state.selected; });
          if (ent) openPreview(ent);
        }
      }
    } catch (e) { /* 重渲失败不挡主题切换 */ }
  }

  /* ---------- 重建皮肤选择器：点一下弹出色卡网格 ---------- */
  function swatchOf(item) {
    if (item.swatch) return item.swatch;
    return item.dark ? [item.c1, item.c3, item.c2] : [item.c2, item.c1, item.c3];
  }
  var allItems = BUILTINS.concat(PALETTES);

  function buildSwitcher() {
    var host = document.getElementById('theme-switch');
    if (!host) return;
    host.innerHTML = '';

    var label = document.createElement('div');
    label.className = 'theme-switch-label';
    label.textContent = '皮肤';
    host.appendChild(label);

    var current = document.createElement('button');
    current.id = 'fbx-skin-current';
    current.className = 'fbx-skin-current';
    host.appendChild(current);

    var pop = document.createElement('div');
    pop.id = 'fbx-skin-pop';
    pop.className = 'fbx-skin-pop hidden';
    allItems.forEach(function (item) {
      var b = document.createElement('button');
      b.className = 'fbx-swatch';
      b.dataset.skin = item.id;
      b.title = item.name;
      var bars = '';
      swatchOf(item).forEach(function (c) { bars += '<i style="background:' + c + '"></i>'; });
      b.innerHTML = '<span class="fbx-bars">' + bars + '</span><span class="fbx-nm">' + item.name + '</span>';
      b.addEventListener('click', function () {
        applySkin(item.id);
        pop.classList.add('hidden');
      });
      pop.appendChild(b);
    });
    host.appendChild(pop);

    current.addEventListener('click', function (ev) {
      ev.stopPropagation();
      pop.classList.toggle('hidden');
    });
    document.addEventListener('click', function (ev) {
      if (!host.contains(ev.target)) pop.classList.add('hidden');
    });
  }

  function updateActive(skin) {
    var cur = document.getElementById('fbx-skin-current');
    if (cur) {
      var item = byId(skin) || BUILTINS.filter(function (b) { return b.id === skin; })[0];
      if (item) {
        var bars = '';
        swatchOf(item).forEach(function (c) { bars += '<i style="background:' + c + '"></i>'; });
        cur.innerHTML = '<span class="fbx-bars">' + bars + '</span><span class="fbx-nm">' + item.name + '</span><span class="fbx-caret">▾</span>';
      }
    }
    var pop = document.getElementById('fbx-skin-pop');
    if (pop) pop.querySelectorAll('.fbx-swatch').forEach(function (b) {
      b.classList.toggle('active', b.dataset.skin === skin);
    });
  }

  /* ---------- 选择器自身样式 ---------- */
  function injectSwitcherCSS() {
    var css = [
      '#theme-switch{position:relative;}',
      '.fbx-skin-current{display:flex;align-items:center;gap:8px;width:100%;padding:7px 9px;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);cursor:pointer;font-size:12.5px;transition:.15s;}',
      '.fbx-skin-current:hover{border-color:var(--accent);}',
      '.fbx-skin-current .fbx-nm{flex:1;text-align:left;font-family:var(--font-fname);}',
      '.fbx-skin-current .fbx-caret{color:var(--text-faint);font-size:10px;}',
      '.fbx-bars{display:inline-flex;border-radius:3px;overflow:hidden;border:1px solid rgba(127,127,127,.25);}',
      '.fbx-bars i{display:block;width:9px;height:14px;}',
      '.fbx-skin-pop{position:absolute;left:0;right:0;bottom:calc(100% + 6px);max-height:46vh;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:7px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);z-index:120;}',
      '.fbx-skin-pop.hidden{display:none;}',
      '.fbx-swatch{display:flex;align-items:center;gap:6px;padding:6px 7px;background:var(--bg-3);border:1px solid transparent;border-radius:7px;color:var(--text-dim);cursor:pointer;font-size:11.5px;transition:.12s;}',
      '.fbx-swatch:hover{color:var(--text);border-color:var(--accent);}',
      '.fbx-swatch.active{border-color:var(--accent);color:var(--text);background:var(--accent-soft);}',
      '.fbx-swatch .fbx-nm{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-fname);}',
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'fbx-switcher-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 安装 ---------- */
  function install() {
    injectThemeCSS();
    injectSwitcherCSS();
    extendTermAndMonaco();
    buildSwitcher();

    // 覆盖全局 applyTheme：内部其它调用（终端 spawn、编辑器 retheme 等）走同一套
    try { window.applyTheme = function (skin) { applySkin(skin); }; } catch (e) { /* */ }

    // 启动时恢复我们记住的皮肤（app.js 已先用它的 fb_theme 跑过一遍，这里覆盖）
    var saved = null;
    try { saved = localStorage.getItem('fb_skin'); } catch (e) { /* */ }
    if (!saved) {
      // 首次：沿用 app.js 当前生效的主题，保证选择器高亮正确
      saved = DEFAULT_SKIN; // 首次无记忆：用默认主题（电子舞厅）
    }
    applySkin(saved || DEFAULT_SKIN);
  }

  // app.js 的脚本在本文件之前、且 init() 同步部分已执行完；DOM 也已就绪（脚本在 body 末尾）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
