<#
.SYNOPSIS
    Exposes the local backend on a public HTTPS URL and points the mobile app at
    it, so the Expo app running on a physical device can reach this machine.

.DESCRIPTION
    The previous version of this script only printed instructions — it opened
    no tunnel, started no server and edited no configuration, so every step
    still had to be done by hand and the URL re-copied on each restart. This one
    performs the sequence:

      1. Starts the backend (port 5000) and the web app (port 3000), each in its
         own window, unless -SkipServers is passed.
      2. Opens a tunnel to the backend with cloudflared (default) or ngrok.
      3. Reads the public URL the tunnel prints, and rewrites
         EXPO_PUBLIC_API_URL / EXPO_PUBLIC_WS_URL in apps/mobile/.env in place,
         leaving every other key alone. The previous file is backed up first,
         because that .env normally points at production and you will want it
         back when you are done.
      4. Starts the Expo bundler with a cleared cache, which is required for a
         changed EXPO_PUBLIC_* value to be picked up.

.PARAMETER Provider
    cloudflared (default) or ngrok. cloudflared needs no account for a quick
    tunnel; ngrok needs `ngrok config add-authtoken <token>` once.

.PARAMETER SkipServers
    Assume the backend and web app are already running.

.PARAMETER TunnelWeb
    Also open a second tunnel to the Next.js app on port 3000, for testing the
    website itself in a phone browser.

.EXAMPLE
    .\start-live-tunnel.ps1
    .\start-live-tunnel.ps1 -Provider ngrok -SkipServers
#>

[CmdletBinding()]
param(
    [ValidateSet('cloudflared', 'ngrok')]
    [string]$Provider = 'cloudflared',
    [switch]$SkipServers,
    [switch]$TunnelWeb
)

$ErrorActionPreference = 'Stop'

# Anchor every path to the script's own location. Relative paths broke the
# moment the script was invoked from anywhere but the repository root.
$Root      = $PSScriptRoot
$MobileDir = Join-Path $Root 'apps/mobile'
$EnvFile   = Join-Path $MobileDir '.env'
$BackendPort = 5000
$WebPort     = 3000

function Write-Step($n, $text) { Write-Host "`n[$n] $text" -ForegroundColor Cyan }
function Write-Ok($text)       { Write-Host "    $text" -ForegroundColor Green }
function Write-Warn2($text)    { Write-Host "    $text" -ForegroundColor Yellow }

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " LocalSampark - Live Device Testing Tunnel ($Provider)"     -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ── Preflight ────────────────────────────────────────────────────────────────
if (-not (Get-Command $Provider -ErrorAction SilentlyContinue)) {
    Write-Host "`n'$Provider' is not on PATH." -ForegroundColor Red
    if ($Provider -eq 'cloudflared') {
        Write-Host "Install it with:  winget install --id Cloudflare.cloudflared"
    } else {
        Write-Host "Install it from https://ngrok.com/download, then run:"
        Write-Host "  ngrok config add-authtoken <your_token>"
    }
    exit 1
}
if (-not (Test-Path $EnvFile)) {
    $template = Join-Path $MobileDir '.env.template'
    if (Test-Path $template) {
        Copy-Item $template $EnvFile
        Write-Warn2 "Created apps/mobile/.env from .env.template"
    } else {
        New-Item -ItemType File -Path $EnvFile | Out-Null
    }
}

# ── 1. Local servers ─────────────────────────────────────────────────────────
if (-not $SkipServers) {
    Write-Step 1 "Starting backend (port $BackendPort) and web app (port $WebPort)..."
    Start-Process powershell.exe -WorkingDirectory $Root `
        -ArgumentList '-NoExit', '-Command', 'npm run dev:backend'
    Start-Process powershell.exe -WorkingDirectory $Root `
        -ArgumentList '-NoExit', '-Command', 'npm run dev:web'

    Write-Host "    Waiting for the backend health check to pass..." -NoNewline
    $healthy = $false
    foreach ($i in 1..60) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" `
                                   -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $healthy = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
        Write-Host '.' -NoNewline
    }
    Write-Host ''
    if ($healthy) {
        Write-Ok "Backend is up on http://localhost:$BackendPort"
    } else {
        # Not fatal: the tunnel is still useful and the backend may simply be
        # slow to boot. But say so, rather than letting the user chase a
        # "network error" on the phone that is really a dead backend.
        Write-Warn2 "Backend did not answer /health within 120s. Check its window before testing."
    }
} else {
    Write-Step 1 "Skipping server startup (-SkipServers)."
}

# ── 2. Tunnel ────────────────────────────────────────────────────────────────
Write-Step 2 "Opening the $Provider tunnel to port $BackendPort..."

$logFile = Join-Path $env:TEMP "localsampark-tunnel-$PID.log"
if (Test-Path $logFile) { Remove-Item $logFile -Force }

