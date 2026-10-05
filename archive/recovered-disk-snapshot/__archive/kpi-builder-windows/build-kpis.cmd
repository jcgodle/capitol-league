@echo off
setlocal
cd /d "%~dp0"
echo Building kpis.json (this may take ~5-15 seconds)...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install Node 18+ from https://nodejs.org and try again.
  pause
  exit /b 1
)
node build-kpis.cjs
echo.
pause
