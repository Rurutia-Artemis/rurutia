<div align="center">

<img src="public/logo.png" alt="Rurutia" width="120" />

# Rurutia

**A cockpit for coding agents — a personal enhanced edition built on [FanBox](https://github.com/alchaincyf/fanbox)**

Command Claude Code / Codex to work locally, see every file it touches and every line it changes, and take over at any moment.<br>
On top of that, Rurutia reworks the visuals, fonts, and color schemes, and makes the sidebar entries, usage panel, and terminal icons all feel more polished.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/macOS-Apple%20Silicon-black?logo=apple)](#installation)
[![Signed](https://img.shields.io/badge/Signed-Developer%20ID%20%2B%20Notarized-success?logo=apple)](#installation)
[![Upstream](https://img.shields.io/badge/Upstream-FanBox%20v2.3.1-blueviolet)](https://github.com/alchaincyf/fanbox)

[简体中文](README.md) · **English** · [日本語](README.ja.md)

</div>

---

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Rurutia main interface: files on the left · preview below · embedded terminal on the right" width="100%">
</p>
<p align="center"><sub>▲ Main interface overview (default "Pixel Light" skin).</sub></p>

---

## Table of Contents

- [What is this](#what-is-this)
- [What the original FanBox can do (full feature set)](#what-the-original-fanbox-can-do-full-feature-set)
- [What Rurutia changed](#what-rurutia-changed)
- [Installation](#installation)
- [Building from source](#building-from-source)
- [How the changes are organized (patch-style)](#how-the-changes-are-organized-patch-style)
- [Privacy & security](#privacy--security)
- [Technical architecture](#technical-architecture)
- [Acknowledgments & license](#acknowledgments--license)

---

## What is this

[**FanBox**](https://github.com/alchaincyf/fanbox) (by [Huashu (花叔)](https://github.com/alchaincyf)) is a locally-run "**cockpit for coding agents**": browse / preview / edit your local files on one side, while running Claude Code, Codex, or any coding agent in a real embedded terminal on the other—whenever the agent changes a file, it lights up in real time. **Find the files → run the agent → see the changes**, all in a single window. Zero-dependency backend, and your data never leaves your machine.

> *"AI helps you spin up ten projects in one afternoon, and then you can never find them again. FanBox helps you find them back."*

**Rurutia** is my **personalized rework** built on FanBox v2.3.1 (`c93a486`): the core capabilities are 100% from FanBox, while I redid the visuals/fonts/color schemes and polished a few everyday quality-of-life touches. Below, I first lay out the **full feature set of the original project**, then describe **what exactly I changed**.

---

## What the original FanBox can do (full feature set)

> This section covers FanBox's own capabilities, which Rurutia preserves in full. The original English documentation is in [`README.fanbox.md`](README.fanbox.md).

### 🗂 Files · Find back & preview
- **⌘K global fuzzy search**: remembering a fragment of the name is enough; `⌘↵` opens the whole project in your editor; `content:keyword` switches to full-text search.
- **Bold solid icons**: every file type "looks like itself"—PDFs red, JS yellow, Markdown blue; photos and videos rendered at their true aspect ratios.
- **In-place preview**: Markdown rendering, live HTML output, syntax-highlighted code, inline images/videos/PDFs (including HEIC), archive content listings, and a checkerboard backing for transparent images.
- **Thumbnail acceleration**: scrolling and clicking through large folders both happen within 0.1 seconds.
- **Project badges**: folder cards are tagged node / web / py / rs / go, so the ten projects you started in one afternoon are recognizable by type at a glance.

### 👀 See what the agent changed
- **Live dashboard**: every time the agent writes a file, that card ripples on the spot and glows/breathes by change frequency—the light follows the agent as it writes.
- **Follow mode**: one click makes the file view + preview track the file the agent is currently editing—code flashes its newly written lines, HTML renders live as it's written (double-buffered, zero white flash), and Markdown renders in real time. Any manual browsing immediately hands control back to you.
- **Session replay**: drag the timeline like scrubbing a video to replay, step by step, which files the agent changed over that span.
- **Change inbox**: aggregates every file changed in this session across multiple projects.
- **Git diff of changes**: a Monaco read-only DiffEditor shows HEAD vs the current working tree side by side.

### 🤖 Agent cockpit
- **Project memory**: open any project folder to see what the AI has done there—past sessions (your first sentence becomes the title), the files changed in each session, the skills triggered; "▶ Resume" picks up the context in the embedded terminal with one click via `claude --resume` / `codex resume`.
- **Screenshot express**: the moment a system screenshot hits disk, an express card floats up—feed it to the agent in the terminal, file it into the project's `assets/`, or annotate it first and then send.
- **AI tidy-up**: the AI looks only at metadata to produce an organization proposal (it doesn't read content or touch the filesystem); you review it item by item, then execute it with a rollback log written + one-click full undo.
- **Release wizard**: for node projects, one click chains together the version bump, CHANGELOG, packaging, push, and GitHub Release.
- **Skills overview**: all agent skills on your machine in a single view—trigger stats, health checks, context budget, and on/off toggles that don't delete files.
- **Agent usage**: Claude Code's official 5h window / weekly quota (same source as `/usage`) + local token stats; a Codex limit snapshot.
- **Disk usage overview**: a real-usage bar ranking (`du`-equivalent) that you can drill into.

### 🖥 Terminal · Command the agent
- **Real embedded terminal**: node-pty + xterm.js (WebGL rendering), running Claude Code / vim / htop without glitches, with correct CJK wide-character handling.
- **Drag files into the terminal**: drag a file/folder from the file list into the terminal to automatically insert its path and feed it to the agent as context.
- **Clickable paths**: file paths that appear in the terminal can be opened directly (screenshot names with spaces, Chinese names, and wrapped long paths are all recognized).
- **Select and toss to the terminal**: select a snippet of text in the preview and send it to the terminal with one click, formatted as "source file + fence".
- **Situational awareness**: the tab dot shows agent running/idle/exited; when it's your turn the terminal edge breathes a prompt, and a system notification fires when a long task completes.

### ✍️ Edit · WYSIWYG
- **Markdown**: Milkdown Crepe provides Notion-style WYSIWYG, with auto-save 0.8 seconds after you stop typing.
- **Code/JSON**: the Monaco editor (same core as VS Code).
- **Image annotation**: brush/arrow/text/redaction, format conversion, compression, and resolution adjustment.
- **Unsaved guard**: all three editors uniformly intercept exit with unsaved changes.

---

## What Rurutia changed

> The core capabilities come entirely from FanBox; below is what I added/reworked.

#### 🎨 Visuals & color schemes
- **18 premium "Sèsuǒ" color skins**: Neo-Memphis / Acid Fashion / Digital Jelly / Circuit Board / Void / Lava Orange / Deep-Sea Core… click "Skins" in the sidebar to pop up a swatch grid and switch; the default is "Pixel Light." Each one automatically adapts the main interface, sidebar, terminal, and code highlighting.
- **Overall UI modernization**: hairline borders, a unified corner-radius rhythm, floating capsule-style segmented controls, accent-color glow, sidebar selected states, and restrained transition animations—all following the current skin's accent color.

<p align="center">
  <img src="docs/screenshots/skins.png" alt="18 skin swatch switching" width="80%">
</p>
<p align="center"><sub>▲ Overview of all 18 skins (9 light, 9 dark, all auto-adapting the UI / terminal / code highlighting).</sub></p>

#### 🔤 Fonts
- **Global Maple Mono CN**: the interface, file names, code, and terminal share one monospaced style, with full **Chinese + Japanese kana** character coverage (embedded woff2, works offline).

#### 🗂 A smoother sidebar
- **Quick entries can be added/removed**: ➕ to add the current folder, hover ✕ to remove (even default items can be removed), persisted server-side.
- **Agent projects can be added/removed**: manually add a pin to the top, hide the ones you don't want to see (once hidden, scanning won't surface them again).

<p align="center">
  <img src="docs/screenshots/sidebar.png" alt="Sidebar quick entries / Agent projects can be added or removed" width="40%">
</p>
<p align="center"><sub>▲ Sidebar: quick entries / favorites / Agent projects, with drag-to-add/remove and reordering.</sub></p>

#### 📊 Usage panel enhancements
- Claude Code's official limits (5h window / weekly quota) are **always shown**: when fetched, you get a progress bar; when not, the reason is spelled out (not subscribed/logged in / network restricted / no window data) + a retry.
- **Near-limit (≥85%) red warning bar + desktop notification** (throttled so it won't nag), and the panel auto-refreshes when expanded.

#### 🖥 Terminal & icons
- The 10 action buttons in the terminal top bar are **all redrawn as monochrome vector icons** (following the theme color); tabs are taller and their width adapts to the file name.
- Custom app icon + sidebar logo, with the app renamed to Rurutia.

#### ⚙️ Other
- **Automatic port fallback**: when the default 4567 is taken, it automatically moves to the next free port pair, so multiple instances no longer collide.

#### 🪄 Interaction-detail polish
- **The entire top strip of the window is draggable**: no longer can you only grab a corner of the brand area; the top-left traffic lights get enough clearance and no longer overlap the logo.
- **The terminal is made into a standalone rounded card**: the header nav bar gets a rounded top edge, and the background follows the current skin's base color to blend into the whole (no more jarring pure-black block under dark skins).
- **Elastic drag-to-reorder terminal tabs**: hold and drag horizontally, and once you pass an adjacent tab it yields in real time—no need to align precisely with the target slot.
- **Sidebar dragging**: Agent projects can be dragged directly into "favorites / quick entries," and can also be dragged up and down within a list for custom ordering (order is persisted); the update time is uniformly right-aligned.
- **Reworked scrollbar**: thin and rounded, following the accent color, with the track indented at both ends to clear the rounded card's corners so it no longer protrudes.
- **Global forced Maple Mono**: covers the few corners with hardcoded fonts, so Chinese / English / Japanese characters are truly all unified.
- **Steadier Claude usage**: the official limits endpoint has strict rate limits, so this switches to a 10-minute cache + reusing the last data when rate-limited, so an occasional throttle no longer shows "no data."

---

## Installation

**macOS (Apple Silicon / arm64)**

1. Download the latest `Rurutia-*.dmg` from [**Releases**](../../releases).
2. Open the dmg and drag **Rurutia** into "Applications."
3. Double-click to open and you're ready to go.

> ✅ This build is **signed with an Apple Developer ID certificate + Apple notarization + hardened runtime**—just download it from Releases, **double-click to install and use**, with no "developer cannot be verified" warning and no extra steps required.

---

## Building from source

```bash
npm install
npm run rebuild        # rebuild node-pty against Electron's ABI

# Unsigned local build (simplest, for your own use):
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac --dir -c.mac.identity=null
# Output: dist/mac-arm64/Rurutia.app
```

---

## How the changes are organized (patch-style)

So as to keep following upstream FanBox updates, the changes are made **additive** as much as possible, making it easy to re-apply them via `git rebase` after each new release:

- **New files** (no conflicts): `public/ui-patch.css` (all UI/fonts), `public/themes-patch.js` (the 18 skins), `public/vendor/fonts/maple/*`, `public/vendor/icons/`, `public/logo.png`, `public/favicon.png`.
- **Edited upstream files** (few, worth watching): `public/index.html`, `public/app.js`, `server.js`, `electron/main.js`, `package.json` + `build/icon*`.

The full change list + the steps for "how to re-apply after upstream releases a new version" are in [`RURUTIA-PATCH.md`](RURUTIA-PATCH.md).

---

## Privacy & security

> Consistent with upstream FanBox, Rurutia does not change its security model.

- The backend only listens on the local loopback address + validates the Host header (blocking DNS rebinding), and **data never leaves your machine**.
- All frontend assets (including the renderer and fonts) are bundled locally, so it's **fully usable offline**. The only outbound requests: the Claude usage endpoint (optional) and the GitHub update check.
- The HTML preview is rendered in a sandboxed iframe with an isolated origin, so it can't touch terminal capabilities.
- Configuration uses atomic writes (temp + fsync + rename), so no data is lost; deletions go to the system Trash (recoverable).

---

## Technical architecture

| Layer | What it uses |
|---|---|
| Backend | Zero-dependency Node.js `server.js` (file API + static serving + thumbnails) |
| Desktop shell | Electron 33 + node-pty (asarUnpack native module) |
| Terminal | xterm.js + WebGL + unicode11 |
| Editor | Monaco (code) + Milkdown Crepe (Markdown) |
| Fonts | Maple Mono CN (embedded woff2) |
| Packaging | electron-builder → signed + notarized arm64 `.dmg` |

---

## Acknowledgments & license

- The core application **FanBox** is developed by **[Huashu (花叔)](https://github.com/alchaincyf)** ([alchaincyf/fanbox](https://github.com/alchaincyf/fanbox)), under the MIT license. Rurutia is a personal enhanced fork of it, following the same [MIT license](LICENSE). FanBox's capabilities in turn build on a host of excellent open-source projects such as Electron / node-pty / xterm.js / Monaco / Milkdown (the full list is in [`README.fanbox.md`](README.fanbox.md)).
- The **Maple Mono** font comes from [subframe7536/maple-font](https://github.com/subframe7536/maple-font) (OFL).
- The color schemes are inspired by the premium color-palette collection from the "**Sèsuǒ (色所)**" WeChat account.

<div align="center">
<br>

**Finder** helps you manage files. The **IDE** helps you write code. **Rurutia / FanBox** helps you see what the AI did on your machine.

MIT License © Rurutia · Built on [Huashu (花叔)'s FanBox](https://github.com/alchaincyf/fanbox)

</div>
