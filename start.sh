#!/bin/bash
# Start PromoGen — no API keys needed, uses ChatGPT web + Chrome automation
ROOT=$(cd "$(dirname "$0")" && pwd)

echo "Starting PromoGen backend on :3001..."
cd "$ROOT/backend" && node src/app.js &
BACKEND_PID=$!

sleep 1

echo "Starting frontend on :3000..."
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "  PromoGen → http://localhost:3000"
echo "================================"
echo ""
echo "首次使用："
echo "  1. 填寫資訊後點「生成廣告文案」"
echo "  2. Chrome 視窗會自動開啟 ChatGPT"
echo "  3. 若未登入，請在該視窗登入 ChatGPT"
echo "  4. 登入後回到網頁點「重試」"
echo "  5. 發布時同樣需登入 Blogger / Facebook"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped'" EXIT
wait
