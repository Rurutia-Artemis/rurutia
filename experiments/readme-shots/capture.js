// README 实拍截图（一条命令重拍全套）。
//   node experiments/readme-shots/capture.js
// Playwright 驱动 Electron，用一个「假 HOME」（含编造的演示项目 + Claude/Codex 会话日志，
// 全是假数据、绝不含真实收藏/项目/用量），拍出：
//   docs/screenshots/overview.png  深+浅并列总览
//   docs/screenshots/terminal.png  彩虹标签 + 品牌图标工具栏 + powerline 提示符
//   docs/screenshots/prompt.png    提示符选择器（16 套主题 + 5 修饰）
//   docs/screenshots/sidebar.png   侧栏（快速入口 / Agent 项目 / 用量）
//   docs/screenshots/skins.png     18 套皮肤 3×6 拼图
// 依赖：playwright-core（npm i -D playwright-core）。仅 macOS。
'use strict';
const { _electron } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'docs/screenshots');
// 用 /tmp 而不是 os.tmpdir()：后者在 macOS 是 /var/folders/.../T，面包屑会显示一长串乱码路径。
const HOME = '/tmp/rurutia-shot-home';
const TILES = path.join(os.tmpdir(), 'rurutia-shot-tiles');
const DOCS = path.join(HOME, 'Documents');
const W = 1560, H = 950;
const NOW = Date.now();
const sleep = (p, ms) => p.waitForTimeout(ms);
const iso = (age) => new Date(NOW - age).toISOString();

const SKINS = [
  ['memphis', '新孟菲斯'], ['museum', '现代博物'], ['acid', '酸性时尚'],
  ['future', '未来社区'], ['tropical', '热带运动'], ['disco', '电子舞厅'],
  ['rowing', '赛艇俱乐部'], ['glass', '玻璃城市'], ['jelly', '数字果冻'],
  ['grid', '电路板'], ['pixel', '像素光'], ['axis', '工业轴'],
  ['void', '虚空'], ['mode', '霓虹夜'], ['unit', '电光紫'],
  ['flux', '熔岩橙'], ['core', '深海核'], ['form', '翡翠林'],
];

