@echo off
title MolGuard — Backend (FastAPI)
color 0A

echo.
echo  ==========================================
echo   MolGuard ^| Drug-Food Interaction API
echo   FastAPI + Chemprop D-MPNN Backend
echo  ==========================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    echo [SETUP] Installing dependencies...
    venv\Scripts\pip install -r requirements.txt
    echo.
)

echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

echo [INFO] Checking model artifacts...
if not exist "model_artifacts\full_checkpoint.pt" (
    echo.
    echo  [WARNING] Model not found at backend\model_artifacts\full_checkpoint.pt
    echo  [WARNING] Running in DEMO MODE with heuristic predictions.
    echo  [WARNING] Train the model in Google Colab and download model_artifacts.zip
    echo  [WARNING] Then extract and place model_artifacts\ inside backend\
    echo.
)

echo [START] Starting FastAPI server on http://localhost:8000
echo [INFO]  API docs available at http://localhost:8000/docs
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
