@echo off
title MolGuard — Dataset Augmentation
color 0E

echo.
echo  ==========================================
echo   MolGuard ^| Dataset Augmentation Script
echo   Fetches new drug SMILES from PubChem
echo  ==========================================
echo.

cd /d "%~dp0"

if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Backend venv not found. Run start_backend.bat first.
    pause
    exit /b
)

call backend\venv\Scripts\activate.bat

echo [INFO] Running augmentation script...
echo [INFO] This will fetch SMILES from PubChem for 10 new drugs.
echo.

python scripts\augment_dataset.py

echo.
echo [DONE] Check datasets\drug_interactions_augmented.csv
echo [INFO] Upload augmented CSV to Colab and retrain for better accuracy.
echo.

pause
