'use strict';
/**
 * 安全桥接：把终端 IPC 暴露给渲染进程（contextIsolation 下唯一的通道）。
 * 渲染进程通过 window.fanboxPty 控制 node-pty，window.fanboxEnv 判断是否在桌面 app 内。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fanboxPty', {
  spawn: (opts) => ipcRenderer.invoke('pty:spawn', opts),
  input: (id, data) => ipcRenderer.send('pty:input', { id, data }),
  resize: (id, cols, rows) => ipcRenderer.send('pty:resize', { id, cols, rows }),
  kill: (id) => ipcRenderer.send('pty:kill', { id }),
  onData: (cb) => { const h = (e, m) => cb(m); ipcRenderer.on('pty:data', h); return () => ipcRenderer.removeListener('pty:data', h); },
  onExit: (cb) => { const h = (e, m) => cb(m); ipcRenderer.on('pty:exit', h); return () => ipcRenderer.removeListener('pty:exit', h); },
});

contextBridge.exposeInMainWorld('fanboxEnv', {
  isDesktopApp: true,
  platform: process.platform,
});
