'use strict';
/*
 * shot-hotkey.js — 截图直通车·热键版（Rurutia 纯新增模块）
 * ------------------------------------------------------------------
 * 诉求：跟终端里的 CC/Codex 聊天要发截图，不想「存桌面→拖进来」两步。
 * 链路：全局热键 → macOS 自带 screencapture 交互选区（不抢焦点）
 *      → 落盘到 userData/shots/（桌面从此干净）
 *      → 推 shot:insert 给渲染层，shot-patch.js 用 term.insertPath() 自动插进当前终端
 *      → 启动时 + 每 6 小时清一遍 48 小时前的旧图（CC 发送那一刻已把图读进对话，删原件不影响历史）。
 * 快捷键可设、最多两组：渲染层录入 → shot:keys-set → 重注册 + 持久化 userData/shot-hotkey.json。
 * main.js 只需一行接线（app ready 之后调用）：require('./shot-hotkey').init(() => win);
 */
const { app, globalShortcut, ipcMain, Notification, systemPreferences } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEFAULT_KEYS = ['Command+Shift+2']; // 挨着系统 ⌘⇧3/4/5 一家子，好记
const MAX_KEYS = 2;
const KEEP_MS = 48 * 3600e3;   // 截图保留 48 小时
const SWEEP_MS = 6 * 3600e3;   // 每 6 小时清一次

const shotsDir = () => path.join(app.getPath('userData'), 'shots');
const cfgFile = () => path.join(app.getPath('userData'), 'shot-hotkey.json');

let keys = [];        // 当前已注册成功的组合键
let busy = false;     // 选区进行中，别叠加第二张
let hinted = false;   // 权限指引通知只弹一次

function loadKeys() {
  try {
    const j = JSON.parse(fs.readFileSync(cfgFile(), 'utf8'));
    if (Array.isArray(j.keys)) return j.keys.filter((k) => typeof k === 'string' && k).slice(0, MAX_KEYS);
  } catch { /* 首次运行无配置 */ }
  return DEFAULT_KEYS.slice();
}
function saveKeys(list) {
  try { fs.writeFileSync(cfgFile(), JSON.stringify({ keys: list })); } catch { /* */ }
}

function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function capture(getWin) {
  if (busy) return;
  const dir = shotsDir();
  try { fs.mkdirSync(dir, { recursive: true }); } catch { return; }
  const file = path.join(dir, `直通截图-${stamp()}.png`);
  busy = true;
  // -i 交互式选区（空格可切整窗），Esc 取消则不产文件；写完盘进程才退出
  const p = spawn('/usr/sbin/screencapture', ['-i', file]);
  p.on('error', () => { busy = false; });
  p.on('exit', () => {
    busy = false;
    fs.stat(file, (err, st) => {
      if (err || !st.isFile() || st.size < 100) { maybeHintPermission(); return; }
      const win = getWin();
      if (!win || win.isDestroyed()) return;
      win.webContents.send('shot:insert', { path: file, name: path.basename(file), size: st.size });
      // 在别的 app 里按的热键：把窗口拉回前台，插入结果看得见
      try { app.focus({ steal: true }); win.show(); win.focus(); } catch { /* */ }
    });
  });
}

function maybeHintPermission() {
  // 没出文件通常只是按了 Esc；但屏幕录制权限没给时选区根本弹不出来 → 给一次性指引
  try {
    if (systemPreferences.getMediaAccessStatus('screen') === 'granted' || hinted) return;
    hinted = true;
    new Notification({
      title: '截图直通车需要授权',
      body: '系统设置 → 隐私与安全性 → 屏幕录制 里勾选 Rurutia，然后再按一次快捷键',
    }).show();
  } catch { /* */ }
}

// 只认渲染层录入面板生成的形态：修饰键(Command/Control/Alt/Shift) + 单个主键
const ACC_RE = /^((Command|Control|Alt|Shift)\+)+([A-Z0-9]|F\d{1,2}|Space|Up|Down|Left|Right|`|-|=)$/;

function registerAll(list, getWin) {
  try { globalShortcut.unregisterAll(); } catch { /* */ }
  const result = [];
  keys = [];
  for (const k of list.slice(0, MAX_KEYS)) {
    if (!ACC_RE.test(k)) { result.push({ key: k, ok: false, error: '格式不认识' }); continue; }
    let ok = false;
    try { ok = globalShortcut.register(k, () => capture(getWin)); } catch { ok = false; }
    if (ok) keys.push(k);
    result.push({ key: k, ok, error: ok ? null : '被其他应用占用' });
  }
  return result;
}

function sweep() {
  const dir = shotsDir();
  fs.readdir(dir, (err, names) => {
    if (err) return;
    const cut = Date.now() - KEEP_MS;
    for (const n of names) {
      if (!/\.png$/i.test(n)) continue;
      const fp = path.join(dir, n);
      fs.stat(fp, (e, st) => { if (!e && st.isFile() && st.mtimeMs < cut) fs.unlink(fp, () => { /* */ }); });
    }
  });
}

function init(getWin) {
  if (process.platform !== 'darwin') return;
  const r = registerAll(loadKeys(), getWin);
  for (const x of r) if (!x.ok) console.log(`[shot] 快捷键 ${x.key} 注册失败：${x.error}`);
  sweep();
  setInterval(sweep, SWEEP_MS);
  app.on('will-quit', () => { try { globalShortcut.unregisterAll(); } catch { /* */ } });

  ipcMain.handle('shot:keys-get', () => ({ ok: true, keys: loadKeys(), active: keys }));
  ipcMain.handle('shot:keys-set', (e, { keys: list } = {}) => {
    if (!Array.isArray(list)) return { ok: false, error: '参数不对' };
    const clean = list.filter((k) => typeof k === 'string' && k).slice(0, MAX_KEYS);
    const result = registerAll(clean.length ? clean : DEFAULT_KEYS.slice(), getWin);
    saveKeys(clean.length ? clean : DEFAULT_KEYS.slice());
    return { ok: result.every((x) => x.ok), result };
  });
  ipcMain.handle('shot:capture', () => { capture(getWin); return { ok: true }; });
}

module.exports = { init };
