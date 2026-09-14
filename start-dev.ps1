# LocalSampark Development Launcher
# Starts Backend, Web App, and Mobile Bundler in separate PowerShell windows.
#
# Every window is anchored to $PSScriptRoot. Previously each child process
# inherited the caller's working directory and then ran a relative `cd backend`,
# so launching this script from anywhere other than the repository root opened
# three windows that all failed with "path does not exist".

$Root = $PSScriptRoot

Write-Host "🚀 Starting LocalSampark Development Environment..." -ForegroundColor Cyan

Write-Host "Starting Backend API on port 5000..." -ForegroundColor Green
Start-Process powershell.exe -WorkingDirectory $Root `
    -ArgumentList "-NoExit", "-Command", "npm run dev:backend"

# Give the backend a head start so the web app's first API calls are not
# hitting a port that is not listening yet.
Start-Sleep -Seconds 3

Write-Host "Starting Web Application on port 3000..." -ForegroundColor Yellow
Start-Process powershell.exe -WorkingDirectory $Root `
    -ArgumentList "-NoExit", "-Command", "npm run dev:web"

Write-Host "Starting Expo Mobile Bundler..." -ForegroundColor Magenta
Start-Process powershell.exe -WorkingDirectory (Join-Path $Root 'apps/mobile') `
    -ArgumentList "-NoExit", "-Command", "npx expo start"

Write-Host "✅ All environments started." -ForegroundColor Green
Write-Host "For physical-device testing, run .\start-live-tunnel.ps1 (it opens the" -ForegroundColor Cyan
Write-Host "tunnel and rewrites apps/mobile/.env for you), or see tunnel-setup.md." -ForegroundColor Cyan
