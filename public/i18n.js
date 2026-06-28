'use strict';
/**
 * FanBox i18n —— 集中式翻译层（多语言版）。
 * 中文（简体）是源语言；其余语言各有一个词典：
 *   · en   → window.FANBOX_DICT / FANBOX_DICT_RULES（i18n-dict.js，沿用历史结构）
 *   · 其它 → window.FANBOX_DICTS[code] = { dict, rules }（i18n-dict.<code>.js）
 * 非中文模式：MutationObserver 在微任务时机翻译新增/变更的文本节点和 title/placeholder，
 * 绘制前完成、无闪烁，app.js 不需要散布翻译调用。用户内容区（预览/编辑器/终端）一律不碰。
 * 语言选择器插在侧栏（紧跟「皮肤 / 提示符」），列出全部界面语言，切换写 localStorage +
 *   config.json（Electron 菜单读），刷新生效。
 */
(() => {
  const LANGS = [
    { code: 'zh',    name: '简体中文' },
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'en',    name: 'English' },
    { code: 'ja',    name: '日本語' },
    { code: 'ko',    name: '한국어' },
    { code: 'fr',    name: 'Français' },
    { code: 'es',    name: 'Español' },
  ];
  const CODES = LANGS.map((l) => l.code);
  const PICKER_LABEL = { zh: '语言', 'zh-TW': '語言', en: 'Language', ja: '言語', ko: '언어', fr: 'Langue', es: 'Idioma' };

  function systemDefault() {
    const s = (navigator.language || 'en').toLowerCase();
    if (s.startsWith('zh')) return /(tw|hk|mo|hant)/.test(s) ? 'zh-TW' : 'zh';
    for (const c of ['ja', 'ko', 'fr', 'es']) if (s.startsWith(c)) return c;
    return 'en';
  }
  let saved = null;
  try { saved = localStorage.getItem('fb_lang'); } catch (e) { /* */ }
  const lang = CODES.includes(saved) ? saved : systemDefault();
  window.fanboxLang = lang;
  window.fanboxLangs = LANGS;

  // 语言切换：记到 localStorage（渲染层）+ config.json（Electron 菜单读），刷新生效
  window.fanboxSetLang = (l) => {
    if (!CODES.includes(l)) return;
    try { localStorage.setItem('fb_lang', l); } catch (e) { /* */ }
    fetch('/api/lang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: l }) })
      .catch(() => {}).finally(() => location.reload());
  };

  /* ---------- 侧栏语言选择器（复用皮肤/提示符选择器的样式） ---------- */
  function buildPicker() {
    if (document.getElementById('lang-switch')) return;
    const themeHost = document.getElementById('theme-switch');
    const promptHost = document.getElementById('prompt-switch');
    const anchor = promptHost || themeHost;            // 排在「提示符」之后，没有就跟在「皮肤」后
    if (!anchor || !anchor.parentNode) return;

    const host = document.createElement('div');
    host.className = 'theme-switch';
    host.id = 'lang-switch';

    const label = document.createElement('div');
    label.className = 'theme-switch-label';
    label.textContent = PICKER_LABEL[lang] || 'Language';
    host.appendChild(label);

    const current = document.createElement('button');
    current.id = 'fbx-lang-current';
    current.className = 'fbx-skin-current';
    const cur = LANGS.find((l) => l.code === lang) || LANGS[0];
    current.innerHTML = '<span class="fbx-nm" style="flex:1;text-align:left;">' + cur.name + '</span><span class="fbx-caret">▾</span>';
    host.appendChild(current);

    const pop = document.createElement('div');
    pop.id = 'fbx-lang-pop';
    pop.className = 'fbx-skin-pop hidden';
    pop.style.gridTemplateColumns = '1fr';
    LANGS.forEach((l) => {
      const b = document.createElement('button');
      b.className = 'fbx-swatch' + (l.code === lang ? ' active' : '');
      b.innerHTML = '<span class="fbx-nm">' + l.name + '</span>';
      b.addEventListener('click', () => { if (l.code !== lang) window.fanboxSetLang(l.code); });
      pop.appendChild(b);
    });
    host.appendChild(pop);

    current.addEventListener('click', (ev) => { ev.stopPropagation(); pop.classList.toggle('hidden'); });
    document.addEventListener('click', (ev) => { if (!host.contains(ev.target)) pop.classList.add('hidden'); });

    anchor.parentNode.insertBefore(host, anchor.nextSibling);
  }
  // 旧的二元 #lang-toggle 开关被新选择器取代，藏掉
  const installPicker = () => {
    const old = document.getElementById('lang-toggle');
    if (old) old.style.display = 'none';
    // setTimeout 0：让 prompt-patch 先把 #prompt-switch 插好，语言选择器排在它后面
    setTimeout(buildPicker, 0);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPicker);
  else installPicker();

  /* ---------- 翻译层 ---------- */
  if (lang === 'zh') { window.t = (s) => s; return; }
  const reg = (lang === 'en')
    ? { dict: window.FANBOX_DICT || {}, rules: window.FANBOX_DICT_RULES || [] }
    : ((window.FANBOX_DICTS || {})[lang] || null);
  if (!reg) { window.t = (s) => s; document.documentElement.lang = lang; return; } // 词典缺失：回退显示中文源，不报错

  const HAN = /[㐀-鿿「」（）：；！？…·]/;
  const DICT = reg.dict || {}, RULES = reg.rules || [];
  const trOne = (core) => {
    const hit = DICT[core];
    if (hit !== undefined) return hit;
    for (const [re, rep] of RULES) {
      const m = core.match(re);
      if (m) {
        try { return typeof rep === 'function' ? rep(m) : rep; } catch { /* 规则异常不挡显示 */ }
      }
    }
    return null;
  };
  const tr = (s) => {
    if (!s || !HAN.test(s)) return s;
    const core = s.trim();
    const whole = trOne(core);
    if (whole !== null) return s.replace(core, whole);
    // 复合文案（「刚刚 · 12 条消息 · 改了 16 个文件」）整段匹配不上：按 · 分段逐段翻
    if (core.includes('·')) {
      const segs = core.split('·').map((x) => x.trim()).filter(Boolean);
      const parts = segs.map((x) => trOne(x) ?? x);
      if (parts.some((x, i) => x !== segs[i])) {
        const joined = parts.join(' · ') + (/·\s*$/.test(core) ? ' · ' : '');
        return s.replace(core, joined);
      }
    }
    return s;
  };
  window.t = tr;

  // 用户内容区不翻译：文件预览正文、三种编辑器、终端、灯箱、语言选择器（保留各语言本名）
  const SKIP = '#preview-body, #ed-host, .xterm, .milkdown, .lightbox, .cp-name, .cp-dir, #lang-switch';
  const ATTRS = ['title', 'placeholder'];
  const visit = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const p = node.parentElement;
      if (p && p.closest(SKIP)) return;
      const out = tr(node.nodeValue);
      if (out !== node.nodeValue) node.nodeValue = out;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || node.closest(SKIP)) return;
    for (const a of ATTRS) {
      const v = node.getAttribute(a);
      if (v) { const out = tr(v); if (out !== v) node.setAttribute(a, out); }
    }
    for (const c of [...node.childNodes]) visit(c);
  };
  const ob = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData' || m.type === 'attributes') visit(m.target.nodeType ? m.target : m.target);
      else m.addedNodes.forEach(visit);
    }
  });
  const start = () => {
    visit(document.body);
    ob.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.documentElement.lang = lang;
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
