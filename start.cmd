@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Can Node.js 22+ va chay setup.cmd truoc.
 pause
 exit /b 1
)
if not exist node_modules\tiktok-live-connector (
 echo Hay chay setup.cmd truoc lan dau.
 pause
 exit /b 1
)
echo Tam Phai Tran Ma - http://127.0.0.1:8788
echo OBS URL: http://127.0.0.1:8788/obs
echo Nhan Ctrl+C de luu va dung server.
node server.mjs --open
if errorlevel 1 pause
