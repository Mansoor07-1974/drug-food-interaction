@echo off
title MolGuard — Docker Deployment
color 0B

echo.
echo  ==========================================
echo   MolGuard ^| Docker Deployment
echo   Starts Backend + Frontend via Docker
echo  ==========================================
echo.

cd /d "%~dp0"

:: Check Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker not found. Install Docker Desktop from https://docker.com
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose not found. Update Docker Desktop.
    pause
    exit /b 1
)

echo [CHECK] Docker found.

:: Check model artifacts
if not exist "backend\model_artifacts\full_checkpoint.pt" (
    echo.
    echo  [WARNING] Model weights not found at backend\model_artifacts\full_checkpoint.pt
    echo  [WARNING] Backend will run in DEMO mode.
    echo  [INFO]    Train in Colab, download model_artifacts.zip, extract here.
    echo.
    timeout /t 3 /nobreak >nul
)

echo [BUILD] Building Docker images (first run may take a few minutes)...
docker compose build

echo.
echo [START] Launching services...
docker compose up -d

echo.
echo  ==========================================
echo   Services started!
echo.
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo  ==========================================
echo.

:: Open browser
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo [INFO] To stop: run stop_docker.bat or  docker compose down
echo.
pause
