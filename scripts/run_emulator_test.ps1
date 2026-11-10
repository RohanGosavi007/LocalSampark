# LocalSampark - Automated Android Emulator Boot & Sanity Test Runner

$ErrorActionPreference = 'Continue'
$sdkRoot = "C:\Users\Rohan\AppData\Local\Android\Sdk"
$avdManager = "$sdkRoot\cmdline-tools\latest\bin\avdmanager.bat"
$emulator = "$sdkRoot\emulator\emulator.exe"
$adb = "$sdkRoot\platform-tools\adb.exe"
$avdName = "LocalSampark_AVD"
$systemImage = "system-images;android-34;google_apis;x86_64"
$apkPath = "c:\localsampark 04-09-2026\localsampark 25-10-2026\build-android\app-release.apk"
$screenshotPath = "c:\localsampark 04-09-2026\localsampark 25-10-2026\build-android\emulator_screenshot.png"

Write-Host "=========================================="
Write-Host "  LocalSampark Android Emulator Runner    "
Write-Host "=========================================="

# 1. Create AVD if not already created
$existingAvds = & $emulator -list-avds
if ($existingAvds -notcontains $avdName) {
    Write-Host "[1/5] Creating AVD '$avdName'..."
    cmd.exe /c "echo no | `"$avdManager`" create avd -n `"$avdName`" -k `"$systemImage`" --device `"pixel_4`" --force"
} else {
    Write-Host "[1/5] AVD '$avdName' already exists."
}

# 2. Start emulator in background if not already running
$runningDevices = & $adb devices
if ($runningDevices -notmatch 'emulator-\d+') {
    Write-Host "[2/5] Starting emulator '$avdName'..."
    Start-Process -FilePath $emulator -ArgumentList "-avd $avdName -no-snapshot-load -no-boot-anim" -WindowStyle Minimized
} else {
    Write-Host "[2/5] Emulator is already running."
}

# 3. Wait for boot completion
Write-Host "[3/5] Waiting for emulator to boot up..."
& $adb wait-for-device

$booted = $false
for ($i = 0; $i -lt 60; $i++) {
    $status = & $adb shell getprop sys.boot_completed 2>$null
    if ($status.Trim() -eq "1") {
        $booted = $true
        break
    }
    Start-Sleep -Seconds 3
    Write-Host "  Waiting for sys.boot_completed... ($($i*3)s)"
}

if (-not $booted) {
    Write-Warning "Emulator took too long to complete boot."
} else {
    Write-Host "Emulator boot complete!"
}

# 4. Install APK
if (Test-Path $apkPath) {
    Write-Host "[4/5] Installing APK: $apkPath..."
    & $adb install -r $apkPath
} else {
    Write-Warning "APK not found at $apkPath"
}

# 5. Launch App & Capture Screenshot
Write-Host "[5/5] Launching in.localsampark.app..."
& $adb shell monkey -p in.localsampark.app -c android.intent.category.LAUNCHER 1
Start-Sleep -Seconds 10

Write-Host "Capturing emulator screenshot..."
& $adb shell screencap -p /sdcard/screenshot.png
& $adb pull /sdcard/screenshot.png $screenshotPath
Write-Host "Screenshot saved to $screenshotPath"

Write-Host "Checking for crash logs..."
& $adb logcat -d -s AndroidRuntime:E ReactNative:E *:F | Select-Object -Last 40

Write-Host "=========================================="
Write-Host "  Emulator Launch and Test Cycle Complete "
Write-Host "=========================================="
