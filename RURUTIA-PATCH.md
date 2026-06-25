# Rurutia 改造补丁说明

把上游 **FanBox**（`github.com/alchaincyf/fanbox`）改造成 **Rurutia** 的全部改动清单 + 上游更新后的重新套用方法。

基线：`c93a486`（v2.3.1）。

---

## 一、改动清单

### A. 新增文件（纯追加，上游更新永不冲突）

| 文件 | 作用 |
|---|---|
| `public/ui-patch.css` | 第一层 UI 视觉改造：现代化变量契约、分段/按钮/侧栏/搜索/进度条重绘、终端外壳、Maple 字体 `@font-face` + 字体变量覆盖、拖拽区、用量警告条样式、终端图标尺寸等。**靠后加载覆盖，不改原 CSS** |
| `public/soft-patch.css` | 第二层「柔和座舱」视觉：圆角/柔光/仪表化用量/文件卡片/终端圆角卡 + 头部圆弧、顶部整条可拖拽留白 + 交通灯避让、终端标签色脊、滚动条重做（轨道缩进避开圆角）、全局强制 Maple Mono、拖入收藏/Agent 排序落点高亮、Agent 更新时间右对齐。纯覆盖，可整删回退 |
| `public/themes-patch.js` | 18 套「色所」配色皮肤 + 色卡选择器 + 主题切换猴子补丁（默认**像素光**）。自注入，不改 app.js 主题逻辑 |
| `public/vendor/fonts/maple/*.woff2` | Maple Mono CN 字体（中文+日文假名，4 字重，约 22MB） |
| `public/vendor/icons/` | 早期位图图标（现已改用内联 SVG，可保留或删除） |
| `public/logo.png` / `public/favicon.png` | 侧栏 logo / 网页图标（明日香线稿，纯白底） |
| `README.md` / `README.en.md` / `README.ja.md` / `docs/screenshots/*` | 三语言仓库说明（中 / 英 / 日，顶部互链）+ 主题 / 界面截图 |

### B. 编辑的上游文件（上游更新时**可能冲突**，需重新套用）

| 文件 | 改了什么 | 冲突风险 |
|---|---|---|
| `public/index.html` | `<title>`、favicon/preload/ui-patch.css/themes-patch.js 引用、侧栏品牌块换 logo+改名、快速入口/Agent 分区加 `+` 按钮、终端 10 个动作按钮换内联 SVG | 中 |
| `public/app.js` | 用量面板（官方区恒显+原因+重试+≥85% 警告条+桌面通知+45s 刷新）、快速入口/Agent 增删 UI、`SVG.folder` 形状、`syncMute` 铃铛改 SVG；**本轮新增**：`tintTheme` 终端背景跟随 `--bg`、`startTabDrag` 终端标签指针弹性拖拽、`makeDropZone` 拖目录进收藏/快速入口、`makeSortable`+`applyAgentOrder` Agent 列表内拖动排序（localStorage 持久化） | 中 |
| `server.js` | `/api/roots` 与 `/api/agent-projects` 加 POST 增删 + 持久化（config.json 的 quickRoots/agentHidden/agentPinned）、`claudeOfficialLimits` 返回原因对象、`agentUsage` claudeOut 逻辑；**本轮新增**：`claudeOfficialLimits` 加 10 分钟缓存 + `rate_limit_error` 时沿用上次缓存（修复 Claude 用量「无数据」根因） | 中 |
| `electron/main.js` | `app.setName`、菜单「关于 Rurutia」 | 低 |
| `package.json` | productName / dmg 标题 / description 改 Rurutia | 低 |
| `build/icon*` | 应用图标（二进制） | 低 |

> **内部标识刻意未改**：`~/.fanbox` 配置目录、`appId`、npm 包名、preload 的 `fanbox*` 桥接名——动了会丢配置/断渲染层。

---

## 二、上游更新后重新套用

### 最省事：一键脚本

```bash
./update-from-upstream.sh
```

它会：拉上游 `origin`(alchaincyf/fanbox) → 把 `rurutia` 分支的所有改动 rebase 上去 → 无冲突直接完成；有冲突只会在下面 B 表那几个编辑过的上游文件里，按提示 `git add` + `git rebase --continue` 即可。完事 `git push publish rurutia` 推到自己仓库。

### 手动（等价）

全部改动已提交在分支 **`rurutia`** 上。上游出新版后：

```bash
cd fanbox
git fetch origin                      # 拉上游新版（如 origin/master 到了 v2.4.0）
git checkout rurutia
git rebase origin/master              # 把我们的提交搬到新版之上
#   → 若有冲突，只会出现在上面 B 表那 5 个文件，按提示解决后：
git rebase --continue
```

或者用 **补丁文件**（`rurutia.patch`，含二进制）：

```bash
git checkout origin/master -b rurutia-new
git am rurutia.patch                  # 套用；冲突时 git am --3way 再手动解
```

冲突处理要点：B 表里的文件大多是**在原函数里插入新段**，上游若没动同一处就自动合并；动了同一函数才需手动挑一下。新增文件（A 表）永远不冲突。

---

## 三、重新打包成 App

```bash
npm install                                  # 首次
npm run rebuild                              # 重编 node-pty 到 electron ABI
CSC_IDENTITY_AUTO_DISCOVERY=false \
  npx electron-builder --mac --dir -c.mac.identity=null   # 未签名 .app → dist/mac-arm64/Rurutia.app
```

> 用本机自己的 Apple 证书可去掉 `-c.mac.identity=null` 并改 `package.json` 的 identity；要 dmg 把 `--dir` 换成默认。
