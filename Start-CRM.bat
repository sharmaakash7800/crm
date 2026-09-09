@echo off
title Sheetless CRM (Portable Offline)
echo ===================================================
echo             Sheetless CRM (Offline)
echo ===================================================

cd /d "%~dp0"

:: Use portable node.exe if present, else fallback to system node
if exist "%~dp0node.exe" (
    set "NODE_CMD=%~dp0node.exe"
) else (
    set "NODE_CMD=node"
)

echo Starting CRM Server...
start /B "" "%NODE_CMD%" server/index.js > nul 2>&1

:: Wait 2 seconds for server to boot
timeout /t 2 /nobreak > nul

echo Opening CRM in default browser...
start http://localhost:5000

echo ===================================================
echo  CRM is running successfully at: http://localhost:5000
echo  (Do NOT close this window while using the CRM)
echo ===================================================
cmd /k
