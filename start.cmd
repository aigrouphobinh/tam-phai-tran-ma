@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Can Node.js 22 hoac moi hon.
  pause
  exit /b 1
)
echo Tam Phai Tran Ma V2 - http://127.0.0.1:8788/admin
echo OBS URL: http://127.0.0.1:8788/obs
echo Nhan Ctrl+C de dung server.
start "" "http://127.0.0.1:8788/admin"
node server.mjs
if errorlevel 1 pause
