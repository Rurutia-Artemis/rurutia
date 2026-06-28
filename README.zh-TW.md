<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**Coding Agent 的駕駛艙 —— 基於 [FanBox](https://github.com/alchaincyf/fanbox) 的個人增強版**

指揮 Claude Code / Codex 在本機做事，看清它碰過的每個檔案、改過的每一行，隨時接手。<br>
在此之上，Rurutia 重做了視覺與字型，加了 **18 套配色皮膚**、**自帶 Starship 的終端機提示符**、**終端機品牌圖示工具列**，把側邊欄入口、用量面板、互動細節都打磨得更順手。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#安裝)
[![Signed](https://img.shields.io/badge/已簽名-Developer%20ID%20%2B%20公證-success?logo=apple)](#安裝)
[![Version](https://img.shields.io/badge/版本-v2.7.2-ff3d8b)](../../releases)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.3-blueviolet)](https://github.com/alchaincyf/fanbox)

[简体中文](README.md) · **繁體中文** · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Español](README.es.md)

</div>

---

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Rurutia 主介面：左側邊欄 · 中間檔案網格 · 右內嵌終端機，深淺兩套皮膚並列" width="100%">
</p>
<p align="center"><sub>▲ 主介面總覽 —— 同一介面、左深「像素光」右淺「數位果凍」。檔案網格帶強色專案徽章，側邊欄彙總 Agent 專案與官方用量。</sub></p>

> **✨ v2.8.0 本版亮點**：18 套配色皮膚精調（淺色去白、暗色去同質化）· 應用內 **7 國語言** + 語言選擇器 · 終端複製貼上 / 字級縮放 · 合併上游 FanBox v2.3.3 核心修復。

---

## 目錄

- [這是什麼](#這是什麼)
- [30 秒看懂](#30-秒看懂)
- [原版 FanBox 能做什麼（完整功能）](#原版-fanbox-能做什麼完整功能)
- [Rurutia 改造了什麼](#rurutia-改造了什麼)：18 套皮膚 · 終端機提示符 · 品牌圖示 + 彩虹標籤 · 側邊欄
- [安裝](#安裝)
- [從原始碼建置](#從原始碼建置)
- [改動如何組織（補丁式）](#改動如何組織補丁式)
- [隱私與安全](#隱私與安全)
- [技術架構](#技術架構)
- [致謝 & 授權](#致謝--授權)

---

## 這是什麼

[**FanBox**](https://github.com/alchaincyf/fanbox)（作者：[花叔](https://github.com/alchaincyf)）是一個在本機執行的「**Coding Agent 駕駛艙**」：一邊瀏覽 / 預覽 / 編輯本機檔案，一邊在內嵌真實終端機裡跑 Claude Code、Codex 或任何 coding agent，agent 改了哪個檔案就即時高亮——**找回檔案 → 執行 agent → 看清改動**，全在一個視窗完成。零依賴後端、資料不出本機。

> *"AI 幫你一個下午起十個專案，然後它們就再也找不到了。FanBox 幫你把它們找回來。"*

**Rurutia** 是我在 FanBox v2.3.1（`c93a486`）基礎上做的**個人化改造**：核心能力 100% 來自 FanBox，我重做了視覺 / 字型 / 配色，加了一整套皮膚與終端機提示符系統，並打磨了幾十處日常順手度。下面先講清**原專案的完整功能**，再講**我具體改了什麼**。

---

## 30 秒看懂

| 你想做的事 | 在 Rurutia 裡 |
|---|---|
| 找回一個下午亂起的十個專案 | `⌘K` 全域模糊搜尋 · 資料夾標 node/web/py/rs/go 徽章一眼認出類型 |
| 讓 agent 做事、還能看清它改了啥 | 內嵌真實終端機跑 Claude Code / Codex；它寫哪個檔案，那張卡片當場發光、預覽即時跟隨 |
| 接續昨天的工作階段 | 點開專案看歷史工作階段，「▶ 接續」一鍵 `claude --resume` / `codex resume` 接回上下文 |
| 盯住官方用量別超額 | 側邊欄常顯 Claude / Codex 的 5h 視窗 + 週配額，接近上限紅條 + 桌面通知 |
| 讓整個介面隨心情換裝 | 18 套配色皮膚 + 16 套終端機提示符主題，UI / 終端機 / 程式碼高亮一起變 |

---

## 原版 FanBox 能做什麼（完整功能）

> 這部分是 FanBox 本身的能力，Rurutia 完整保留。原始英文版說明見 [`README.fanbox.md`](README.fanbox.md)。

### 🗂 檔案 · 找回與預覽
- **⌘K 全域模糊搜尋**：記得名字片段就行；`⌘↵` 用編輯器整包打開專案；`内容:关键词` 切全文搜尋。
- **強色實體圖示**：每種檔案「長得像它自己」——PDF 紅、JS 黃、Markdown 藍；照片影片按真實比例呈現。
- **原地預覽**：Markdown 渲染、HTML 即時成品、程式碼語法高亮、圖片/影片/PDF 內嵌（含 HEIC）、壓縮檔內容清單、透明圖棋盤格墊底。
- **縮圖加速**：大資料夾捲動和點擊都在 0.1 秒內。
- **專案徽章**：資料夾卡片標 node / web / py / rs / go，一下午起的十個專案一眼認出類型。

### 👀 看 agent 改了什麼
- **活的儀表板**：agent 每寫一個檔案，那張卡片當場盪開漣漪、按改動頻率發光呼吸，agent 寫到哪光走到哪。
- **跟隨模式**：一鍵讓檔案檢視 + 預覽追蹤 agent 正在編輯的檔案——程式碼隨新寫行高亮閃爍，HTML 邊寫邊即時渲染（雙緩衝、零白閃），Markdown 即時渲染。任何手動瀏覽立即把控制權交還給你。
- **工作階段回放**：像刷影片一樣拖時間軸，重現這段時間 agent 一步步改了哪些檔案。
- **變更收件匣**：跨多個專案彙總本工作階段所有被改動的檔案。
- **Git 改動 diff**：Monaco 唯讀 DiffEditor 並排展示 HEAD vs 目前工作區。

### 🤖 Agent 駕駛艙
- **專案記憶**：點開任何專案資料夾，看 AI 在這裡做過什麼——歷史工作階段（你的第一句話當標題）、每次工作階段改過的檔案、觸發過的 skill；「▶ 接續」一鍵在內嵌終端機 `claude --resume` / `codex resume` 接回上下文。
- **截圖直通車**：系統截圖落檔即浮出直通卡——餵給終端機裡的 agent、收進專案 `素材/`、或先標註再發。
- **AI 整理**：AI 只看中繼資料出整理提案（不讀內容、不碰檔案系統），逐條過人後執行 + 寫還原日誌、一鍵整體復原。
- **發版精靈**：node 專案一鍵串起版本號、CHANGELOG、打包、推送、GitHub Release。
- **Skills 透視**：本機全部 agent skills 一個檢視——觸發統計、健康檢查、context 預算、不刪檔案的啟停開關。
- **Agent 用量**：Claude Code 官方 5h 視窗/週配額（和 `/usage` 同源）+ 本機 token 統計；Codex 限額快照。
- **磁碟佔用透視**：`du` 口徑的真實佔用長條榜，可下鑽。

### 🖥 終端機 · 指揮 agent
- **真實內嵌終端機**：node-pty + xterm.js（WebGL 渲染），跑 Claude Code / vim / htop 不花屏，中文寬字元正確。
- **拖檔案進終端機**：從檔案列表拖檔案/資料夾進終端機，自動插入路徑餵給 agent 當上下文。
- **路徑可點擊**：終端機裡出現的檔案路徑直接點開（帶空格的截圖名、中文名、折行長路徑都能識別）。
- **選中即丟給終端機**：預覽裡選一段文字，一鍵以「檔案出處 + 圍欄」格式發進終端機。
- **態勢感知**：標籤圓點顯示 agent 執行/閒置/退出；輪到你時終端機邊緣呼吸提示，長任務完成發系統通知。

### ✍️ 編輯 · 所見即所得
- **Markdown**：Milkdown Crepe 提供 Notion 式所見即所得，停筆 0.8 秒自動儲存。
- **程式碼/JSON**：Monaco 編輯器（VS Code 同款核心）。
- **圖片標註**：畫筆/箭頭/文字/馬賽克、格式轉換、壓縮、調解析度。
- **未儲存守衛**：三種編輯器統一攔截未儲存退出。

---

## Rurutia 改造了什麼

> 核心能力完全來自 FanBox，下面是我新增 / 重做的部分。整體圍繞四件事：**好看**、**好認**、**好用的終端機**、**少打擾**。

### 🎨 18 套配色皮膚（多強調色系統）

點側邊欄「皮膚」彈出色卡網格切換，預設「像素光」。每套是「**中性底 + 3 個並列強調色**（主：按鈕/活動態 · 次：分區標題與連結 · 跳：徽章）+ 一組語意狀態色」——顏色更跳，又靠角色分工保持協調。正文 / 強調色 / 徽章字 / 終端機 16 ANSI **全部過 WCAG 對比度校驗**；每套自動適配主介面、側邊欄、終端機配色、程式碼高亮，連 Monaco 編輯器底色也跟著同色溫走。

靈感來自公眾號「色所」的高級感配色合集：新孟菲斯 / 酸性時尚 / 數位果凍 / 電路板 / 虛空 / 熔岩橙 / 深海核……9 淺 9 深，共 18 套。

<p align="center">
  <img src="docs/screenshots/skins.png" alt="18 套配色皮膚總覽：9 淺 9 深，每套自動適配 UI / 終端機 / 程式碼高亮" width="100%">
</p>
<p align="center"><sub>▲ 18 套皮膚總覽（9 淺 9 深）。切一下，主介面 / 側邊欄 / 終端機配色 / 程式碼高亮一起換。</sub></p>

整體 UI 也做了現代化：髮絲邊框、統一圓角節奏、懸浮膠囊式分段控制項、強調色輝光、側邊欄選中態、克制的過渡動效——全部跟隨目前皮膚的強調色。介面、檔名、程式碼、終端機統一用 **Maple Mono CN**（含中文 + 日文假名全字元，內嵌 woff2，離線可用）。

### 🚀 終端機提示符（自帶 Starship · 16 套主題）

**開箱即用的 powerline 提示符**：內建已簽名公證的 starship + Nerd Font 圖示字，裝完打開終端機就是 powerline 藥丸（目錄 / git 狀態 / 語言版本 / ♥ 時間），**不用自己裝 starship、不用設定 `~/.zshrc`**。

走 ZDOTDIR 注入：先 source 你真實的 dotfile（PATH / 別名分毫不差，`claude` / `codex` 照樣找得到），再疊加 starship——**只在本 App 終端機生效、不碰任何 dotfile、解除安裝零殘留**。僅 macOS + zsh。

<p align="center">
  <img src="docs/screenshots/prompt.png" alt="終端機提示符選擇器：16 套整套主題（帶迷你 powerline 預覽）+ 5 個可疊加修飾" width="100%">
</p>
<p align="center"><sub>▲ 側邊欄「提示符」選擇器：整套主題選一個，疊加修飾可多選；切換即時生效，正在跑的終端機按 Enter 就變樣。</sub></p>

- **16 套提示符主題（獨立於皮膚）**：藥丸·摩卡 / 帕斯特爾 / 東京夜 / Gruvbox 彩虹 / Nord 極地 / Dracula / Rosé Pine / Everforest / Kanagawa / 拿鐵淺色 / 扁平彩字 / Jetpack 座艙 / Pure 簡約 / 極簡單行 / 兩行 / 純文字。
- **5 個可疊加修飾（可多選並行）**：隱藏語言版本 / 純文字符號·去圖示 / 關時間 / 關命令耗時 / 去前導空行。
- **每套皮膚獨立終端機配色**：終端機背景 / 游標 / 選取區 + 16 ANSI 全按皮膚推導；淺色皮膚的彩字也壓到對比 ≥ 3.5，不再糊進淺底。

### 🖥 終端機 · 品牌圖示 + 彩虹標籤

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="終端機：彩虹色專案標籤 + Claude/OpenAI/Codex/微信 品牌圖示工具列 + powerline 提示符" width="100%">
</p>
<p align="center"><sub>▲ 內嵌終端機：標籤按專案黃金角配色（彩虹），頂欄一排官方品牌圖示可直接啟動 Claude / Codex / 微信，提示符是自帶的 starship powerline。</sub></p>

- **品牌圖示工具列**：Claude Code / Codex / 微信 等啟動入口換成**官方品牌向量圖示**，頂欄一排一目了然；其餘動作按鈕（預覽跟隨 / 新標籤 / 全螢幕 / 切換 dock / 靜音…）全部重繪為跟隨主題色的單色向量圖示。
- **彩虹標籤**：每個終端機標籤按專案用黃金角取色，多專案並排時自動錯開成一道彩虹，一眼分得清哪個終端機在哪個專案；標籤加高、寬度隨檔名自適應，可彈性拖曳換位（越過相鄰標籤即時讓位）。
- **「普通終端機」按鈕**：Claude Code / Codex 旁一鍵在目前資料夾開個乾淨 shell（不帶 agent）。
- **獨立圓角終端機卡**：頭部導覽列圓弧上緣，背景跟隨目前皮膚底色融入整體（深色皮膚下不再是突兀的純黑方塊），淺色皮膚下活動標籤改成淡染、去掉多餘的底部色條。

### 🗂 側邊欄 · 入口與 Agent 專案可增刪

<p align="center">
  <img src="docs/screenshots/sidebar.png" alt="側邊欄：快速入口 / 收藏 / Agent 專案，可增刪與拖曳排序 + 官方用量面板" width="34%">
</p>
<p align="center"><sub>▲ 側邊欄：快速入口 / 收藏 / Agent 專案，可拖曳增刪與排序；底部 Agent 用量面板常顯官方限額。</sub></p>

- **快速入口可增刪**：➕ 把目前資料夾加入、懸停 ✕ 移除（預設項也能刪），伺服器端持久化。
- **Agent 專案可增刪**：手動加入置頂、隱藏不想看的（隱藏後掃描不再冒回）；也能從列表拖進「收藏 / 快速入口」，或在列表內上下拖曳自訂排序（順序持久化）。
- **用量面板增強**：Claude Code 官方限額（5h 視窗 / 週配額）**恆顯**——取到就給進度條，取不到寫明原因（未訂閱登入 / 網路受限 / 無視窗資料）+ 重試；接近上限（≥85%）**紅色警告條 + 桌面通知**（節流不打擾），面板展開時自動重新整理。官方限額介面有嚴格速率限制，改為 10 分鐘快取 + 限流時沿用上次資料，不再因偶發限流就顯示「無資料」。

### 其餘打磨

- **點紅色 ✕ = 隱藏視窗（macOS）**：不再銷毀視窗殺掉終端機，點 Dock 原樣喚回（終端機 / 狀態都在），⌘Q 才是真正退出。
- **視窗頂部整條留白可拖曳**：不再只能抓品牌區一角；左上角紅綠燈留足避讓、不與 logo 重疊。
- **捲軸重做**：細圓、跟隨強調色，軌道兩端縮排避開圓角卡的圓角，不再凸出。
- **標籤自訂游標**：終端機標籤區用跟隨皮膚強調色的小箭頭游標。
- **自動連接埠順延**：預設 4567 被佔用時自動換到下一對空連接埠，多實例不再衝突。
- **自訂應用程式圖示 + 側邊欄 logo**，應用程式更名 Rurutia。

### 🌐 介面語言（7 種）

- 應用程式介面語言從「中 / 英」擴充到 **7 種**：简体中文 / 繁體中文 / English / 日本語 / 한국어 / Français / Español。側邊欄新增「語言」選擇器，在清單裡點母語名即可切換；使用者內容區（預覽 / 編輯器 / 終端機）不翻譯。

---

## 安裝

**macOS（Apple Silicon / arm64）**

1. 到 [**Releases**](../../releases) 下載最新 `Rurutia-*.dmg`。
2. 打開 dmg，把 **Rurutia** 拖進「應用程式」。
3. 雙擊打開即可使用。

> ✅ 本版已用 **Apple Developer ID 憑證簽名 + Apple 公證（notarization）+ hardened runtime**——從 Releases 下載後**雙擊直接安裝使用**，不會彈「無法驗證開發者」，無需任何額外操作。

---

## 從原始碼建置

```bash
npm install
npm run rebuild        # 把 node-pty 重编到 Electron 的 ABI

# 未签名本地构建（最简单，自己用）：
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# 产物：dist/mac-arm64/Rurutia.app
```

---

## 改動如何組織（補丁式）

為了能跟隨上游 FanBox 持續更新，改動盡量做成**追加式**，方便每次出新版後 `git rebase` 重新套用：

- **新增檔案**（不衝突）：`public/ui-patch.css` + `public/soft-patch.css`（全部 UI/字型）、`public/themes-patch.js`（18 套皮膚）、`public/prompt-patch.js`（終端機提示符選擇器）、`public/vendor/fonts/maple/*`、`public/vendor/icons/`、`vendor/starship/*`、`public/logo.png`、`public/favicon.png`。
- **編輯的上游檔案**（少量、需留意）：`public/index.html`、`public/app.js`、`server.js`、`electron/main.js`、`package.json` + `build/icon*`。

完整改動清單 + 「上游出新版後如何重新套用」的步驟見 [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md)。

---

## 隱私與安全

> 與上游 FanBox 一致，Rurutia 不改變其安全模型。

- 後端只在本機回送位址監聽 + 校驗 Host 標頭（擋 DNS rebinding），**資料不出本機**。
- 全部前端資源（含渲染器、字型、starship 二進位）本機內建，**離線完全可用**。唯一的對外網路請求：Claude / Codex 用量介面（選用）和 GitHub 更新檢查。
- HTML 預覽在隔離 origin 的沙箱 iframe 裡渲染，碰不到終端機能力。
- 終端機提示符走 ZDOTDIR 注入，**不寫、不改你的任何 dotfile**，解除安裝零殘留。
- 設定走原子寫（temp + fsync + rename），不丟資料；刪除走系統垃圾桶（可復原）。

---

## 技術架構

| 層 | 用什麼 |
|---|---|
| 後端 | 零依賴 Node.js `server.js`（檔案 API + 靜態服務 + 縮圖） |
| 桌面殼 | Electron 33 + node-pty（asarUnpack 原生模組） |
| 終端機 | xterm.js + WebGL + unicode11 |
| 提示符 | 內建 starship（已簽名公證）+ Nerd Font，ZDOTDIR 執行階段注入 |
| 編輯器 | Monaco（程式碼）+ Milkdown Crepe（Markdown） |
| 字型 | Maple Mono CN（內嵌 woff2） |
| 打包 | electron-builder → 簽名 + 公證的 arm64 `.dmg` |

---

## 致謝 & 授權

- 核心應用程式 **FanBox** 由 **[花叔](https://github.com/alchaincyf)**（[alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)）開發，MIT 授權。Rurutia 是其個人增強分支，遵循同一 [MIT 授權](LICENSE)。FanBox 的能力又建立在 Electron / node-pty / xterm.js / Monaco / Milkdown 等一眾優秀開源專案之上（完整名單見 [`README.fanbox.md`](README.fanbox.md)）。
- 字型 **Maple Mono** 來自 [subframe7536/maple-font](https://github.com/subframe7536/maple-font)（OFL）。
- 終端機提示符 **Starship** 來自 [starship/starship](https://github.com/starship/starship)（ISC）。
- 配色靈感來自公眾號「**色所**」的高級感配色合集。

<div align="center">
<br>

**Finder** 幫你管理檔案。**IDE** 幫你寫程式碼。**Rurutia / FanBox** 幫你看清 AI 在你機器上做了什麼。

MIT License © Rurutia · 基於 [花叔 Huashu 的 FanBox](https://github.com/alchaincyf/fanbox)

</div>