if ($Provider -eq 'cloudflared') {
    # cloudflared writes its banner to stderr, so both streams are captured.
    $proc = Start-Process cloudflared `
        -ArgumentList 'tunnel', '--url', "http://localhost:$BackendPort" `
        -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err" `
        -PassThru -WindowStyle Minimized
    $urlPattern = 'https://[a-z0-9-]+\.trycloudflare\.com'
} else {
    # ngrok's log-format=logfmt output is stable and greppable; the default TUI
    # is not, which is why parsing the console window is not attempted.
    $proc = Start-Process ngrok `
        -ArgumentList 'http', "$BackendPort", '--log', 'stdout', '--log-format', 'logfmt' `
        -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err" `
        -PassThru -WindowStyle Minimized
    $urlPattern = 'https://[a-z0-9-]+\.ngrok[-a-z.]*\.(app|io)'
}

$publicUrl = $null
foreach ($i in 1..45) {
    Start-Sleep -Seconds 2
    foreach ($f in @($logFile, "$logFile.err")) {
        if (Test-Path $f) {
            $m = Select-String -Path $f -Pattern $urlPattern -AllMatches -ErrorAction SilentlyContinue
            if ($m) { $publicUrl = $m.Matches[0].Value; break }
        }
    }
    if ($publicUrl) { break }
}

if (-not $publicUrl) {
    Write-Host "`n    Could not read a public URL from $Provider within 90s." -ForegroundColor Red
    Write-Host "    Tunnel log: $logFile"
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
    exit 1
}

$wsUrl = $publicUrl -replace '^https://', 'wss://'
Write-Ok "Public API URL: $publicUrl"

# ── 3. Point the mobile app at the tunnel ────────────────────────────────────
Write-Step 3 "Updating apps/mobile/.env..."

$backup = "$EnvFile.backup"
Copy-Item $EnvFile $backup -Force
Write-Ok "Previous .env backed up to apps/mobile/.env.backup"

# Rewrite only the two keys; everything else in the file is preserved.
$lines   = @(Get-Content $EnvFile)
$apiLine = "EXPO_PUBLIC_API_URL=$publicUrl/api/v1"
$wsLine  = "EXPO_PUBLIC_WS_URL=$wsUrl"
$sawApi  = $false
$sawWs   = $false

$lines = $lines | ForEach-Object {
    if ($_ -match '^\s*EXPO_PUBLIC_API_URL\s*=') { $script:sawApi = $true; $apiLine }
    elseif ($_ -match '^\s*EXPO_PUBLIC_WS_URL\s*=') { $script:sawWs = $true; $wsLine }
    else { $_ }
}
if (-not $script:sawApi) { $lines += $apiLine }
if (-not $script:sawWs)  { $lines += $wsLine }

Set-Content -Path $EnvFile -Value $lines -Encoding utf8
Write-Ok "EXPO_PUBLIC_API_URL = $publicUrl/api/v1"
Write-Ok "EXPO_PUBLIC_WS_URL  = $wsUrl"

# ── 4. Optional web tunnel ───────────────────────────────────────────────────
if ($TunnelWeb) {
    Write-Step 4 "Opening a second tunnel to the web app on port $WebPort..."
    if ($Provider -eq 'cloudflared') {
        Start-Process cloudflared -ArgumentList 'tunnel', '--url', "http://localhost:$WebPort" -WindowStyle Normal
    } else {
        Start-Process ngrok -ArgumentList 'http', "$WebPort" -WindowStyle Normal
    }
    Write-Warn2 "Read the URL from that window. Point the site at the API by setting"
    Write-Warn2 "NEXT_PUBLIC_API_URL=$publicUrl in apps/web/.env.local, then restart the web dev server."
}

# ── 5. Expo ──────────────────────────────────────────────────────────────────
Write-Step 5 "Starting the Expo bundler (cache cleared)..."
# -c is required: without it Metro serves the previously inlined EXPO_PUBLIC_*
# values and the app keeps talking to whatever URL was baked in last time.
Start-Process powershell.exe -WorkingDirectory $MobileDir `
    -ArgumentList '-NoExit', '-Command', 'npx expo start -c'

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Ready for device testing" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host @"

  API tunnel    : $publicUrl
  Health check  : $publicUrl/health
  Tunnel log    : $logFile

  On your phone:
    1. Install Expo Go (Android: Play Store, iOS: App Store).
    2. Scan the QR code in the Expo window that just opened.
       Android: scan from inside Expo Go. iOS: use the Camera app.
    3. The phone needs internet, but does NOT need to be on this Wi-Fi —
       that is the whole point of the tunnel.

  When you are finished:
    - Close the tunnel window (the URL dies with it).
    - Restore production config:
        Copy-Item apps/mobile/.env.backup apps/mobile/.env -Force

  Note: both cloudflared quick tunnels and ngrok free tunnels issue a NEW
  random URL every restart. Re-run this script to re-point the app.

"@ -ForegroundColor Gray
