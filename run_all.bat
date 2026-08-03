@echo off
title LocalSampark Complete Launcher

:: Change to the directory where this batch file is located
cd /d "%~dp0"

:: Store the project path for spawned windows
set "PROJECT_DIR=%~dp0"

echo ==============================================
echo       Starting All LocalSampark Services...
echo ==============================================
echo.

:: Check if node_modules exists, if not run npm install
if not exist "node_modules" (
    echo node_modules not found! Running npm install...
    npm install
    echo.
)

:: Start the Backend Server
echo [1/3] Starting Backend Server...
start "LocalSampark Backend" /d "%PROJECT_DIR%" cmd /k "npm run dev:backend"

:: Start the Frontend Web Application
echo [2/3] Starting Frontend Web Application...
start "LocalSampark Frontend Web" /d "%PROJECT_DIR%" cmd /k "npm run dev:web"

:: Start the Admin Web Application
echo [3/3] Starting Frontend Admin Application...
start "LocalSampark Frontend Admin" /d "%PROJECT_DIR%" cmd /k "npm run dev:admin"

:: Wait for servers to initialize
echo Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: Open the web applications in the default browser
echo.
echo Launching Web App (http://localhost:3000) and Admin App (http://localhost:3001) in your browser...
start http://localhost:3000
start http://localhost:3001

echo.
echo All services started! You can close this window.
echo Keep the other command windows open to keep the servers running.
echo ==============================================
timeout /t 3 > nul
exit
