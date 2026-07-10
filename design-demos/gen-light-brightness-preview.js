#!/usr/bin/env node
/*
 * 浅色皮肤亮度对比页生成器：9 套浅色皮肤，旧推导（v2.8.1 的亮度）vs 新推导（Vela 契约 v3 降亮度）
 * 并排渲染成 App 外壳模拟（侧栏 / 内容卡 / 文字 / 按钮），一眼看出降了多少。
 * 用法：node design-demos/gen-light-brightness-preview.js
 * 产出：design-demos/light-brightness-preview.html
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function loadEngine(src) {
  const a = src.indexOf('var DARK_FUNC');
  const b = src.indexOf('/* ---------- 把 18 套主题写成 CSS 注入');
  return new Function(src.slice(a, b) + '; return { PALETTES, buildVars, relLum };')();
}

const NEW = loadEngine(fs.readFileSync(path.join(ROOT, 'public/themes-patch.js'), 'utf8'));
const OLD = loadEngine(execSync('git show 088aeb2:public/themes-patch.js', { cwd: ROOT, encoding: 'utf8' }));

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

// —— App 外壳模拟：侧栏 + 顶栏 + 内容卡片区，全部用该皮肤推导出的 CSS 变量上色 ——
function shell(v, name, tag, lum) {
  const s = (k) => v['--' + k];
  return `
  <div class="shell" style="background:${s('bg')}">
    <div class="shell-tag">${tag} · 页面底 ${lum}</div>
    <div class="sh-side" style="background:${s('panel')};border-right:1px solid ${s('border')}">
      <div class="sh-brand" style="color:${s('text')}">Rurutia</div>
      <div class="sh-nav" style="color:${s('accent-2-text')}">快速入口</div>
      <div class="sh-item" style="color:${s('text-dim')}">文档</div>
      <div class="sh-item act" style="background:${s('accent-soft')};color:${s('text')}">主目录</div>
      <div class="sh-item" style="color:${s('text-dim')}">下载</div>
      <div class="sh-nav" style="color:${s('accent-2-text')}">AGENT 项目</div>
      <div class="sh-item" style="color:${s('text-dim')}">Rurubox</div>
    </div>
    <div class="sh-main">
      <div class="sh-top" style="background:${s('bg-3')};border-bottom:1px solid ${s('border')};color:${s('text-dim')}">Users › <b style="color:${s('text')}">rurutia</b></div>
      <div class="sh-body" style="background:${s('bg')}">
        <div class="sh-card" style="background:${s('bg-2')};border:1px solid ${s('border')}">
          <div style="color:${s('text')};font-weight:600">正文文字 AaBb 中文示例</div>
          <div style="color:${s('text-dim')};font-size:11px">暗淡说明文字 · 修改于 3 分钟前</div>
          <div style="color:${s('text-faint')};font-size:11px">最淡的占位提示</div>
        </div>
        <div class="sh-card" style="background:${s('bg-2')};border:1px solid ${s('border')}">
          <span class="sh-btn" style="background:${s('accent')};color:${s('accent-ink')}">主按钮</span>
          <span class="sh-tagchip" style="background:${s('accent-3')};color:${s('accent-3-ink')}">徽章</span>
          <span style="color:${s('accent-2-text')};font-size:11px">链接文字</span>
        </div>
      </div>
    </div>
  </div>`;
}

let cards = '';
for (const p of NEW.PALETTES.filter((x) => !x.dark)) {
  const po = OLD.PALETTES.find((x) => x.id === p.id);
  const vn = NEW.buildVars(p), vo = OLD.buildVars(po);
  const L = (h) => (NEW.relLum(h) * 100).toFixed(0) + '%';
  cards += `
  <section class="card">
    <h2>${p.name} <code>${p.id}</code></h2>
    <div class="pair">
      ${shell(vo, p.name, '旧（v2.8.1 亮度）', L(vo['--bg']))}
      ${shell(vn, p.name, '新（降亮度后）', L(vn['--bg']))}
    </div>
  </section>`;
}

const html = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rurutia 浅色皮肤亮度对比 · 旧 vs 新</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { background: #232227; color: #e8e8ee; font: 14px/1.6 -apple-system, "PingFang SC", sans-serif; padding: 28px clamp(16px, 4vw, 48px) 80px; }
  header { max-width: 1180px; margin: 0 auto 26px; }
  h1 { font-size: 20px; margin-bottom: 6px; }
  header p { color: #9a9aa8; font-size: 13px; max-width: 72ch; }
  .card { max-width: 1180px; margin: 0 auto 30px; }
  .card h2 { font-size: 14px; margin-bottom: 8px; font-weight: 600; }
  .card h2 code { color: #9a9aa8; font-size: 11px; margin-left: 6px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 860px) { .pair { grid-template-columns: 1fr; } }
  .shell { display: flex; border-radius: 10px; overflow: hidden; min-height: 210px; position: relative; border: 1px solid #00000022; }
  .shell-tag { position: absolute; top: 6px; right: 10px; font-size: 10.5px; color: #00000088; background: #ffffff55; padding: 1px 7px; border-radius: 99px; }
  .sh-side { width: 118px; flex: none; padding: 10px 9px; font-size: 11px; }
  .sh-brand { font-weight: 700; font-size: 12.5px; margin-bottom: 10px; }
  .sh-nav { font-size: 9.5px; letter-spacing: .06em; margin: 8px 0 3px; }
  .sh-item { padding: 3px 6px; border-radius: 6px; }
  .sh-item.act { font-weight: 600; }
  .sh-main { flex: 1; display: flex; flex-direction: column; }
  .sh-top { padding: 7px 12px; font-size: 11px; }
  .sh-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .sh-card { border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
  .sh-card:last-child { flex-direction: row; align-items: center; gap: 10px; }
  .sh-btn { font-size: 11px; padding: 4px 12px; border-radius: 7px; font-weight: 600; }
  .sh-tagchip { font-size: 10px; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
</style></head><body>
<header>
  <h1>浅色皮肤亮度对比 —— 旧 vs 新（9 套）</h1>
  <p>左边是 v2.8.1 的亮度（页面底 67–80%、内容面最高 85%，长时间盯着刺眼），右边是降亮度后
  （页面底压进 57–61%、最亮面 61–64%）。色相没动，皮肤还是那张脸，只是从「发光的白纸」换成「哑光的牛皮纸」。
  角标里的百分比是页面底的相对亮度。</p>
</header>
${cards}
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'light-brightness-preview.html'), html);
console.log('written: design-demos/light-brightness-preview.html');
