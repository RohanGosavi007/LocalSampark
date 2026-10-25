# scripts/audit/use-local-env.ps1
# Enforces strictly local database connections and blanks all remote/production variables
# Ground Rules §1A.3: Aborts if database host is not localhost or 127.0.0.1

param(
    [switch]$UsePostgres = $false,
    [string]$PostgresPort = "5432",
    [string]$DatabaseName = "localsampark",
    [string]$RedisPort = "6379"
)

Write-Host "🛡️  Enforcing local-only environment configuration for safety..." -ForegroundColor Cyan

# 1. Clear all Supabase production keys
$env:SUPABASE_URL = ""
$env:SUPABASE_ANON_KEY = ""
$env:SUPABASE_SERVICE_ROLE_KEY = ""

# 2. Configure Local Database URLs
if ($UsePostgres) {
    $env:USE_SQLITE = "false"
    $env:TEST_USE_POSTGRES = "1"
    $env:DB_HOST = "127.0.0.1"
    $env:DB_PORT = $PostgresPort
    $env:DB_NAME = $DatabaseName
    $env:DB_USER = "postgres"
    $env:DB_PASSWORD = "password"
    $env:DATABASE_URL = "postgresql://postgres:password@127.0.0.1:${PostgresPort}/${DatabaseName}"
    $env:DIRECT_URL = "postgresql://postgres:password@127.0.0.1:${PostgresPort}/${DatabaseName}"
} else {
    $env:USE_SQLITE = "true"
    $env:TEST_USE_POSTGRES = "0"
    $env:DATABASE_URL = ""
    $env:DIRECT_URL = ""
}

# 3. Configure Local Redis
$env:REDIS_URL = "redis://127.0.0.1:${RedisPort}"
$env:REDIS_HOST = "127.0.0.1"
$env:REDIS_PORT = $RedisPort

# 4. Extract and Validate Resolved Database Host
$resolvedDbHost = "localhost (sqlite)"
if ($env:USE_SQLITE -ne "true") {
    $parsedUri = [System.Uri]$env:DATABASE_URL
    $resolvedDbHost = $parsedUri.Host
    if ($resolvedDbHost -ne "localhost" -and $resolvedDbHost -ne "127.0.0.1") {
        Write-Error "❌ CRITICAL SAFETY VIOLATION: Database host '$resolvedDbHost' is not local! Aborting immediately."
        exit 1
    }
}

Write-Host "✅ Local Environment Configured:" -ForegroundColor Green
Write-Host "   USE_SQLITE    = $env:USE_SQLITE"
Write-Host "   DB_HOST       = $resolvedDbHost"
Write-Host "   DATABASE_URL  = $env:DATABASE_URL"
Write-Host "   REDIS_URL     = $env:REDIS_URL"
Write-Host "   SUPABASE_URL  = (blanked)"
