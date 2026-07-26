/*
 * observer-patch.js — 观察舱（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * v2.12 改版：从「倒数模型」换成「今日 Token 里程」——消耗即成就，只涨不跌。
 * 视觉定稿见 design-demos/观察舱-token里程-样例.html（极光版 + 三种读数模式）。
 *
 * 数据三路（全部只读「运行本 App 的用户」自己的家目录，谁装谁读谁的）：
 *   · 大数字 = 今日全机消耗（/api/obs-tokens，5s 轮询）：
 *     Claude Code 读 ~/.claude/projects/**.jsonl 的 usage（真 token 含 cache），
 *     Codex 读 ~/.codex/sessions/** rollout 的 total_token_usage 快照按天求增量；
 *     两次轮询之间用 rAF 把显示值匀速滚向目标——滚轮一直在转，追上即停（零常驻开销）。
 *   · 仓位 = 打开的终端 tab（term.sessions），右上角显示该项目今日消耗（perCwd 归属）；
 *     外加「外部仓位」：Codex 会话 45s 内活跃、但 cwd 不属于任何打开的终端 →
 *     自动冒出一张带「外部」章的卡（如单开的 Codex 客户端），安静后自动收走。
 *   · 格子 = 该终端实时输出事件（fanboxPty.onData 旁听）：红=报错、黄=警告有语义，
 *     其余输出彩纸四色随机轮转（蓝/绿/强调/紫外）——工作时五颜六色地跳。
 *     （旧版「其它全归蓝」蓝海淹屏、「进度翻绿」把整卡刷成纯绿，v2.13.1 都撤了。）
 *
 * 色阶天梯（今日口径，v2.13 起四档阈值全可自定义：footer ⚙ 小浮层，存 rb_obs_tiers）：
 *   默认 点火 <1M 素白 → 蓝移 1M（--info）→ 紫外 10M（固定紫罗兰——皮肤没有紫色状态色，
 *   --accent 每套皮肤颜色都不同，挂不得）→ 鎏金 100M（--yellow）→ 棱镜 500M（五色流光）。
 *   跨阶一次性闪光；环境极光跟着色阶换色。仓位卡也按「该项目今日消耗」走同一套阈值
 *   换里程边框（蓝 / 紫 / 金 / 彩虹渐变）。
 *
 * 读数三模式（rb_obs_nummode，切换器在精确行右侧）：
 *   简写 = 三位有效数字+单位恒定超大；K = 只除 1000 其余位全滚；全显 = 记分牌两行堆叠。
 *   任一模式下方都有 11 位「精确」小滚轮（全显模式隐藏，它本身就是精确值）。
 *
 * 收工庆典（安静 6.5s 且本轮输出覆盖 ≥5 个活跃秒才判收工——tab 切换/resize 的整屏重绘
 *   是 1-2 秒的瞬时爆发，不算工作，防彩虹来回横跳）：闪光扫过 + 旋转彩虹流光 8.5s，
 *   谢幕后转入**常驻彩虹**（rest 态：静态渐变边框 + 对角彩虹格慢速流动 + 白点「已收工」），
 *   直到下一轮真实工作（活跃 ≥3 秒）开始才复原格子。子任务完成庆祝保留。
 *
 * 资源纪律（不变）：持续动效只碰 transform/opacity/合成器 filter；辉光全部预烘焙；
 *   面板关闭或窗口隐藏 → 定时器与 rAF 全停；浅色皮肤停用辉光/噪点（screen 叠加会出色斑）。
 * 布局不入侵：#app 打开时加 padding-right，面板自身 fixed 悬浮——12px 边距圆角卡，
 *   随 soft-patch 的卡片语言（18px 圆角 + 发丝边 + 柔光），与左侧终端/导航同一族。
 * web 版无终端不装载；?rbobs=demo 演示数据（无头验收），&rbtok=N 预置今日量，
 * &win=N 窗口数，&rbdone=1 预置一张收工卡，&rbmode=compact|kilo|full 预置读数模式，
 * &rbcfg=1 预置打开档位设置浮层。
 */
