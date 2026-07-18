@echo off
title LocalSampark Launcher
echo ==============================================
echo       Starting LocalSampark Services...
echo ==============================================
echo.

:: Start the Backend Server in a new window
echo [1/3] Starting Backend Server...
start "LocalSampark Backend" cmd /k "npm run dev:backend"

:: Start the Frontend Web Application in a new window
echo [2/3] Starting Frontend Web Application...
start "LocalSampark Frontend" cmd /k "npm run dev:web"

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
