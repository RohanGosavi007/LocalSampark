@echo off
title LocalSampark Server Launcher
echo ========================================================
echo Starting LocalSampark Backend, Database and Web Servers...
echo ========================================================

:: Change directory to the folder containing this batch file
cd /d "%~dp0"

:: If localsampark subdirectory exists, enter it
if exist localsampark (
  cd localsampark
)

:: Start database containers in background
echo Starting database containers (PostgreSQL and Redis)...
docker-compose up -d postgres redis

:: Start backend in a new command window
echo Launching Backend server...
start "LocalSampark Backend" cmd.exe /c "npm.cmd run dev:backend"

:: Start Next.js web application in a new command window
echo Launching Next.js Web server...
start "LocalSampark Web App" cmd.exe /c "npm.cmd run dev:web"

echo Waiting for servers to initialize...
ping 127.0.0.1 -n 6 >nul

echo Opening LocalSampark in the default web browser...
start http://localhost:3000

echo ========================================================
echo Servers are running. You can close this console.
echo Keep the launched Backend and Web App windows open.
echo ========================================================
pause
