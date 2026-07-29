$src = "e:\localsampark 27-07-2026\localsampark 27-07-2026"
$dst = "C:\ls_proj"

Write-Host "Creating destination directory..."
New-Item -ItemType Directory -Force -Path $dst | Out-Null

Write-Host "Copying project files..."
Get-ChildItem -Path $src -Exclude ".gradle",".idea",".git","node_modules","dist" | Copy-Item -Destination $dst -Recurse -Force

Write-Host "Installing dependencies..."
Set-Location "$dst\apps\mobile"
npm install --legacy-peer-deps

Write-Host "Starting Gradle build..."
$env:ANDROID_HOME = "C:\Users\Admin\AppData\Local\Android\Sdk"
$env:NODE_OPTIONS = "--max-old-space-size=8192"
Set-Location "$dst\apps\mobile\android"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
