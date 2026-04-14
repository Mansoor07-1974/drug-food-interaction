@echo off
title MolGuard — Backend Tests
color 0E

echo.
echo  ==========================================
echo   MolGuard ^| API Integration Tests
echo   pytest backend tests
echo  ==========================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found.
    echo [INFO]  Run start_backend.bat first to set up the venv.
    pause
    exit /b
)

call venv\Scripts\activate.bat

pip install -q pytest httpx 2>nul

echo [INFO] Running tests...
echo.

pytest tests/test_api.py -v --tb=short

echo.
pause
