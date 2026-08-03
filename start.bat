@echo off
title LocalSampark Launcher

:: Change to the directory where this batch file is located
cd /d "%~dp0"

:: Store the project path for spawned windows
set "PROJECT_DIR=%~dp0"

echo ==============================================
echo       Starting LocalSampark Services...
echo ==============================================
echo.

:: Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo node_modules not found! Running npm install...
    npm install
    echo.
)

:: Start the Backend Server in a new window
echo [1/3] Starting Backend Server...
start "LocalSampark Backend" /d "%PROJECT_DIR%" cmd /k "npm run dev:backend"

:: Start the Frontend Web Application in a new window
echo [2/3] Starting Frontend Web Application...
start "LocalSampark Frontend" /d "%PROJECT_DIR%" cmd /k "npm run dev:web"

:: Wait for servers to initialize
echo [3/3] Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: Open the web application in the default browser
echo.
echo Launching http://localhost:3000 in your browser...
start http://localhost:3000

echo.
echo All services started! You can close this window.
echo Keep the other command windows open to keep the servers running.
echo ==============================================
timeout /t 3 > nul
exit
