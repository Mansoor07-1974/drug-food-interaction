@echo off
title MolGuard — Frontend (React + Vite)
color 0B

echo.
echo  ==========================================
echo   MolGuard ^| Drug-Food Interaction UI
echo   React 18 + Vite Dev Server
echo  ==========================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [SETUP] Installing Node packages...
    npm install
    echo.
)

echo [START] Starting Vite dev server on http://localhost:5173
echo.

npm run dev

pause
