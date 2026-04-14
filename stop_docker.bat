@echo off
title MolGuard — Stop Docker
color 0C

echo.
echo  Stopping MolGuard Docker services...
echo.

cd /d "%~dp0"
docker compose down

echo.
echo  All services stopped.
pause
