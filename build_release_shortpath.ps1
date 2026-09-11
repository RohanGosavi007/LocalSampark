<#
    LocalSampark - Release APK build via a short working path.

    WHY THIS SCRIPT EXISTS
    ----------------------
    The repository lives at a long path containing spaces, e.g.
    "C:\localsampark 04-09-2026\localsampark 12-08-2026". CMake refuses to place
    an object file when the full path would exceed CMAKE_OBJECT_PATH_MAX (250
    characters), and several native React Native modules -- react-native-nitro-image
    is the first to blow the limit -- build inside
    node_modules\<pkg>\android\.cxx\..., which adds well over a hundred characters
    on its own. The build then fails with:

        ninja: error: manifest 'build.ninja' still dirty after 100 tries

    android/app/build.gradle stages the :app module's own intermediates under a
    short path (see cxxStagingDirectory), but that setting only applies to :app.
    It cannot move a LIBRARY module's .cxx directory, so the only reliable fix is
    to build the whole project from a short path. That is what this script does.

    WHAT CHANGED
    ------------
    The previous version hardcoded one developer's machine: a $src on E: that no
    longer exists, and JAVA_HOME/ANDROID_HOME under C:\Users\Admin. On any other
    checkout it copied nothing and then failed on a missing JDK. It now locates
    the repository from its own location and discovers the toolchain, so it works
    on any machine without editing.

    USAGE
    -----
        powershell -ExecutionPolicy Bypass -File .\build_release_shortpath.ps1
        ... -Variant Debug            # debug APK instead of release
        ... -Dest D:\ls_build         # different scratch location
        ... -Architectures arm64-v8a,armeabi-v7a
#>
[CmdletBinding()]
param(
    # Scratch build location. Keep it SHORT and space-free -- that is the whole
    # point of the script.
    [string]$Dest = 'C:\ls_build',

    [ValidateSet('Release', 'Debug')]
    [string]$Variant = 'Release',

    [string]$Architectures = 'arm64-v8a'
)

$ErrorActionPreference = 'Stop'

# The repo root is wherever this script lives, so a moved or renamed checkout
# needs no edit.
$src = $PSScriptRoot
if (-not (Test-Path (Join-Path $src 'apps\mobile\android\gradlew.bat'))) {
    throw "Not a LocalSampark checkout: $src (apps\mobile\android\gradlew.bat missing)"
}

Write-Host '========================================='
Write-Host '  LocalSampark Release APK Build Script'
Write-Host '========================================='
Write-Host "  Source : $src"
Write-Host "  Scratch: $Dest"
Write-Host "  Variant: $Variant  ($Architectures)"

# ── Toolchain discovery ─────────────────────────────────────────────────────
# Honour an existing environment first; only go looking if it is unset.
if (-not $env:ANDROID_HOME) {
    $sdkCandidates = @(
        (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
        'C:\Android\Sdk'
    )
    # android/local.properties is gitignored and machine-specific; it is the
    # most authoritative answer when present.
    $localProps = Join-Path $src 'apps\mobile\android\local.properties'
    if (Test-Path $localProps) {
        $sdkLine = Select-String -Path $localProps -Pattern '^\s*sdk\.dir\s*=\s*(.+)$'
        if ($sdkLine) {
            $sdkCandidates = @($sdkLine.Matches[0].Groups[1].Value.Trim().Replace('\', '\')) + $sdkCandidates
        }
    }
    $env:ANDROID_HOME = $sdkCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
}
if (-not $env:ANDROID_HOME) {
    throw 'Android SDK not found. Set ANDROID_HOME, or put sdk.dir in apps\mobile\android\local.properties.'
}

if (-not $env:JAVA_HOME) {
    # AGP for this project requires JDK 17; a newer default JDK on PATH will fail
    # the build, so prefer an explicit 17 over whatever `java` resolves to.
    $jdk = Get-ChildItem -Path 'C:\Program Files\*\jdk-17*', 'C:\Program Files\*\*jdk*17*' -Directory -ErrorAction SilentlyContinue |
           Where-Object { Test-Path (Join-Path $_.FullName 'bin\javac.exe') } |
           Select-Object -First 1
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}
if (-not $env:JAVA_HOME) {
    throw 'JDK 17 not found. Set JAVA_HOME to a JDK 17 installation.'
}

$env:NODE_OPTIONS = '--max-old-space-size=8192'
Write-Host "  JAVA_HOME    = $env:JAVA_HOME"
Write-Host "  ANDROID_HOME = $env:ANDROID_HOME"

# ── 1. Mirror the source to the short path ──────────────────────────────────
Write-Host "`n[1/5] Mirroring project to $Dest ..."
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
# node_modules is excluded deliberately: it is reinstalled below so the scratch
# tree gets a clean, correctly-resolved dependency graph rather than a copy that
# still carries absolute paths and .cxx state from the source tree -- stale .cxx
# is itself a cause of the "build.ninja still dirty" failure.
robocopy $src $Dest /MIR `
    /XD .git node_modules dist build-android build .gradle .next .expo test-results playwright-report `
    /XF *.log `
    /NFL /NDL /NJH /NJS /NP | Out-Null
# Robocopy exit codes below 8 are informational (files copied / extra files).
if ($LASTEXITCODE -ge 8) { throw "Robocopy failed with exit code $LASTEXITCODE" }

# ── 2/3. Dependencies ───────────────────────────────────────────────────────
# `npm ci` rather than `npm install --legacy-peer-deps`: a release build must
# install exactly what the lockfile pins. If npm ci fails here the lockfile has
# drifted from package.json and that needs fixing, not bypassing.
Write-Host '[2/5] Installing root monorepo dependencies (npm ci) ...'
Push-Location $Dest
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Root npm ci failed.' }
Pop-Location

Write-Host '[3/5] Installing mobile dependencies (npm ci) ...'
Push-Location (Join-Path $Dest 'apps\mobile')
# postinstall runs scripts/postinstall.js + patch-package; do not skip scripts.
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Mobile npm ci failed.' }
Pop-Location

# ── 4. Build ────────────────────────────────────────────────────────────────
# No manual `expo export:embed` step: android/app/build.gradle already sets
# bundleCommand = "export:embed" inside the react {} block, so assembleRelease
# produces index.android.bundle itself. Pre-bundling by hand races the Gradle
# task for the same output path.
Write-Host "[4/5] Gradle assemble$Variant ($Architectures) ..."
Push-Location (Join-Path $Dest 'apps\mobile\android')
& .\gradlew.bat "assemble$Variant" "-PreactNativeArchitectures=$Architectures" --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { throw "Gradle build failed with exit code $gradleExit" }

# ── 5. Report ───────────────────────────────────────────────────────────────
$outDir = Join-Path $Dest ("apps\mobile\android\app\build\outputs\apk\" + $Variant.ToLower())
Write-Host "`n========================================="
Write-Host '  Build Complete!'
Get-ChildItem -Path $outDir -Filter *.apk -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host ("  {0}  ({1:N1} MB)" -f $_.FullName, ($_.Length / 1MB)) }
Write-Host '========================================='
