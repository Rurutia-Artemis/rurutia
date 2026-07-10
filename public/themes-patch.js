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
    // —— 暗底霓虹系 9 套（v2：底色分 3 档深浅 + 拉开色相，去同质化）——
    { id: 'grid',  name: '电路板', dark: true, bg: '#0C140D', text: '#E4ECDD', acc: ['#3DDC84', '#FFC83D', '#2AD0E0'] },
    { id: 'pixel', name: '像素光', dark: true, bg: '#1B0F1A', text: '#ECE6F2', acc: ['#FF3D8B', '#21E6C1', '#FFE03D'] },
    { id: 'axis',  name: '工业轴', dark: true, bg: '#1E1B10', text: '#E9E6DD', acc: ['#FF8F1F', '#00BCD4', '#FFC83D'] },
    { id: 'void',  name: '虚空',   dark: true, bg: '#141A33', text: '#E6E2F2', acc: ['#8B5CFF', '#64DD17', '#00D9FF'] },
    { id: 'mode',  name: '霓虹夜', dark: true, bg: '#1C0E14', text: '#F0E6EA', acc: ['#FF2D55', '#5B8CFF', '#FF9F2D'] },
    { id: 'unit',  name: '电光紫', dark: true, bg: '#1E0E2A', text: '#ECE2F5', acc: ['#BE52FF', '#00D9FF', '#FF4DD8'] },
    { id: 'flux',  name: '熔岩橙', dark: true, bg: '#241509', text: '#F2E8E2', acc: ['#FF6B35', '#2F9BED', '#FFC23D'] },
    { id: 'core',  name: '深海核', dark: true, bg: '#0C1E22', text: '#DEEAEA', acc: ['#00B8A0', '#FFB300', '#4DA6FF'] },
    { id: 'form',  name: '翡翠林', dark: true, bg: '#102A19', text: '#E2ECE4', acc: ['#00D165', '#FF7043', '#FFC93C'] },
    // —— 浅底海报系 9 套（v2：底色加深一档、surface 不再洗白）——
    { id: 'memphis',  name: '新孟菲斯',   dark: false, bg: '#F7DEC9', text: '#232A4D', acc: ['#2D4CC8', '#D6246E', '#F4B400'] },
    { id: 'museum',   name: '现代博物',   dark: false, bg: '#EFE6D2', text: '#232838', acc: ['#2A4A8F', '#B5604A', '#C99A3C'] },
    { id: 'acid',     name: '酸性时尚',   dark: false, bg: '#DEC95C', text: '#15173A', acc: ['#2433C8', '#C81E6E', '#00897B'] },
    { id: 'future',   name: '未来社区',   dark: false, bg: '#C9EFDD', text: '#1B2540', acc: ['#7C3AED', '#0E8FB0', '#E0457E'] },
    { id: 'tropical', name: '热带运动',   dark: false, bg: '#FAD6A6', text: '#2A4A66', acc: ['#00604A', '#C25A1A', '#234F96'] },
    { id: 'disco',    name: '电子舞厅',   dark: false, bg: '#E6CCFB', text: '#352A55', acc: ['#6E27D6', '#C0249A', '#0E8FB0'] },
    { id: 'rowing',   name: '赛艇俱乐部', dark: false, bg: '#F2E7C3', text: '#283A2C', acc: ['#2A4A8F', '#2E7D5B', '#D94A4A'] },
    { id: 'glass',    name: '玻璃城市',   dark: false, bg: '#D2EAFB', text: '#283E78', acc: ['#1F54BC', '#1B8E76', '#6735BE'] },
    { id: 'jelly',    name: '数字果冻',   dark: false, bg: '#FBD9E4', text: '#34285E', acc: ['#2A52CC', '#E0457E', '#8B5CF6'] },
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
    // 浅色降亮度（Vela 契约 v3）：生产力工具要长时间盯，原页面底 67–80% 亮度、内容面 75–85%，
    // 盯久了刺眼。把页面底压进 52–62% 带（>62% 按 4% 一档往下，最多五档；本来就在带内的不动），
    // 面材贴着底走——「染色的纸」，不是发光的白。色相不动，皮肤还是那张脸，只是灯调暗了。
    if (!p.dark) { for (var i = 0; i < 5 && relLum(bg) > 0.62; i++) bg = darken(bg, 0.04); }
    return {
      '--bg': bg,
      '--bg-2': p.bg2 || (p.dark ? lighten(bg, 0.05) : lighten(bg, 0.10)),
      '--bg-3': p.bg3 || (p.dark ? lighten(bg, 0.10) : darken(bg, 0.05)),
      '--panel': p.panel || (p.dark ? lighten(bg, 0.02) : lighten(bg, 0.05)),
      '--border': p.border || (p.dark ? lighten(bg, 0.14) : darken(bg, 0.14)), // 暗一点的纸配更结实的骨线
      '--rule': p.dark ? lighten(bg, 0.09) : darken(bg, 0.08),
      '--text': tx,
      '--text-dim': mix(tx, bg, p.dark ? 0.40 : 0.32),   // 浅底收窄混合，暗淡字抬回 3:1 以上
      '--text-faint': mix(tx, bg, p.dark ? 0.62 : 0.54),
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
      var gutterBg = p.dark ? mix(v['--bg'], '#000000', 0.04) : lighten(v['--bg-2'], 0.12); // 降亮度后 0.4 的白沟槽太晃，收到 0.12
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

  /* ---------- 每套皮肤一整套 ANSI 16 色（v2：真跟皮肤 + 醒目）----------
   * 上一版的问题：18 套皮肤共用一副 Catppuccin 锚色、只往皮肤色偏 10%——换肤后终端里的
   * Claude Code（dark-ansi 下界面全走这 16 色）几乎看不出差别，框线永远是灰的。这版两刀：
   *   1. 关系槽（蓝/品红/青，Claude Code 的横幅/强调/链接）按色相就近把皮肤三强调色请上台——
   *      皮肤是什么色，终端里的重点就是什么色；语义槽（红=错、绿=成、黄=警）保住色相、拉高饱和。
   *   2. brightBlack 是 Claude Code 对话框的框线/暗淡文字——往皮肤主强调色偏 40%，框跟皮肤发光。
   * 可读性：浅底所有彩字压到对终端底 >= 3.2 对比度；暗底彩字提亮到 >= 2.8。
   */
  function hueOf6(h) {
    var c = toRgb(h), r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return -1; // 无色相（灰）
    var H = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return H * 60;
  }
  function satOf(h) { var c = toRgb(h), mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); return mx ? (mx - mn) / mx : 0; }
  function hueDist(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

  function buildAnsi(p, acc, acc2, acc3, bgEff) {
    var bg = bgEff || p.bg;   // 浅色降亮度后生效底 ≠ 原始 bg，可读性目标要对新纸算
    // 语义锚色：比 Catppuccin 更饱和、更亮堂（暗底），浅底用同族深色
    var A = p.dark
      ? { red: '#ff5c6c', green: '#3ddc84', yellow: '#ffd93d', blue: '#5b9bff', magenta: '#d67bff', cyan: '#35e0d0' }
      : { red: '#c2183a', green: '#1d7a34', yellow: '#8f6206', blue: '#1c4fd6', magenta: '#8a1ec8', cyan: '#0b7d85' };
    // 关系槽 ← 皮肤强调色：按色相就近分配（每个强调色最多占一个槽；灰调/离得太远的不硬塞）
    var SLOT_HUE = { blue: 225, magenta: 310, cyan: 180 };
    var accs = [acc, acc2, acc3].filter(Boolean).filter(function (c) { return satOf(c) > 0.30 && hueOf6(c) >= 0; });
    var pairs = [];
    Object.keys(SLOT_HUE).forEach(function (slot) {
      accs.forEach(function (c) { pairs.push({ slot: slot, c: c, d: hueDist(hueOf6(c), SLOT_HUE[slot]) }); });
    });
    pairs.sort(function (x, y) { return x.d - y.d; });
    var slotColor = {}, usedAcc = {};
    pairs.forEach(function (pr) {
      if (pr.d > 70 || slotColor[pr.slot] || usedAcc[pr.c]) return;
      slotColor[pr.slot] = pr.c; usedAcc[pr.c] = 1;
    });
    // 可读性整备：暗底提亮、浅底压暗
    var fix = p.dark
      ? function (c, t) { return readableOn(c, bg, t || 2.8); }
      : function (c, t) { return readableOn(c, bg, t || 3.2); };
    var tint = function (h, amt) { return mix(h, acc, amt); };
    var base = {
      red: fix(tint(A.red, 0.08), p.dark ? 2.8 : 3.5),
      green: fix(tint(A.green, 0.08)),
      yellow: fix(tint(A.yellow, 0.08)),
      blue: fix(slotColor.blue || tint(A.blue, 0.16)),
      magenta: fix(slotColor.magenta || tint(A.magenta, 0.16)),
      cyan: fix(slotColor.cyan || tint(A.cyan, 0.16)),
    };
    if (p.dark) {
      return {
        foreground: mix(p.text, acc, 0.08),
        black: mix(lighten(bg, 0.20), acc, 0.10),
        red: base.red, green: base.green, yellow: base.yellow,
        blue: base.blue, magenta: base.magenta, cyan: base.cyan,
        white: mix('#c8cede', acc, 0.10),
        // Claude Code 的框线/暗淡字：带足皮肤色温但压着亮度，框「发光」而字不抢正文
        brightBlack: fix(mix('#8a8fa0', acc, 0.40), 2.4),
        brightRed: lighten(base.red, 0.18), brightGreen: lighten(base.green, 0.18), brightYellow: lighten(base.yellow, 0.18),
        brightBlue: lighten(base.blue, 0.18), brightMagenta: lighten(base.magenta, 0.18), brightCyan: lighten(base.cyan, 0.18),
        brightWhite: mix('#ffffff', acc, 0.05),
      };
    }
    return {
      foreground: mix(p.text, acc, 0.08),
      black: mix('#3a3d4d', acc, 0.10),
      red: base.red, green: base.green, yellow: base.yellow,
      blue: base.blue, magenta: base.magenta, cyan: base.cyan,
      white: fix(mix('#6c6f85', acc, 0.08)),
      brightBlack: fix(mix('#6c6f85', acc, 0.35), 2.6),
      brightRed: darken(base.red, 0.06), brightGreen: darken(base.green, 0.06), brightYellow: darken(base.yellow, 0.06),
      brightBlue: darken(base.blue, 0.06), brightMagenta: darken(base.magenta, 0.06), brightCyan: darken(base.cyan, 0.06),
      brightWhite: mix('#2a2c3e', acc, 0.08), // 浅底上「亮白」反而要深，否则隐形
    };
  }

  /* ---------- 用户自选终端色：每套皮肤分开记忆，存 localStorage ---------- */
  var TERM_OVERRIDES = (function () {
    try { return JSON.parse(localStorage.getItem('fb_term_colors') || '{}') || {}; } catch (e) { return {}; }
  })();
  function saveTermOverrides() {
    try { localStorage.setItem('fb_term_colors', JSON.stringify(TERM_OVERRIDES)); } catch (e) { /* */ }
  }
  function ovFor(skin) { return TERM_OVERRIDES[skin] || {}; }
  // 皮肤默认 + 用户覆盖 = 生效主题；写回 term.themes[skin] 让 app.js 的 theme()/retheme() 原样吃到
  function mergeSkinTheme(skin) {
    try {
      if (typeof term === 'undefined' || !term.themesBase || !term.themesBase[skin]) return;
      var t = {}, b = term.themesBase[skin], o = ovFor(skin);
      for (var k in b) t[k] = b[k];
      for (var k2 in o) t[k2] = o[k2];
      term.themes[skin] = t;
    } catch (e) { /* */ }
  }

  /* ---------- 让终端 / 编辑器跟着换色（复用最接近的现有主题，低风险）---------- */
  function extendTermAndMonaco() {
    try {
      if (typeof term !== 'undefined' && term.themes) {
        // 原始默认存一份（含 app.js 自带的 3 套），自选颜色的「还原默认」从这里取
        term.themesBase = term.themesBase || {};
        ['terminal', 'warm', 'editorial'].forEach(function (id) {
          if (term.themes[id] && !term.themesBase[id]) {
            var c = {}; for (var k in term.themes[id]) c[k] = term.themes[id][k];
            term.themesBase[id] = c;
          }
        });
        PALETTES.forEach(function (p) {
          // 每套皮肤一套终端配色：背景/光标/选区取该皮肤推导色（与面板同底、无缝衔接），
          // 前景 + ANSI 16 色由 buildAnsi 按皮肤推导（让 dark-ansi 下的 Claude Code 也跟皮肤）。
          var v = buildVars(p);
          if (OVERRIDES[p.id]) { var o = OVERRIDES[p.id]; for (var ok in o) v[ok] = o[ok]; }
          var base = p.dark ? term.themes.terminal : term.themes.warm;
          var t = {};
          for (var k in base) t[k] = base[k];          // 继承结构，补齐可能遗漏的键
          var a = buildAnsi(p, v['--accent'], v['--accent-2'], v['--accent-3'], v['--bg']);
          for (var ak in a) t[ak] = a[ak];             // 覆盖前景 + 16 ANSI
          t.background = v['--bg'];
          t.cursor = v['--accent'];
          t.cursorAccent = v['--bg'];
          t.selectionBackground = alpha(v['--accent'], 0.28);
          term.themesBase[p.id] = t;
          mergeSkinTheme(p.id);
        });
        ['terminal', 'warm', 'editorial'].forEach(mergeSkinTheme);
        // 终端背景跟随 --bg 是 tintTheme 干的；用户自选了背景就得让用户说了算
        if (term.tintTheme && !term.__tcTintWrapped) {
          var origTint = term.tintTheme.bind(term);
          term.tintTheme = function (th, dir) {
            var out = origTint(th, dir);
            try { var o = ovFor(state.theme); if (o.background) out.background = o.background; } catch (e) { /* */ }
            return out;
          };
          term.__tcTintWrapped = 1;
        }
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
  // 终端标签 hover 光标:斜箭头实心填皮肤强调色 + 白描边,跟皮肤走。
  // data URI 不能引用 CSS 变量,所以按当前 accent 现拼一份,塞给 --tab-cursor(soft-patch 里用它)。
  function setTabCursor() {
    try {
      var acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e0567a';
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
        + '<path d="M5 3l13 7.2-5.4 1.2 3 5.6-2.4 1.3-3-5.7L5 17z" fill="' + acc + '" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';
      document.documentElement.style.setProperty('--tab-cursor', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") 4 3, pointer');
    } catch (e) { /* 取不到 accent 就退回 pointer(CSS var fallback) */ }
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
    setTabCursor(); // 让标签光标跟着新皮肤的强调色重拼
    try { updateTcCurrent(skin); var tp = document.getElementById('fbx-tc-pop'); if (tp && !tp.classList.contains('hidden')) buildTcRows(tp, skin); } catch (e) { /* 编辑器未装好不挡换肤 */ }
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

  /* ---------- 终端配色编辑器：每个槽位标着 Claude Code 里的实际用途，改哪个框什么色一目了然 ----------
   * 皮肤下面自己一行「终端配色」。点开出面板：常用 12 槽 + 亮色变体（折叠）。改动即时下发到所有
   * 开着的终端（含正在跑的 Claude Code），每套皮肤分开记忆（fb_term_colors），可逐项/整套还原。
   */
  var TC_SLOTS = [
    { k: 'background', n: '背景', d: '终端底色（默认跟皮肤面板）' },
    { k: 'foreground', n: '正文文字', d: 'Claude 回答、命令输出的默认色' },
    { k: 'cursor', n: '光标', d: '' },
    { k: 'selectionBackground', n: '选中底色', d: '鼠标选中文本的背景', a: true },
    { k: 'brightBlack', n: '框线 / 暗淡字', d: 'Claude Code 对话框的边框、思考中的灰字' },
    { k: 'blue', n: '蓝 · 信息横幅', d: '提示框、进行中状态' },
    { k: 'cyan', n: '青 · 链接路径', d: '文件路径、URL、命令名' },
    { k: 'magenta', n: '品红 · 强调', d: '特殊高亮' },
    { k: 'green', n: '绿 · 成功新增', d: '确认框选中项、diff 新增行' },
    { k: 'red', n: '红 · 错误删除', d: '报错、diff 删除行' },
    { k: 'yellow', n: '黄 · 警告等待', d: '警告、待确认' },
    { k: 'white', n: '次要文字', d: '' },
    { k: 'black', n: '暗底块', d: '', adv: true },
    { k: 'brightRed', n: '亮红', d: '', adv: true },
    { k: 'brightGreen', n: '亮绿', d: '', adv: true },
    { k: 'brightYellow', n: '亮黄', d: '', adv: true },
    { k: 'brightBlue', n: '亮蓝', d: '', adv: true },
    { k: 'brightMagenta', n: '亮品红', d: '', adv: true },
    { k: 'brightCyan', n: '亮青', d: '', adv: true },
    { k: 'brightWhite', n: '亮白', d: '', adv: true },
  ];
  function tcEffective(skin) {
    try { return (typeof term !== 'undefined' && term.themes && term.themes[skin]) || null; } catch (e) { return null; }
  }
  function tcHex6(v) { return /^#[0-9a-fA-F]{8}$/.test(v || '') ? v.slice(0, 7) : (v || '#888888'); }
  function tcApply(skin) {
    mergeSkinTheme(skin);
    try { if (typeof term !== 'undefined' && term.sessions && term.sessions.length && state.theme === skin) term.retheme(); } catch (e) { /* */ }
    updateTcCurrent(skin);
  }
  function updateTcCurrent(skin) {
    var cur = document.getElementById('fbx-tc-current');
    if (!cur) return;
    var t = tcEffective(skin);
    var n = Object.keys(ovFor(skin)).length;
    var bars = '';
    if (t) ['foreground', 'brightBlack', 'blue', 'green', 'red', 'yellow'].forEach(function (k) {
      bars += '<i style="background:' + tcHex6(t[k]) + '"></i>';
    });
    cur.innerHTML = '<span class="fbx-bars">' + bars + '</span><span class="fbx-nm">' +
      (n ? '已自定义 ' + n + ' 项' : '皮肤默认') + '</span><span class="fbx-caret">▾</span>';
  }
  function buildTcRows(pop, skin) {
    pop.innerHTML = '';
    var t = tcEffective(skin);
    if (!t) { pop.innerHTML = '<div class="fbx-tc-empty">终端还没就绪</div>'; return; }
    var o = ovFor(skin);
    var mkRow = function (s) {
      var row = document.createElement('label');
      row.className = 'fbx-tc-row' + (o[s.k] ? ' changed' : '');
      row.title = s.d || s.n;
      var val = tcHex6(t[s.k]);
      row.innerHTML = '<span class="fbx-tc-nm">' + s.n + '</span>' +
        (s.d ? '<span class="fbx-tc-d">' + s.d + '</span>' : '') +
        '<input type="color" value="' + val + '">' +
        '<button class="fbx-tc-reset" title="还原这项默认">↺</button>';
      var input = row.querySelector('input');
      input.addEventListener('input', function () {
        TERM_OVERRIDES[skin] = TERM_OVERRIDES[skin] || {};
        // 选中底色带透明度：取色后补上默认 28% alpha，不然一选就实心盖住文字
        TERM_OVERRIDES[skin][s.k] = s.a ? (input.value + '47') : input.value;
        saveTermOverrides(); tcApply(skin); row.classList.add('changed');
      });
      row.querySelector('.fbx-tc-reset').addEventListener('click', function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (TERM_OVERRIDES[skin]) { delete TERM_OVERRIDES[skin][s.k]; if (!Object.keys(TERM_OVERRIDES[skin]).length) delete TERM_OVERRIDES[skin]; }
        saveTermOverrides(); tcApply(skin);
        var bt = tcEffective(skin); if (bt) input.value = tcHex6(bt[s.k]);
        row.classList.remove('changed');
      });
      return row;
    };
    var head = document.createElement('div');
    head.className = 'fbx-tc-head';
    head.textContent = '终端配色 · ' + ((byId(skin) || {}).name || skin);
    pop.appendChild(head);
    TC_SLOTS.filter(function (s) { return !s.adv; }).forEach(function (s) { pop.appendChild(mkRow(s)); });
    var advBtn = document.createElement('button');
    advBtn.className = 'fbx-tc-adv';
    advBtn.textContent = '亮色变体（高级）▸';
    pop.appendChild(advBtn);
    var advBox = document.createElement('div');
    advBox.className = 'fbx-tc-advbox hidden';
    TC_SLOTS.filter(function (s) { return s.adv; }).forEach(function (s) { advBox.appendChild(mkRow(s)); });
    pop.appendChild(advBox);
    advBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      var open = !advBox.classList.toggle('hidden');
      advBtn.textContent = open ? '亮色变体（高级）▾' : '亮色变体（高级）▸';
    });
    var foot = document.createElement('div');
    foot.className = 'fbx-tc-foot';
    foot.innerHTML = '<button class="fbx-tc-resetall">还原本皮肤全部默认</button><span>改动即时生效 · 每套皮肤分开记忆</span>';
    foot.querySelector('.fbx-tc-resetall').addEventListener('click', function () {
      delete TERM_OVERRIDES[skin]; saveTermOverrides(); tcApply(skin); buildTcRows(pop, skin);
    });
    pop.appendChild(foot);
  }
  function buildTcSwitcher() {
    var themeHost = document.getElementById('theme-switch');
    if (!themeHost || document.getElementById('termcolor-switch')) return;
    var host = document.createElement('div');
    host.className = 'theme-switch';
    host.id = 'termcolor-switch';
    var label = document.createElement('div');
    label.className = 'theme-switch-label';
    label.textContent = '终端配色';
    host.appendChild(label);
    var current = document.createElement('button');
    current.id = 'fbx-tc-current';
    current.className = 'fbx-skin-current';
    host.appendChild(current);
    var pop = document.createElement('div');
    pop.id = 'fbx-tc-pop';
    pop.className = 'fbx-tc-pop hidden';
    host.appendChild(pop);
    themeHost.parentNode.insertBefore(host, themeHost.nextSibling);
    current.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var opening = pop.classList.contains('hidden');
      if (opening) buildTcRows(pop, state.theme); // 每次打开按当前皮肤现算
      pop.classList.toggle('hidden');
    });
    document.addEventListener('click', function (ev) {
      if (!host.contains(ev.target)) pop.classList.add('hidden');
    });
    updateTcCurrent(state.theme);
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
      /* 终端配色编辑器 */
      '#termcolor-switch{position:relative;}', // 弹窗 absolute，宿主必须 relative（v2.8.1 语言选择器的教训）
      '.fbx-tc-pop{position:absolute;left:0;right:0;bottom:calc(100% + 6px);max-height:56vh;overflow-y:auto;padding:7px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);z-index:120;}',
      '.fbx-tc-pop.hidden{display:none;}',
      '.fbx-tc-head{padding:4px 5px 8px;font-size:11.5px;font-weight:600;color:var(--text-dim);border-bottom:1px solid var(--rule);margin-bottom:4px;}',
      '.fbx-tc-row{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:6px;padding:4px 5px;border-radius:6px;cursor:pointer;}',
      '.fbx-tc-row:hover{background:var(--bg-3);}',
      '.fbx-tc-row .fbx-tc-nm{font-size:11.5px;color:var(--text);white-space:nowrap;}',
      '.fbx-tc-row.changed .fbx-tc-nm{color:var(--accent);}',
      '.fbx-tc-row .fbx-tc-d{font-size:10px;color:var(--text-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.fbx-tc-row input[type="color"]{width:26px;height:18px;padding:0;border:1px solid var(--border);border-radius:4px;background:none;cursor:pointer;}',
      '.fbx-tc-row .fbx-tc-reset{border:none;background:none;color:var(--text-faint);cursor:pointer;font-size:12px;padding:0 2px;visibility:hidden;}',
      '.fbx-tc-row:hover .fbx-tc-reset,.fbx-tc-row.changed .fbx-tc-reset{visibility:visible;}',
      '.fbx-tc-row .fbx-tc-reset:hover{color:var(--accent);}',
      '.fbx-tc-adv{display:block;width:100%;text-align:left;border:none;background:none;color:var(--text-dim);font-size:11px;padding:6px 5px 2px;cursor:pointer;}',
      '.fbx-tc-adv:hover{color:var(--text);}',
      '.fbx-tc-advbox.hidden{display:none;}',
      '.fbx-tc-foot{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:8px 5px 2px;border-top:1px solid var(--rule);margin-top:4px;}',
      '.fbx-tc-foot span{font-size:10px;color:var(--text-faint);}',
      '.fbx-tc-resetall{border:1px solid var(--border);background:var(--bg-3);color:var(--text-dim);font-size:10.5px;padding:3px 7px;border-radius:6px;cursor:pointer;}',
      '.fbx-tc-resetall:hover{color:var(--text);border-color:var(--accent);}',
      '.fbx-tc-empty{padding:10px;font-size:11px;color:var(--text-faint);}',
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
    buildTcSwitcher();

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
