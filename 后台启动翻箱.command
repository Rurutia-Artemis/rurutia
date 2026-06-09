#!/bin/bash
# 双击启动「后台常驻」翻箱 FanBox —— 起好后可直接关掉这个窗口，服务照常在后台运行。
cd "$(dirname "$0")"
# 兜底：把常见 node 安装位置加进 PATH（homebrew / 系统位置双击时默认未必在 PATH）
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
PORT="${FANBOX_PORT:-4567}"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  还没装 Node.js。请到 https://nodejs.org 下载 LTS 装好，再双击一次。"
  echo ""
  read -n 1 -s -r -p "  按任意键关闭这个窗口…"
  exit 1
fi

mkdir -p "$HOME/.fanbox"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  翻箱已经在运行，正在打开浏览器…"
else
  echo "  正在后台启动翻箱…"
  FANBOX_NO_OPEN=1 nohup node server.js > "$HOME/.fanbox/run.log" 2>&1 &
  disown
  sleep 1.5
fi

open "http://localhost:$PORT"
echo ""
echo "  ✓ 已打开 http://localhost:$PORT"
echo "    这个窗口可以直接关掉，服务会继续在后台运行。"
echo "    想停止服务，双击「停止翻箱.command」。"
sleep 2
