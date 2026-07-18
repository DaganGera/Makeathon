# Zenithal — one-command demo launcher (Windows PowerShell).
#
# First run: creates a Python venv and installs backend packages, then starts
# the backend and dashboard. All data/models/threat-feeds/API-key are already
# committed in this repo — nothing to download, no account to create. Needs
# Python 3.11+ and Node.js already installed on this machine; everything else
# is automatic.
#
#   powershell -ExecutionPolicy Bypass -File run.ps1
# (or just double-click START_DEMO.bat in this same folder)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "== Zenithal :: URL Threat Intelligence from IP Data ==" -ForegroundColor Cyan

# --- 0. Prerequisite check ---
function Test-Cmd($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
if (-not (Test-Cmd "python") -and -not (Test-Cmd "py")) {
  Write-Host "[!] Python not found on PATH. Install Python 3.11+ from python.org and re-run." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}
if (-not (Test-Cmd "node")) {
  Write-Host "[!] Node.js not found on PATH. Install Node 18+ from nodejs.org and re-run." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

# --- 1. Backend venv (first run only) ---
$venvPy = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
  Write-Host "[*] First run: creating Python venv (one-time, ~1-2 min)..." -ForegroundColor Yellow
  $basePy = if (Test-Cmd "python") { "python" } else { "py" }
  & $basePy -m venv (Join-Path $root ".venv")
  Write-Host "[*] Installing backend packages (one-time, needs internet, ~2-4 min)..." -ForegroundColor Yellow
  & $venvPy -m pip install --quiet --upgrade pip
  & $venvPy -m pip install --quiet -r (Join-Path $root "backend\requirements.txt")
  Write-Host "[OK] Backend environment ready." -ForegroundColor Green
} else {
  Write-Host "[*] Using existing venv: .venv" -ForegroundColor DarkGray
}

# --- 2. Dashboard packages (first run only — node_modules is normally committed, this is just a safety net) ---
$nodeModules = Join-Path $root "dashboard\node_modules"
if (-not (Test-Path $nodeModules)) {
  Write-Host "[*] First run: installing dashboard packages (one-time, needs internet)..." -ForegroundColor Yellow
  Push-Location (Join-Path $root "dashboard")
  npm install --silent
  Pop-Location
  Write-Host "[OK] Dashboard packages ready." -ForegroundColor Green
} else {
  Write-Host "[*] Using existing dashboard\node_modules" -ForegroundColor DarkGray
}

# --- 3. Backend ---
Write-Host "[*] Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\backend'; & '$venvPy' -m uvicorn app.main:app --port 8000"
)

Start-Sleep -Seconds 3

# --- 4. Dashboard ---
Write-Host "[*] Starting dashboard on http://127.0.0.1:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\dashboard'; npm run dev"
)

Start-Sleep -Seconds 4
Write-Host "[OK] Dashboard: http://127.0.0.1:5173   API docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"
