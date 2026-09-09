@echo off
title Sheetless CRM - Setup for New PC
echo ===================================================
echo      Installing Dependencies for Sheetless CRM
echo ===================================================

cd /d "%~dp0"

echo Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org and try again.
    pause
    exit /b
)

echo [1/2] Installing Backend Dependencies...
call npm install

echo [2/2] Installing Frontend Dependencies...
cd client
call npm install
cd ..

echo ===================================================
echo [SUCCESS] Setup Complete!
echo You can now run 'Start-CRM.bat' to launch the CRM.
echo ===================================================
pause
