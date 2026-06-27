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

  /* ---------- 18 套配色：多强调色系统 ----------
   * 每套 = 中性 canvas(bg/text) + 一组并列 accent[a1,a2,a3] + 一组功能色(可选, 缺省走 *_FUNC)。
   *   a1 主（按钮/活动态/光标/面包屑），a2 次（侧栏标题/链接，小字自动压成可读变体），a3 跳（徽章填充）。
   * 设计取向：canvas 保持中性、让三个 accent 同台不打架；色值经 WCAG 对比度全量校验
   *   （text/a1/a2/按钮ink/徽章ink + 终端 16 ANSI 都达标）。bg2/bg3/panel/border 由 buildVarsMulti 派生。
   */
  // 功能色（状态语义，红=红绿=绿，不跟皮肤跳色）：深/浅各一套，按 dark 自动选
  var DARK_FUNC  = { ok: '#3DDC84', warn: '#FFC83D', err: '#FF5C6C', info: '#5B9BFF' };
  var LIGHT_FUNC = { ok: '#1FA85A', warn: '#C98A1E', err: '#E0454F', info: '#2D6BD8' };
  var PALETTES = [
    // —— 暗底霓虹系 9 套 ——
    { id: 'grid',  name: '电路板', dark: true, bg: '#0F1410', text: '#E4ECDD', acc: ['#3DDC84', '#FFC83D', '#2AD0E0'] },
    { id: 'pixel', name: '像素光', dark: true, bg: '#15101A', text: '#ECE6F2', acc: ['#FF3D8B', '#21E6C1', '#FFE03D'] },
    { id: 'axis',  name: '工业轴', dark: true, bg: '#16130E', text: '#E9E6DD', acc: ['#FF8F1F', '#00BCD4', '#FFC83D'] },
    { id: 'void',  name: '虚空',   dark: true, bg: '#110F1A', text: '#E6E2F2', acc: ['#8B5CFF', '#64DD17', '#00D9FF'] },
    { id: 'mode',  name: '霓虹夜', dark: true, bg: '#190F12', text: '#F0E6EA', acc: ['#FF2D55', '#5B8CFF', '#FF9F2D'] },
    { id: 'unit',  name: '电光紫', dark: true, bg: '#150A1C', text: '#ECE2F5', acc: ['#BE52FF', '#00D9FF', '#FF4DD8'] },
    { id: 'flux',  name: '熔岩橙', dark: true, bg: '#1A1210', text: '#F2E8E2', acc: ['#FF6B35', '#2F9BED', '#FFC23D'] },
    { id: 'core',  name: '深海核', dark: true, bg: '#0D1718', text: '#DEEAEA', acc: ['#00B8A0', '#FFB300', '#4DA6FF'] },
    { id: 'form',  name: '翡翠林', dark: true, bg: '#0D1A12', text: '#E2ECE4', acc: ['#00D165', '#FF7043', '#FFC93C'] },
    // —— 浅底海报系 9 套 ——
    { id: 'memphis',  name: '新孟菲斯',   dark: false, bg: '#FCE9DC', text: '#232A4D', acc: ['#2D4CC8', '#D6246E', '#F4B400'] },
    { id: 'museum',   name: '现代博物',   dark: false, bg: '#F6F1E5', text: '#232838', acc: ['#2A4A8F', '#B5604A', '#C99A3C'] },
    { id: 'acid',     name: '酸性时尚',   dark: false, bg: '#E9D24A', text: '#15173A', acc: ['#2433C8', '#C81E6E', '#00897B'] },
    { id: 'future',   name: '未来社区',   dark: false, bg: '#DAF7EC', text: '#1B2540', acc: ['#7C3AED', '#0E8FB0', '#E0457E'] },
    { id: 'tropical', name: '热带运动',   dark: false, bg: '#FFE0B8', text: '#2A4A66', acc: ['#00604A', '#C25A1A', '#234F96'] },
    { id: 'disco',    name: '电子舞厅',   dark: false, bg: '#F0DBFF', text: '#352A55', acc: ['#6E27D6', '#C0249A', '#0E8FB0'] },
    { id: 'rowing',   name: '赛艇俱乐部', dark: false, bg: '#FBF3D6', text: '#283A2C', acc: ['#2A4A8F', '#2E7D5B', '#D94A4A'] },
    { id: 'glass',    name: '玻璃城市',   dark: false, bg: '#E3F3FF', text: '#283E78', acc: ['#1F54BC', '#1B8E76', '#6735BE'] },
    { id: 'jelly',    name: '数字果冻',   dark: false, bg: '#FFE6EE', text: '#34285E', acc: ['#2A52CC', '#E0457E', '#8B5CF6'] },
  ];

  // 原生 3 套皮肤（app.js 自带）：按用户要求不在选择器里展示，仅保留 id 识别用于兜底，不重定义其样式
  var BUILTINS = [];
  var BUILTIN_IDS = { warm: 1, terminal: 1, editorial: 1 };

  var DEFAULT_SKIN = 'pixel'; // 默认主题：像素光

  // 精修覆盖（在通用推导之上微调）——多强调色皮肤已带显式 canvas，暂无需覆盖
  var OVERRIDES = {};

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
  // WCAG 相对亮度 + 对比度（gamma 正确版，用于「保证可读」推导）
  function relLum(h) { var c = toRgb(h); var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function contrastOf(a, b) { var L1 = relLum(a), L2 = relLum(b), hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); }
  // 把某色在指定底色上「调到够可读」：浅底压暗、暗底提亮，逐步逼近目标对比度（小字文本用）
  function readableOn(color, bg, target) {
    target = target || 4.5; var c = color, lightBg = relLum(bg) > 0.4;
    for (var i = 0; i < 24 && contrastOf(c, bg) < target; i++) c = lightBg ? darken(c, 0.05) : lighten(c, 0.05);
    return c;
  }

  /* ---------- 多强调色皮肤：不走单源推导，直接给 canvas + 一组并列 accent + 功能色 ----------
   * 数据形态：{ id,name,dark, acc:[a1,a2,a3], bg,bg2,bg3,panel,border,text, func:{ok,warn,err,info} }
   * a1 主（按钮/活动态/光标），a2 次（链接/分区标题/选区），a3 跳（徽章/角标）。canvas 保持中性，
   * 让三个 accent 立得起来——这是「多色还协调」的关键：协调靠共享底 + 角色分工，不靠把一切染成一个色。
   */
  function buildVarsMulti(p) {
    var a = p.acc, a1 = a[0], a2 = a[1], a3 = a[2], bg = p.bg, tx = p.text;
    var f = p.func || (p.dark ? DARK_FUNC : LIGHT_FUNC);   // 功能色：缺省走该明暗的共享状态色
    return {
      '--bg': bg,
      '--bg-2': p.bg2 || (p.dark ? lighten(bg, 0.05) : lighten(bg, 0.5)),
      '--bg-3': p.bg3 || (p.dark ? lighten(bg, 0.10) : darken(bg, 0.04)),
      '--panel': p.panel || (p.dark ? lighten(bg, 0.02) : lighten(bg, 0.3)),
      '--border': p.border || (p.dark ? lighten(bg, 0.14) : darken(bg, 0.10)),
      '--rule': p.dark ? lighten(bg, 0.09) : darken(bg, 0.06),
      '--text': tx,
      '--text-dim': mix(tx, bg, 0.40),
      '--text-faint': mix(tx, bg, 0.62),
      '--accent': a1, '--accent-2': a2, '--accent-3': a3,
      '--accent-2-text': readableOn(a2, bg, 4.5),      // a2 当小字（标题/链接）的可读变体：浅底自动压深
      '--accent-soft': alpha(a1, p.dark ? 0.16 : 0.14),
      '--accent-ink': ink(a1),
      '--accent-3-ink': ink(a3),                       // 徽章用 a3 填充时的文字色（黄底必黑字）
      '--green': f.ok,                                 // 状态绿（ok 点/good 数字/proj 徽章），不跟皮肤跳色
      '--yellow': f.warn,                              // 状态黄/收藏星/警告
      '--ok': f.ok, '--warn': f.warn, '--err': f.err, '--info': f.info,
      '--radius': p.dark ? '6px' : '10px',
      '--shadow': p.dark ? ('0 16px 50px ' + alpha(a1, 0.12) + ', 0 8px 30px rgba(0,0,0,0.55)') : ('0 12px 40px ' + alpha(a1, 0.14)),
      '--font-display': p.dark ? 'ui-monospace, "SF Mono", Menlo, monospace' : 'var(--font-ui)',
      '--font-fname': p.dark ? 'ui-monospace, "SF Mono", Menlo, monospace' : 'var(--font-ui)',
    };
  }

  /* ---------- 由 3 个原始色推导整套界面变量（偏还原但可读）---------- */
  function buildVars(p) {
    if (p.acc) return buildVarsMulti(p);              // 多强调色皮肤走独立分支
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
        // （多强调色皮肤没有 c1/c2，用前两个 accent 取光晕色）
        var g1 = p.acc ? p.acc[0] : p.c1, g2 = p.acc ? p.acc[1] : p.c2;
        css += sel + ' body{background-image:radial-gradient(120% 75% at 50% -8%,' +
          alpha(g1, 0.16) + ' 0%,' + alpha(g2, 0.07) + ' 38%,transparent 66%);background-attachment:fixed;}\n';
      } else {
        // 浅色组：微弱纸纹，和原生 warm/editorial 观感一致
        css += sel + ' body{background-image:radial-gradient(rgba(120,100,70,0.05) 1px,transparent 1px);background-size:4px 4px;}\n';
      }

      // 代码/源码表面跟皮肤走：Monaco 编辑器原来写死 #0b0c0a，所有深色皮肤共用一块中性近黑，
      // 跟皮肤一对比就突兀。这里按该皮肤基底推导一块「同色温」底（深色比页面再深一档当「凹槽」，
      // 浅色用更亮的 bg-2），盖掉 fb-dark/fb-paper 的固定底——与终端(--bg)、面板同色系，无缝衔接。
      // 用 !important + [data-theme] 作用域压过 Monaco 自带的主题样式；只动背景，语法配色不碰。
      var codeBg = p.dark ? mix(v['--bg'], '#000000', 0.10) : v['--bg-2'];
      var gutterBg = p.dark ? mix(v['--bg'], '#000000', 0.04) : lighten(v['--bg-2'], 0.4);
      css += sel + ' .monaco-editor,' +
             sel + ' .monaco-editor .monaco-editor-background,' +
             sel + ' .monaco-editor .overflow-guard,' +
             sel + ' .monaco-editor-background{background-color:' + codeBg + ' !important;}\n';
      css += sel + ' .monaco-editor .margin,' +
             sel + ' .monaco-editor .glyph-margin{background-color:' + gutterBg + ' !important;}\n';

      // 多强调色皮肤：把 a2/a3 撒到高频小件上，让三色同台（a1 仍管按钮/活动态/选区）
      if (p.acc) {
        css += sel + ' .nav-title{color:var(--accent-2-text);}\n';            // 侧栏分区标题 → a2(可读变体)
        css += sel + ' .theme-switch-label{color:var(--accent-2-text);}\n';   // 皮肤/提示符 标签 → a2
        css += sel + ' .md-body a{color:var(--accent-2-text);}\n';            // 正文链接 → a2
        css += sel + ' .proj-tag{background:var(--accent-3);color:var(--accent-3-ink);border-color:transparent;}\n'; // 项目徽章 → a3 填充
        // 文件区角标原是 .grid .item .icon .proj-tag(特异性 0,4,0)磨砂半透盖过上面那条，这里用同结构压过它，让 a3 露出来
        css += sel + ' .grid .item .icon .proj-tag{background:var(--accent-3);color:var(--accent-3-ink);border-color:transparent;backdrop-filter:none;}\n';
      }
    });
    var st = document.createElement('style');
    st.id = 'fbx-themes-css';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- 每套皮肤一整套 ANSI 16 色 ----------
   * 锚色用 Catppuccin Mocha(暗)/Latte(亮)——成熟、对比均衡、长读可读；再把每个色「微偏」该皮肤
   * 强调色（~10%），让每套皮肤的终端输出 + dark-ansi 下的 Claude Code 都带自己的色温，又不丢语义
   * （红还是红、绿还是绿）。前景从原来刺眼的近纯白柔化成偏皮肤色的柔白。
   */
  function buildAnsi(p, acc) {
    var t = function (h, amt) { return mix(h, acc, amt == null ? 0.10 : amt); };
    if (p.dark) {
      return {
        foreground: mix('#cdd6f4', acc, 0.07),
        black: '#45475a', red: t('#f38ba8'), green: t('#a6e3a1'), yellow: t('#f9e2af'),
        blue: t('#89b4fa'), magenta: t('#cba6f7'), cyan: t('#94e2d5'), white: t('#bac2de', 0.05),
        brightBlack: '#585b70', brightRed: t('#f5a0b8'), brightGreen: t('#b6f0b1'), brightYellow: t('#ffeec0'),
        brightBlue: t('#a6c8ff'), brightMagenta: t('#dcc0ff'), brightCyan: t('#aef0e2'), brightWhite: mix('#ffffff', acc, 0.04),
      };
    }
    // 浅底上的彩字：Latte 锚色在饱和浅底（尤其 acid 金黄）对比会塌——统一压暗、黄/绿/青压更狠，
    // 再微偏皮肤强调色保留色温；实测每套浅皮肤的彩色对终端底对比度都 >= 3.5。brightWhite 原是近白、
    // 在浅底上隐形，这里也压成深色。
    var d = function (h, amt, tint) { return mix(darken(h, amt), acc, tint == null ? 0.08 : tint); };
    return {
      foreground: mix('#4c4f69', acc, 0.08),
      black: '#5c5f77', red: d('#b3122e', 0.06), green: d('#2f7d1e', 0.20), yellow: d('#8f6206', 0.18),
      blue: d('#1346c9', 0.06), magenta: d('#7421c4', 0.08), cyan: d('#0c666b', 0.16), white: mix('#6c6f85', acc, 0.05),
      brightBlack: '#6c6f85', brightRed: d('#c5183a', 0.02), brightGreen: d('#36912b', 0.20), brightYellow: d('#9c6e0a', 0.10),
      brightBlue: d('#2a5fe6', 0.02), brightMagenta: d('#8631e6', 0.04), brightCyan: d('#159195', 0.20), brightWhite: '#2a2c3e',
    };
  }

  /* ---------- 让终端 / 编辑器跟着换色（复用最接近的现有主题，低风险）---------- */
  function extendTermAndMonaco() {
    try {
      if (typeof term !== 'undefined' && term.themes) {
        PALETTES.forEach(function (p) {
          // 每套皮肤一套终端配色：背景/光标/选区取该皮肤推导色（与面板同底、无缝衔接），
          // 前景 + ANSI 16 色由 buildAnsi 按皮肤推导（让 dark-ansi 下的 Claude Code 也跟皮肤）。
          var v = buildVars(p);
          if (OVERRIDES[p.id]) { var o = OVERRIDES[p.id]; for (var ok in o) v[ok] = o[ok]; }
          var base = p.dark ? term.themes.terminal : term.themes.warm;
          var t = {};
          for (var k in base) t[k] = base[k];          // 继承结构，补齐可能遗漏的键
          var a = buildAnsi(p, v['--accent']);
          for (var ak in a) t[ak] = a[ak];             // 覆盖前景 + 16 ANSI
          t.background = v['--bg'];
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
    document.documentElement.dataset.mode = isDark(skin) ? 'dark' : 'light'; // 供 CSS 用 [data-mode] 只改浅色，不波及深色

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
    if (item.acc) return item.acc;                   // 多强调色皮肤：色卡直接显 3 个 accent
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
