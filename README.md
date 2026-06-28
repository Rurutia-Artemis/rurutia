<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**Coding Agent 的驾驶舱 —— 基于 [FanBox](https://github.com/alchaincyf/fanbox) 的个人增强版**

指挥 Claude Code / Codex 在本地干活，看清它碰过的每个文件、改过的每一行，随时接手。<br>
在此之上，Rurutia 重做了视觉与字体，加了 **18 套配色皮肤**、**自带 Starship 的终端提示符**、**终端品牌图标工具栏**，把侧栏入口、用量面板、交互细节都打磨得更顺手。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#安装)
[![Signed](https://img.shields.io/badge/已签名-Developer%20ID%20%2B%20公证-success?logo=apple)](#安装)
[![Version](https://img.shields.io/badge/版本-v2.7.2-ff3d8b)](../../releases)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.3-blueviolet)](https://github.com/alchaincyf/fanbox)

**简体中文** · [繁體中文](README.zh-TW.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Español](README.es.md)

</div>

---

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Rurutia 主界面：左侧栏 · 中间文件网格 · 右内嵌终端，深浅两套皮肤并列" width="100%">
</p>
<p align="center"><sub>▲ 主界面总览 —— 同一界面、左深「像素光」右浅「数字果冻」。文件网格带强色项目徽章，侧栏汇总 Agent 项目与官方用量。</sub></p>

---

## 目录

- [这是什么](#这是什么)
- [30 秒看懂](#30-秒看懂)
- [原版 FanBox 能做什么（完整功能）](#原版-fanbox-能做什么完整功能)
- [Rurutia 改造了什么](#rurutia-改造了什么)：18 套皮肤 · 终端提示符 · 品牌图标 + 彩虹标签 · 侧栏
- [安装](#安装)
- [从源码构建](#从源码构建)
- [改动如何组织（补丁式）](#改动如何组织补丁式)
- [隐私与安全](#隐私与安全)
- [技术架构](#技术架构)
- [致谢 & 许可](#致谢--许可)

---

## 这是什么

[**FanBox**](https://github.com/alchaincyf/fanbox)（作者：[花叔](https://github.com/alchaincyf)）是一个本地运行的「**Coding Agent 驾驶舱**」：一边浏览 / 预览 / 编辑本地文件，一边在内嵌真实终端里跑 Claude Code、Codex 或任何 coding agent，agent 改了哪个文件就实时高亮——**找回文件 → 运行 agent → 看清改动**，全在一个窗口完成。零依赖后端、数据不出本机。

> *"AI 帮你一个下午起十个项目，然后它们就再也找不到了。FanBox 帮你把它们找回来。"*

**Rurutia** 是我在 FanBox v2.3.1（`c93a486`）基础上做的**个人化改造**：核心能力 100% 来自 FanBox，我重做了视觉 / 字体 / 配色，加了一整套皮肤与终端提示符系统，并打磨了几十处日常顺手度。下面先讲清**原项目的完整功能**，再讲**我具体改了什么**。

---

## 30 秒看懂

| 你想做的事 | 在 Rurutia 里 |
|---|---|
| 找回一个下午乱起的十个项目 | `⌘K` 全局模糊搜索 · 文件夹标 node/web/py/rs/go 徽章一眼认出类型 |
| 让 agent 干活、还能看清它改了啥 | 内嵌真实终端跑 Claude Code / Codex；它写哪个文件，那张卡片当场发光、预览实时跟随 |
| 续上昨天的会话 | 点开项目看历史会话，「▶ 续上」一键 `claude --resume` / `codex resume` 接回上下文 |
| 盯住官方用量别超额 | 侧栏常显 Claude / Codex 的 5h 窗口 + 周配额，接近上限红条 + 桌面通知 |
| 让整个界面随心情换装 | 18 套配色皮肤 + 16 套终端提示符主题，UI / 终端 / 代码高亮一起变 |

---

## 原版 FanBox 能做什么（完整功能）

> 这部分是 FanBox 本身的能力，Rurutia 完整保留。原始英文版说明见 [`README.fanbox.md`](README.fanbox.md)。

### 🗂 文件 · 找回与预览
- **⌘K 全局模糊搜索**：记得名字片段就行；`⌘↵` 用编辑器整包打开项目；`内容:关键词` 切全文搜索。
- **强色实体图标**：每种文件「长得像它自己」——PDF 红、JS 黄、Markdown 蓝；照片视频按真实比例呈现。
- **原地预览**：Markdown 渲染、HTML 实时成品、代码语法高亮、图片/视频/PDF 内嵌（含 HEIC）、压缩包内容清单、透明图棋盘格垫底。
- **缩略图加速**：大文件夹滚动和点击都在 0.1 秒内。
- **项目徽章**：文件夹卡片标 node / web / py / rs / go，一下午起的十个项目一眼认出类型。

### 👀 看 agent 改了什么
- **活的仪表盘**：agent 每写一个文件，那张卡片当场荡开涟漪、按改动频率发光呼吸，agent 写到哪光走到哪。
- **跟随模式**：一键让文件视图 + 预览跟踪 agent 正在编辑的文件——代码随新写行高亮闪烁，HTML 边写边实时渲染（双缓冲、零白闪），Markdown 实时渲染。任何手动浏览立即把控制权交还给你。
- **会话回放**：像刷视频一样拖时间轴，重现这段时间 agent 一步步改了哪些文件。
- **变更收件箱**：跨多个项目汇总本会话所有被改动的文件。
- **Git 改动 diff**：Monaco 只读 DiffEditor 并排展示 HEAD vs 当前工作区。

### 🤖 Agent 驾驶舱
- **项目记忆**：点开任何项目文件夹，看 AI 在这里干过什么——历史会话（你的第一句话当标题）、每次会话改过的文件、触发过的 skill；「▶ 续上」一键在内嵌终端 `claude --resume` / `codex resume` 接回上下文。
- **截图直通车**：系统截屏落盘即浮出直通卡——喂给终端里的 agent、收进项目 `素材/`、或先标注再发。
- **AI 整理**：AI 只看元数据出整理提案（不读内容、不碰文件系统），逐条过人后执行 + 写回滚日志、一键整体撤销。
- **发版向导**：node 项目一键串起版本号、CHANGELOG、打包、推送、GitHub Release。
- **Skills 透视**：本机全部 agent skills 一个视图——触发统计、健康检查、context 预算、不删文件的启停开关。
- **Agent 用量**：Claude Code 官方 5h 窗口/周配额（和 `/usage` 同源）+ 本地 token 统计；Codex 限额快照。
- **磁盘占用透视**：`du` 口径的真实占用条形榜，可下钻。

### 🖥 终端 · 指挥 agent
- **真实内嵌终端**：node-pty + xterm.js（WebGL 渲染），跑 Claude Code / vim / htop 不花屏，中文宽字符正确。
- **拖文件进终端**：从文件列表拖文件/文件夹进终端，自动插入路径喂给 agent 当上下文。
- **路径可点击**：终端里出现的文件路径直接点开（带空格的截屏名、中文名、折行长路径都能识别）。
- **选中即甩给终端**：预览里选一段文字，一键以「文件出处 + 围栏」格式发进终端。
- **态势感知**：标签圆点显示 agent 运行/空闲/退出；轮到你时终端边缘呼吸提示，长任务完成发系统通知。

### ✍️ 编辑 · 所见即所得
- **Markdown**：Milkdown Crepe 提供 Notion 式所见即所得，停笔 0.8 秒自动保存。
- **代码/JSON**：Monaco 编辑器（VS Code 同款内核）。
- **图片标注**：画笔/箭头/文字/打码、格式转换、压缩、调分辨率。
- **未保存守卫**：三种编辑器统一拦截未保存退出。

---

## Rurutia 改造了什么

> 核心能力完全来自 FanBox，下面是我新增 / 重做的部分。整体围绕四件事：**好看**、**好认**、**好用的终端**、**少打扰**。

### 🎨 18 套配色皮肤（多强调色系统）

点侧栏「皮肤」弹出色卡网格切换，默认「像素光」。每套是「**中性底 + 3 个并列强调色**（主：按钮/活动态 · 次：分区标题与链接 · 跳：徽章）+ 一组语义状态色」——颜色更跳，又靠角色分工保持协调。正文 / 强调色 / 徽章字 / 终端 16 ANSI **全部过 WCAG 对比度校验**；每套自动适配主界面、侧栏、终端配色、代码高亮，连 Monaco 编辑器底色也跟着同色温走。

灵感来自公众号「色所」的高级感配色合集：新孟菲斯 / 酸性时尚 / 数字果冻 / 电路板 / 虚空 / 熔岩橙 / 深海核……9 浅 9 深，共 18 套。

<p align="center">
  <img src="docs/screenshots/skins.png" alt="18 套配色皮肤总览：9 浅 9 深，每套自动适配 UI / 终端 / 代码高亮" width="100%">
</p>
<p align="center"><sub>▲ 18 套皮肤总览（9 浅 9 深）。切一下，主界面 / 侧栏 / 终端配色 / 代码高亮一起换。</sub></p>

整体 UI 也做了现代化：发丝边框、统一圆角节奏、悬浮胶囊式分段控件、强调色辉光、侧栏选中态、克制的过渡动效——全部跟随当前皮肤的强调色。界面、文件名、代码、终端统一用 **Maple Mono CN**（含中文 + 日文假名全字符，内嵌 woff2，离线可用）。

### 🚀 终端提示符（自带 Starship · 16 套主题）

**开箱即用的 powerline 提示符**：内置已签名公证的 starship + Nerd Font 图标字，装完打开终端就是 powerline 药丸（目录 / git 状态 / 语言版本 / ♥ 时间），**不用自己装 starship、不用配 `~/.zshrc`**。

走 ZDOTDIR 注入：先 source 你真实的 dotfile（PATH / 别名分毫不差，`claude` / `codex` 照样找得到），再叠加 starship——**只在本 App 终端生效、不碰任何 dotfile、卸载零残留**。仅 macOS + zsh。

<p align="center">
  <img src="docs/screenshots/prompt.png" alt="终端提示符选择器：16 套整套主题（带迷你 powerline 预览）+ 5 个可叠加修饰" width="100%">
</p>
<p align="center"><sub>▲ 侧栏「提示符」选择器：整套主题选一个，叠加修饰可多选；切换即时生效，正在跑的终端按回车就变样。</sub></p>

- **16 套提示符主题（独立于皮肤）**：药丸·摩卡 / 帕斯特尔 / 东京夜 / Gruvbox 彩虹 / Nord 极地 / Dracula / Rosé Pine / Everforest / Kanagawa / 拿铁浅色 / 扁平彩字 / Jetpack 座舱 / Pure 简约 / 极简单行 / 两行 / 纯文本。
- **5 个可叠加修饰（可多选并行）**：隐藏语言版本 / 纯文本符号·去图标 / 关时间 / 关命令耗时 / 去前导空行。
- **每套皮肤独立终端配色**：终端背景 / 光标 / 选区 + 16 ANSI 全按皮肤推导；浅色皮肤的彩字也压到对比 ≥ 3.5，不再糊进浅底。

### 🖥 终端 · 品牌图标 + 彩虹标签

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="终端：彩虹色项目标签 + Claude/OpenAI/Codex/微信 品牌图标工具栏 + powerline 提示符" width="100%">
</p>
<p align="center"><sub>▲ 内嵌终端：标签按项目黄金角配色（彩虹），顶栏一排官方品牌图标可直接启动 Claude / Codex / 微信，提示符是自带的 starship powerline。</sub></p>

- **品牌图标工具栏**：Claude Code / Codex / 微信 等启动入口换成**官方品牌矢量图标**，顶栏一排一目了然；其余动作按钮（预览跟随 / 新标签 / 全屏 / 切换 dock / 静音…）全部重绘为跟随主题色的单色矢量图标。
- **彩虹标签**：每个终端标签按项目用黄金角取色，多项目并排时自动错开成一道彩虹，一眼分得清哪个终端在哪个项目；标签加高、宽度随文件名自适应，可弹性拖拽换位（越过相邻标签即实时让位）。
- **「普通终端」按钮**：Claude Code / Codex 旁一键在当前文件夹开个干净 shell（不带 agent）。
- **独立圆角终端卡**：头部导航栏圆弧上沿，背景跟随当前皮肤底色融入整体（深色皮肤下不再是突兀的纯黑方块），浅色皮肤下活动标签改成淡染、去掉多余的底部色条。

### 🗂 侧栏 · 入口与 Agent 项目可增删

<p align="center">
  <img src="docs/screenshots/sidebar.png" alt="侧栏：快速入口 / 收藏 / Agent 项目，可增删与拖拽排序 + 官方用量面板" width="34%">
</p>
<p align="center"><sub>▲ 侧栏：快速入口 / 收藏 / Agent 项目，可拖拽增删与排序；底部 Agent 用量面板常显官方限额。</sub></p>

- **快速入口可增删**：➕ 把当前文件夹加入、悬停 ✕ 移除（默认项也能删），服务端持久化。
- **Agent 项目可增删**：手动添加置顶、隐藏不想看的（隐藏后扫描不再冒回）；也能从列表拖进「收藏 / 快速入口」，或在列表内上下拖动自定义排序（顺序持久化）。
- **用量面板增强**：Claude Code 官方限额（5h 窗口 / 周配额）**恒显**——取到就给进度条，取不到写明原因（未订阅登录 / 网络受限 / 无窗口数据）+ 重试；接近上限（≥85%）**红色警告条 + 桌面通知**（节流不打扰），面板展开时自动刷新。官方限额接口有严格速率限制，改为 10 分钟缓存 + 限流时沿用上次数据，不再因偶发限流就显示「无数据」。

### 其余打磨

- **点红色 ✕ = 隐藏窗口（macOS）**：不再销毁窗口杀掉终端，点 Dock 原样唤回（终端 / 状态都在），⌘Q 才是真退。
- **窗口顶部整条留白可拖拽**：不再只能抓品牌区一角；左上角交通灯留足避让、不与 logo 重叠。
- **滚动条重做**：细圆、跟随强调色，轨道两端缩进避开圆角卡的圆角，不再凸出。
- **标签自定义光标**：终端标签区用跟随皮肤强调色的小箭头光标。
- **自动端口顺延**：默认 4567 被占用时自动换到下一对空端口，多实例不再冲突。
- **自定义应用图标 + 侧栏 logo**，应用更名 Rurutia。

### 🌐 界面语言（7 国）

- 应用内界面语言从「中 / 英」扩到 **7 种**：简体中文 / 繁體中文 / English / 日本語 / 한국어 / Français / Español。侧栏新增「语言」选择器，列表里点母语名即切换；用户内容区（预览 / 编辑器 / 终端）不翻译。

---

## 安装

**macOS（Apple Silicon / arm64）**

1. 到 [**Releases**](../../releases) 下载最新 `Rurutia-*.dmg`。
2. 打开 dmg，把 **Rurutia** 拖进「应用程序」。
3. 双击打开即可使用。

> ✅ 本版已用 **Apple Developer ID 证书签名 + Apple 公证（notarization）+ hardened runtime**——从 Releases 下载后**双击直接安装使用**，不会弹「无法验证开发者」，无需任何额外操作。

---

## 从源码构建

```bash
npm install
npm run rebuild        # 把 node-pty 重编到 Electron 的 ABI

# 未签名本地构建（最简单，自己用）：
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# 产物：dist/mac-arm64/Rurutia.app
```

---

## 改动如何组织（补丁式）

为了能跟随上游 FanBox 持续更新，改动尽量做成**追加式**，方便每次出新版后 `git rebase` 重新套用：

- **新增文件**（不冲突）：`public/ui-patch.css` + `public/soft-patch.css`（全部 UI/字体）、`public/themes-patch.js`（18 套皮肤）、`public/prompt-patch.js`（终端提示符选择器）、`public/vendor/fonts/maple/*`、`public/vendor/icons/`、`vendor/starship/*`、`public/logo.png`、`public/favicon.png`。
- **编辑的上游文件**（少量、需留意）：`public/index.html`、`public/app.js`、`server.js`、`electron/main.js`、`package.json` + `build/icon*`。

完整改动清单 + 「上游出新版后如何重新套用」的步骤见 [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md)。

---

## 隐私与安全

> 与上游 FanBox 一致，Rurutia 不改变其安全模型。

- 后端只在本机回环地址监听 + 校验 Host 头（挡 DNS rebinding），**数据不出本机**。
- 全部前端资源（含渲染器、字体、starship 二进制）本地内置，**离线完全可用**。仅有的出网请求：Claude / Codex 用量接口（可选）和 GitHub 更新检查。
- HTML 预览在隔离 origin 的沙箱 iframe 里渲染，碰不到终端能力。
- 终端提示符走 ZDOTDIR 注入，**不写、不改你的任何 dotfile**，卸载零残留。
- 配置走原子写（temp + fsync + rename），不丢数据；删除走系统废纸篓（可恢复）。

---

## 技术架构

| 层 | 用什么 |
|---|---|
| 后端 | 零依赖 Node.js `server.js`（文件 API + 静态服务 + 缩略图） |
| 桌面壳 | Electron 33 + node-pty（asarUnpack 原生模块） |
| 终端 | xterm.js + WebGL + unicode11 |
| 提示符 | 内置 starship（已签名公证）+ Nerd Font，ZDOTDIR 运行时注入 |
| 编辑器 | Monaco（代码）+ Milkdown Crepe（Markdown） |
| 字体 | Maple Mono CN（内嵌 woff2） |
| 打包 | electron-builder → 签名 + 公证的 arm64 `.dmg` |

---

## 致谢 & 许可

- 核心应用 **FanBox** 由 **[花叔](https://github.com/alchaincyf)**（[alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)）开发，MIT 许可。Rurutia 是其个人增强分支，遵循同一 [MIT 许可](LICENSE)。FanBox 的能力又建立在 Electron / node-pty / xterm.js / Monaco / Milkdown 等一众优秀开源项目之上（完整名单见 [`README.fanbox.md`](README.fanbox.md)）。
- 字体 **Maple Mono** 来自 [subframe7536/maple-font](https://github.com/subframe7536/maple-font)（OFL）。
- 终端提示符 **Starship** 来自 [starship/starship](https://github.com/starship/starship)（ISC）。
- 配色灵感来自公众号「**色所**」的高级感配色合集。

<div align="center">
<br>

**Finder** 帮你管理文件。**IDE** 帮你写代码。**Rurutia / FanBox** 帮你看清 AI 在你机器上干了什么。

MIT License © Rurutia · 基于 [花叔 Huashu 的 FanBox](https://github.com/alchaincyf/fanbox)

</div>
