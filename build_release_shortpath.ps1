$src = "e:\localsampark 27-07-2026\localsampark 27-07-2026"
$dst = "C:\ls_proj"

Write-Host "========================================="
Write-Host "  LocalSampark Release APK Build Script"
Write-Host "========================================="

Write-Host "`n[1/7] Creating destination directory..."
New-Item -ItemType Directory -Force -Path $dst | Out-Null

Write-Host "[2/7] Copying project files (excluding .gradle, .idea, .git, node_modules, dist, build-android)..."
Get-ChildItem -Path $src -Exclude ".gradle",".idea",".git","node_modules","dist","build-android" | Copy-Item -Destination $dst -Recurse -Force

Write-Host "[3/7] Cleaning old Gradle build caches..."
Remove-Item -Recurse -Force "$dst\apps\mobile\android\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$dst\apps\mobile\android\app\build" -ErrorAction SilentlyContinue

Write-Host "[4/7] Installing root monorepo dependencies..."
Set-Location $dst
npm install --legacy-peer-deps 2>&1 | Out-Null

Write-Host "[5/7] Installing mobile app dependencies..."
Set-Location "$dst\apps\mobile"
npm install --legacy-peer-deps

Write-Host "[6/7] Setting environment variables..."
$env:JAVA_HOME = "C:\Users\Admin\jdk17\jdk-17.0.19+10"
$env:ANDROID_HOME = "C:\Users\Admin\AppData\Local\Android\Sdk"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

Write-Host "  JAVA_HOME  = $env:JAVA_HOME"
Write-Host "  ANDROID_HOME = $env:ANDROID_HOME"
Write-Host "  NODE_OPTIONS = $env:NODE_OPTIONS"

Write-Host "`n[7/7] Starting Gradle release build (arm64-v8a)..."
Set-Location "$dst\apps\mobile\android"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon

Write-Host "`n========================================="
Write-Host "  Build Complete!"
Write-Host "  APK location: $dst\apps\mobile\android\app\build\outputs\apk\release\"
Write-Host "========================================="
