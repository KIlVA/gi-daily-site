@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo 正在获取本机的局域网 IP 地址...
for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do set LOCAL_IP=%%a

echo =======================================================
echo 本机访问:  http://localhost:8000
echo 内网分享:  http://%LOCAL_IP%:8000
echo 请把内网链接发给你的同事传阅！
echo =======================================================

echo 正在启动本地服务器...
start /b python -m http.server 8000
timeout /t 2 /nobreak > nul
start http://localhost:8000
echo 服务器已启动，按任意键关闭服务器并退出。
pause > nul
