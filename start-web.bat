@echo off
setlocal
cd /d "%~dp0web\server"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22.5 or newer is required.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing web server dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo.
echo Starting ClothTravel web API + admin...
echo User web:  http://127.0.0.1:3000
echo Admin:     http://127.0.0.1:3000/admin
echo Phone LAN: see the address printed below
echo.
start "ClothTravel Web" cmd /c "node index.js"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:3000/admin
endlocal
