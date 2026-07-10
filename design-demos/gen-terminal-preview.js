#!/usr/bin/env node
/*
 * 终端配色预览页生成器：从 themes-patch.js 真代码里抠出配色函数跑一遍，
 * 18 套皮肤 × (旧版 Catppuccin+10% / 新版 真跟皮肤) 并排渲染成 Claude Code / Codex 界面模拟。
 * 用法：node design-demos/gen-terminal-preview.js [旧版来源git引用，默认 HEAD 里没有旧版时自动跳过]
 * 产出：design-demos/terminal-colors-preview.html
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// 从 themes-patch.js 源码里切出纯函数段（不含 DOM 代码）并求值
function loadEngine(src) {
  const a = src.indexOf('var DARK_FUNC');
  const b = src.indexOf('/* ---------- 把 18 套主题写成 CSS 注入');
  if (a < 0 || b < 0) throw new Error('找不到调色板数据段');
  let code = src.slice(a, b);
  // buildAnsi 段（新版有 hueOf6 前导，旧版直接是注释块+函数）
  const c = src.indexOf('每套皮肤一整套 ANSI 16 色');
  if (c < 0) throw new Error('找不到 buildAnsi 段');
  const cStart = src.lastIndexOf('/*', c);
  const dNew = src.indexOf('/* ---------- 用户自选终端色', c);
  const dOld = src.indexOf('/* ---------- 让终端 / 编辑器跟着换色', c);
  const d = Math.min(...[dNew, dOld].filter((x) => x > 0));
  code += '\n' + src.slice(cStart, d);
  const fn = new Function(code + `
    return { PALETTES, buildVars, buildAnsi, alpha,
      themeOf: function (p) {
        var v = buildVars(p);
        var a = buildAnsi(p, v['--accent'], v['--accent-2'], v['--accent-3']);
        a.background = v['--bg']; a.cursor = v['--accent']; a.cursorAccent = v['--bg'];
        a.selectionBackground = alpha(v['--accent'], 0.28);
        return a;
      } };`);
  return fn();
}

const newSrc = fs.readFileSync(path.join(ROOT, 'public/themes-patch.js'), 'utf8');
const oldSrc = execSync('git show 088aeb2:public/themes-patch.js', { cwd: ROOT, encoding: 'utf8' });
const NEW = loadEngine(newSrc);
const OLD = loadEngine(oldSrc);

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

// —— Claude Code (dark-ansi) + Codex 界面模拟：每行都用真实槽位上色 ——
function mockTerm(t, label) {
  const fg = t.foreground, bd = t.brightBlack, bg = t.background;
  const line = (html) => `<div class="ln">${html}</div>`;
  const sp = (c, s, extra) => `<span style="color:${c}${extra || ''}">${esc(s)}</span>`;
  const box = (inner, w) => `<div class="cbox" style="border-color:${bd}">${inner}</div>`;
  return `
  <div class="term" style="background:${bg};color:${fg}">
    <div class="term-tag">${label}</div>
    ${box(
      line(sp(t.magenta, ' ✻ ') + sp(fg, 'Welcome to ') + sp(fg, 'Claude Code', ';font-weight:700') + sp(bd, '  v2.1.x')) +
      line(sp(bd, '   model: ') + sp(t.cyan, 'claude-fable-5') + sp(bd, ' · ') + sp(t.cyan, '~/Documents/RuruCode/Rurubox'))
    )}
    ${line(sp(bd, '> ') + sp(fg, '把这个 bug 修一下'))}
    ${line(sp(t.magenta, '✻ ') + sp(bd, 'Thinking…'))}
    ${line(sp(t.blue, '⏺ ') + sp(fg, 'Read') + sp(bd, '(') + sp(t.cyan, 'src/app.js') + sp(bd, ')'))}
    ${line(sp(t.green, '  ⎿ ') + sp(bd, 'Read 120 lines'))}
    ${line(sp(t.green, '+ const ok = validate(input);'))}
    ${line(sp(t.red, '- const ok = true; // FIXME'))}
    ${box(
      line(sp(fg, 'Do you want to make this edit to ') + sp(t.cyan, 'app.js') + sp(fg, '?')) +
      line(sp(t.green, ' ❯ 1. Yes')) +
      line(sp(bd, '   2. Yes, and don’t ask again')) +
      line(sp(bd, '   3. No, tell Claude what to do differently'))
    )}
    ${line(sp(t.yellow, '⚠ ') + sp(t.yellow, 'Context left until auto-compact: 12%'))}
    ${line(sp(t.red, '✗ ') + sp(t.red, 'Error: ') + sp(fg, 'connection timed out'))}
    <div class="rule" style="border-color:${bd}"></div>
    ${line(sp(t.blue, '▌ ') + sp(fg, 'OpenAI Codex', ';font-weight:700') + sp(bd, ' (v0.14x)'))}
    ${line(sp(bd, '  › ') + sp(fg, '跑一下测试'))}
    ${line(sp(t.magenta, '  • ') + sp(fg, 'Ran ') + sp(t.cyan, 'npm test'))}
    ${line(sp(t.green, '  ✓ 17 passed') + sp(bd, ' · ') + sp(t.yellow, '1 skipped'))}
    ${line(sp(fg, '  sel: ') + `<span style="background:${t.selectionBackground};color:${fg}">${esc('选中的文本长这样')}</span>` + sp(fg, ' cursor:') + `<span style="background:${t.cursor};color:${t.cursorAccent}">█</span>`)}
    <div class="swatches">${['red','green','yellow','blue','magenta','cyan','white','brightBlack'].map((k) => `<i title="${k}" style="background:${t[k]}"></i>`).join('')}</div>
  </div>`;
}

let cards = '';
for (const p of NEW.PALETTES) {
  const tn = NEW.themeOf(p);
  const po = OLD.PALETTES.find((x) => x.id === p.id);
  const to = OLD.themeOf(po);
  cards += `
  <section class="card">
    <h2>${p.name} <code>${p.id}</code> ${p.dark ? '<em>暗</em>' : '<em class="lt">浅</em>'}</h2>
    <div class="pair">
      <div>${mockTerm(to, '旧（改动前）')}</div>
      <div>${mockTerm(tn, '新（真跟皮肤）')}</div>
    </div>
  </section>`;
}

const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rurutia 终端配色预览 · 18 套皮肤 旧 vs 新</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body { background: #101014; color: #e8e8ee; font: 14px/1.6 -apple-system, "PingFang SC", sans-serif; padding: 28px clamp(16px, 4vw, 48px) 80px; }
  header { max-width: 1200px; margin: 0 auto 28px; }
  h1 { font-size: 20px; margin-bottom: 6px; }
  header p { color: #9a9aa8; font-size: 13px; }
  .card { max-width: 1200px; margin: 0 auto 26px; }
  .card h2 { font-size: 14px; margin-bottom: 8px; font-weight: 600; }
  .card h2 code { color: #9a9aa8; font-size: 11px; margin: 0 6px; }
  .card h2 em { font-style: normal; font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #26262e; color: #b8b8c4; }
  .card h2 em.lt { background: #e8e4d8; color: #55503f; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
  .term { border-radius: 10px; padding: 12px 14px 10px; font: 11.5px/1.55 ui-monospace, "SF Mono", Menlo, monospace; overflow-x: auto; border: 1px solid #ffffff14; position: relative; }
  .term-tag { position: absolute; top: 8px; right: 10px; font-size: 10px; color: #888; font-family: -apple-system, sans-serif; opacity: .75; }
  .ln { white-space: pre; }
  .cbox { border: 1px solid; border-radius: 6px; padding: 4px 8px; margin: 6px 0; }
  .rule { border-top: 1px dashed; margin: 8px 0 6px; opacity: .6; }
  .swatches { display: flex; gap: 4px; margin-top: 8px; }
  .swatches i { width: 22px; height: 10px; border-radius: 3px; display: block; border: 1px solid #00000030; }
</style></head><body>
<header>
  <h1>终端配色预览 —— 18 套皮肤 · 旧 vs 新</h1>
  <p>模拟 dark-ansi 下的 Claude Code 界面（欢迎框 / 权限对话框 / diff / 警告报错）+ Codex 输出。左旧右新；
  新版的框线（brightBlack）带皮肤色温、蓝/品红/青槽按色相把皮肤强调色请上台，语义色（红错/绿成/黄警）拉高饱和。
  App 里还有「终端配色」面板可逐项自调，此页只定默认值。</p>
</header>
${cards}
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'terminal-colors-preview.html'), html);
console.log('written: design-demos/terminal-colors-preview.html (' + NEW.PALETTES.length + ' skins)');
