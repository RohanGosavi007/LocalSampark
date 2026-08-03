$src = "e:\localsampark 27-07-2026\localsampark 27-07-2026"
$dst = "E:\ls_build_temp"

Write-Host "========================================="
Write-Host "  LocalSampark Release APK Build Script"
Write-Host "========================================="

Write-Host "`n[1/8] Creating destination directory..."
New-Item -ItemType Directory -Force -Path $dst | Out-Null

Write-Host "[2/8] Copying project files (excluding .gradle, .idea, .git, node_modules, dist, build-android)..."
node fast_copy.js
if ($LASTEXITCODE -ne 0) { Write-Error "Node copy failed"; exit 1 }
Write-Host "[3/8] Cleaning old Gradle build caches..."
Remove-Item -Recurse -Force "$dst\apps\mobile\android\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$dst\apps\mobile\android\app\build" -ErrorAction SilentlyContinue

Write-Host "[4/8] Installing root monorepo dependencies..."
Set-Location $dst
npm install --legacy-peer-deps 2>&1 | Out-Null

Write-Host "[5/8] Installing mobile app dependencies..."
Set-Location "$dst\apps\mobile"
npm install --legacy-peer-deps

Write-Host "[6/8] Applying expo-modules-core safety patch..."
node scripts/postinstall.js

Write-Host "[7/8] Setting environment variables..."
$env:JAVA_HOME = "C:\Users\Admin\jdk17\jdk-17.0.19+10"
$env:ANDROID_HOME = "C:\Users\Admin\AppData\Local\Android\Sdk"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

Write-Host "  JAVA_HOME  = $env:JAVA_HOME"
Write-Host "  ANDROID_HOME = $env:ANDROID_HOME"
Write-Host "  NODE_OPTIONS = $env:NODE_OPTIONS"

Write-Host "`n[8/8] Starting Gradle release build (arm64-v8a)..."
Set-Location "$dst\apps\mobile\android"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon

Write-Host "`n========================================="
Write-Host "  Build Complete!"
Write-Host "  APK location: $dst\apps\mobile\android\app\build\outputs\apk\release\"
Write-Host "========================================="
