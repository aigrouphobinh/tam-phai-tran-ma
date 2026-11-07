@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Can cai Node.js 22+ truoc khi chay.
 pause
 exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
 echo Can Node.js 22 hoac moi hon.
 pause
 exit /b 1
)
call npm ci --ignore-scripts --no-audit --no-fund
if errorlevel 1 (
 echo Khong cai duoc thu vien. Kiem tra mang va thu lai.
 pause
 exit /b 1
)
node --input-type=module -e "await import('tiktok-live-connector')"
if errorlevel 1 (
 echo Thieu thu vien giai ma TikTok.
 pause
 exit /b 1
)
echo Da cai xong. Mo start.cmd de chay game.
pause
