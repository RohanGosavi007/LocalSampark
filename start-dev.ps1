# LocalSampark Development Launcher
# Starts Backend, Web App, and Mobile Bundler in separate PowerShell windows

Write-Host "🚀 Starting LocalSampark Development Environment..." -ForegroundColor Cyan

# Start Backend
Write-Host "Starting Backend API on port 5000..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 3

# Start Web App
Write-Host "Starting Web Application on port 3000..." -ForegroundColor Yellow
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd apps/web; npm run dev"

# Start Mobile Bundler
Write-Host "Starting Expo Mobile Bundler..." -ForegroundColor Magenta
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", "cd apps/mobile; npx expo start"

Write-Host "✅ All environments started successfully!" -ForegroundColor Green
Write-Host "Please refer to tunnel-setup.md for physical device testing instructions." -ForegroundColor Cyan
