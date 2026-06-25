<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**Coding Agent 的驾驶舱 —— 基于 [FanBox](https://github.com/alchaincyf/fanbox) 的个人增强版**

指挥 Claude Code / Codex 在本地干活，看清它碰过的每个文件、改过的每一行，随时接手。<br>
在此之上，Rurutia 重做了视觉、字体、配色，并让侧栏入口、用量面板、终端图标都更顺手。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#安装)
[![Signed](https://img.shields.io/badge/已签名-Developer%20ID%20%2B%20公证-success?logo=apple)](#安装)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.1-blueviolet)](https://github.com/alchaincyf/fanbox)

**简体中文** · [English](README.en.md) · [日本語](README.ja.md)

</div>

---

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Rurutia 主界面：左文件 · 下预览 · 右内嵌终端" width="100%">
</p>
<p align="center"><sub>▲ 主界面总览（默认「像素光」皮肤）。</sub></p>

---

## 目录

- [这是什么](#这是什么)
- [原版 FanBox 能做什么（完整功能）](#原版-fanbox-能做什么完整功能)
- [Rurutia 改造了什么](#rurutia-改造了什么)
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

**Rurutia** 是我在 FanBox v2.3.1（`c93a486`）基础上做的**个人化改造**：核心能力 100% 来自 FanBox，我重做了视觉/字体/配色，并打磨了几处日常顺手度。下面先讲清**原项目的完整功能**，再讲**我具体改了什么**。

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

> 核心能力完全来自 FanBox，下面是我新增/重做的部分。

#### 🎨 视觉与配色
- **18 套「色所」高级感配色皮肤**：新孟菲斯 / 酸性时尚 / 数字果冻 / 电路板 / 虚空 / 熔岩橙 / 深海核…… 点侧栏「皮肤」弹出色卡网格切换，默认「像素光」。每套自动适配主界面、侧栏、终端、代码高亮。
- **整体 UI 现代化**：发丝边框、统一圆角节奏、悬浮胶囊式分段控件、强调色辉光、侧栏选中态、克制的过渡动效——全部跟随当前皮肤的强调色。

<p align="center">
  <img src="docs/screenshots/skins.png" alt="18 套皮肤色卡切换" width="80%">
</p>
<p align="center"><sub>▲ 18 套皮肤总览（9 浅 9 深，均自动适配 UI / 终端 / 代码高亮）。</sub></p>

#### 🔤 字体
- **全局 Maple Mono CN**：界面、文件名、代码、终端统一等宽风，含**中文 + 日文假名**全字符（内嵌 woff2，离线可用）。

#### 🗂 侧栏更顺手
- **快速入口可增删**：➕ 把当前文件夹加入、悬停 ✕ 移除（默认项也能删），服务端持久化。
- **Agent 项目可增删**：手动添加置顶、隐藏不想看的（隐藏后扫描不再冒回）。

<p align="center">
  <img src="docs/screenshots/sidebar.png" alt="侧栏快速入口 / Agent 项目可增删" width="40%">
</p>
<p align="center"><sub>▲ 侧栏：快速入口 / 收藏 / Agent 项目，可拖拽增删与排序。</sub></p>

#### 📊 用量面板增强
- Claude Code 官方限额（5h 窗口 / 周配额）**恒显**：取到就给进度条，取不到写明原因（未订阅登录 / 网络受限 / 无窗口数据）+ 重试。
- **接近上限（≥85%）红色警告条 + 桌面通知**（节流不打扰），面板展开时自动刷新。

#### 🖥 终端 & 图标
- 终端顶栏 10 个动作按钮**全部重绘为单色矢量图标**（跟随主题色）；标签加高、宽度随文件名自适应。
- 自定义应用图标 + 侧栏 logo，应用更名 Rurutia。

#### ⚙️ 其他
- **自动端口顺延**：默认 4567 被占用时自动换到下一对空端口，多实例不再冲突。

#### 🪄 交互细节打磨
- **窗口顶部整条留白可拖拽**：不再只能抓品牌区一角；左上角交通灯留足避让、不与 logo 重叠。
- **终端做成独立圆角卡**：头部导航栏圆弧上沿，背景跟随当前皮肤底色融入整体（深色皮肤下不再是突兀的纯黑方块）。
- **终端标签弹性拖拽换位**：按住横向拖，越过相邻标签即实时让位，不必精准对齐目标格。
- **侧栏拖拽**：Agent 项目可直接拖进「收藏 / 快速入口」，也能在列表内上下拖动自定义排序（顺序持久化）；更新时间统一右对齐。
- **滚动条重做**：细圆、跟随强调色，轨道两端缩进避开圆角卡的圆角，不再凸出。
- **全局强制 Maple Mono**：兜住少数硬编码字体的角落，中 / 英 / 日字符真正全统一。
- **Claude 用量更稳**：官方限额接口有严格速率限制，改为 10 分钟缓存 + 限流时沿用上次数据，不再因偶发限流就显示「无数据」。

---

## 安装

**macOS（Apple Silicon / arm64）**

1. 到 [**Releases**](../../releases) 下载最新 `Rurutia-*.dmg`。
2. 打开 dmg，把 **Rurutia** 拖进「应用程序」。
3. 双击打开即可使用。

> ✅ 本版已用 **Apple Developer ID 证书签名 + Apple 公证（notarization）+ hardened runtime**——双击直接打开，**不会**弹「无法验证开发者」。

<details>
<summary>如果你拿到的是未签名的自构建版本</summary>

首次打开提示「无法验证开发者」时，右键 → **打开**，或终端执行：
```bash
xattr -dr com.apple.quarantine /Applications/Rurutia.app
```
</details>

---

## 从源码构建

```bash
npm install
npm run rebuild        # 把 node-pty 重编到 Electron 的 ABI

# 未签名本地构建（最简单，自己用）：
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# 产物：dist/mac-arm64/Rurutia.app
```

**签名 + 公证版**（需要 Apple Developer ID 证书）：

```bash
# 1. 用你自己的 Developer ID 证书构建（electron-builder 自动发现钥匙串里的证书）
#    ⚠️ 项目若在 iCloud 目录下，先把产物输出到本地盘，避免 iCloud 扩展属性导致
#       codesign 报 "resource fork ... not allowed"：
npx electron-builder --mac -c.directories.output=/tmp/rurutia-dist

# 2. 一次性把公证凭据存进钥匙串（App 专用密码在 appleid.apple.com 生成）
xcrun notarytool store-credentials "rurutia-notary" \
  --apple-id "<你的 Apple ID>" --team-id "<你的 Team ID>" --password "<App 专用密码>"

# 3. 提交公证并等结果
xcrun notarytool submit /tmp/rurutia-dist/Rurutia-*.dmg --keychain-profile "rurutia-notary" --wait

# 4. 把公证票据钉进 dmg
xcrun stapler staple /tmp/rurutia-dist/Rurutia-*.dmg
```

---

## 改动如何组织（补丁式）

为了能跟随上游 FanBox 持续更新，改动尽量做成**追加式**，方便每次出新版后 `git rebase` 重新套用：

- **新增文件**（不冲突）：`public/ui-patch.css`（全部 UI/字体）、`public/themes-patch.js`（18 套皮肤）、`public/vendor/fonts/maple/*`、`public/vendor/icons/`、`public/logo.png`、`public/favicon.png`。
- **编辑的上游文件**（少量、需留意）：`public/index.html`、`public/app.js`、`server.js`、`electron/main.js`、`package.json` + `build/icon*`。

完整改动清单 + 「上游出新版后如何重新套用」的步骤见 [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md)。

---

## 隐私与安全

> 与上游 FanBox 一致，Rurutia 不改变其安全模型。

- 后端只在本机回环地址监听 + 校验 Host 头（挡 DNS rebinding），**数据不出本机**。
- 全部前端资源（含渲染器、字体）本地内置，**离线完全可用**。仅有的出网请求：Claude 用量接口（可选）和 GitHub 更新检查。
- HTML 预览在隔离 origin 的沙箱 iframe 里渲染，碰不到终端能力。
- 配置走原子写（temp + fsync + rename），不丢数据；删除走系统废纸篓（可恢复）。

---

## 技术架构

| 层 | 用什么 |
|---|---|
| 后端 | 零依赖 Node.js `server.js`（文件 API + 静态服务 + 缩略图） |
| 桌面壳 | Electron 33 + node-pty（asarUnpack 原生模块） |
| 终端 | xterm.js + WebGL + unicode11 |
| 编辑器 | Monaco（代码）+ Milkdown Crepe（Markdown） |
| 字体 | Maple Mono CN（内嵌 woff2） |
| 打包 | electron-builder → 签名 + 公证的 arm64 `.dmg` |

---

## 致谢 & 许可

- 核心应用 **FanBox** 由 **[花叔](https://github.com/alchaincyf)**（[alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)）开发，MIT 许可。Rurutia 是其个人增强分支，遵循同一 [MIT 许可](LICENSE)。FanBox 的能力又建立在 Electron / node-pty / xterm.js / Monaco / Milkdown 等一众优秀开源项目之上（完整名单见 [`README.fanbox.md`](README.fanbox.md)）。
- 字体 **Maple Mono** 来自 [subframe7536/maple-font](https://github.com/subframe7536/maple-font)（OFL）。
- 配色灵感来自公众号「**色所**」的高级感配色合集。

<div align="center">
<br>

**Finder** 帮你管理文件。**IDE** 帮你写代码。**Rurutia / FanBox** 帮你看清 AI 在你机器上干了什么。

MIT License © Rurutia · 基于 [花叔 Huashu 的 FanBox](https://github.com/alchaincyf/fanbox)

</div>
