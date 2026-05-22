# =====================================================================
# TEAM TASK MANAGER - ROBUST DATABASE BOOTSTRAP RUNNER
# =====================================================================
$ErrorActionPreference = "Stop"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "            TEAM TASK MANAGER - DATABASE AUTOMATION RUNNER            " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# --- STEP 1: DETECT LOCALDB INSTALLATION ---
Write-Host "[1/5] Detecting Microsoft SQL Server LocalDB utility..." -ForegroundColor Gray

$LocalDbCmd = Get-Command "sqllocaldb" -ErrorAction SilentlyContinue
if (-not $LocalDbCmd) {
    # Scan default installation locations for sqllocaldb.exe
    $CommonLocalDbPaths = @(
        "C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqllocaldb.exe",
        "C:\Program Files\Microsoft SQL Server\150\Tools\Binn\sqllocaldb.exe",
        "C:\Program Files\Microsoft SQL Server\140\Tools\Binn\sqllocaldb.exe",
        "C:\Program Files\Microsoft SQL Server\130\Tools\Binn\sqllocaldb.exe"
    )
    foreach ($Path in $CommonLocalDbPaths) {
        if (Test-Path $Path) {
            $LocalDbCmd = $Path
            break
        }
    }
}

if (-not $LocalDbCmd) {
    Write-Host "[FATAL ERROR] Microsoft SQL Server LocalDB ('sqllocaldb') could not be detected." -ForegroundColor Red
    Write-Host "Ensure that SQL Server LocalDB is installed on your Windows machine." -ForegroundColor Yellow
    Write-Host "Download Link: https://learn.microsoft.com/sql/database-engine/configure-windows/sql-server-express-localdb" -ForegroundColor Yellow
    Exit 1
}

Write-Host "Found sqllocaldb utility: $LocalDbCmd" -ForegroundColor DarkGray


# --- STEP 2: ENSURE MSSQLLOCALDB INSTANCE IS RUNNING ---
Write-Host "[2/5] Configuring MSSQLLocalDB instance..." -ForegroundColor Gray

try {
    # Check if MSSQLLocalDB instance exists
    $InstanceList = & $LocalDbCmd info
    $InstanceExists = $InstanceList -contains "MSSQLLocalDB"

    if (-not $InstanceExists) {
        Write-Host "MSSQLLocalDB instance is missing. Creating instance..." -ForegroundColor Yellow
        & $LocalDbCmd create MSSQLLocalDB | Out-Host
    } else {
        Write-Host "MSSQLLocalDB instance already exists." -ForegroundColor Green
    }

    # Start the instance
    Write-Host "Starting MSSQLLocalDB instance..." -ForegroundColor Gray
    $StartOutput = & $LocalDbCmd start MSSQLLocalDB 2>&1
    Write-Host "Status: $StartOutput" -ForegroundColor Green
} catch {
    Write-Host "[FATAL ERROR] Failed to create or start MSSQLLocalDB instance." -ForegroundColor Red
    Write-Error $_.Exception.Message
    Exit 1
}


# --- STEP 3: LOCATE SQLCMD UTILITY ---
Write-Host "[3/5] Locating sqlcmd utility..." -ForegroundColor Gray

$SqlCmdPath = Get-Command "sqlcmd" -ErrorAction SilentlyContinue
if (-not $SqlCmdPath) {
    # Scan standard Microsoft SQL Server Tools paths
    $SqlCmdCommonPaths = @(
        "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd.exe",
        "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\180\Tools\Binn\sqlcmd.exe",
        "C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd.exe",
        "C:\Program Files\Microsoft SQL Server\150\Tools\Binn\sqlcmd.exe",
        "C:\Program Files\Microsoft SQL Server\140\Tools\Binn\sqlcmd.exe",
        "C:\Program Files\Microsoft SQL Server\130\Tools\Binn\sqlcmd.exe"
    )
    foreach ($Path in $SqlCmdCommonPaths) {
        if (Test-Path $Path) {
            $SqlCmdPath = $Path
            break
        }
    }
}

if (-not $SqlCmdPath) {
    Write-Host "[FATAL ERROR] 'sqlcmd' utility could not be detected in PATH or common directories." -ForegroundColor Red
    Write-Host "Please install Microsoft Command Line Utilities for SQL Server." -ForegroundColor Yellow
    Write-Host "Download Link: https://learn.microsoft.com/sql/tools/sqlcmd-utility" -ForegroundColor Yellow
    Exit 1
}

Write-Host "Found sqlcmd utility: $SqlCmdPath" -ForegroundColor DarkGray


# --- STEP 4: VERIFY LOCALDB CONNECTION BEFORE SCHEMA EXECUTION ---
Write-Host "[4/5] Testing database server connection before applying schema..." -ForegroundColor Gray

try {
    # Run a lightweight query to confirm active LocalDB connection.
    # -b: abort on error, -t 5: 5-second timeout
    $TestResult = & $SqlCmdPath -S "(localdb)\MSSQLLocalDB" -Q "SELECT 1" -b -t 5 2>&1
    $ExitCode = $LASTEXITCODE

    if ($ExitCode -ne 0 -or $TestResult -match "error" -or $TestResult -match "fail") {
        Write-Host "[FATAL ERROR] LocalDB connection verification failed!" -ForegroundColor Red
        Write-Host "Test Query Output:" -ForegroundColor Yellow
        $TestResult | Out-String | Write-Host -ForegroundColor Yellow
        Exit 1
    }
    Write-Host "Connection test to (localdb)\MSSQLLocalDB verified successfully (SELECT 1 succeeded)." -ForegroundColor Green
} catch {
    Write-Host "[FATAL ERROR] Failed to connect to local SQL Server LocalDB instance." -ForegroundColor Red
    Write-Error $_.Exception.Message
    Exit 1
}


# --- STEP 5: RUN SCHEMA SCHEMA.SQL ---
$SchemaFile = Join-Path $PSScriptRoot "schema.sql"
if (-not (Test-Path $SchemaFile)) {
    Write-Host "[FATAL ERROR] Database schema script was not found at: $SchemaFile" -ForegroundColor Red
    Exit 1
}

Write-Host "[5/5] Applying schema.sql script (Idempotent schema builder)..." -ForegroundColor Gray

try {
    # Run the SQL script. -b aborts immediately on query batch failures
    $SqlOutput = & $SqlCmdPath -S "(localdb)\MSSQLLocalDB" -i "$SchemaFile" -b 2>&1
    $SqlExit = $LASTEXITCODE

    if ($SqlExit -eq 0) {
        Write-Host "---------------------------------------------------------------------" -ForegroundColor Gray
        $SqlOutput | Out-String | Write-Host -ForegroundColor DarkGreen
        Write-Host "---------------------------------------------------------------------" -ForegroundColor Gray
        Write-Host "SUCCESS: Database 'TeamTaskManagerDb' configured and seeded successfully!" -ForegroundColor Green
        Write-Host "You can now run the backend application with 'dotnet run'." -ForegroundColor Green
    } else {
        Write-Host "[FATAL ERROR] Database schema script execution failed with exit code $SqlExit." -ForegroundColor Red
        Write-Host "SQL error output:" -ForegroundColor Yellow
        $SqlOutput | Out-String | Write-Host -ForegroundColor Yellow
        Exit $SqlExit
    }
} catch {
    Write-Host "[FATAL ERROR] An unexpected error occurred while executing the database setup." -ForegroundColor Red
    Write-Error $_.Exception.Message
    Exit 1
}

Write-Host "=====================================================================" -ForegroundColor Cyan
