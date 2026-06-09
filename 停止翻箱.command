#!/bin/bash
# 双击停止后台运行的翻箱 FanBox。
PORT="${FANBOX_PORT:-4567}"
PIDS=$(lsof -ti TCP:"$PORT" -sTCP:LISTEN 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill
  echo "  ✓ 翻箱已停止（端口 $PORT 已释放）。"
else
  echo "  翻箱当前没有在运行。"
fi
sleep 1.5
