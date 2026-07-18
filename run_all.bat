@echo off
title LocalSampark Complete Launcher
echo ==============================================
echo       Starting All LocalSampark Services...
echo ==============================================
echo.

:: Start the Backend Server
echo [1/3] Starting Backend Server...
start "LocalSampark Backend" cmd /k "npm run dev:backend"

:: Start the Frontend Web Application
echo [2/3] Starting Frontend Web Application...
start "LocalSampark Frontend Web" cmd /k "npm run dev:web"

:: Start the Admin Web Application
echo [3/3] Starting Frontend Admin Application...
start "LocalSampark Frontend Admin" cmd /k "npm run dev:admin"

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
