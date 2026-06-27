# v2.7.1 设计 / 构建归档（2026-06-28）

发布：`Rurutia-Artemis/rurutia` · tag `v2.7.1` · commit `__COMMIT__`（构建所用代码）。
DMG：`Rurutia-2.7.1-arm64.dmg`，已 Developer ID 签名 + Apple 公证 + staple（见 `build.log`）。

两处 app 内改动，都小。

## 1. 终端标签彩虹色：hueOf 改黄金角

`app.js` 的 `hueOf(path)` 原来用 `h*31+charCode` 哈希路径取色相。问题：哈希被长路径的公共前缀主导，`/Users/rurutia/Documents/RuruCode/` 下的几个项目挤到相近色相。实测旧算法：

| 项目 | 旧 hue | 新 hue |
|---|---|---|
| Reverie | 118（绿） | 25（橙） |
| RuruAgent | 137（绿） | 300（品红） |
| Rurubox | 215（蓝） | 163（青） |

Reverie 和 RuruAgent 差 19°，肉眼就是「两个都绿」——这就是「新开三个终端全绿」的来由。

改法：按会话内项目出现顺序，用黄金角 137.508° 铺色环（`seq*137.508+25`），每个新项目的色相尽量离已有的远。同一项目仍恒定一色，标签和面包屑的配对色点不变。用户拍板「按项目」上色（同项目同色），不是「按标签」。

## 2. 面包屑徽章不再换行

`.breadcrumb .proj-badge` 是 flex 项却漏了 `white-space:nowrap` 和 `flex-shrink`，顶栏被拖窄时被挤压换行，「GIT 项目」断成两行、文字上下跳。`soft-patch.css` 补 `nowrap + flex-shrink:0`，徽章恒一行硬药丸，挤压交给面包屑横滚。

无头 Chrome 窄宽度（260px）核对过：`badge-before.png`「改前」压成圆圈两行，`badge-after.png`「改后」一行药丸。

> 注：此图用无头 Chrome 套真实的旧/新 `soft-patch.css` 渲染，终端/面包屑真机以 Electron 为准。

## 不在这版包里

- Claude Code `dark-ansi`、Codex `tui.theme="ansi"`：改的是用户机器上的全局配置（`~/.claude/settings.json`、`~/.codex/config.toml`），让 CC/Codex 在终端里跟 Rurutia 皮肤的 16 ANSI 走。不进 app 包，所以不算这版功能点。
- 「切皮肤同步 CC 自定义主题卡片」(feature B)：仍 deferred，等用户看过 dark-ansi 效果再定。

细节见仓库根 `CHANGELOG.md` 的 `[2.7.1]` 段。
