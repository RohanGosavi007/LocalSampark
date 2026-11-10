# LocalSampark - Complete Download, Extract & Launch Emulator

$ErrorActionPreference = 'Continue'
$zipPath = "$env:TEMP\x86_64-34_r14.zip"
$expectedSize = 1563721130
$sdkRoot = "C:\Users\Rohan\AppData\Local\Android\Sdk"
$destDir = "$sdkRoot\system-images\android-34\google_apis"
$url = "https://dl.google.com/android/repository/sys-img/google_apis/x86_64-34_r14.zip"

Write-Host "=========================================="
Write-Host " Resuming Android 34 System Image Download"
Write-Host "=========================================="

$completed = $false
for ($attempt = 1; $attempt -le 25; $attempt++) {
    $currentSize = 0
    if (Test-Path $zipPath) {
        $currentSize = (Get-Item $zipPath).Length
    }
    Write-Host ("Attempt {0}: Current size = {1:N1} MB / {2:N1} MB" -f $attempt, ($currentSize / 1MB), ($expectedSize / 1MB))
    
    if ($currentSize -ge $expectedSize) {
        $completed = $true
        Write-Host "Download verified complete!"
        break
    }
    
    # Run curl with resume
    curl.exe -L -C - --retry 5 --retry-delay 3 --retry-connrefused -o $zipPath $url
    Start-Sleep -Seconds 2
}

if (-not $completed) {
    if (Test-Path $zipPath) {
        if ((Get-Item $zipPath).Length -ge $expectedSize) {
            $completed = $true
        }
    }
}

if (-not $completed) {
    Write-Error "Download did not reach expected size of $expectedSize bytes."
    exit 1
}

Write-Host "`n[2/4] Extracting system image to $destDir..."
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

tar.exe -xf $zipPath -C $destDir
Write-Host "Extraction completed."

# Clean up zip
Remove-Item -Force $zipPath -ErrorAction SilentlyContinue

# Verify extraction
$targetImg = "$destDir\x86_64\system.img"
if (-not (Test-Path $targetImg)) {
    Write-Warning "system.img not found at $targetImg. Searching extracted files..."
    Get-ChildItem -Path $destDir -Recurse | Select-Object -First 10
} else {
    Write-Host "Verified system.img exists: $targetImg"
}

Write-Host "`n[3/4] Triggering Emulator Test Runner..."
& "$PSScriptRoot\run_emulator_test.ps1"
