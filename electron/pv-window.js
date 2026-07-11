'use strict';
/*
 * pv-window.js — 独立预览窗口（Rurutia 纯新增模块）
 * ------------------------------------------------------------------
 * 诉求：点开 MD 等可读文件不想被定死在主窗上方的内嵌面板里，
 *      要一个能随手拖走、看完 ⌘W 关掉的真·系统窗口。
 * 做法：pv:open → 弹（或复用）一个普通 BrowserWindow，加载同一套本地页面的
 *      纯预览模式 http://localhost:<port>/?pv=<路径>；渲染层 pv-patch.js 负责铺满预览。
 * 关键安全阀：webPreferences.additionalArguments 带 --rurutia-pv，
 *      preload 见参只暴露 fanboxEnv —— 预览窗按 web 版跑（web 版零桥本就全功能降级），
 *      pty/微信/录像等桥一律不给，绝不跟主窗抢终端数据路由。
 * main.js 只需一行接线：require('./pv-window').init(() => global.__rurutiaPort || PORT);
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let pvWin = null; // 单窗复用：再开别的文件就在同一窗里换内容，跟内嵌面板心智一致

const stateFile = () => path.join(app.getPath('userData'), 'pv-window-state.json');
function loadBounds() {
  try {
    const b = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (b && b.width > 300 && b.height > 200) return b;
  } catch { /* 首次无记忆 */ }
  return { width: 980, height: 760 };
}
function saveBounds() {
  if (!pvWin || pvWin.isDestroyed()) return;
  try { fs.writeFileSync(stateFile(), JSON.stringify(pvWin.getBounds())); } catch { /* */ }
}

function openPv(fp, getPort) {
  const url = `http://localhost:${getPort()}/?pv=${encodeURIComponent(fp)}`;
  if (pvWin && !pvWin.isDestroyed()) {
    pvWin.loadURL(url).catch(() => { /* */ });
    pvWin.show(); pvWin.focus();
    return;
  }
  const b = loadBounds();
  pvWin = new BrowserWindow({
    width: b.width, height: b.height, x: b.x, y: b.y,
    minWidth: 520, minHeight: 400,
    title: path.basename(fp),
    backgroundColor: '#0b0c0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: ['--rurutia-pv'],
    },
  });
  let bt = null;
  const remember = () => { clearTimeout(bt); bt = setTimeout(saveBounds, 400); };
  pvWin.on('resize', remember);
  pvWin.on('move', remember);
  pvWin.on('close', saveBounds); // 预览窗是真关（不像主窗红叉只藏 Dock）
  pvWin.on('closed', () => { pvWin = null; });
  pvWin.webContents.setWindowOpenHandler(({ url: u }) => {
    if (/^https?:/.test(u)) { shell.openExternal(u); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  pvWin.loadURL(url).catch(() => { /* */ });
}

function init(getPort) {
  ipcMain.handle('pv:open', (e, { path: fp } = {}) => {
    if (!fp || typeof fp !== 'string' || !fs.existsSync(fp)) return { ok: false, error: '文件不存在' };
    openPv(fp, getPort);
    return { ok: true };
  });
}

module.exports = { init };
