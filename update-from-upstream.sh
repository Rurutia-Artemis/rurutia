#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# 一键从上游 FanBox 同步：拉上游最新 → 把 Rurutia 的所有改动 rebase 上去 → 报告冲突
#   用法：./update-from-upstream.sh
#   原理：我们的全部改动都在 rurutia 分支上（c93a486 之上的几个提交）。
#         绝大多数是新增文件（soft-patch.css / themes-patch.js / ui-patch.css / 字体 / README…），
#         rebase 时永不冲突；只有少数编辑过的上游文件（app.js / server.js / index.html /
#         electron/main.js / package.json）在上游动了同一处时才需手动解。
# ──────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

# 上游 = origin（alchaincyf/fanbox）；我们的仓库 = publish（你自己的 fork）
UPSTREAM_REMOTE="origin"
echo "▸ 拉取上游 ${UPSTREAM_REMOTE} (alchaincyf/fanbox)…"
git fetch "${UPSTREAM_REMOTE}"

# 上游主分支（master / main 自动识别）
UB=$(git remote show "${UPSTREAM_REMOTE}" 2>/dev/null | sed -n 's/.*HEAD branch: //p')
UB=${UB:-master}
echo "▸ 上游主分支：${UPSTREAM_REMOTE}/${UB}"

# 先存一下当前未提交的改动（如果有），避免 rebase 被挡
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "▸ 有未提交改动，先 stash…"; git stash push -u -m "auto-stash-before-update"
  STASHED=1
fi

echo "▸ 把本地改动 rebase 到 ${UPSTREAM_REMOTE}/${UB} …"
if git rebase "${UPSTREAM_REMOTE}/${UB}"; then
  echo "✓ 更新完成，无冲突。"
else
  echo ""
  echo "⚠ 出现冲突——只会在我们编辑过的上游文件里："
  echo "    public/app.js · server.js · public/index.html · electron/main.js · package.json"
  echo "  解决步骤：编辑冲突文件 → git add <文件> → git rebase --continue（如此重复直到完成）"
  echo "  实在不想解就：git rebase --abort 回到更新前。"
  exit 1
fi

[ -n "${STASHED:-}" ] && { echo "▸ 恢复之前 stash 的未提交改动…"; git stash pop || true; }

echo ""
echo "✓ 已同步到上游最新。下一步可推到你的仓库：git push publish rurutia"
echo "  重新打包 App：见 RURUTIA-PATCH.md 第三节。"
