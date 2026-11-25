@echo off
setlocal
cd /d "%~dp0mobile"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22.5 or newer is required.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing mobile dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Make sure web/server is running at the API base configured in app.json.
echo Starting Expo on LAN...
echo Scan the QR code with Expo Go or use a development build.
echo.
call npx expo start --lan
endlocal