(function () {
  'use strict';
  var DEMO = /rbobs=demo/.test(location.search);
  var DEMOWIN = (function () { var m = /[?&]win=(\d+)/.exec(location.search); return m ? Math.max(1, Math.min(6, +m[1])) : 0; })();
  var DEMOTOK = (function () { var m = /[?&]rbtok=(\d+)/.exec(location.search); return m ? +m[1] : 0; })();
  if (!window.fanboxPty && !DEMO) return;
  if (/[?&]pv=/.test(location.search)) return; // 独立预览窗里不装

  var PANEL_W = 380;
  var OPEN_KEY = 'rb_obs_open';
  var MODE_KEY = 'rb_obs_nummode';
  var POLL_MS = 5000;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AGENT_BINS = ['claude', 'codex', 'grok', 'hermes', 'openclaw', 'kimi', 'opencode', 'pi', 'codebuddy', 'qodercli'];

  // ---------- 样式：全走皮肤变量，色阶经 --rbg 中转 ----------
  var st = document.createElement('style');
  st.textContent = [
    '@font-face { font-family: "Chakra Petch"; font-style: normal; font-weight: 600; font-display: swap; src: url("vendor/fonts/chakra-petch-600-latin.woff2") format("woff2"); }',
    '#app { transition: padding-right 340ms cubic-bezier(.77,0,.175,1); }',
    // 12(边) + 面板 + 12(与主界面卡片的缝)：跟 #app 自己的 12px 间隙节奏一致
    '#app.rb-obs-open { padding-right: ' + (PANEL_W + 24) + 'px; }',
    // 悬浮圆角卡：随 soft-patch 的卡片语言（18px 圆角 + 发丝边 + 柔光 + 亮一档底），不再贴边直角
    '#rb-obs { position: fixed; z-index: 45; top: 12px; right: 12px; bottom: 12px; width: ' + PANEL_W + 'px;',
    '  display: flex; flex-direction: column; overflow: hidden;',
    '  --rbg: var(--text-dim); --rb-num: "Chakra Petch", var(--font-mono, monospace);',
    '  background: radial-gradient(130% 42% at 50% -12%, color-mix(in srgb, var(--rbg) 14%, transparent), transparent 66%),',
    '    radial-gradient(80% 30% at 96% 106%, color-mix(in srgb, var(--rbg) 6%, transparent), transparent 62%), color-mix(in srgb, var(--bg-2) 50%, var(--bg));',
    '  border: 1px solid color-mix(in srgb, var(--text) 10%, transparent); border-radius: 18px;',
    '  box-shadow: 0 16px 40px -24px rgba(0,0,0,.4), 0 2px 8px -4px rgba(0,0,0,.24); color: var(--text);',
    '  transform: translateX(calc(100% + 26px)); transition: transform 340ms cubic-bezier(.77,0,.175,1);',
    '  -webkit-app-region: no-drag; }',
    // 紫外档专色：皮肤没有紫色状态色（--accent 每套皮肤颜色都不同，挂不得），固定紫罗兰；
    // 浅色皮肤换深一档保证可读。.ro-cfg 档位浮层挂在 body 下，需要同一份变量。
    '#rb-obs, .ro-cfg { --rb-uv: #a991ff; }',
    'html[data-mode="light"] #rb-obs, html[data-mode="light"] .ro-cfg { --rb-uv: #7a4fe0; }',
    '#rb-obs.t1 { --rbg: var(--info); }',
    '#rb-obs.t2 { --rbg: var(--rb-uv); }',
    '#rb-obs.t3 { --rbg: var(--yellow); }',
    '#rb-obs.t4 { --rbg: var(--accent); }',
    'html[data-mode="light"] #rb-obs { background: radial-gradient(130% 42% at 50% -12%, color-mix(in srgb, var(--rbg) 7%, transparent), transparent 66%), color-mix(in srgb, var(--bg-2) 50%, var(--bg)); }',
    '.desktop #rb-obs { top: 40px; }',
    '#app.rb-obs-open #rb-obs { transform: none; }',
    // 细颗粒噪点（深色皮肤专属材质；浅色会显脏，停用）
    '.ro-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none;',
    "  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E\"); }",
    'html[data-mode="light"] #rb-obs .ro-grain { display: none; }',
    // 顶部五色跑马灯（皮肤状态色）
    '.ro-track { position: absolute; z-index: 8; top: 0; right: 0; left: 0; height: 3px; overflow: hidden; background: color-mix(in srgb, var(--text) 5%, transparent); }',
    // 跑马灯改 transform 平移：原来动 left 属于布局属性，每步都要重排整条轨道。位移按自身宽度换算
    // （自身 26% 父宽，父坐标 -22%→100% 等价于自身 -84.6%→384.6%），轨迹与原来完全一致。
    '.ro-train { position: absolute; top: 0; left: 0; display: flex; width: 26%; height: 100%; animation: ro-train 8s steps(80) infinite; }',
    '.ro-train i { flex: 1; }',
    '.ro-train i:nth-child(1) { background: var(--err); }',
    '.ro-train i:nth-child(2) { background: var(--yellow); }',
    '.ro-train i:nth-child(3) { background: var(--ok); }',
    '.ro-train i:nth-child(4) { background: var(--info); }',
    '.ro-train i:nth-child(5) { background: var(--accent); }',
    '.ro-head { display: flex; align-items: center; gap: 9px; flex: 0 0 46px; padding: 3px 10px 0 15px; border-bottom: 1px solid var(--border); position: relative; z-index: 3; }',
    '.ro-dot { width: 6px; height: 6px; border-radius: 2px; background: var(--ok); box-shadow: 0 0 9px var(--ok); animation: ro-breathe 2.4s steps(24) infinite; flex: 0 0 auto; }',
    '.ro-eyebrow { color: var(--text-dim); font: 9px/1 var(--font-mono, monospace); letter-spacing: .14em; text-transform: uppercase; }',
    '.ro-x { display: grid; width: 26px; height: 26px; place-items: center; margin-left: auto; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); color: var(--text-dim); cursor: pointer; font-size: 11px; transition: transform 140ms cubic-bezier(.23,1,.32,1), background 160ms ease, color 160ms ease; }',
    '.ro-x:hover { background: var(--accent-soft, var(--panel)); color: var(--text); }',
    '.ro-x:active { transform: scale(.94); }',
    // ---- hero：今日 Token 里程 ----
    '.ro-hero { position: relative; z-index: 3; flex: 0 0 auto; margin: 13px 16px 0; padding: 0 2px; }',
    '.ro-hero-top { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; }',
    '.ro-label { color: var(--text-dim); font: 11px/1 var(--font-mono, monospace); letter-spacing: .16em; }',
    '.ro-badge { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 4px 10px 4px 8px;',
    '  border: 1px solid color-mix(in srgb, var(--rbg) 40%, transparent);',
    '  clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);',
    '  color: var(--rbg); font: 600 9.5px/1 var(--font-mono, monospace); letter-spacing: .1em;',
    '  background: color-mix(in srgb, var(--rbg) 9%, transparent);',
    '  transition: color 500ms ease, border-color 500ms ease, background 500ms ease; }',
    '.ro-badge i { width: 6px; height: 6px; background: currentColor; }',
    '.ro-badge.pop { animation: ro-badgepop 620ms cubic-bezier(.23,1,.32,1); }',
    '#rb-obs.t4 .ro-badge { color: var(--text); border-color: transparent;',
    '  background: linear-gradient(var(--panel), var(--panel)) padding-box, linear-gradient(100deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)) border-box; border: 1px solid transparent; }',
    // 跨阶闪光（预烘焙光斑，只动 opacity；浅色皮肤停用——screen 叠加在浅底出色斑）
    '.ro-bloom { position: absolute; inset: -6px -14px 20px; opacity: 0; pointer-events: none; mix-blend-mode: screen; filter: blur(18px); transition: opacity 1200ms ease;',
    '  background: radial-gradient(ellipse 62% 88% at 30% 55%, color-mix(in srgb, var(--rbg) 50%, transparent), transparent 62%),',
    '  radial-gradient(ellipse 55% 85% at 74% 45%, color-mix(in srgb, var(--rbg) 38%, transparent), transparent 62%); }',
    '.ro-hero.flash .ro-bloom { opacity: .9; transition: opacity 140ms ease; }',
    '.ro-hero.flash .ro-bigwrap { animation: ro-settle 560ms cubic-bezier(.23,1,.32,1); }',
    'html[data-mode="light"] #rb-obs .ro-bloom { display: none; }',
    // 主读数（简写/K 单行 + 全显两行堆叠）
    '.ro-bigwrap { display: inline-block; }',
    '.rb-big { display: inline-flex; align-items: baseline; font-family: var(--rb-num); font-weight: 600; font-size: 132px; line-height: 1; font-variant-numeric: tabular-nums;',
    '  transition: font-size 320ms cubic-bezier(.23,1,.32,1), filter 600ms ease; }',
    // 强制数字字体：soft-patch 有 body * { font-family: Maple !important } 全局兜底，
    // 会把大数字碾成 Maple（圆体+巨逗号）。这里用 #id+class 更高特异性的 !important 抢回来。
    '#rb-obs .rb-big, #rb-obs .rb-big *, #rb-obs .ro-subnum, #rb-obs .ro-subnum * { font-family: var(--rb-num) !important; }',
    '#rb-obs.t1 .rb-big, #rb-obs.t2 .rb-big, #rb-obs.t3 .rb-big { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--rbg) 38%, transparent)); }',
    '#rb-obs.t4 .rb-big { filter: drop-shadow(0 0 10px color-mix(in srgb, var(--yellow) 30%, transparent)) drop-shadow(0 0 22px color-mix(in srgb, var(--info) 30%, transparent)); }',
    'html[data-mode="light"] #rb-obs .rb-big { filter: none; }',
    '.rb-big.stack { display: none; flex-direction: column; align-items: flex-end; line-height: 1.06; font-size: 92px; }',
    '.rb-big .row { display: inline-flex; }',
    '.ro-hero.mode-full .rb-big.line { display: none; }',
    '.ro-hero.mode-full .rb-big.stack { display: inline-flex; }',
    '.ro-hero.mode-full .ro-subcap, .ro-hero.mode-full .ro-subnum { display: none; }',
    '.ro-hero.mode-compact #rb-kilo, .ro-hero.mode-kilo #rb-compact { display: none; }',
    '.rb-unit { font-size: .38em; margin-left: .08em; transform: translateY(-.06em); color: var(--text-dim); }',
    '#rb-obs.t1 .rb-unit { color: var(--info); }',
    '#rb-obs.t2 .rb-unit { color: var(--rb-uv); }',
    '#rb-obs.t3 .rb-unit { color: var(--yellow); }',
    '#rb-obs.t4 .rb-unit { background-image: linear-gradient(120deg, var(--yellow), var(--ok), var(--info)); background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }',
    // 滚轮构件（大字与精确行共用）：容器一律 inline-flex——inline-block 的 baseline 对齐
    // 会拿 overflow:hidden 盒子的底边当基线，整行错位（真实壳里踩过的坑）
    '.rb-digits, #rb-sub, #rb-rowhi, #rb-rowlo { display: inline-flex; }',
    '.rb-dg { display: inline-block; vertical-align: top; width: .6em; height: 1em; overflow: hidden; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.rb-dg.off, .rb-sep.off, .rb-pt.off { width: 0; opacity: 0; }',
    '.rb-sep { display: inline-block; vertical-align: top; width: .26em; height: 1em; overflow: hidden; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.rb-pt { display: inline-block; vertical-align: top; width: .3em; height: 1em; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    // will-change 不写死在这里：全部读数滚轮（简写4位+精确11位+K模式8位+全显两行~17位，
    // 量级~30个元素）常年占着合成器纹理，但滚轮多数时间是静止的（只有轮询到新 token 数、
    // 或用户切读数模式时才滚）。改成 JS 按需挂——见下方 setReelsWC，随 heroRaf 的起停开关。
    '.rb-reel { display: block; }',
    '.rb-reel b, .rb-sep b, .rb-pt b { display: block; height: 1em; line-height: 1; font-weight: 600; text-align: center; color: var(--text); }',
    // 色阶配色：t0 素色 → t1 蓝移 → t2 紫外 → t3 鎏金 → t4 棱镜（渐变文字缓慢流动，只作用于大字）
    // 千分位逗号（.rb-sep）与数字/小数点一起吃渐变——白逗号夹在渐变数字里太跳（用户报的 bug）
    (function () {
      // 渐变挂在**列容器**（.rb-reel / .rb-pt / .rb-sep）上，不是里面的每个 <b>。
      // 这是本次性能治理里唯一一条实测有效的大改：原来 30 个数字列 × 每列 11 个 <b> = 约 330 个元素
      // 各自扛着 background-clip:text + 动 background-position，实测这条动画独占观察舱动效开销的 82%
      // （关掉它省 24.8 点，而关掉色相旋转/锥形转圈/跑马灯各自都省不到 2 点）。成本随动画元素个数走，
      // 降帧（steps）完全无效——动画只要在跑，每帧都要重画字形蒙版。提到容器上元素数降到 1/11，实测省 19 点。
      // 注意不能再往上提到 .rb-dg：.rb-reel 带 transform 会形成独立绘制上下文，父级的 background-clip:text
      // 抓不到它的文字，数字会整个消失（试过，白屏）。.rb-reel 自己是那层 transform 的持有者，正好是上限。
      var sel = function (t, pre) {
        return ['.rb-reel', '.rb-pt', '.rb-sep'].map(function (p) { return (pre || '') + '#rb-obs.' + t + ' .rb-big ' + p; }).join(', ');
      };
      var selB = function (t) { return sel(t).split(', ').map(function (s) { return s + ' b'; }).join(', '); };
      var flow = function (c, dk) { return 'linear-gradient(100deg, color-mix(in srgb, ' + c + ' 55%, #fff) 0%, ' + c + ' 32%, color-mix(in srgb, ' + c + ' 70%, ' + dk + ') 60%, ' + c + ' 82%, color-mix(in srgb, ' + c + ' 55%, #fff) 100%)'; };
      var flowLight = function (c, dk) { return 'linear-gradient(100deg, ' + c + ' 0%, color-mix(in srgb, ' + c + ' 70%, ' + dk + ') 50%, ' + c + ' 100%)'; };
      var L = 'html[data-mode="light"] ';
      return [
        // 回 linear：steps() 降帧对这条动画一点用都没有（实测），而 linear 的流动更顺
        [sel('t1'), sel('t2'), sel('t3'), sel('t4')].join(', ') + ' { color: transparent; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-size: 64px 100%; animation: ro-flow 5.6s linear infinite; }',
        // 数字本体让位：自身填充透明，让上面容器那层被字形裁过的渐变透出来
        [selB('t1'), selB('t2'), selB('t3'), selB('t4')].join(', ') + ' { color: inherit; -webkit-text-fill-color: inherit; }',
        sel('t1') + ' { background-image: ' + flow('var(--info)', '#003') + '; }',
        sel('t2') + ' { background-image: ' + flow('var(--rb-uv)', '#103') + '; }',
        sel('t3') + ' { background-image: ' + flow('var(--yellow)', '#530') + '; }',
        sel('t4') + ' { background-image: linear-gradient(100deg, var(--err) 0%, var(--yellow) 22%, var(--ok) 44%, var(--info) 64%, var(--accent) 84%, var(--err) 100%); }',
        sel('t1', L) + ' { background-image: ' + flowLight('var(--info)', '#003') + '; }',
        sel('t2', L) + ' { background-image: ' + flowLight('var(--rb-uv)', '#103') + '; }',
        sel('t3', L) + ' { background-image: ' + flowLight('var(--yellow)', '#530') + '; }',
      ].join('\n');
    })(),
    // 精确行 + 模式切换
    '.ro-subrow { display: flex; align-items: center; gap: 8px; margin: 9px 0 0; }',
    '.ro-subcap { color: var(--text-faint); font: 9px/1 var(--font-mono, monospace); letter-spacing: .14em; }',
    '.ro-subnum { font-family: var(--rb-num); font-weight: 600; font-size: 18px; line-height: 1; }',
    '.ro-subnum .rb-reel b, .ro-subnum .rb-sep b { color: color-mix(in srgb, var(--text) 62%, transparent); }',
    '.ro-modesw { margin-left: auto; display: inline-flex; gap: 3px; }',
    '.ro-modesw button { padding: 3px 8px; border: 1px solid var(--border); border-radius: 6px; background: none; color: var(--text-faint); font: 600 9px/1 var(--font-mono, monospace); letter-spacing: .06em; cursor: pointer; transition: color 160ms ease, background 160ms ease, border-color 160ms ease; }',
    '.ro-modesw button:hover { color: var(--text); }',
    '.ro-modesw button.on { border-color: color-mix(in srgb, var(--text) 24%, transparent); background: color-mix(in srgb, var(--text) 7%, transparent); color: var(--text); }',
    // 里程仪表：十段刻度，跨阶清零像新的一圈
    '.ro-meterrow { display: flex; align-items: center; gap: 9px; margin: 12px 0 0; }',
    '.ro-meter { position: relative; flex: 1; height: 6px; background: color-mix(in srgb, var(--text) 8%, transparent); border-radius: 2px; overflow: hidden; }',
    '.ro-meter i { display: block; height: 100%; width: 0; background: color-mix(in srgb, var(--rbg) 92%, transparent); transition: width 500ms cubic-bezier(.23,1,.32,1), background 500ms ease; }',
    '#rb-obs.t4 .ro-meter i { background: linear-gradient(90deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)); }',
    '.ro-meter::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1.5px), var(--bg) calc(10% - 1.5px) 10%); }',
    '.ro-meternext { color: var(--text-faint); font: 10px/1 var(--font-mono, monospace); letter-spacing: .08em; flex: 0 0 auto; }',
    '.ro-meternext b { color: var(--rbg); font-weight: 600; transition: color 500ms ease; }',
    '.ro-trend { margin: 10px 0 0; color: var(--text-dim); font: 11.5px/1.4 var(--font-mono, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.ro-trend b { color: var(--ok); font-weight: 500; }',
    '.ro-srcrow { display: flex; align-items: center; gap: 12px; margin: 6px 0 0; }',
    '.ro-src { display: inline-flex; align-items: center; gap: 5px; color: var(--text-faint); font: 10px/1 var(--font-mono, monospace); }',
    '.ro-src i { width: 6px; height: 6px; border-radius: 2px; flex: 0 0 auto; }',
    '.ro-src b { color: var(--text-dim); font-weight: 500; }',
    '.ro-srcnote { margin-left: auto; color: var(--text-faint); font: 9px/1 var(--font-mono, monospace); letter-spacing: .06em; }',
    // 读数口径开关：净用量（默认）/ 含缓存重读。做成小胶囊挂在来源行末尾，不抢版面
    '.ro-cachesw { flex: none; padding: 2px 6px; border: 1px solid var(--border); border-radius: 5px; background: none; color: var(--text-faint); font: 9px/1 var(--font-mono, monospace); letter-spacing: .04em; cursor: pointer; transition: color 160ms ease, border-color 160ms ease; }',
    '.ro-cachesw:hover { color: var(--text-dim); border-color: color-mix(in srgb, var(--text) 26%, transparent); }',
    '.ro-cachesw.raw { color: var(--yellow); border-color: color-mix(in srgb, var(--yellow) 45%, transparent); }',
    '.ro-rule { position: relative; z-index: 3; height: 1px; margin: 13px 16px 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--rbg) 45%, transparent) 30%, color-mix(in srgb, var(--rbg) 45%, transparent) 70%, transparent); }',
    // ---- 仓位 ----
    '.ro-flow { position: relative; z-index: 3; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 13px 14px 12px; min-height: 0; overflow-y: auto; align-content: start; }',
    '.ro-flow.cols-1 { grid-template-columns: 1fr; }',
    '.ro-flow::-webkit-scrollbar { width: 0; }',
    '.ro-mod { position: relative; min-width: 0; padding: 10px 11px 11px; border: 1px solid var(--border); border-radius: 13px; background: var(--panel); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent); }',
    'html[data-mode="light"] .ro-mod { box-shadow: none; }',
    // 里程边框：该项目今日消耗走同一套自定义阈值（默认 1M 蓝 / 10M 紫 / 100M 金 / 500M 彩虹；
    // 常驻荣誉，收工的旋转流光是临时庆典）
    '.ro-mod.m1 { border-color: color-mix(in srgb, var(--info) 52%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 18px -7px color-mix(in srgb, var(--info) 50%, transparent); }',
    '.ro-mod.m2 { border-color: color-mix(in srgb, var(--rb-uv) 55%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 18px -7px color-mix(in srgb, var(--rb-uv) 55%, transparent); }',
    '.ro-mod.m3 { border-color: color-mix(in srgb, var(--yellow) 55%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 18px -7px color-mix(in srgb, var(--yellow) 55%, transparent); }',
    '.ro-mod.m4 { border: 1px solid transparent; background: linear-gradient(var(--panel), var(--panel)) padding-box, linear-gradient(120deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)) border-box;',
    '  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 16px -7px color-mix(in srgb, var(--err) 38%, transparent), 0 0 20px -8px color-mix(in srgb, var(--info) 38%, transparent); }',
    'html[data-mode="light"] .ro-mod.m1, html[data-mode="light"] .ro-mod.m2, html[data-mode="light"] .ro-mod.m3, html[data-mode="light"] .ro-mod.m4 { box-shadow: none; }',
    '.ro-mod.m1 .ro-cnt { color: var(--info); }',
    '.ro-mod.m2 .ro-cnt { color: var(--rb-uv); }',
    '.ro-mod.m3 .ro-cnt { color: var(--yellow); }',
    '.ro-mod.m4 .ro-cnt { background-image: linear-gradient(100deg, var(--yellow), var(--ok), var(--info)); background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; font-weight: 700; }',
    '.ro-mod-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }',
    '.ro-st { width: 7px; height: 7px; border-radius: 2px; background: var(--text-faint); flex: 0 0 auto; transition: background 300ms ease, box-shadow 300ms ease; }',
    '.ro-st.working { background: var(--ok); box-shadow: 0 0 8px var(--ok); animation: ro-breathe 2.4s steps(24) infinite; }',
    '.ro-st.waiting { background: var(--yellow); box-shadow: 0 0 8px var(--yellow); }',
    '.ro-st.exited { background: var(--err); }',
    '.ro-mod.ext .ro-st { background: var(--accent); box-shadow: 0 0 8px var(--accent); }',
    '.ro-pick { display: flex; align-items: center; gap: 5px; min-width: 0; border: none; background: none; padding: 2px 4px; margin: -2px 0; border-radius: 6px; color: var(--text); font-size: 12px; font-weight: 650; cursor: pointer; transition: background 160ms ease, transform 140ms cubic-bezier(.23,1,.32,1); }',
    '.ro-pick:hover { background: var(--accent-soft, rgba(128,128,128,.12)); }',
    '.ro-pick:active { transform: scale(.97); }',
    '.ro-pick small { color: var(--text-faint); font-size: 9px; }',
    '.ro-pick .ro-nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ro-extchip { flex: 0 0 auto; padding: 2px 5px; border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent); border-radius: 5px; color: var(--accent); font: 600 8px/1 var(--font-mono, monospace); letter-spacing: .1em; }',
    '.ro-cnt { margin-left: auto; color: var(--text-dim); font: 11px/1 var(--font-mono, monospace); flex: 0 0 auto; letter-spacing: .02em; }',
    '.ro-mod.working .ro-cnt { color: var(--text); }',
    // 本轮进度丝（回合机驱动）
    '.ro-run { position: relative; z-index: 2; display: block; height: 2px; margin: 0 0 8px; border-radius: 99px; background-color: color-mix(in srgb, var(--text) 8%, transparent); background-image: linear-gradient(90deg, var(--ok), var(--info)); background-repeat: no-repeat; background-size: 0% 100%; }',
    '.ro-mod.ext .ro-run { background-image: linear-gradient(90deg, var(--accent), var(--info)); }',
    '.ro-mod.done .ro-run { background-image: linear-gradient(90deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)); background-size: 100% 100%; }',
    '.ro-grid { position: relative; z-index: 2; display: grid; gap: 6px; }',
    // 不再常驻 translateZ(0)：单卡 24/40 格，观察舱峰值 6 张卡 + 外部仓位卡能堆到 150-250+ 格，
    // 面板收起时只是 #rb-obs 整体 translateX 移出可视区（没 display:none/卸载），常驻提升的图层
    // 会跟着一起常驻显存。图层提升挪到 .chasing/.pop 这两个真正会切 transform 的瞬时状态类上
    // （见下方），格子过渡动画/追灯/pop 弹跳观感不变。
    '.ro-cell { aspect-ratio: 1; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); transition: transform 200ms cubic-bezier(.23,1,.32,1), background-color 320ms ease, border-color 320ms ease, box-shadow 320ms ease; }',
    ['err', 'yellow', 'accent', 'ok', 'info'].map(function (t) {
      var v = 'var(--' + t + ')';
      return '.ro-cell.' + t + ' { color: ' + v + '; border-color: color-mix(in srgb, ' + v + ' 78%, transparent); background: color-mix(in srgb, ' + v + ' 66%, transparent); }\n' +
        'html[data-mode="light"] .ro-cell.' + t + ' { border-color: ' + v + '; background: color-mix(in srgb, ' + v + ' 90%, transparent); }';
    }).join('\n'),
    // 第六色：紫外（--rb-uv 专色）——彩纸轮转的第四张牌，皮肤状态色里没有紫
    '.ro-cell.uv { color: var(--rb-uv); border-color: color-mix(in srgb, var(--rb-uv) 78%, transparent); background: color-mix(in srgb, var(--rb-uv) 66%, transparent); }',
    'html[data-mode="light"] .ro-cell.uv { border-color: var(--rb-uv); background: color-mix(in srgb, var(--rb-uv) 90%, transparent); }',
    // 图层提升只挂在这两个真正会动 transform 的瞬时状态上：追灯每 640ms 挪一格、pop 是 340ms 一次性
    // 弹跳，持续时间短、同时命中的格子数也就个位数，撑不出常驻提升的成本
    '.ro-cell.chasing, .ro-cell.pop { will-change: transform; }',
    '.ro-cell.chasing { outline: 1px solid color-mix(in srgb, var(--text) 55%, transparent); outline-offset: 1px; transform: translateY(-2px) scale(1.08); }',
    '.ro-cell.pop { animation: ro-pop 340ms cubic-bezier(.23,1,.32,1); }',
    // ===== 收工 = 彩虹流光（一次性庆典 + 8.5s 持续流光后自动恢复） =====
    '.ro-rim { position: absolute; inset: 0; z-index: 0; border-radius: 13px; overflow: hidden; display: none; pointer-events: none; }',
    '.ro-rim::before { content: ""; position: absolute; inset: -75%; background: conic-gradient(from 0deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent), var(--err)); animation: ro-spin 3.2s linear infinite; }',
    '.ro-rim::after { content: ""; position: absolute; inset: 2px; border-radius: 11px; background: var(--panel); }',
    '.ro-mod.done .ro-rim { display: block; }',
    '.ro-mod.done { border-color: transparent; box-shadow: 0 0 26px -6px color-mix(in srgb, var(--err) 30%, transparent), 0 0 40px -10px color-mix(in srgb, var(--info) 30%, transparent); }',
    'html[data-mode="light"] .ro-mod.done { box-shadow: none; }',
    // hue-rotate 是滤镜：满帧跑等于每帧把 96 个格子连同各自的 box-shadow 重新栅格化再过一遍色相矩阵。
    // steps(60) = 15fps，色相是连续大范围渐变，15fps 和 60fps 肉眼分不出，成本除以四。
    '.ro-mod.done .ro-grid { animation: ro-huerun 4s steps(60) infinite; }',
    '.ro-mod.done .ro-cell { border-color: transparent; box-shadow: 0 0 10px -1px currentColor; }',
    'html[data-mode="light"] .ro-mod.done .ro-cell { box-shadow: none; }',
    // ===== 常驻收工（rest）：庆典谢幕后不再打回原形，静静保持彩虹荣誉态，直到下一轮真实工作 =====
    // 写在 .m1-.m4 之后：同特异性靠顺序压过里程边框（反正 rest 本身就是满级彩虹）
    '.ro-mod.rest { border: 1px solid transparent; background: linear-gradient(var(--panel), var(--panel)) padding-box, linear-gradient(120deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)) border-box;',
    '  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 16px -7px color-mix(in srgb, var(--err) 30%, transparent), 0 0 20px -8px color-mix(in srgb, var(--info) 30%, transparent); }',
    'html[data-mode="light"] .ro-mod.rest { box-shadow: none; }',
    '.ro-mod.rest .ro-grid { animation: ro-huerun 14s steps(70) infinite; }', // 慢速流动：完成了，但还活着（5fps 足够，见 done 档注释）
    '.ro-mod.rest .ro-cell { border-color: transparent; }',
    '.ro-st.rest { background: var(--text); box-shadow: 0 0 10px var(--text); }',
    '.ro-mod.rest .ro-run { background-image: linear-gradient(90deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)); }',
    '.ro-flash { position: absolute; inset: 0; z-index: 3; border-radius: 13px; overflow: hidden; pointer-events: none; display: none; }',
    '.ro-flash i { position: absolute; top: -30%; bottom: -30%; left: 0; width: 46%; background: linear-gradient(105deg, transparent, color-mix(in srgb, #fff 32%, transparent), transparent); transform: translateX(-130%) skewX(-12deg); }',
    '.ro-mod.celebrate .ro-flash { display: block; }',
    '.ro-mod.celebrate .ro-flash i { animation: ro-sweep 760ms cubic-bezier(.23,1,.32,1) 120ms both; }',
    '.ro-mod.celebrate { animation: ro-modwin 900ms cubic-bezier(.23,1,.32,1); }',
    '.ro-mod.done .ro-st { background: var(--text); box-shadow: 0 0 10px var(--text); animation: none; }',
    '.ro-cnt.winpop { animation: ro-pop 340ms cubic-bezier(.23,1,.32,1); }',
    '.ro-empty { grid-column: 1 / -1; padding: 30px 10px; color: var(--text-faint); font: 12px/1.8 var(--font-mono, monospace); text-align: center; }',
    '.ro-foot { margin-top: auto; display: flex; align-items: center; gap: 9px; row-gap: 4px; flex-wrap: wrap; flex: 0 0 auto; padding: 10px 14px; border-top: 1px solid var(--border); color: var(--text-faint); font: 9.5px/1.5 var(--font-mono, monospace); position: relative; z-index: 3; }',
    '.ro-ladder { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; row-gap: 3px; }',
    '.ro-gear { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 1px solid var(--border); border-radius: 7px; background: var(--panel); color: var(--text-dim); cursor: pointer; font-size: 11px; flex: 0 0 auto; transition: color 160ms ease, background 160ms ease, transform 200ms cubic-bezier(.23,1,.32,1); }',
    '.ro-gear:hover { color: var(--text); background: var(--accent-soft, rgba(128,128,128,.12)); transform: rotate(30deg); }',
    '.ro-gear:active { transform: rotate(30deg) scale(.9); }',
    '.ro-motto { margin-left: auto; }', // 图例挤到换行时靠右，不吊在左边
    '.ro-ladder span { display: flex; align-items: center; gap: 4px; }',
    '.ro-ladder i { width: 7px; height: 7px; border-radius: 2px; }',
    '.ro-foot .sp { flex: 1; }',
    // 换绑菜单：origin-aware
    '.ro-menu { position: fixed; z-index: 120; min-width: 170px; padding: 5px; border: 1px solid var(--border); border-radius: 11px; background: var(--panel); box-shadow: var(--shadow, 0 18px 60px rgba(0,0,0,.4)); transform-origin: top left; transform: scale(.97); opacity: 0; transition: transform 150ms cubic-bezier(.23,1,.32,1), opacity 150ms cubic-bezier(.23,1,.32,1); }',
    '.ro-menu.open { transform: scale(1); opacity: 1; }',
    '.ro-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: none; border-radius: 7px; background: none; color: var(--text); font-size: 11.5px; text-align: left; cursor: pointer; transition: background 140ms ease; }',
    '.ro-menu button:hover { background: var(--accent-soft, rgba(128,128,128,.12)); }',
    '.ro-menu button .sq { width: 8px; height: 8px; border-radius: 2px; flex: 0 0 auto; }',
    '.ro-menu button .now { margin-left: auto; color: var(--ok); font: 8px/1 var(--font-mono, monospace); }',
    // 色阶档位设置浮层（footer ⚙ 点开，往上弹）：四档颜色固定，只开放阈值；递增校验，实时生效
    '.ro-cfg { position: fixed; z-index: 320; width: 240px; padding: 9px 9px 7px; border: 1px solid var(--border); border-radius: 12px; background: var(--panel); box-shadow: var(--shadow, 0 18px 60px rgba(0,0,0,.4)); transform-origin: bottom right; transform: scale(.97); opacity: 0; transition: transform 150ms cubic-bezier(.23,1,.32,1), opacity 150ms cubic-bezier(.23,1,.32,1); }',
    '.ro-cfg.open { transform: scale(1); opacity: 1; }',
    '.ro-cfg-t { padding: 0 3px; color: var(--text); font-size: 12px; font-weight: 700; }',
    '.ro-cfg-h { padding: 4px 3px 8px; border-bottom: 1px solid var(--border); color: var(--text-faint); font: 9px/1.6 var(--font-mono, monospace); }',
    '.ro-cfg-row { display: flex; align-items: center; gap: 7px; padding: 7px 3px; border-bottom: 1px solid var(--border); }',
    '.ro-cfg-row i { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }',
    '.ro-cfg-row b { font-size: 12px; font-weight: 650; }',
    '.ro-cfg-row small { margin-left: auto; color: var(--text-faint); font: 9px/1 var(--font-mono, monospace); }',
    '.ro-cfg-row input { width: 76px; padding: 5px 8px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text); font-size: 12.5px; font-weight: 600; text-align: right; outline: none; transition: border-color 160ms ease, box-shadow 160ms ease; }',
    // 数字字体抢回 Chakra Petch：soft-patch 有 body * !important 全局兜底（老坑），要同级 !important + 更高特异性
    '.ro-cfg .ro-cfg-row input { font-family: "Chakra Petch", var(--font-mono, monospace) !important; }',
    '.ro-cfg-row input:focus { border-color: color-mix(in srgb, var(--info) 60%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--info) 14%, transparent); }',
    '.ro-cfg-row input.bad { border-color: color-mix(in srgb, var(--err) 70%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--err) 12%, transparent); }',
    '.ro-cfg-err { min-height: 13px; padding: 5px 3px 0; color: var(--err); font: 9px/1.4 var(--font-mono, monospace); }',
    '.ro-cfg-f { display: flex; align-items: center; gap: 8px; padding: 7px 3px 2px; }',
    '.ro-cfg-reset { padding: 5px 10px; border: 1px solid var(--border); border-radius: 7px; background: none; color: var(--text-dim); font: 10px/1 var(--font-mono, monospace); cursor: pointer; transition: color 140ms ease, background 140ms ease; }',
    '.ro-cfg-reset:hover { color: var(--text); background: var(--accent-soft, rgba(128,128,128,.12)); }',
    '.ro-cfg-f small { margin-left: auto; color: var(--text-faint); font: 8.5px/1 var(--font-mono, monospace); }',
    '@keyframes ro-breathe { 0%,100% { opacity: 1; } 50% { opacity: .45; } }',
    '@keyframes ro-train { from { transform: translateX(-84.6%); } to { transform: translateX(384.6%); } }',
    '@keyframes ro-flow { to { background-position: 64px 0; } }',
    '@keyframes ro-settle { 0% { transform: scale(1.04); } 100% { transform: scale(1); } }',
    '@keyframes ro-badgepop { 0% { transform: scale(.8); } 55% { transform: scale(1.14); } 100% { transform: scale(1); } }',
    '@keyframes ro-pop { 0% { transform: scale(.82); } 62% { transform: scale(1.10); } 100% { transform: scale(1); } }',
    '@keyframes ro-spin { to { transform: rotate(360deg); } }',
    '@keyframes ro-huerun { to { filter: hue-rotate(360deg); } }',
    '@keyframes ro-sweep { to { transform: translateX(320%) skewX(-12deg); } }',
    '@keyframes ro-modwin { 0% { transform: scale(1); } 26% { transform: scale(1.03); } 100% { transform: scale(1); } }',
    // ?shot 截图模式：无头 Chrome 的 virtual-time 会把过渡冻在起点，截图时过渡全瞬时
    (/[?&]shot/.test(location.search) ? '#rb-obs, #rb-obs *, .ro-cfg, .ro-cfg * { transition-duration: 0ms !important; }' : ''),
    '@media (prefers-reduced-motion: reduce) { .ro-train, .ro-dot, .ro-st, .ro-cell.pop, .ro-badge.pop, .ro-hero.flash .ro-bigwrap, .ro-mod.done .ro-grid, .ro-mod.rest .ro-grid, .ro-rim::before, .ro-mod.celebrate, .ro-mod.celebrate .ro-flash i, .ro-cnt.winpop,',
    '  #rb-obs .rb-big .rb-reel b, #rb-obs .rb-big .rb-pt b, #rb-obs .rb-big .rb-sep b { animation: none !important; } #rb-obs, #app { transition-duration: 1ms; } }',
  ].join('\n');
  document.head.appendChild(st);

  // ---------- DOM ----------
  var app = document.getElementById('app');
  if (!app) return;
  var aside = document.createElement('aside');
  aside.id = 'rb-obs';
  aside.className = 't0';
  aside.innerHTML =
    '<span class="ro-grain"></span>' +
    '<div class="ro-track"><div class="ro-train"><i></i><i></i><i></i><i></i><i></i></div></div>' +
    '<header class="ro-head"><span class="ro-dot"></span><span class="ro-eyebrow">Live · 今日 Token</span>' +
    '<button class="ro-x" title="收起观察舱（终端 ⋯ 菜单可再打开）">✕</button></header>' +
    '<div class="ro-hero">' +
    '<span class="ro-bloom"></span>' +
    '<div class="ro-hero-top"><span class="ro-label">今日消耗 · TOKENS</span>' +
    '<span class="ro-badge"><i></i><span class="ro-badgetext">点火</span></span></div>' +
    '<span class="ro-bigwrap">' +
    '<span class="rb-big line"><span class="rb-digits" id="rb-compact"></span><span class="rb-digits" id="rb-kilo"></span><span class="rb-unit"></span></span>' +
    '<span class="rb-big stack"><span class="row" id="rb-rowhi"></span><span class="row" id="rb-rowlo"></span></span>' +
    '</span>' +
    '<div class="ro-subrow"><span class="ro-subcap">精确</span><span class="ro-subnum"><span id="rb-sub"></span></span>' +
    '<span class="ro-modesw"><button data-mode="compact">简写</button><button data-mode="kilo">K</button><button data-mode="full">全显</button></span></div>' +
    '<div class="ro-meterrow"><div class="ro-meter"><i></i></div><span class="ro-meternext">→ <b>1M</b></span></div>' +
    '<div class="ro-trend">—</div>' +
    '<div class="ro-srcrow"><span class="ro-src"><i style="background:var(--err)"></i><b class="ro-src-claude">—</b></span>' +
    '<span class="ro-src"><i style="background:var(--accent)"></i><b class="ro-src-codex">—</b></span>' +
    '<span class="ro-srcnote">本机日志 · 每天 00:00 起</span>' +
    '<button class="ro-cachesw" title="切换读数口径">—</button></div>' +
    '</div>' +
    '<div class="ro-rule"></div>' +
    '<div class="ro-flow"></div>' +
    '<footer class="ro-foot"><span class="ro-ladder"></span><span class="sp"></span>' +
    '<button class="ro-gear" title="自定义色阶档位">⚙</button>' +
    '<span class="ro-motto">只观察 · 不接管</span></footer>';
  app.appendChild(aside);
  var flow = aside.querySelector('.ro-flow');
  var hero = aside.querySelector('.ro-hero');
  var trendEl = aside.querySelector('.ro-trend');
  var srcClaudeEl = aside.querySelector('.ro-src-claude');
  var srcCodexEl = aside.querySelector('.ro-src-codex');
  var badgeEl = aside.querySelector('.ro-badge');
  var badgeTextEl = aside.querySelector('.ro-badgetext');
  var meterFillEl = aside.querySelector('.ro-meter i');
  var meterNextEl = aside.querySelector('.ro-meternext');
  var unitEl = aside.querySelector('.rb-unit');
  var bigLineEl = aside.querySelector('.rb-big.line');
  var bigStackEl = aside.querySelector('.rb-big.stack');
  var rowHiEl = document.getElementById('rb-rowhi');

  // ---------- 开合（关闭 = 零成本） ----------
  function isOpen() { return app.classList.contains('rb-obs-open'); }
  function setOpen(on) {
    app.classList.toggle('rb-obs-open', !!on);
    try { localStorage.setItem(OPEN_KEY, on ? '1' : '0'); } catch (e) { /* */ }
    try { document.dispatchEvent(new CustomEvent('rb-obs-open', { detail: !!on })); } catch (e) { /* 工具条按钮高亮同步 */ }
    if (on) { startAll(); } else { stopAll(); }
    var refit = function () { try { if (typeof term !== 'undefined' && term.fitActive) term.fitActive(); } catch (e) { /* */ } };
    setTimeout(refit, 180); setTimeout(refit, 380);
  }
  aside.querySelector('.ro-x').onclick = function () { setOpen(false); };
  window.rbObserver = { toggle: function () { setOpen(!isOpen()); }, open: function () { setOpen(true); }, isOpen: isOpen };

  // ---------- 会话源 ----------
  var demoSessions = DEMO ? [
    { id: 'd1', title: 'Rurubox', cwd: '/tmp/Rurubox' }, { id: 'd2', title: 'Build', cwd: '/tmp/Build' },
    { id: 'd3', title: 'Tests', cwd: '/tmp/Tests' }, { id: 'd4', title: 'Server', cwd: '/tmp/Server' },
    { id: 'd5', title: 'Docs', cwd: '/tmp/Docs' }, { id: 'd6', title: 'zsh', cwd: '/tmp/zsh' },
  ] : null;
  function sessionsNow() {
    if (DEMO) return DEMOWIN ? demoSessions.slice(0, DEMOWIN) : demoSessions;
    try { return (typeof term !== 'undefined' && term.sessions) ? term.sessions.filter(function (s) { return !s.dead; }) : []; } catch (e) { return []; }
  }
  var baseName = function (p) { return String(p || '').replace(/\/$/, '').split('/').pop() || 'shell'; };
  function nameOf(s) { return s.title || baseName(s.cwd || s.startDir) || '终端'; }
  function hueOf(s) {
    try { if (!DEMO && typeof term !== 'undefined' && term.hueOf) return term.hueOf(s.cwd || s.startDir); } catch (e) { /* */ }
    var str = String(s.id), h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
    return h;
  }

  // ---------- 活动旁听（面板关着时只记时间戳） ----------
  var act = {}; // sid -> { last, pend:[], proc, cells:[], ptr, turn, ema, emaKey, open, done, rest }
  function actOf(sid) { return act[sid] || (act[sid] = { last: 0, pend: [], proc: '', cells: null, ptr: 0, open: null, done: 0, rest: 0, turn: null, ema: 0, emaKey: '', demoHold: 0 }); }
  // 报错/警告保留语义（红/黄），其余输出不装懂：彩纸四色随机轮转——工作时五颜六色地跳
  // （旧版把「其它一切」都归蓝色，蓝海淹屏；「成功词翻绿」+ 进度翻绿又把整卡刷成纯绿，都撤了）
  var CONFETTI = ['info', 'ok', 'accent', 'uv'];
  function classify(chunk) {
    var s = String(chunk).slice(0, 400);
    if (/error|failed|✗|✘|exception|fatal/i.test(s)) return 'err';
    if (/warn/i.test(s)) return 'yellow';
    return CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
  }
  if (!DEMO && window.fanboxPty && window.fanboxPty.onData) {
    window.fanboxPty.onData(function (m) {
      var a = actOf(m.id);
      var now = Date.now();
      a.last = now;
      if (a.turn) {
        a.turn.spentB += (m.data && m.data.length) || 0;
        // 活跃秒计数：本轮输出落在多少个不同的秒里。tab 切换/resize 触发的整屏重绘
        // 是一次性爆发（1-2 秒），真实工作会一路涨——这是收工判定的防抖依据
        var sec = (now / 1000) | 0;
        if (sec !== a.turn.lastSec) { a.turn.lastSec = sec; a.turn.secs++; }
      }
      if (!isOpen() || document.hidden) return;
      if (a.pend.length < 4) a.pend.push(classify(m.data));
    });
  }

  // ---------- 数字滚轮构件 ----------
  var WINDOWS_K = [1, .34, .18, .12]; // 低位连续飞转，高位咔哒进位
  function mkDigit() {
    var d = document.createElement('span');
    d.className = 'rb-dg';
    var reel = '<span class="rb-reel">';
    for (var n = 0; n <= 10; n++) reel += '<b>' + (n % 10) + '</b>';
    d.innerHTML = reel + '</span>';
    return d;
  }
  function buildRow(container, kHi, kLo, tailSep) {
    var list = [];
    for (var k = kHi; k >= kLo; k--) {
      var d = mkDigit();
      container.appendChild(d);
      list.push({ el: d, reel: d.querySelector('.rb-reel'), k: k, sep: false });
      if (k > kLo && k % 3 === 0) {
        var s = document.createElement('span');
        s.className = 'rb-sep'; s.innerHTML = '<b>,</b>';
        container.appendChild(s);
        list.push({ el: s, k: k, sep: true });
      }
    }
    if (tailSep) {
      var ts = document.createElement('span');
      ts.className = 'rb-sep'; ts.innerHTML = '<b>,</b>';
      container.appendChild(ts);
      list.push({ el: ts, k: kLo, sep: true });
    }
    return list;
  }
  function paintParts(list, v, s) {
    var safe = Math.max(0, v);
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.sep) { p.el.classList.toggle('off', safe < Math.pow(10, p.k)); continue; }
      var u = safe / Math.pow(10, p.k);
      var D = Math.floor(u) % 10;
      var r = u - Math.floor(u);
      var W = WINDOWS_K[p.k] || .09;
      var pos = reduceMotion ? D : D + Math.max(0, 1 - (1 - r) / W);
      if (s) pos += (D - pos) * s; // 落位（s→1 回正到整数位）：静止的轮子不许悬在两个数字中间
      p.reel.style.transform = 'translateY(' + (-pos).toFixed(3) + 'em)';
      p.el.classList.toggle('off', p.k > 0 && safe < Math.pow(10, p.k));
    }
  }
  // 简写模式：4 数位槽 + 2 小数点槽（d0 p0 d1 p1 d2 d3）
  var compactEl = document.getElementById('rb-compact');
  var cSlots = [];
  (function () {
    for (var i = 0; i < 4; i++) {
      var d = mkDigit(); compactEl.appendChild(d);
      cSlots.push({ el: d, reel: d.querySelector('.rb-reel'), digit: true });
      if (i < 2) {
        var pnode = document.createElement('span');
        pnode.className = 'rb-pt'; pnode.innerHTML = '<b>.</b>';
        compactEl.appendChild(pnode);
        cSlots.push({ el: pnode, digit: false });
      }
    }
  })();
  var C_D = [0, 2, 4, 5], C_P = [1, 3];
  var subParts = buildRow(document.getElementById('rb-sub'), 10, 0);
  var kiloParts = buildRow(document.getElementById('rb-kilo'), 7, 0);
  var hiParts = buildRow(rowHiEl, 10, 6, true);
  var loParts = buildRow(document.getElementById('rb-rowlo'), 5, 0);

  var HERO_W = PANEL_W - 36;
  var lenOf = function (v) { return Math.max(1, Math.floor(Math.log10(Math.max(1, v))) + 1); };
  function paintCompact(v, s) {
    var str, unit, lastCont;
    if (v < 10000) { str = String(Math.floor(Math.max(0, v))); unit = ''; lastCont = v % 10; }
    else {
      var g = Math.min(3, Math.floor(Math.log10(v) / 3));
      var scaled = v / Math.pow(10, 3 * g);
      unit = 'KMB'[g - 1];
      var step = scaled < 10 ? .01 : scaled < 100 ? .1 : 1;
      var fixed = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
      str = (Math.floor(scaled / step) * step).toFixed(fixed);
      lastCont = (scaled / step) % 10;
    }
    var chars = str.split('');
    var di = 0, usedP = [false, false], lastDigitIdx = 0;
    for (var i = 0; i < chars.length; i++) { if (chars[i] !== '.') lastDigitIdx = i; }
    for (var j = 0; j < chars.length; j++) {
      var ch = chars[j];
      if (ch === '.') { usedP[di - 1] = true; continue; }
      var slot = cSlots[C_D[di]];
      slot.el.classList.remove('off');
      var pos = (j === lastDigitIdx && !reduceMotion) ? lastCont + (+ch - lastCont) * (s || 0) : +ch;
      slot.reel.style.transform = 'translateY(' + (-pos).toFixed(3) + 'em)';
      di++;
    }
    for (var m = di; m < 4; m++) cSlots[C_D[m]].el.classList.add('off');
    C_P.forEach(function (pi, idx) { cSlots[pi].el.classList.toggle('off', !usedP[idx]); });
    unitEl.textContent = unit;
    bigLineEl.style.fontSize = '132px';
  }
  function paintKilo(v, s) {
    var kv = v < 1000 ? v : v / 1000;
    paintParts(kiloParts, kv, s);
    unitEl.textContent = v < 1000 ? '' : 'K';
    var len = lenOf(kv), seps = Math.floor((len - 1) / 3);
    bigLineEl.style.fontSize = Math.min(132, Math.floor(HERO_W / (len * .6 + seps * .26 + (v < 1000 ? 0 : .3)))) + 'px';
  }
  function paintFull(v, s) {
    paintParts(hiParts, v, s);
    paintParts(loParts, v, s);
    var hasHi = v >= 1e6;
    rowHiEl.style.display = hasHi ? '' : 'none';
    var fs;
    if (!hasHi) {
      var len = lenOf(v), seps = Math.floor((len - 1) / 3);
      fs = Math.min(132, Math.floor(HERO_W / (len * .6 + seps * .26)));
    } else {
      var loEm = 6 * .6 + .26;
      var hiLen = lenOf(v) - 6, hiSeps = (hiLen > 3 ? 1 : 0) + 1;
      var hiEm = hiLen * .6 + hiSeps * .26;
      fs = Math.min(94, Math.floor(HERO_W / Math.max(loEm, hiEm)));
    }
    bigStackEl.style.fontSize = fs + 'px';
  }

  // ---------- 读数模式（客户自选，持久化） ----------
  var MODES = ['compact', 'kilo', 'full'];
  var mode = (function () {
    var m = /[?&]rbmode=(\w+)/.exec(location.search);
    if (m && MODES.indexOf(m[1]) !== -1) return m[1];
    try { var s = localStorage.getItem(MODE_KEY); if (MODES.indexOf(s) !== -1) return s; } catch (e) { /* */ }
    return 'kilo';
  })();
  function applyMode() {
    hero.classList.remove('mode-compact', 'mode-kilo', 'mode-full');
    hero.classList.add('mode-' + mode);
    aside.querySelectorAll('.ro-modesw button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === mode); });
  }
  aside.querySelectorAll('.ro-modesw button').forEach(function (b) {
    b.onclick = function () {
      mode = b.dataset.mode;
      try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* */ }
      applyMode(); paintHeroNumber(heroRaf ? 0 : 1); // 静止时切模式直接整位呈现
    };
  });
  applyMode();

  // ---------- 色阶天梯（今日口径，v2.13 四档阈值可自定义）：蓝 → 紫 → 金 → 彩虹 ----------
  var TIER_KEY = 'rb_obs_tiers';
  var TIER_DEF = [1e6, 1e7, 1e8, 5e8]; // 蓝移 / 紫外 / 鎏金 / 棱镜 默认阈值
  var RAINBOW_CHIP = 'linear-gradient(135deg,var(--err),var(--yellow),var(--ok),var(--info),var(--accent))';
  var TIER_META = [
    { cls: 't1', ms: 'm1', name: '蓝移', c: 'var(--info)' },
    { cls: 't2', ms: 'm2', name: '紫外', c: 'var(--rb-uv)' },
    { cls: 't3', ms: 'm3', name: '鎏金', c: 'var(--yellow)' },
    { cls: 't4', ms: 'm4', name: '棱镜', c: 'var(--accent)', rainbow: true },
  ];
  function validTiers(a) {
    return Array.isArray(a) && a.length === 4 && a.every(function (v, i) {
      return typeof v === 'number' && isFinite(v) && v >= 1000 && (i === 0 || v > a[i - 1]);
    });
  }
  var tierAt = (function () {
    try { var s = JSON.parse(localStorage.getItem(TIER_KEY) || 'null'); if (validTiers(s)) return s; } catch (e) { /* */ }
    return TIER_DEF.slice();
  })();
  // 阈值标签：800K / 1M / 10M / 1.5B（一元 + 顺手吃掉小数尾零）
  function fmtTh(n) {
    return n >= 1e9 ? +(n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? +(n / 1e6).toFixed(2) + 'M' : +(n / 1e3).toFixed(1) + 'K';
  }
  var TIERS = [];
  function rebuildTiers() {
    TIERS = [{ at: 0, cls: 't0', name: '点火', next: tierAt[0], nextLabel: fmtTh(tierAt[0]) }];
    TIER_META.forEach(function (tm, i) {
      TIERS.push({ at: tierAt[i], cls: tm.cls, name: tm.name + ' ' + fmtTh(tierAt[i]), next: i < 3 ? tierAt[i + 1] : null, nextLabel: i < 3 ? fmtTh(tierAt[i + 1]) : 'MAX' });
    });
  }
  rebuildTiers();
  var tierOf = function (v) { var t = TIERS[0]; for (var i = 0; i < TIERS.length; i++) { if (v >= TIERS[i].at) t = TIERS[i]; } return t; };
  var msOf = function (v) { for (var i = 3; i >= 0; i--) { if (v >= tierAt[i]) return TIER_META[i].ms; } return ''; };
  var curTier = null;
  function paintTier(v, silent) {
    var t = tierOf(v);
    if (t !== curTier) {
      aside.classList.remove('t0', 't1', 't2', 't3', 't4');
      aside.classList.add(t.cls);
      badgeTextEl.textContent = t.name;
      if (curTier && !silent && !reduceMotion) {
        hero.classList.remove('flash'); void hero.offsetWidth; hero.classList.add('flash');
        badgeEl.classList.remove('pop'); void badgeEl.offsetWidth; badgeEl.classList.add('pop');
        setTimeout(function () { hero.classList.remove('flash'); }, 900);
      }
      curTier = t;
    }
    var p;
    if (!t.next) p = 1;
    else if (t.at === 0) p = v / t.next;
    else p = (Math.log(v) - Math.log(t.at)) / (Math.log(t.next) - Math.log(t.at));
    meterFillEl.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%';
    meterNextEl.innerHTML = t.next ? '→ <b>' + t.nextLabel + '</b>' : '<b>MAX</b>';
  }

  // ---------- footer 图例 + 档位设置浮层（阈值自定义，颜色固定四档） ----------
  var ladderEl = aside.querySelector('.ro-ladder');
  function renderLadder() {
    ladderEl.innerHTML = TIER_META.map(function (tm, i) {
      return '<span style="color:' + tm.c + '"><i style="background:' + (tm.rainbow ? RAINBOW_CHIP : tm.c) + '"></i>' + fmtTh(tierAt[i]) + ' ' + tm.name + '</span>';
    }).join('');
  }
  renderLadder();
  paintTier(0, true); // 初始里程标签吃自定义阈值（默认 innerHTML 里的 1M 只是占位）
  function applyTiers(arr) {
    tierAt = arr.slice();
    try { localStorage.setItem(TIER_KEY, JSON.stringify(tierAt)); } catch (e) { /* */ }
    rebuildTiers();
    curTier = null; // 强制重挂色阶 class（paintTier 用引用比较）
    paintTier(heroV, true); // silent：改档位不放跨阶闪光
    renderLadder();
    mods.forEach(function (m) { m.ms = null; });
    Object.keys(extMods).forEach(function (k) {
      // syncExtBays 只重算活跃卡：先清旧边框，免得濒退场的卡挂错色阶
      extMods[k].ms = null; extMods[k].el.classList.remove('m1', 'm2', 'm3', 'm4');
    });
    paintBayMilestones();
    syncExtBays();
    placeCfg(); // 图例变长可能把 footer 挤到换行、⚙ 挪位，浮层跟着重锚定
  }
  function parseTh(s) {
    var m = /^\s*(\d+(?:\.\d+)?)\s*([kmb])?\s*$/i.exec(String(s));
    if (!m) return null;
    var v = Math.round(parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1));
    return v >= 1000 ? v : null; // 至少 1K，防手滑
  }
  var gearEl = aside.querySelector('.ro-gear');
  var cfgEl = null;
  function closeCfg() {
    if (!cfgEl) return; var c = cfgEl; cfgEl = null;
    c.classList.remove('open'); setTimeout(function () { c.remove(); }, 160);
    document.removeEventListener('mousedown', onCfgOut, true);
  }
  function onCfgOut(ev) { if (cfgEl && !cfgEl.contains(ev.target) && ev.target !== gearEl) closeCfg(); }
  function placeCfg() {
    if (!cfgEl) return;
    var r = gearEl.getBoundingClientRect();
    cfgEl.style.right = Math.max(10, window.innerWidth - r.right) + 'px';
    cfgEl.style.bottom = (window.innerHeight - r.top + 6) + 'px';
  }
  function openCfg() {
    if (cfgEl) { closeCfg(); return; }
    cfgEl = document.createElement('div');
    cfgEl.className = 'ro-cfg';
    cfgEl.innerHTML = '<div class="ro-cfg-t">色阶档位</div>' +
      '<div class="ro-cfg-h">烧到多少换什么颜色，自己定<br>支持 800K / 10M / 1.5B / 1200000 写法</div>' +
      TIER_META.map(function (tm, i) {
        return '<label class="ro-cfg-row"><i style="background:' + (tm.rainbow ? RAINBOW_CHIP : tm.c) + '"></i>' +
          '<b style="color:' + (tm.rainbow ? 'var(--text)' : tm.c) + '">' + tm.name + '</b>' +
          '<small>亮起 ≥</small><input data-i="' + i + '" value="' + fmtTh(tierAt[i]) + '" spellcheck="false"></label>';
      }).join('') +
      '<div class="ro-cfg-err"></div>' +
      '<div class="ro-cfg-f"><button class="ro-cfg-reset">恢复默认</button><small>实时生效 · 只存本机</small></div>';
    document.body.appendChild(cfgEl);
    placeCfg();
    requestAnimationFrame(function () { if (cfgEl) cfgEl.classList.add('open'); });
    var inputs = [].slice.call(cfgEl.querySelectorAll('input'));
    var errEl = cfgEl.querySelector('.ro-cfg-err');
    // 只解析被编辑的那格：输入框回填的是 fmtTh 舍入标签（1234567 显示 1.23M），
    // 没动过的档位一律保留 cur 里的精确存值，不许被回填值悄悄改写
    var cur = tierAt.slice();
    function editAt(idx) {
      var inp = inputs[idx];
      var v = parseTh(inp.value);
      inp.classList.toggle('bad', v == null);
      if (v == null) { errEl.textContent = '看不懂或太小（至少 1K）——试试 800K / 10M / 1.5B'; return; }
      var next = cur.slice(); next[idx] = v;
      if (!validTiers(next)) {
        inp.classList.add('bad');
        errEl.textContent = '档位要递增：蓝移 < 紫外 < 鎏金 < 棱镜';
        return;
      }
      cur = next;
      errEl.textContent = '';
      applyTiers(cur);
    }
    inputs.forEach(function (inp) {
      inp.addEventListener('input', function () { editAt(+inp.dataset.i); });
    });
    cfgEl.querySelector('.ro-cfg-reset').onclick = function () {
      inputs.forEach(function (inp, i) { inp.value = fmtTh(TIER_DEF[i]); inp.classList.remove('bad'); });
      errEl.textContent = '';
      cur = TIER_DEF.slice();
      applyTiers(TIER_DEF.slice());
    };
    document.addEventListener('mousedown', onCfgOut, true);
  }
  gearEl.onclick = function (ev) { ev.stopPropagation(); openCfg(); };

  // ---------- 大数字引擎：轮询目标 + rAF 匀速滚近（追上后 ~300ms 落位归整再停，零常驻） ----------
  var heroV = 0, heroTarget = 0, heroRate = 0, heroRaf = 0, heroLastT = 0, firstFeed = true;
  var SETTLE_MS = 300, heroSettleT = 0; // 落位计时：滚动可以过程连滚，静止必须整位
  var lastTokSpeed = 0; // tok/s，趋势行显示
  // 滚轮的图层提升按需挂（配合上面 .rb-reel 撤掉写死的 will-change）：heroRaf 是全部滚轮唯一的动力源，
  // 所以「rAF 在跑」就等价于「滚轮在动」。跑起来才给全部滚轮加 will-change，落位停下立刻摘掉——
  // 静止时（占绝大多数时间）不再白占约 30 张合成器纹理。toggle 一次才 querySelectorAll 一次，
  // 一轮轮询最多两次，可忽略。
  var reelsWC = false;
  function setReelsWC(on) {
    if (on === reelsWC) return;
    reelsWC = on;
    var els = document.querySelectorAll('#rb-obs .rb-reel');
    for (var i = 0; i < els.length; i++) els[i].style.willChange = on ? 'transform' : 'auto';
  }
  function paintHeroNumber(s) {
    if (mode === 'compact') paintCompact(heroV, s);
    else if (mode === 'kilo') paintKilo(heroV, s);
    else paintFull(heroV, s);
    paintParts(subParts, heroV, s);
  }
  function heroFrame(now) {
    var dt = now - heroLastT; heroLastT = now;
    heroV = Math.min(heroTarget, heroV + heroRate * dt);
    if (!isOpen() || document.hidden) { // 不可见：直接收尾落位，不留半路轮子
      heroV = heroTarget; heroSettleT = 0; heroRaf = 0;
      paintHeroNumber(1); paintTier(heroV);
      setReelsWC(false);
      return;
    }
    var s = 0;
    if (heroV >= heroTarget) {
      if (!heroSettleT) heroSettleT = now;
      var st = Math.min(1, (now - heroSettleT) / SETTLE_MS);
      s = 1 - Math.pow(1 - st, 3);
    } else heroSettleT = 0;
    paintHeroNumber(s);
    paintTier(heroV);
    var more = heroV < heroTarget || s < 1;
    if (!more) { heroSettleT = 0; setReelsWC(false); } // 落位归整了，摘掉提升
    heroRaf = more ? requestAnimationFrame(heroFrame) : 0;
  }
  function feedTotal(total) {
    if (firstFeed || reduceMotion) {
      firstFeed = false;
      heroV = heroTarget = total;
      paintHeroNumber(1); paintTier(heroV, true);
      return;
    }
    // 跨零点/后端重算导致回落（>1K 都当真——真实状态就是变小了）：直接落位重画。
    // 旧逻辑只许向上，面板开过夜会卡在昨日总量一整个上午（2.13 修复）。
    if (total < heroTarget - 1000) {
      if (heroRaf) { cancelAnimationFrame(heroRaf); heroRaf = 0; }
      heroSettleT = 0; lastTokSpeed = 0;
      heroV = heroTarget = total;
      paintHeroNumber(1); paintTier(heroV, true);
      setReelsWC(false);
      return;
    }
    if (total <= heroTarget + 1) { heroTarget = Math.max(heroTarget, total); return; }
    lastTokSpeed = (total - heroV) / (POLL_MS / 1000);
    heroRate = (total - heroV) / POLL_MS;
    heroTarget = total;
    if (!heroRaf) { heroLastT = performance.now(); setReelsWC(true); heroRaf = requestAnimationFrame(heroFrame); }
  }

  // ---------- 模块渲染（数量自适应 + 可换绑 + 外部仓位） ----------
  var overrides = {};
  var mods = [];
  var extMods = {}; // key(cwd) -> { el, cellEls, ptr, lastSeen, cols, tokens }
  var lastKey = '';
  var fmtTok = function (n) {
    var t0 = function (s) { return s.replace(/\.0+$/, ''); };
    return n >= 1e9 ? t0((n / 1e9).toFixed(n < 1e10 ? 2 : 1)) + 'B'
      : n >= 1e6 ? t0((n / 1e6).toFixed(n < 1e7 ? 2 : 1)) + 'M'
      : n >= 1e3 ? t0((n / 1e3).toFixed(n < 1e4 ? 1 : 0)) + 'K' : String(Math.round(n));
  };
  function layoutFor(n) {
    return n === 1 ? { one: true, cols: 6, rows: 4 } : n === 2 ? { one: true, cols: 8, rows: 5 } : { one: false, cols: 6, rows: 4 };
  }
  function pickSessions() {
    var ss = sessionsNow();
    var byId = {}; ss.forEach(function (s) { byId[s.id] = s; });
    var chosen = [], used = {};
    for (var slot = 0; slot < Math.min(6, ss.length); slot++) {
      var want = overrides[slot] && byId[overrides[slot]] && !used[overrides[slot]] ? byId[overrides[slot]] : null;
      if (!want) { for (var i = 0; i < ss.length; i++) { if (!used[ss[i].id]) { want = ss[i]; break; } } }
      if (!want) break;
      used[want.id] = 1; chosen.push(want);
    }
    return chosen;
  }
  function modShell(opts) {
    var el = document.createElement('div');
    el.className = 'ro-mod' + (opts.ext ? ' ext' : '');
    el.innerHTML = '<span class="ro-rim"></span><span class="ro-flash"><i></i></span>' +
      '<div class="ro-mod-head"><span class="ro-st"></span>' +
      '<button class="ro-pick" title="' + (opts.ext ? '外部 agent（不属于任何终端 tab）' : '点名字换绑窗口') + '"><span class="ro-nm"></span>' + (opts.ext ? '' : '<small>▾</small>') + '</button>' +
      (opts.ext ? '<span class="ro-extchip">外部</span>' : '') +
      '<span class="ro-cnt">·</span></div>' +
      '<i class="ro-run"></i>' +
      '<div class="ro-grid" style="grid-template-columns:repeat(' + opts.cols + ',1fr)">' + new Array(opts.cols * opts.rows + 1).join('<i class="ro-cell"></i>') + '</div>';
    return el;
  }
  function rebuildModules() {
    var chosen = pickSessions();
    var L = layoutFor(Math.max(1, chosen.length));
    flow.classList.toggle('cols-1', !!L.one);
    mods = [];
    flow.innerHTML = '';
    if (!chosen.length && !Object.keys(extMods).length) {
      flow.innerHTML = '<div class="ro-empty">还没有打开的终端<br>开个终端跑 agent，这里就活了</div>';
      lastKey = 'empty';
      return;
    }
    chosen.forEach(function (s, slot) {
      var a = actOf(s.id);
      var total = L.cols * L.rows;
      if (!a.cells || a.cells.length !== total) { a.cells = new Array(total).fill(null); a.ptr = 0; }
      var el = modShell({ ext: false, cols: L.cols, rows: L.rows });
      el.querySelector('.ro-nm').textContent = nameOf(s);
      el.querySelector('.ro-nm').style.color = 'hsl(' + hueOf(s) + ' 62% 58%)';
      el.querySelector('.ro-pick').onclick = function (ev) { openMenu(ev, slot); };
      flow.appendChild(el);
      // stEl（状态灯）随 runEl 一起在创建时缓存：statusTick 1000ms 一 tick、每个活跃模块都要摸一下，
      // 别再靠 querySelector 现查。chaseIdx 记的是当前追灯格在 cellEls 里的下标（不是 DOM 引用），
      // chaseTick 直接按下标取消/命中，不再靠 '.ro-cell.chasing' 这个 class 选择器巡场
      var m = { sid: s.id, cwd: s.cwd || s.startDir || '', el: el, cellEls: [].slice.call(el.querySelectorAll('.ro-cell')), runEl: el.querySelector('.ro-run'), stEl: el.querySelector('.ro-st'), chaseIdx: -1, cols: L.cols, ms: null, doneUntil: 0 };
      a.cells.forEach(function (tone, i) { if (tone && m.cellEls[i]) m.cellEls[i].classList.add(tone); });
      if (a.rest) applyRest(m, a, true); // 常驻彩虹挂在 act 上，重建后原样接回
      mods.push(m);
    });
    // 外部仓位：DOM 节点常驻复用，重建布局时重新挂回
    Object.keys(extMods).forEach(function (k) { flow.appendChild(extMods[k].el); });
    paintBayMilestones();
  }
  function sessionsKey() {
    return pickSessions().map(function (s) { return s.id; }).join(',') + '|' + JSON.stringify(overrides) + '|' + Object.keys(extMods).join(',');
  }

  // 换绑菜单
  var menu = null;
  function closeMenu() {
    if (!menu) return; var m = menu; menu = null;
    m.classList.remove('open'); setTimeout(function () { m.remove(); }, 160);
    document.removeEventListener('mousedown', onOut, true);
  }
  function onOut(ev) { if (menu && !menu.contains(ev.target)) closeMenu(); }
  function openMenu(ev, slot) {
    ev.stopPropagation();
    if (menu) { closeMenu(); return; }
    var ss = sessionsNow();
    menu = document.createElement('div');
    menu.className = 'ro-menu';
    menu.innerHTML = ss.map(function (s) {
      return '<button data-sid="' + s.id + '"><span class="sq" style="background:hsl(' + hueOf(s) + ' 62% 48%)"></span>' +
        '<span>' + String(nameOf(s)).replace(/[<>&]/g, '') + '</span>' +
        (mods[slot] && mods[slot].sid === s.id ? '<span class="now">当前</span>' : '') + '</button>';
    }).join('');
    document.body.appendChild(menu);
    var r = ev.currentTarget.getBoundingClientRect();
    menu.style.left = Math.min(window.innerWidth - 190, r.left) + 'px';
    menu.style.top = (r.bottom + 5) + 'px';
    requestAnimationFrame(function () { if (menu) menu.classList.add('open'); });
    menu.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { overrides[slot] = b.dataset.sid; closeMenu(); refreshSessions(true); };
    });
    document.addEventListener('mousedown', onOut, true);
  }
  var lastActGC = 0;
  function refreshSessions(force) {
    var key = sessionsKey();
    if (force || key !== lastKey) { lastKey = key; rebuildModules(); }
    // act 按终端 id 只增不删，而 id 是 term.seq 递增、永不复用，所以它的 key 数 ==「本次启动以来
    // 开过的终端总数」。关标签页时没人通知这里清（app.js 的 closeTab 不知道有这个对象）。
    // 一天开关几十个标签、App 又常连着开好几周，会堆到几百上千条。照 extMods 那套按存活集合差集回收，
    // 30s 一次足够（这函数 2s 一跳，别每次都全量比对）。
    var now = Date.now();
    if (now - lastActGC < 30000) return;
    lastActGC = now;
    var live = {};
    sessionsNow().forEach(function (s) { live[s.id] = 1; });
    Object.keys(act).forEach(function (k) {
      if (live[k]) return;
      var a = act[k];
      // 还挂着庆典/常驻彩虹的先留着，等动画谢幕（doneUntil 过期、rest 撤了）下一轮再收
      if (a && (a.rest || (a.done && a.done > now))) return;
      delete act[k];
    });
  }

  // ---------- 格子事件消化 + 巡场 ----------
  var DEMO_TONES = ['info', 'uv', 'info', 'uv', 'ok', 'ok', 'accent', 'accent', 'yellow', 'err'];
  var TONES_ALL = ['err', 'yellow', 'accent', 'ok', 'info', 'uv'];
  function paintCell(m, a, i, tone) {
    if (a) a.cells[i] = tone;
    var c = m.cellEls[i];
    if (!c) return;
    c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'uv', 'pop');
    c.classList.add(tone);
    if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
  }
  function drainTick() {
    var now = Date.now();
    mods.forEach(function (m, idx) {
      var a = actOf(m.sid);
      if (m.doneUntil > now || a.rest) return; // 收工流光/常驻彩虹期间格子定格
      var tone = a.pend.shift();
      if (DEMO) {
        var live = demoStatus(idx) === 'working' && !(a.demoHold && now < a.demoHold);
        tone = live && Math.random() < .8 ? DEMO_TONES[Math.floor(Math.random() * DEMO_TONES.length)] : null;
      }
      if (tone) { paintCell(m, a, a.ptr % a.cells.length, tone); a.ptr++; }
    });
    // 外部仓位：按活跃状态低频吐事件（没有 pty 流，节奏是合成的）
    Object.keys(extMods).forEach(function (k) {
      var x = extMods[k];
      if (x.doneUntil > now) return;
      if (now - x.lastSeen > 60000) return;
      if (x.active && Math.random() < .5) {
        var c = x.cellEls[x.ptr % x.cellEls.length];
        if (c) {
          c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'uv', 'pop');
          c.classList.add(DEMO_TONES[Math.floor(Math.random() * DEMO_TONES.length)]);
          if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
        }
        x.ptr++;
      }
    });
  }
  function chaseTick() {
    var now = Date.now();
    mods.forEach(function (m, i) {
      // 追灯下标记在 m.chaseIdx 上，直接按下标取消/命中 cellEls——不再每 640ms 靠
      // '.ro-cell.chasing' 选择器巡一遍格子找上一个追灯在哪
      if (m.chaseIdx >= 0 && m.cellEls[m.chaseIdx]) m.cellEls[m.chaseIdx].classList.remove('chasing');
      m.chaseIdx = -1;
      if (m.doneUntil > now || actOf(m.sid).rest) return;
      var step = Math.floor(Date.now() / 640) + i * 5;
      var idx = step % m.cellEls.length;
      var c = m.cellEls[idx];
      if (c) { c.classList.add('chasing'); m.chaseIdx = idx; }
    });
  }

  // ---------- 状态 + 回合机（进度丝 + 收工庆典；EMA 校准估算，按项目持久化） ----------
  var UNIT = 64;
  var TURN_MIN = 40;
  var TURN_SECS = 5; // 收工资格：本轮输出至少覆盖 5 个活跃秒——点 tab 触发的重绘爆发只有 1-2 秒，够不着
  var REST_SECS = 3; // 常驻彩虹退场：新一轮活跃 ≥3 秒才算真开工，才把格子复原
  var QUIET_MS = 6500;
  var DEFAULT_EST = 1800;
  var EMA_KEY = 'rb_obs_ema';
  var emaStore = (function () { try { return JSON.parse(localStorage.getItem(EMA_KEY) || '{}'); } catch (e) { return {}; } })();
  var workingNow = 0;
  var mungeCwd = function (cwd) { return String(cwd || '').replace(/[^A-Za-z0-9]/g, '-'); };
  function demoStatus(i) { return ['working', 'working', 'waiting', 'idle', 'working', 'idle'][i] || 'idle'; }
  function statusTick() {
    var now = Date.now();
    var ss = sessionsNow();
    var wc = 0;
    mods.forEach(function (m, idx) {
      var a = actOf(m.sid);
      if (DEMO && demoStatus(idx) === 'working') {
        if (a.demoHold && now < a.demoHold) { /* 收工静默期 */ }
        else if (a.turn && a.turn.spent >= a.turn.est) { a.demoHold = now + 9000; }
        else { a.last = now; if (a.turn) { a.turn.spentB += 9600; a.turn.secs++; } }
      }
      var stEl = m.stEl; // 创建时已缓存，不再每 tick 现查
      var working = now - a.last < 4000;
      var agent = AGENT_BINS.indexOf(String(a.proc).toLowerCase()) !== -1;
      var cls = working ? 'working' : (agent ? 'waiting' : 'idle');
      if (DEMO) cls = (a.demoHold && now < a.demoHold) ? 'idle' : demoStatus(idx);
      // —— 回合机 ——
      if (working && !a.turn) {
        if (!a.ema && !a.emaKey) {
          var sx = ss.find(function (x) { return x.id === m.sid; });
          a.emaKey = mungeCwd((sx && (sx.cwd || sx.startDir)) || '');
          a.ema = emaStore[a.emaKey] || 0;
        }
        a.turn = { spentB: 0, spent: 0, secs: 0, lastSec: 0, t0: now, est: a.ema || (DEMO ? 2400 : DEFAULT_EST) };
      }
      if (a.turn) {
        a.turn.spent = Math.round(a.turn.spentB / UNIT);
        // 常驻彩虹期间进度丝定格满格彩虹（applyRest 管），别被本轮进度覆写
        if (!a.rest) m.runEl.style.backgroundSize = (a.turn.spent >= TURN_MIN ? Math.min(100, a.turn.spent / a.turn.est * 100).toFixed(1) : 0) + '% 100%';
        if (now - a.last > QUIET_MS) {
          var t = a.turn; a.turn = null;
          // 够量 + 够久才算真收工：tab 切换/resize 的重绘爆发字节量够大但只占 1-2 个活跃秒，
          // 旧版把它当一轮工作 → 安静 6.5s 后又放一遍庆典，彩虹来回横跳（用户报的 bug）
          if (t.spent >= TURN_MIN && t.secs >= TURN_SECS) {
            a.ema = Math.max(TURN_MIN, a.ema ? Math.round(a.ema * .6 + t.spent * .4) : t.spent);
            if (!DEMO && a.emaKey) { emaStore[a.emaKey] = a.ema; try { localStorage.setItem(EMA_KEY, JSON.stringify(emaStore)); } catch (e) { /* */ } }
            bayDone(m, a); // 收工庆典：闪光 + 旋转流光 + 对角彩虹，谢幕后转常驻
          } else if (!a.rest) {
            m.runEl.style.backgroundSize = '0% 100%';
          }
        }
      }
      // 常驻彩虹的退场：只认真实新一轮（活跃 ≥REST_SECS 秒）——瞬时重绘不打扰荣誉态
      if (a.rest && a.turn && a.turn.secs >= REST_SECS && m.doneUntil <= now) {
        a.rest = 0;
        applyRest(m, a, false);
      }
      if (m.doneUntil > now) cls = 'working';
      else if (a.rest && cls === 'idle') cls = 'rest';
      stEl.className = 'ro-st ' + cls;
      stEl.title = cls === 'working' ? '工作中' : cls === 'waiting' ? (a.proc + ' 在等你回话') : cls === 'rest' ? '已收工' : '空闲';
      m.el.classList.toggle('waiting', cls === 'waiting');
      m.el.classList.toggle('working', cls === 'working' && m.doneUntil <= now);
      if (cls === 'working') wc++;
    });
    workingNow = wc;
    paintTrend();
  }
  function procTick() {
    if (DEMO || !window.fanboxPty || !window.fanboxPty.proc) return;
    mods.forEach(function (m) {
      window.fanboxPty.proc(m.sid).then(function (r) {
        if (r && r.ok) actOf(m.sid).proc = String(r.proc || '').split('/').pop().replace(/^-/, '').toLowerCase();
      }).catch(function () { /* */ });
    });
  }

  // ---------- 收工庆典（谢幕转常驻）/ 子任务庆祝 ----------
  var RAINBOW5 = ['err', 'yellow', 'ok', 'info', 'accent'];
  // rest 开关一步到位：开 = 对角彩虹格 + 满格彩虹进度丝；关 = 复原事件格子的历史色。
  // 独立成函数是因为三处要用：庆典谢幕、模块重建（rest 存在 act 上，扛得住重建）、新一轮开工
  function applyRest(m, a, on) {
    if (!m || !m.el) return;
    m.el.classList.toggle('rest', !!on);
    m.runEl.style.backgroundSize = on ? '100% 100%' : '0% 100%';
    m.cellEls.forEach(function (c, ci) {
      c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'uv', 'pop');
      var tone = on ? RAINBOW5[(Math.floor(ci / m.cols) + ci % m.cols) % 5] : (a && a.cells ? a.cells[ci] : null);
      if (tone) c.classList.add(tone);
    });
  }
  function bayDone(m, a) {
    var now = Date.now();
    m.doneUntil = now + 8500;
    m.el.classList.add('done');
    m.el.classList.remove('celebrate'); void m.el.offsetWidth; m.el.classList.add('celebrate');
    m.runEl.style.backgroundSize = '100% 100%'; // 满格彩虹丝（.done 的 background-image 由 CSS 给）
    var prev = m.el.querySelector('.ro-cell.chasing');
    if (prev) prev.classList.remove('chasing');
    m.cellEls.forEach(function (c, ci) {
      var row = Math.floor(ci / m.cols), col = ci % m.cols;
      var delay = reduceMotion ? 0 : (row + col) * 40;
      setTimeout(function () {
        c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'uv', 'pop');
        c.classList.add(RAINBOW5[(row + col) % 5]);
        if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
      }, delay);
    });
    setTimeout(function () {
      m.el.classList.remove('done', 'celebrate');
      m.doneUntil = 0;
      // 谢幕不散场：转入常驻彩虹（rest），存在 act 上以扛住模块重建；
      // 重建过的话 m 可能已是弃子，找当前挂在同 sid 上的模块来挂 rest 态
      if (a) {
        a.rest = 1;
        // 庆典期间若已冒出新回合，把它的活跃秒清零：退场判定只数 rest 之后的新活动，
        // 否则带着存量秒数的回合会让 rest 秒退（上场即被判「在工作」）
        if (a.turn) { a.turn.secs = 0; a.turn.lastSec = 0; }
      }
      var cur = null;
      for (var i = 0; i < mods.length; i++) { if (mods[i].sid === m.sid) { cur = mods[i]; break; } }
      applyRest(cur || m, a, true);
    }, 8700);
  }
  function celebrateModule(m) {
    if (!m || !m.el || reduceMotion) return;
    m.el.classList.remove('celebrate'); void m.el.offsetWidth; m.el.classList.add('celebrate');
    var cnt = m.el.querySelector('.ro-cnt');
    if (cnt) { cnt.classList.remove('winpop'); void cnt.offsetWidth; cnt.classList.add('winpop'); }
  }

  // ---------- 子任务庆祝（~/.claude/tasks，保留 v2.11 行为，只做庆祝不做倒数） ----------
  var projCache = {};
  var taskDirSet = { set: null, t: 0 };
  var fileCache = {};
  function listDir(p) {
    return api('/api/list?path=' + encodeURIComponent(p)).then(function (d) { return (d && d.entries) || []; }).catch(function () { return []; });
  }
  async function tasksTick() {
    if (DEMO) return;
    try {
      var now = Date.now();
      if (!taskDirSet.set || now - taskDirSet.t > 30000) {
        var t = await listDir('~/.claude/tasks');
        taskDirSet = { set: new Set(t.map(function (e) { return e.name; })), t: now };
      }
      for (var mi = 0; mi < mods.length; mi++) {
        var m = mods[mi];
        var s = sessionsNow().find(function (x) { return x.id === m.sid; });
        if (!s) continue;
        var dirName = mungeCwd(s.cwd || s.startDir || '');
        var pc = projCache[dirName];
        if (!pc || now - pc.t > 60000) {
          var entries = await listDir('~/.claude/projects/' + dirName);
          var sids = entries.filter(function (e) { return /\.jsonl$/.test(e.name) && now - (e.mtime || 0) < 12 * 3600e3; })
            .map(function (e) { return e.name.replace(/\.jsonl$/, ''); });
          pc = projCache[dirName] = { sids: sids, t: now };
        }
        var reads = 0, justDone = false;
        for (var si = 0; si < pc.sids.length; si++) {
          var sid = pc.sids[si];
          if (!taskDirSet.set.has(sid)) continue;
          var files = await listDir('~/.claude/tasks/' + sid);
          for (var fi = 0; fi < files.length; fi++) {
            var f = files[fi];
            if (!/\.json$/.test(f.name)) continue;
            var fc = fileCache[f.path];
            if (!fc || fc.mtime !== f.mtime) {
              if (reads++ > 40) continue;
              var d = await api('/api/read?path=' + encodeURIComponent(f.path)).catch(function () { return null; });
              var one = { mtime: f.mtime, open: 0, done: 0 };
              try {
                var j = JSON.parse((d && d.content) || '{}');
                if (j && j.status) { if (j.status === 'completed') one.done = 1; else one.open = 1; }
              } catch (e) { /* 非任务 json，忽略 */ }
              if (fc && fc.open === 1 && one.done === 1) justDone = true;
              fc = fileCache[f.path] = one;
            }
          }
        }
        if (justDone) celebrateModule(m);
      }
    } catch (e) { /* 数据层失败不打扰界面 */ }
  }

  // ---------- 今日 token 轮询：hero 目标 + 仓位里程 + 外部仓位 ----------
  var lastFeed = { claudeToday: 0, codexToday: 0, total: 0, perCwd: {}, codexSessions: [] };
  var demoT0 = Date.now();
  function demoTokensFeed() {
    var base = DEMOTOK || 254380000;
    var elapsed = (Date.now() - demoT0) / 1000;
    var total = base + elapsed * 24000;
    var per = {};
    var shares = [.3, .24, .18, 0, .1, 0];
    sessionsNow().forEach(function (s, i) { per[s.cwd] = Math.round(total * (shares[i] || 0)); });
    per['/tmp/CodexApp'] = Math.round(total * .18);
    return {
      ok: true, total: total,
      claudeToday: Math.round(total * .82), codexToday: Math.round(total * .18),
      // demo 也给两个口径（净用量按实测的 6% 比例造），好让口径开关在无头验收里能测
      totalFresh: Math.round(total * .06),
      claudeTodayFresh: Math.round(total * .06 * .82), codexTodayFresh: Math.round(total * .06 * .18),
      perCwd: per,
      codexSessions: [{ agent: 'codex', cwd: '/tmp/CodexApp', todayTokens: Math.round(total * .18), active: true }],
    };
  }
  function paintBayMilestones() {
    mods.forEach(function (m) {
      var tok = lastFeed.perCwd[m.cwd] || 0;
      var cnt = m.el.querySelector('.ro-cnt');
      if (cnt) cnt.textContent = tok ? fmtTok(tok) : '·';
      var ms = msOf(tok);
      if (ms !== m.ms) {
        m.ms = ms;
        m.el.classList.remove('m1', 'm2', 'm3', 'm4');
        if (ms) m.el.classList.add(ms);
      }
    });
  }
  function syncExtBays() {
    var now = Date.now();
    var termCwds = {};
    sessionsNow().forEach(function (s) { termCwds[s.cwd || s.startDir || ''] = 1; });
    var seen = {};
    (lastFeed.codexSessions || []).forEach(function (cs) {
      if (!cs.active || !cs.cwd || termCwds[cs.cwd]) return;
      seen[cs.cwd] = 1;
      var x = extMods[cs.cwd];
      if (!x) {
        var el = modShell({ ext: true, cols: 6, rows: 4 });
        el.querySelector('.ro-nm').textContent = 'Codex · ' + baseName(cs.cwd);
        el.querySelector('.ro-nm').style.color = 'var(--accent)';
        var stEl0 = el.querySelector('.ro-st');
        stEl0.className = 'ro-st working';
        // stEl 跟 mods 数组那份模块对象同一套字段结构缓存下来（不是热路径必需，statusTick/chaseTick
        // 都不摸 extMods，但结构对齐避免以后谁复用同一段逻辑时 m.stEl 在这半边 undefined）
        x = extMods[cs.cwd] = { el: el, cellEls: [].slice.call(el.querySelectorAll('.ro-cell')), runEl: el.querySelector('.ro-run'), stEl: stEl0, cols: 6, ptr: 0, lastSeen: now, active: true, ms: null, doneUntil: 0 };
        refreshSessions(true);
      }
      x.lastSeen = now;
      x.active = true;
      var cnt = x.el.querySelector('.ro-cnt');
      if (cnt) cnt.textContent = fmtTok(cs.todayTokens || 0);
      var ms = msOf(cs.todayTokens || 0);
      if (ms !== x.ms) { x.ms = ms; x.el.classList.remove('m1', 'm2', 'm3', 'm4'); if (ms) x.el.classList.add(ms); }
      x.el.classList.add('working');
    });
    // 安静太久的外部卡收走
    Object.keys(extMods).forEach(function (k) {
      var x = extMods[k];
      if (seen[k]) return;
      x.active = false;
      x.el.classList.remove('working');
      if (x.stEl) x.stEl.className = 'ro-st';
      if (now - x.lastSeen > 60000) { delete extMods[k]; refreshSessions(true); }
    });
  }
  function paintTrend() {
    var extActive = Object.keys(extMods).filter(function (k) { return extMods[k].active; }).length;
    var n = workingNow + extActive;
    trendEl.innerHTML = n > 0
      ? '<b>⚡ ' + n + ' 路</b>在烧' + (lastTokSpeed > 0 ? ' · ' + fmtTok(Math.round(lastTokSpeed)) + ' tok/s' : '') + (extActive ? ' · 含外部' : '')
      : '今日 00:00 起 · agent 一开工就开始涨';
    srcClaudeEl.textContent = 'Claude ' + fmtTok(rawMode ? (lastFeed.claudeToday || 0) : (lastFeed.claudeTodayFresh || 0));
    srcCodexEl.textContent = 'Codex ' + fmtTok(rawMode ? (lastFeed.codexToday || 0) : (lastFeed.codexTodayFresh || 0));
  }
  // 读数口径。默认「净用量」= 不含 cache_read：agent 每轮都要把整个上下文重读一遍，
  // 那部分实测占 94%，含它的读数动辄几亿几十亿，完全看不出今天到底用了多少。
  // 想看含缓存的原始量（比如对账官方计费）点一下切过去，选择记在 localStorage。
  var RAW_KEY = 'rb_obs_raw';
  var rawMode = false;
  try { rawMode = localStorage.getItem(RAW_KEY) === '1'; } catch (e) { /* */ }
  var cacheSwEl = aside.querySelector('.ro-cachesw');
  function feedNow() { return rawMode ? (lastFeed.total || 0) : (lastFeed.totalFresh || 0); }
  function paintCacheSw() {
    if (!cacheSwEl) return;
    cacheSwEl.textContent = rawMode ? '含缓存' : '净用量';
    cacheSwEl.classList.toggle('raw', rawMode);
    cacheSwEl.title = rawMode
      ? '当前：含缓存重读（agent 每轮重读上下文都计入，数字会大一个量级）。点击切回净用量'
      : '当前：净用量（不含缓存重读，这是真正新消耗的）。点击查看含缓存的原始量';
  }
  if (cacheSwEl) {
    cacheSwEl.onclick = function () {
      rawMode = !rawMode;
      try { localStorage.setItem(RAW_KEY, rawMode ? '1' : '0'); } catch (e) { /* */ }
      paintCacheSw();
      // 口径一换数量级就差十几倍，别让轮子从旧值一路滚过去——直接落位重画
      firstFeed = true; feedTotal(feedNow()); paintTrend();
    };
    paintCacheSw();
  }
  async function tokensTick() {
    try {
      var d = DEMO ? demoTokensFeed() : await api('/api/obs-tokens');
      if (!d || !d.ok) return;
      lastFeed = d;
      feedTotal(feedNow()); // 按当前口径喂（净用量 / 含缓存重读，见 ro-cachesw）
      paintBayMilestones();
      syncExtBays();
      paintTrend();
    } catch (e) { /* 数据层失败不打扰界面 */ }
  }

  // ---------- 引擎开关（关闭/隐藏 = 零成本） ----------
  var timers = [];
  function startAll() {
    if (timers.length) return;
    refreshSessions(true);
    timers = [
      setInterval(function () { refreshSessions(false); }, 2000),
      setInterval(chaseTick, 640),
      setInterval(drainTick, 700),
      setInterval(statusTick, 1000),
      setInterval(procTick, 5000),
      setInterval(tasksTick, 8000),
      setInterval(tokensTick, POLL_MS),
    ];
    statusTick(); procTick(); tasksTick(); tokensTick();
  }
  function stopAll() {
    timers.forEach(clearInterval); timers = [];
    if (heroRaf) { cancelAnimationFrame(heroRaf); heroRaf = 0; }
    setReelsWC(false); // 面板收起/窗口失焦：滚轮的图层提升一并摘掉
    closeMenu(); closeCfg();
  }
  document.addEventListener('visibilitychange', function () {
    if (!isOpen()) return;
    if (document.hidden) stopAll(); else startAll();
  });
  // 窗口失焦/隐藏到 Dock 时（idle-patch.js 发的信号）连轮询一起停：面板开着也没人在看，
  // 七个 interval 里最快的 640ms 一跳，还会连带打后端接口扫盘。回到前台立刻 startAll 补一轮全量。
  document.addEventListener('rb-active', function (e) {
    if (!isOpen()) return;
    if (e.detail) startAll(); else stopAll();
  });

  // 初始状态：记住上次开合；演示模式默认打开
  var saved = null;
  try { saved = localStorage.getItem(OPEN_KEY); } catch (e) { /* */ }
  if (DEMO || saved === '1') setOpen(true);
  // 无头验收：?rbdone=1 预置一张收工卡；&rbcfg=1 预置打开档位浮层
  if (DEMO && /[?&]rbdone=1/.test(location.search)) {
    setTimeout(function () { if (mods[0]) bayDone(mods[0], actOf(mods[0].sid)); }, 900);
  }
  if (DEMO && /[?&]rbcfg=1/.test(location.search)) {
    setTimeout(openCfg, 600);
  }
})();