function seedHome() {
  for (const d of ['.claude', '.codex']) fs.rmSync(path.join(HOME, d), { recursive: true, force: true });
  const w = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };
  const touch = (p, age) => { const t = new Date(NOW - age); try { fs.utimesSync(p, t, t); } catch (e) {} };
  for (const d of ['Desktop', 'Documents', 'Downloads', 'Library', 'Movies', 'Music', 'Pictures', 'Public']) fs.mkdirSync(path.join(HOME, d), { recursive: true });
  const node = (n) => JSON.stringify({ name: n, version: '0.1.0', private: true }, null, 2);
  w(path.join(DOCS, 'aurora-web/index.html'), '<!doctype html><title>Aurora</title>');
  w(path.join(DOCS, 'aurora-web/style.css'), 'body{font-family:system-ui}');
  w(path.join(DOCS, 'pixel-notes/package.json'), node('pixel-notes'));
  w(path.join(DOCS, 'vecsearch-rs/Cargo.toml'), '[package]\nname = "vecsearch"');
  w(path.join(DOCS, 'vecsearch-rs/src/main.rs'), 'fn main(){}');
  w(path.join(DOCS, 'tide-api/go.mod'), 'module tide-api\n\ngo 1.22');
  w(path.join(DOCS, 'pandas-lab/requirements.txt'), 'pandas\nnumpy');
  w(path.join(DOCS, 'pandas-lab/main.py'), 'import pandas as pd');
  w(path.join(DOCS, 'prompt-kit/package.json'), node('prompt-kit'));
  w(path.join(DOCS, 'starfield/index.html'), '<!doctype html><title>Starfield</title>');
  w(path.join(DOCS, 'mono-ui/package.json'), node('mono-ui'));
  w(path.join(DOCS, 'data-viz/pyproject.toml'), '[project]\nname = "data-viz"');
  w(path.join(DOCS, 'docs-site/index.html'), '<!doctype html><title>Docs</title>');
  w(path.join(DOCS, 'README.md'), '# Workspace');
  w(path.join(DOCS, 'roadmap.md'), '# Roadmap');
  // demo Claude sessions (fabricated): AGENT-projects list + project memory + usage
  const uuid = () => crypto.randomUUID();
  const sess = [
    ['aurora-web', '给落地页加一个深色模式切换，按钮放右上角', 10 * 60e3, ['index.html', 'style.css', 'theme.js']],
    ['prompt-kit', '重构提示词模板，抽出多语言占位符', 42 * 60e3, ['render.ts', 'locales.json']],
    ['vecsearch-rs', '向量检索加增量索引，避免每次全量重建', 3 * 3600e3, ['src/main.rs', 'src/index.rs']],
    ['pandas-lab', '清洗销量数据并画一张相关性热力图', 7 * 3600e3, ['main.py', 'clean.py']],
    ['tide-api', '给 API 加基于令牌桶的限流中间件', 26 * 3600e3, ['main.go', 'middleware/ratelimit.go']],
    ['pixel-notes', '把笔记列表改成虚拟滚动，长列表不再卡', 50 * 3600e3, ['index.js', 'list.js']],
  ];
  const model = 'claude-opus-4-8';
  for (const [folder, title, age, files] of sess) {
    const cwd = path.join(DOCS, folder);
    const dir = path.join(HOME, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'));
    const lines = [JSON.stringify({ type: 'user', cwd, timestamp: iso(age + 30 * 60e3), message: { role: 'user', content: title } })];
    files.forEach((f, i) => lines.push(JSON.stringify({ type: 'assistant', cwd, timestamp: iso(age + (files.length - i) * 4 * 60e3),
      message: { id: 'msg_' + uuid().slice(0, 8), model, role: 'assistant', content: [{ type: 'tool_use', name: i % 2 ? 'Edit' : 'Write', input: { file_path: path.join(cwd, f) } }],
        usage: { input_tokens: 900 + i * 120, output_tokens: 500 + i * 80, cache_creation_input_tokens: 2600, cache_read_input_tokens: 18000 + i * 1500 } } })));
    const fp = path.join(dir, uuid() + '.jsonl');
    w(fp, lines.join('\n') + '\n'); touch(fp, age);
  }
  // demo Codex session (fabricated rate_limits) -> official 5h/周配额 bars + plan badge
  const cfp = path.join(HOME, '.codex', 'sessions', '2026', '06', '28', 'rollout-' + uuid() + '.jsonl');
  w(cfp, [
    JSON.stringify({ type: 'session_meta', timestamp: iso(20 * 60e3), payload: { id: uuid(), cwd: path.join(DOCS, 'mono-ui') } }),
    JSON.stringify({ type: 'event_msg', timestamp: iso(12 * 60e3), payload: { type: 'token_count', rate_limits: { plan_type: 'pro_20x',
      primary: { used_percent: 4, window_minutes: 300, resets_in_seconds: 13980 }, secondary: { used_percent: 11, window_minutes: 10080, resets_in_seconds: 402300 } } } }),
  ].join('\n') + '\n'); touch(cfp, 12 * 60e3);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TILES, { recursive: true });
  seedHome();
  const app = await _electron.launch({ args: [ROOT], cwd: ROOT, env: { ...process.env, HOME, FANBOX_PORT: '4651' } });
  const win = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }, s) => { const w = BrowserWindow.getAllWindows()[0]; w.setSize(s.W, s.H); w.center(); }, { W, H });
  await sleep(win, 2600);
  const clean = () => win.evaluate(() => {
    localStorage.setItem('fb_guided', '1');
    document.querySelectorAll('.guide-overlay').forEach((e) => e.remove());
    document.querySelectorAll('[class*="tip"],[class*="hint"],[class*="toast"],[class*="guide"]').forEach((e) => {
      const t = (e.textContent || '').trim();
      if (/拖进终端|提示[:：]|拖拽/.test(t) && e.getBoundingClientRect().bottom > window.innerHeight - 220) e.remove();
    });
  });
  const setSkin = (id) => win.evaluate((s) => { try { window.applyTheme(s); } catch (e) {} }, id);
  const nav = (p) => win.evaluate((x) => { try { navigate(x); } catch (e) {} }, p);
  await clean(); await nav(DOCS); await sleep(win, 900); await nav(DOCS); await sleep(win, 1100); await clean();

  // overview tiles
  for (const id of ['pixel', 'jelly']) { await setSkin(id); await sleep(win, 700); await clean(); await win.screenshot({ path: path.join(TILES, 'ov-' + id + '.png') }); }

  // sidebar
  await setSkin('pixel'); await sleep(win, 500); await clean();
  try { await win.locator('#sidebar').first().screenshot({ path: path.join(OUT, 'sidebar.png') }); }
  catch (e) { await win.screenshot({ path: path.join(OUT, 'sidebar.png'), clip: { x: 0, y: 0, width: 360, height: H } }); }

  // terminal: rainbow tabs + brand toolbar + powerline
  await win.evaluate(() => { try { term.setDock && term.setDock('right'); } catch (e) {} });
  await win.evaluate(() => { try { (term.open ? term.open() : document.querySelector('#btn-terminal')?.click()); } catch (e) {} });
  await sleep(win, 1800);
  for (const d of ['aurora-web', 'vecsearch-rs', 'pandas-lab', 'tide-api']) { await win.evaluate((p) => { try { term.openInDir && term.openInDir(p); } catch (e) {} }, path.join(DOCS, d)); await sleep(win, 850); }
  await win.evaluate(() => { try { window.fanboxPty.input(term.active, 'ls\r'); } catch (e) {} });
  await sleep(win, 1000); await clean();
  await win.screenshot({ path: path.join(OUT, 'terminal.png') });

  // prompt: float the 提示符 picker fully into view
  await win.evaluate(() => {
    document.getElementById('fbx-prompt-current')?.click();
    const pop = document.getElementById('fbx-prompt-pop');
    if (pop) { pop.classList.remove('hidden'); Object.assign(pop.style, { position: 'fixed', left: '22px', bottom: '20px', top: 'auto', width: '328px', maxHeight: '88vh', overflow: 'auto', zIndex: '99999', boxShadow: '0 24px 60px rgba(0,0,0,.55)' }); }
  });
  await sleep(win, 700);
  await win.screenshot({ path: path.join(OUT, 'prompt.png') });
  await win.evaluate(() => { try { term.close ? term.close() : (term.toggle && term.toggle()); } catch (e) {} });
  await sleep(win, 700);

  // 18 skin tiles
  await nav(DOCS); await sleep(win, 700);
  for (const [id] of SKINS) { await setSkin(id); await sleep(win, 650); await clean(); await win.screenshot({ path: path.join(TILES, 'skin-' + id + '.png') }); }

  // montages via a hidden window (fullPage beats screen-size clamp)
  const url = (p) => 'file://' + p;
  async function montage(html, outPath) {
    const f = path.join(TILES, 'm.html'); fs.writeFileSync(f, html);
    await app.evaluate(({ BrowserWindow }, file) => { const m = new BrowserWindow({ width: 1400, height: 900, show: false, webPreferences: { webSecurity: false } }); m.loadFile(file); }, f);
    const page = await app.waitForEvent('window');
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForTimeout(1400);
    await page.screenshot({ path: outPath, fullPage: true });
    await page.evaluate(() => window.close()).catch(() => {});
  }
  const ovHtml = `<!doctype html><meta charset=utf8><style>html,body{margin:0;background:#0b0c0a}.row{display:flex;width:max-content}img{width:${W}px;height:${H}px;display:block}.d{width:2px;background:#000}</style><div class=row><img src="${url(path.join(TILES, 'ov-pixel.png'))}"><div class=d></div><img src="${url(path.join(TILES, 'ov-jelly.png'))}"></div>`;
  const TW = 600, TH = Math.round(H / W * TW);
  const tile = (id, n) => `<figure><img src="${url(path.join(TILES, 'skin-' + id + '.png'))}"><figcaption>${n}</figcaption></figure>`;
  const skinsHtml = `<!doctype html><meta charset=utf8><style>html,body{margin:0;background:#0b0c0a;font-family:-apple-system,"PingFang SC",sans-serif}.grid{display:grid;grid-template-columns:repeat(3,${TW}px);gap:14px;padding:14px;width:max-content}figure{margin:0;position:relative}img{width:${TW}px;height:${TH}px;display:block;border-radius:8px;border:1px solid #222}figcaption{position:absolute;left:10px;top:8px;background:rgba(0,0,0,.6);color:#fff;font-size:15px;font-weight:600;padding:3px 10px;border-radius:6px}</style><div class=grid>${SKINS.map(([id, n]) => tile(id, n)).join('')}</div>`;
  await montage(ovHtml, path.join(OUT, 'overview.png'));
  await montage(skinsHtml, path.join(OUT, 'skins.png'));

  await app.close();
  console.log('done -> docs/screenshots/{overview,terminal,prompt,sidebar,skins}.png');
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
