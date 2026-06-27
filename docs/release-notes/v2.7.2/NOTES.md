# v2.7.2 设计 / 构建归档（2026-06-28）

发布：`Rurutia-Artemis/rurutia` · tag `v2.7.2` · commit `f682a4c`（构建所用代码）。
DMG：`Rurutia-2.7.2-arm64.dmg`，Developer ID 签名 + Apple 公证 + staple（见 `build.log`）。

## 终端工具栏图标 → 官方品牌标

四个启动器换成各家官方矢量标，实心：

- **Claude**：Anthropic 官方星芒（simple-icons，CC0）
- **Codex**：OpenAI 官方花结（Bootstrap Icons，MIT —— simple-icons 因商标把 OpenAI 下架了，改从 `twbs/icons` 取真实 path）
- **微信**：官方双气泡（simple-icons，CC0）
- **普通终端**：没有品牌标，自做实心圆角窗 + `>_`（`mask` 挖空），与三个品牌标同为实心、并排统一

原来的图标是手画的、辨识度差（Codex 那朵云常被当成「Cloud Code」）。层级：启动器实心高亮（`--text`），次级动作线性压淡（`--text-faint`），hover 各提一档。

## 终端标签自定义光标

hover 标签从系统小手换成斜箭头，实心填当前皮肤强调色 + 白描边，跟皮肤换色。data URI 不能引 CSS 变量，所以 `themes-patch.js` 的 `applySkin` 按 `--accent` 现拼一份塞给 `--tab-cursor`，`soft-patch.css` 用 `cursor: var(--tab-cursor, pointer)`。

落点：`index.html`（四个启动器 SVG）、`soft-patch.css`（层级 + 光标 var）、`themes-patch.js`（`setTabCursor`）。

## 核对

- 无头 Chrome 从**真实** `index.html` 抽四个新 SVG 渲染：四个官方标都正确（`design-preview.png` 设计稿、`landed.png` 落地稿）。
- `node --check` 两个 JS 都过；光标 data URI encode→decode 往返是合法 SVG。
- 光标的实际悬停样子浏览器截图抓不到，真机为准。

## 图标素材出处

- Anthropic / WeChat：[simple-icons](https://github.com/simple-icons/simple-icons)（CC0）
- OpenAI：[Bootstrap Icons](https://github.com/twbs/icons)（MIT），因 simple-icons 下架了 OpenAI 商标
