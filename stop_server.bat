@echo off
chcp 65001 > nul
echo 正在停止运行在 8000 端口的服务器...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    taskkill /f /pid %%a
)
echo 服务器已停止。
pause
