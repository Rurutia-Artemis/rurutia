/*
 * observer-patch.js — 观察舱（Rurutia 纯新增补丁）
 * ------------------------------------------------------------------
 * v2.12 改版：从「倒数模型」换成「今日 Token 里程」——消耗即成就，只涨不跌。
 * 视觉定稿见 design-demos/观察舱-token里程-样例.html（极光版 + 三种读数模式）。
 *
 * 数据三路（全部只读「运行本 App 的用户」自己的家目录，谁装谁读谁的）：
 *   · 大数字 = 今日全机消耗（/api/obs-tokens，12s 轮询）：
 *     Claude Code 读 ~/.claude/projects/**.jsonl 的 usage（真 token 含 cache），
 *     Codex 读 ~/.codex/sessions/** rollout 的 total_token_usage 快照按天求增量；
 *     两次轮询之间用 rAF 把显示值匀速滚向目标——滚轮一直在转，追上即停（零常驻开销）。
 *   · 仓位 = 打开的终端 tab（term.sessions），右上角显示该项目今日消耗（perCwd 归属）；
 *     外加「外部仓位」：Codex 会话 45s 内活跃、但 cwd 不属于任何打开的终端 →
 *     自动冒出一张带「外部」章的卡（如单开的 Codex 客户端），安静后自动收走。
 *   · 格子 = 该终端实时输出事件（fanboxPty.onData 旁听分类），与 v2.11 相同。
 *
 * 色阶天梯（今日口径，用户定案）：点火 <1M 素白 → 蓝移 1M（--info）→ 鎏金 1B（--yellow）
 *   → 棱镜 3B（五色流光）。跨阶一次性闪光；环境极光跟着色阶换色。
 *   仓位卡也按「该项目今日消耗」换里程边框（1M 蓝 / 1B 金 / 3B 彩虹渐变）。
 *
 * 读数三模式（rb_obs_nummode，切换器在精确行右侧）：
 *   简写 = 三位有效数字+单位恒定超大；K = 只除 1000 其余位全滚；全显 = 记分牌两行堆叠。
 *   任一模式下方都有 11 位「精确」小滚轮（全显模式隐藏，它本身就是精确值）。
 *
 * 收工庆典（回合机与 v2.11 相同：安静 6.5s 判收工）：闪光扫过 + 旋转彩虹流光边框 +
 *   格子对角彩虹（hue-rotate 合成器流动），8.5s 后恢复原格子色。子任务完成庆祝保留。
 *
 * 资源纪律（不变）：持续动效只碰 transform/opacity/合成器 filter；辉光全部预烘焙；
 *   面板关闭或窗口隐藏 → 定时器与 rAF 全停；浅色皮肤停用辉光/噪点（screen 叠加会出色斑）。
 * 布局不入侵：#app 打开时加 padding-right，面板自身 fixed 靠右。
 * web 版无终端不装载；?rbobs=demo 演示数据（无头验收），&rbtok=N 预置今日量，
 * &win=N 窗口数，&rbdone=1 预置一张收工卡，&rbmode=compact|kilo|full 预置读数模式。
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
  var POLL_MS = 12000;
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AGENT_BINS = ['claude', 'codex', 'grok', 'hermes', 'openclaw', 'kimi', 'opencode', 'pi', 'codebuddy', 'qodercli'];

  // ---------- 样式：全走皮肤变量，色阶经 --rbg 中转 ----------
  var st = document.createElement('style');
  st.textContent = [
    '@font-face { font-family: "Chakra Petch"; font-style: normal; font-weight: 600; font-display: swap; src: url("vendor/fonts/chakra-petch-600-latin.woff2") format("woff2"); }',
    '#app { transition: padding-right 340ms cubic-bezier(.77,0,.175,1); }',
    '#app.rb-obs-open { padding-right: ' + PANEL_W + 'px; }',
    '#rb-obs { position: fixed; z-index: 45; top: 0; right: 0; bottom: 0; width: ' + PANEL_W + 'px;',
    '  display: flex; flex-direction: column; overflow: hidden;',
    '  --rbg: var(--text-dim); --rb-num: "Chakra Petch", var(--font-mono, monospace);',
    '  background: radial-gradient(130% 42% at 50% -12%, color-mix(in srgb, var(--rbg) 14%, transparent), transparent 66%),',
    '    radial-gradient(80% 30% at 96% 106%, color-mix(in srgb, var(--rbg) 6%, transparent), transparent 62%), var(--bg);',
    '  border-left: 1px solid var(--border); color: var(--text);',
    '  transform: translateX(100%); transition: transform 340ms cubic-bezier(.77,0,.175,1);',
    '  -webkit-app-region: no-drag; }',
    '#rb-obs.t1 { --rbg: var(--info); }',
    '#rb-obs.t2 { --rbg: var(--yellow); }',
    '#rb-obs.t3 { --rbg: var(--accent); }',
    'html[data-mode="light"] #rb-obs { background: radial-gradient(130% 42% at 50% -12%, color-mix(in srgb, var(--rbg) 7%, transparent), transparent 66%), var(--bg); }',
    '.desktop #rb-obs { top: 40px; }',
    '#app.rb-obs-open #rb-obs { transform: none; }',
    // 细颗粒噪点（深色皮肤专属材质；浅色会显脏，停用）
    '.ro-grain { position: absolute; inset: 0; z-index: 0; pointer-events: none;',
    "  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E\"); }",
    'html[data-mode="light"] #rb-obs .ro-grain { display: none; }',
    // 顶部五色跑马灯（皮肤状态色）
    '.ro-track { position: absolute; z-index: 8; top: 0; right: 0; left: 0; height: 3px; overflow: hidden; background: color-mix(in srgb, var(--text) 5%, transparent); }',
    '.ro-train { position: absolute; top: 0; left: -22%; display: flex; width: 26%; height: 100%; animation: ro-train 8s steps(80) infinite; }',
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
    '#rb-obs.t3 .ro-badge { color: var(--text); border-color: transparent;',
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
    '#rb-obs.t1 .rb-big, #rb-obs.t2 .rb-big { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--rbg) 38%, transparent)); }',
    '#rb-obs.t3 .rb-big { filter: drop-shadow(0 0 10px color-mix(in srgb, var(--yellow) 30%, transparent)) drop-shadow(0 0 22px color-mix(in srgb, var(--info) 30%, transparent)); }',
    'html[data-mode="light"] #rb-obs .rb-big { filter: none; }',
    '.rb-big.stack { display: none; flex-direction: column; align-items: flex-end; line-height: 1.06; font-size: 92px; }',
    '.rb-big .row { display: inline-flex; }',
    '.ro-hero.mode-full .rb-big.line { display: none; }',
    '.ro-hero.mode-full .rb-big.stack { display: inline-flex; }',
    '.ro-hero.mode-full .ro-subcap, .ro-hero.mode-full .ro-subnum { display: none; }',
    '.ro-hero.mode-compact #rb-kilo, .ro-hero.mode-kilo #rb-compact { display: none; }',
    '.rb-unit { font-size: .38em; margin-left: .08em; transform: translateY(-.06em); color: var(--text-dim); }',
    '#rb-obs.t1 .rb-unit { color: var(--info); }',
    '#rb-obs.t2 .rb-unit { color: var(--yellow); }',
    '#rb-obs.t3 .rb-unit { background-image: linear-gradient(120deg, var(--yellow), var(--ok), var(--info)); background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }',
    // 滚轮构件（大字与精确行共用）：容器一律 inline-flex——inline-block 的 baseline 对齐
    // 会拿 overflow:hidden 盒子的底边当基线，整行错位（真实壳里踩过的坑）
    '.rb-digits, #rb-sub, #rb-rowhi, #rb-rowlo { display: inline-flex; }',
    '.rb-dg { display: inline-block; vertical-align: top; width: .6em; height: 1em; overflow: hidden; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.rb-dg.off, .rb-sep.off, .rb-pt.off { width: 0; opacity: 0; }',
    '.rb-sep { display: inline-block; vertical-align: top; width: .26em; height: 1em; overflow: hidden; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.rb-pt { display: inline-block; vertical-align: top; width: .3em; height: 1em; transition: width 300ms cubic-bezier(.23,1,.32,1), opacity 300ms ease; }',
    '.rb-reel { display: block; will-change: transform; }',
    '.rb-reel b, .rb-sep b, .rb-pt b { display: block; height: 1em; line-height: 1; font-weight: 600; text-align: center; color: var(--text); }',
    // 色阶配色：t0 素色 → t1 蓝移 → t2 鎏金 → t3 棱镜（渐变文字缓慢流动，只作用于大字）
    '#rb-obs.t1 .rb-big .rb-reel b, #rb-obs.t1 .rb-big .rb-pt b, #rb-obs.t2 .rb-big .rb-reel b, #rb-obs.t2 .rb-big .rb-pt b, #rb-obs.t3 .rb-big .rb-reel b, #rb-obs.t3 .rb-big .rb-pt b {',
    '  color: transparent; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-size: 64px 100%; animation: ro-flow 5.6s linear infinite; }',
    '#rb-obs.t1 .rb-big .rb-reel b, #rb-obs.t1 .rb-big .rb-pt b { background-image: linear-gradient(100deg, color-mix(in srgb, var(--info) 55%, #fff) 0%, var(--info) 32%, color-mix(in srgb, var(--info) 72%, #003) 60%, var(--info) 82%, color-mix(in srgb, var(--info) 55%, #fff) 100%); }',
    '#rb-obs.t2 .rb-big .rb-reel b, #rb-obs.t2 .rb-big .rb-pt b { background-image: linear-gradient(100deg, color-mix(in srgb, var(--yellow) 55%, #fff) 0%, var(--yellow) 34%, color-mix(in srgb, var(--yellow) 70%, #530) 62%, var(--yellow) 82%, color-mix(in srgb, var(--yellow) 55%, #fff) 100%); }',
    '#rb-obs.t3 .rb-big .rb-reel b, #rb-obs.t3 .rb-big .rb-pt b { background-image: linear-gradient(100deg, var(--err) 0%, var(--yellow) 22%, var(--ok) 44%, var(--info) 64%, var(--accent) 84%, var(--err) 100%); }',
    'html[data-mode="light"] #rb-obs.t1 .rb-big .rb-reel b, html[data-mode="light"] #rb-obs.t1 .rb-big .rb-pt b { background-image: linear-gradient(100deg, var(--info) 0%, color-mix(in srgb, var(--info) 70%, #003) 50%, var(--info) 100%); }',
    'html[data-mode="light"] #rb-obs.t2 .rb-big .rb-reel b, html[data-mode="light"] #rb-obs.t2 .rb-big .rb-pt b { background-image: linear-gradient(100deg, var(--yellow) 0%, color-mix(in srgb, var(--yellow) 70%, #530) 50%, var(--yellow) 100%); }',
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
    '#rb-obs.t3 .ro-meter i { background: linear-gradient(90deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)); }',
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
    '.ro-rule { position: relative; z-index: 3; height: 1px; margin: 13px 16px 0; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--rbg) 45%, transparent) 30%, color-mix(in srgb, var(--rbg) 45%, transparent) 70%, transparent); }',
    // ---- 仓位 ----
    '.ro-flow { position: relative; z-index: 3; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 13px 14px 12px; min-height: 0; overflow-y: auto; align-content: start; }',
    '.ro-flow.cols-1 { grid-template-columns: 1fr; }',
    '.ro-flow::-webkit-scrollbar { width: 0; }',
    '.ro-mod { position: relative; min-width: 0; padding: 10px 11px 11px; border: 1px solid var(--border); border-radius: 13px; background: var(--panel); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent); }',
    'html[data-mode="light"] .ro-mod { box-shadow: none; }',
    // 里程边框：该项目今日消耗 1M 蓝 / 1B 金 / 3B 彩虹（常驻荣誉；收工的旋转流光是临时庆典）
    '.ro-mod.m1 { border-color: color-mix(in srgb, var(--info) 52%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 18px -7px color-mix(in srgb, var(--info) 50%, transparent); }',
    '.ro-mod.m2 { border-color: color-mix(in srgb, var(--yellow) 55%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 18px -7px color-mix(in srgb, var(--yellow) 55%, transparent); }',
    '.ro-mod.m3 { border: 1px solid transparent; background: linear-gradient(var(--panel), var(--panel)) padding-box, linear-gradient(120deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent)) border-box;',
    '  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 0 16px -7px color-mix(in srgb, var(--err) 38%, transparent), 0 0 20px -8px color-mix(in srgb, var(--info) 38%, transparent); }',
    'html[data-mode="light"] .ro-mod.m1, html[data-mode="light"] .ro-mod.m2, html[data-mode="light"] .ro-mod.m3 { box-shadow: none; }',
    '.ro-mod.m1 .ro-cnt { color: var(--info); }',
    '.ro-mod.m2 .ro-cnt { color: var(--yellow); }',
    '.ro-mod.m3 .ro-cnt { background-image: linear-gradient(100deg, var(--yellow), var(--ok), var(--info)); background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; font-weight: 700; }',
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
    '.ro-cell { aspect-ratio: 1; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); transform: translateZ(0); transition: transform 200ms cubic-bezier(.23,1,.32,1), background-color 320ms ease, border-color 320ms ease, box-shadow 320ms ease; }',
    ['err', 'yellow', 'accent', 'ok', 'info'].map(function (t) {
      var v = 'var(--' + t + ')';
      return '.ro-cell.' + t + ' { color: ' + v + '; border-color: color-mix(in srgb, ' + v + ' 78%, transparent); background: color-mix(in srgb, ' + v + ' 66%, transparent); }\n' +
        'html[data-mode="light"] .ro-cell.' + t + ' { border-color: ' + v + '; background: color-mix(in srgb, ' + v + ' 90%, transparent); }';
    }).join('\n'),
    '.ro-cell.chasing { outline: 1px solid color-mix(in srgb, var(--text) 55%, transparent); outline-offset: 1px; transform: translateY(-2px) scale(1.08); }',
    '.ro-cell.pop { animation: ro-pop 340ms cubic-bezier(.23,1,.32,1); }',
    // ===== 收工 = 彩虹流光（一次性庆典 + 8.5s 持续流光后自动恢复） =====
    '.ro-rim { position: absolute; inset: 0; z-index: 0; border-radius: 13px; overflow: hidden; display: none; pointer-events: none; }',
    '.ro-rim::before { content: ""; position: absolute; inset: -75%; background: conic-gradient(from 0deg, var(--err), var(--yellow), var(--ok), var(--info), var(--accent), var(--err)); animation: ro-spin 3.2s linear infinite; }',
    '.ro-rim::after { content: ""; position: absolute; inset: 2px; border-radius: 11px; background: var(--panel); }',
    '.ro-mod.done .ro-rim { display: block; }',
    '.ro-mod.done { border-color: transparent; box-shadow: 0 0 26px -6px color-mix(in srgb, var(--err) 30%, transparent), 0 0 40px -10px color-mix(in srgb, var(--info) 30%, transparent); }',
    'html[data-mode="light"] .ro-mod.done { box-shadow: none; }',
    '.ro-mod.done .ro-grid { animation: ro-huerun 4s linear infinite; }',
    '.ro-mod.done .ro-cell { border-color: transparent; box-shadow: 0 0 10px -1px currentColor; }',
    'html[data-mode="light"] .ro-mod.done .ro-cell { box-shadow: none; }',
    '.ro-flash { position: absolute; inset: 0; z-index: 3; border-radius: 13px; overflow: hidden; pointer-events: none; display: none; }',
    '.ro-flash i { position: absolute; top: -30%; bottom: -30%; left: 0; width: 46%; background: linear-gradient(105deg, transparent, color-mix(in srgb, #fff 32%, transparent), transparent); transform: translateX(-130%) skewX(-12deg); }',
    '.ro-mod.celebrate .ro-flash { display: block; }',
    '.ro-mod.celebrate .ro-flash i { animation: ro-sweep 760ms cubic-bezier(.23,1,.32,1) 120ms both; }',
    '.ro-mod.celebrate { animation: ro-modwin 900ms cubic-bezier(.23,1,.32,1); }',
    '.ro-mod.done .ro-st { background: var(--text); box-shadow: 0 0 10px var(--text); animation: none; }',
    '.ro-cnt.winpop { animation: ro-pop 340ms cubic-bezier(.23,1,.32,1); }',
    '.ro-empty { grid-column: 1 / -1; padding: 30px 10px; color: var(--text-faint); font: 12px/1.8 var(--font-mono, monospace); text-align: center; }',
    '.ro-foot { margin-top: auto; display: flex; align-items: center; gap: 10px; flex: 0 0 auto; padding: 11px 16px; border-top: 1px solid var(--border); color: var(--text-faint); font: 9.5px/1.5 var(--font-mono, monospace); position: relative; z-index: 3; }',
    '.ro-ladder { display: flex; gap: 9px; align-items: center; }',
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
    '@keyframes ro-breathe { 0%,100% { opacity: 1; } 50% { opacity: .45; } }',
    '@keyframes ro-train { to { left: 100%; } }',
    '@keyframes ro-flow { to { background-position: 64px 0; } }',
    '@keyframes ro-settle { 0% { transform: scale(1.04); } 100% { transform: scale(1); } }',
    '@keyframes ro-badgepop { 0% { transform: scale(.8); } 55% { transform: scale(1.14); } 100% { transform: scale(1); } }',
    '@keyframes ro-pop { 0% { transform: scale(.82); } 62% { transform: scale(1.10); } 100% { transform: scale(1); } }',
    '@keyframes ro-spin { to { transform: rotate(360deg); } }',
    '@keyframes ro-huerun { to { filter: hue-rotate(360deg); } }',
    '@keyframes ro-sweep { to { transform: translateX(320%) skewX(-12deg); } }',
    '@keyframes ro-modwin { 0% { transform: scale(1); } 26% { transform: scale(1.03); } 100% { transform: scale(1); } }',
    // ?shot 截图模式：无头 Chrome 的 virtual-time 会把过渡冻在起点，截图时过渡全瞬时
    (/[?&]shot/.test(location.search) ? '#rb-obs, #rb-obs * { transition-duration: 0ms !important; }' : ''),
    '@media (prefers-reduced-motion: reduce) { .ro-train, .ro-dot, .ro-st, .ro-cell.pop, .ro-badge.pop, .ro-hero.flash .ro-bigwrap, .ro-mod.done .ro-grid, .ro-rim::before, .ro-mod.celebrate, .ro-mod.celebrate .ro-flash i, .ro-cnt.winpop,',
    '  #rb-obs.t1 .rb-big .rb-reel b, #rb-obs.t2 .rb-big .rb-reel b, #rb-obs.t3 .rb-big .rb-reel b { animation: none !important; } #rb-obs, #app { transition-duration: 1ms; } }',
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
    '<span class="ro-srcnote">本机日志 · 每天 00:00 起</span></div>' +
    '</div>' +
    '<div class="ro-rule"></div>' +
    '<div class="ro-flow"></div>' +
    '<footer class="ro-foot"><span class="ro-ladder">' +
    '<span style="color:var(--info)"><i style="background:var(--info)"></i>1M 蓝移</span>' +
    '<span style="color:var(--yellow)"><i style="background:var(--yellow)"></i>1B 鎏金</span>' +
    '<span style="color:var(--accent)"><i style="background:linear-gradient(135deg,var(--err),var(--yellow),var(--ok),var(--info),var(--accent))"></i>3B 棱镜</span>' +
    '</span><span class="sp"></span><span>只观察 · 不接管</span></footer>';
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
  var act = {}; // sid -> { last, pend:[], proc, cells:[], ptr, turn, ema, emaKey, open, done }
  function actOf(sid) { return act[sid] || (act[sid] = { last: 0, pend: [], proc: '', cells: null, ptr: 0, open: null, done: 0, turn: null, ema: 0, emaKey: '', demoHold: 0 }); }
  function classify(chunk) {
    var s = String(chunk).slice(0, 400);
    if (/error|failed|✗|✘|exception|fatal/i.test(s)) return 'err';
    if (/warn/i.test(s)) return 'yellow';
    if (/✓|✔|⏺|passed|success|committed| done/i.test(s)) return 'ok';
    if (/✻|✽|✢|✳|thinking|esc to interrupt/i.test(s)) return 'accent';
    return 'info';
  }
  if (!DEMO && window.fanboxPty && window.fanboxPty.onData) {
    window.fanboxPty.onData(function (m) {
      var a = actOf(m.id);
      a.last = Date.now();
      if (a.turn) a.turn.spentB += (m.data && m.data.length) || 0;
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
  function paintParts(list, v) {
    var safe = Math.max(0, v);
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.sep) { p.el.classList.toggle('off', safe < Math.pow(10, p.k)); continue; }
      var u = safe / Math.pow(10, p.k);
      var D = Math.floor(u) % 10;
      var r = u - Math.floor(u);
      var W = WINDOWS_K[p.k] || .09;
      var pos = reduceMotion ? D : D + Math.max(0, 1 - (1 - r) / W);
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
  function paintCompact(v) {
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
      var pos = (j === lastDigitIdx && !reduceMotion) ? lastCont : +ch;
      slot.reel.style.transform = 'translateY(' + (-pos).toFixed(3) + 'em)';
      di++;
    }
    for (var m = di; m < 4; m++) cSlots[C_D[m]].el.classList.add('off');
    C_P.forEach(function (pi, idx) { cSlots[pi].el.classList.toggle('off', !usedP[idx]); });
    unitEl.textContent = unit;
    bigLineEl.style.fontSize = '132px';
  }
  function paintKilo(v) {
    var kv = v < 1000 ? v : v / 1000;
    paintParts(kiloParts, kv);
    unitEl.textContent = v < 1000 ? '' : 'K';
    var len = lenOf(kv), seps = Math.floor((len - 1) / 3);
    bigLineEl.style.fontSize = Math.min(132, Math.floor(HERO_W / (len * .6 + seps * .26 + (v < 1000 ? 0 : .3)))) + 'px';
  }
  function paintFull(v) {
    paintParts(hiParts, v);
    paintParts(loParts, v);
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
      applyMode(); paintHeroNumber();
    };
  });
  applyMode();

  // ---------- 色阶天梯（今日口径）：1M 蓝 → 1B 金 → 3B 彩虹 ----------
  var TIERS = [
    { at: 0, cls: 't0', name: '点火', next: 1e6, nextLabel: '1M' },
    { at: 1e6, cls: 't1', name: '蓝移 1M', next: 1e9, nextLabel: '1B' },
    { at: 1e9, cls: 't2', name: '鎏金 1B', next: 3e9, nextLabel: '3B' },
    { at: 3e9, cls: 't3', name: '棱镜 3B', next: null, nextLabel: 'MAX' },
  ];
  var tierOf = function (v) { var t = TIERS[0]; for (var i = 0; i < TIERS.length; i++) { if (v >= TIERS[i].at) t = TIERS[i]; } return t; };
  var msOf = function (v) { return v >= 3e9 ? 'm3' : v >= 1e9 ? 'm2' : v >= 1e6 ? 'm1' : ''; };
  var curTier = null;
  function paintTier(v, silent) {
    var t = tierOf(v);
    if (t !== curTier) {
      aside.classList.remove('t0', 't1', 't2', 't3');
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

  // ---------- 大数字引擎：轮询目标 + rAF 匀速滚近（追上即停，零常驻） ----------
  var heroV = 0, heroTarget = 0, heroRate = 0, heroRaf = 0, heroLastT = 0, firstFeed = true;
  var lastTokSpeed = 0; // tok/s，趋势行显示
  function paintHeroNumber() {
    if (mode === 'compact') paintCompact(heroV);
    else if (mode === 'kilo') paintKilo(heroV);
    else paintFull(heroV);
    paintParts(subParts, heroV);
  }
  function heroFrame(now) {
    var dt = now - heroLastT; heroLastT = now;
    heroV = Math.min(heroTarget, heroV + heroRate * dt);
    paintHeroNumber();
    paintTier(heroV);
    heroRaf = heroV < heroTarget && isOpen() && !document.hidden ? requestAnimationFrame(heroFrame) : 0;
  }
  function feedTotal(total) {
    if (firstFeed || reduceMotion) {
      firstFeed = false;
      heroV = heroTarget = total;
      paintHeroNumber(); paintTier(heroV, true);
      return;
    }
    if (total <= heroTarget + 1) { heroTarget = Math.max(heroTarget, total); return; }
    lastTokSpeed = (total - heroV) / (POLL_MS / 1000);
    heroRate = (total - heroV) / POLL_MS;
    heroTarget = total;
    if (!heroRaf) { heroLastT = performance.now(); heroRaf = requestAnimationFrame(heroFrame); }
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
      var m = { sid: s.id, cwd: s.cwd || s.startDir || '', el: el, cellEls: [].slice.call(el.querySelectorAll('.ro-cell')), runEl: el.querySelector('.ro-run'), cols: L.cols, ms: null, doneUntil: 0 };
      a.cells.forEach(function (tone, i) { if (tone && m.cellEls[i]) m.cellEls[i].classList.add(tone); });
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
  function refreshSessions(force) {
    var key = sessionsKey();
    if (force || key !== lastKey) { lastKey = key; rebuildModules(); }
  }

  // ---------- 格子事件消化 + 进度翻绿 + 巡场 ----------
  var DEMO_TONES = ['info', 'info', 'info', 'info', 'ok', 'ok', 'accent', 'accent', 'yellow', 'err'];
  function paintCell(m, a, i, tone) {
    if (a) a.cells[i] = tone;
    var c = m.cellEls[i];
    if (!c) return;
    c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'pop');
    c.classList.add(tone);
    if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
  }
  function drainTick() {
    var now = Date.now();
    mods.forEach(function (m, idx) {
      if (m.doneUntil > now) return; // 收工流光期间格子定格彩虹
      var a = actOf(m.sid);
      var tone = a.pend.shift();
      if (DEMO) {
        var live = demoStatus(idx) === 'working' && !(a.demoHold && now < a.demoHold);
        tone = live && Math.random() < .8 ? DEMO_TONES[Math.floor(Math.random() * DEMO_TONES.length)] : null;
      }
      if (tone) { paintCell(m, a, a.ptr % a.cells.length, tone); a.ptr++; }
      greenTick(m, a);
    });
    // 外部仓位：按活跃状态低频吐事件（没有 pty 流，节奏是合成的）
    Object.keys(extMods).forEach(function (k) {
      var x = extMods[k];
      if (x.doneUntil > now) return;
      if (now - x.lastSeen > 60000) return;
      if (x.active && Math.random() < .5) {
        var c = x.cellEls[x.ptr % x.cellEls.length];
        if (c) {
          c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'pop');
          c.classList.add(DEMO_TONES[Math.floor(Math.random() * DEMO_TONES.length)]);
          if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
        }
        x.ptr++;
      }
    });
  }
  function greenTick(m, a) {
    var p = null;
    if (a.turn && a.turn.spent >= TURN_MIN) p = Math.min(1, a.turn.spent / a.turn.est);
    if (p == null) return;
    var landed = Math.min(a.ptr, a.cells.length);
    if (!landed) return;
    var target = Math.round(p * landed), greens = 0, oldest = -1;
    for (var k = 0; k < landed; k++) {
      var i = ((a.ptr - landed + k) % a.cells.length + a.cells.length) % a.cells.length;
      if (a.cells[i] === 'ok') greens++;
      else if (oldest < 0) oldest = i;
    }
    if (greens < target && oldest >= 0) paintCell(m, a, oldest, 'ok');
  }
  function chaseTick() {
    var now = Date.now();
    mods.forEach(function (m, i) {
      var prev = m.el.querySelector('.ro-cell.chasing');
      if (prev) prev.classList.remove('chasing');
      if (m.doneUntil > now) return;
      var step = Math.floor(Date.now() / 640) + i * 5;
      var c = m.cellEls[step % m.cellEls.length];
      if (c) c.classList.add('chasing');
    });
  }

  // ---------- 状态 + 回合机（进度丝 + 收工庆典；EMA 校准估算，按项目持久化） ----------
  var UNIT = 64;
  var TURN_MIN = 40;
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
        else { a.last = now; if (a.turn) a.turn.spentB += 9600; }
      }
      var stEl = m.el.querySelector('.ro-st');
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
        a.turn = { spentB: 0, spent: 0, t0: now, est: a.ema || (DEMO ? 2400 : DEFAULT_EST) };
      }
      if (a.turn) {
        a.turn.spent = Math.round(a.turn.spentB / UNIT);
        m.runEl.style.backgroundSize = (a.turn.spent >= TURN_MIN ? Math.min(100, a.turn.spent / a.turn.est * 100).toFixed(1) : 0) + '% 100%';
        if (now - a.last > QUIET_MS) {
          var t = a.turn; a.turn = null;
          m.runEl.style.backgroundSize = '0% 100%';
          if (t.spent >= TURN_MIN) {
            a.ema = Math.max(TURN_MIN, a.ema ? Math.round(a.ema * .6 + t.spent * .4) : t.spent);
            if (!DEMO && a.emaKey) { emaStore[a.emaKey] = a.ema; try { localStorage.setItem(EMA_KEY, JSON.stringify(emaStore)); } catch (e) { /* */ } }
            bayDone(m, a); // 收工庆典：闪光 + 旋转流光 + 对角彩虹
          }
        }
      }
      if (m.doneUntil > now) cls = 'working';
      stEl.className = 'ro-st ' + cls;
      stEl.title = cls === 'working' ? '工作中' : cls === 'waiting' ? (a.proc + ' 在等你回话') : '空闲';
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

  // ---------- 收工庆典 / 子任务庆祝 ----------
  var RAINBOW5 = ['err', 'yellow', 'ok', 'info', 'accent'];
  function bayDone(m, a) {
    var now = Date.now();
    m.doneUntil = now + 8500;
    m.el.classList.add('done');
    m.el.classList.remove('celebrate'); void m.el.offsetWidth; m.el.classList.add('celebrate');
    var prev = m.el.querySelector('.ro-cell.chasing');
    if (prev) prev.classList.remove('chasing');
    m.cellEls.forEach(function (c, ci) {
      var row = Math.floor(ci / m.cols), col = ci % m.cols;
      var delay = reduceMotion ? 0 : (row + col) * 40;
      setTimeout(function () {
        c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'pop');
        c.classList.add(RAINBOW5[(row + col) % 5]);
        if (!reduceMotion) { void c.offsetWidth; c.classList.add('pop'); }
      }, delay);
    });
    setTimeout(function () {
      m.el.classList.remove('done', 'celebrate');
      m.doneUntil = 0;
      // 恢复事件格子的历史色
      if (a && a.cells) a.cells.forEach(function (tone, i) {
        var c = m.cellEls[i];
        if (!c) return;
        c.classList.remove('err', 'yellow', 'accent', 'ok', 'info', 'pop');
        if (tone) c.classList.add(tone);
      });
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
        m.el.classList.remove('m1', 'm2', 'm3');
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
        el.querySelector('.ro-st').className = 'ro-st working';
        x = extMods[cs.cwd] = { el: el, cellEls: [].slice.call(el.querySelectorAll('.ro-cell')), runEl: el.querySelector('.ro-run'), cols: 6, ptr: 0, lastSeen: now, active: true, ms: null, doneUntil: 0 };
        refreshSessions(true);
      }
      x.lastSeen = now;
      x.active = true;
      var cnt = x.el.querySelector('.ro-cnt');
      if (cnt) cnt.textContent = fmtTok(cs.todayTokens || 0);
      var ms = msOf(cs.todayTokens || 0);
      if (ms !== x.ms) { x.ms = ms; x.el.classList.remove('m1', 'm2', 'm3'); if (ms) x.el.classList.add(ms); }
      x.el.classList.add('working');
    });
    // 安静太久的外部卡收走
    Object.keys(extMods).forEach(function (k) {
      var x = extMods[k];
      if (seen[k]) return;
      x.active = false;
      x.el.classList.remove('working');
      var stEl = x.el.querySelector('.ro-st');
      if (stEl) stEl.className = 'ro-st';
      if (now - x.lastSeen > 60000) { delete extMods[k]; refreshSessions(true); }
    });
  }
  function paintTrend() {
    var extActive = Object.keys(extMods).filter(function (k) { return extMods[k].active; }).length;
    var n = workingNow + extActive;
    trendEl.innerHTML = n > 0
      ? '<b>⚡ ' + n + ' 路</b>在烧' + (lastTokSpeed > 0 ? ' · ' + fmtTok(Math.round(lastTokSpeed)) + ' tok/s' : '') + (extActive ? ' · 含外部' : '')
      : '今日 00:00 起 · agent 一开工就开始涨';
    srcClaudeEl.textContent = 'Claude ' + fmtTok(lastFeed.claudeToday || 0);
    srcCodexEl.textContent = 'Codex ' + fmtTok(lastFeed.codexToday || 0);
  }
  async function tokensTick() {
    try {
      var d = DEMO ? demoTokensFeed() : await api('/api/obs-tokens');
      if (!d || !d.ok) return;
      lastFeed = d;
      feedTotal(d.total || 0);
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
    closeMenu();
  }
  document.addEventListener('visibilitychange', function () {
    if (!isOpen()) return;
    if (document.hidden) stopAll(); else startAll();
  });

  // 初始状态：记住上次开合；演示模式默认打开
  var saved = null;
  try { saved = localStorage.getItem(OPEN_KEY); } catch (e) { /* */ }
  if (DEMO || saved === '1') setOpen(true);
  // 无头验收：?rbdone=1 预置一张收工卡
  if (DEMO && /[?&]rbdone=1/.test(location.search)) {
    setTimeout(function () { if (mods[0]) bayDone(mods[0], actOf(mods[0].sid)); }, 900);
  }
})();
