<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**Coding Agent 的驾驶舱 —— 基于 [FanBox](https://github.com/alchaincyf/fanbox) 的个人增强版**

指挥 Claude Code / Codex 在本地干活，看清它碰过的每个文件、改过的每一行，随时接手。
在此之上，Rurutia 重做了视觉、字体、配色，并让侧栏入口、用量面板、终端图标都更顺手。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#安装)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.1-blueviolet)](https://github.com/alchaincyf/fanbox)

</div>

---

## 这是什么

[FanBox](https://github.com/alchaincyf/fanbox)（作者：花叔）是一个本地运行的「Coding Agent 驾驶舱」：一边浏览 / 预览 / 编辑本地文件，一边在内嵌真实终端里跑 Claude Code、Codex 或任何 coding agent，agent 改了哪个文件就实时高亮——**找回文件 → 运行 agent → 看清改动**，全在一个窗口完成。零依赖后端、数据不出本机。

**Rurutia** 是我在 FanBox v2.3.1（`c93a486`）基础上做的**个人化改造**，核心能力完全来自 FanBox，我新增/重做了下面这些。完整的原始功能介绍见 [`README.fanbox.md`](README.fanbox.md)。

## Rurutia 改造了什么

#### 🎨 视觉与配色
- **18 套「色所」高级感配色皮肤**：新孟菲斯 / 酸性时尚 / 数字果冻 / 电路板 / 虚空 / 熔岩橙 / 深海核…… 点侧栏「皮肤」弹出色卡网格切换，默认「电子舞厅」。每套自动适配主界面、侧栏、终端、代码高亮。
- **整体 UI 现代化**：发丝边框、统一圆角节奏、悬浮胶囊式分段控件、强调色辉光、侧栏选中态、克制的过渡动效——全部跟随当前皮肤的强调色。

#### 🔤 字体
- **全局 Maple Mono CN**：界面、文件名、代码、终端统一等宽风，含**中文 + 日文假名**全字符（内嵌 woff2，离线可用）。

#### 🗂 侧栏更顺手
- **快速入口可增删**：➕ 把当前文件夹加入、悬停 ✕ 移除（默认项也能删），服务端持久化。
- **Agent 项目可增删**：手动添加置顶、隐藏不想看的（隐藏后扫描不再冒回）。

#### 📊 用量面板增强
- Claude Code 官方限额（5h 窗口 / 周配额）**恒显**：取到就给进度条，取不到写明原因（未订阅登录 / 网络受限 / 无窗口数据）+ 重试。
- **接近上限（≥85%）红色警告条 + 桌面通知**（节流不打扰），面板展开时自动刷新。

#### 🖥 终端 & 图标
- 终端顶栏 10 个动作按钮**全部重绘为单色矢量图标**（跟随主题色）；标签加高、宽度随文件名自适应。
- 自定义应用图标 + 侧栏 logo，应用更名 Rurutia。

## 安装

**macOS（Apple Silicon）**

1. 到 [Releases](../../releases) 下载 `Rurutia.app`（或自行构建，见下）。
2. 拖进「应用程序」。
3. 本机未签名构建，首次打开若提示「无法验证开发者」：右键 → **打开**，或终端执行
   ```bash
   xattr -dr com.apple.quarantine /Applications/Rurutia.app
   ```

## 从源码构建

```bash
npm install
npm run rebuild        # 把 node-pty 重编到 Electron 的 ABI
# 未签名本地构建：
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# 产物：dist/mac-arm64/Rurutia.app
```

> 用自己的 Apple 证书可去掉末尾两个参数并在 `package.json` 配 `identity`；要 `.dmg` 把 `--dir` 去掉。

## 改动如何组织（补丁式）

为了能跟随上游 FanBox 持续更新，改动尽量做成**追加式**：
- **新增文件**（不冲突）：`public/ui-patch.css`（全部 UI/字体）、`public/themes-patch.js`（18 套皮肤）、`public/vendor/fonts`、`public/vendor/icons`、`public/logo.png`。
- **编辑的上游文件**（少量）：`index.html`、`app.js`、`server.js`、`electron/main.js`、`package.json`。

详见 [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md)——含完整改动清单与「上游出新版后如何 `git rebase` 重新套用」的步骤。

## 致谢 & 许可

- 核心应用 **FanBox** 由 **花叔**（[alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)）开发，MIT 许可。Rurutia 是其个人增强分支，遵循同一 [MIT 许可](LICENSE)。
- 字体 **Maple Mono** 来自 [subframe7536/maple-font](https://github.com/subframe7536/maple-font)（OFL）。
- 配色灵感来自公众号「色所」的高级感配色合集。

> 数据不出本机；Rurutia 仅做本地文件 / agent 会话的可视化，不上传任何内容。
