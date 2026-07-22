# Zenithal — one-command demo launcher (Windows PowerShell).
#
# First run: creates a Python venv, installs backend packages, trains any
# missing models, and then starts the backend and dashboard. The stack is
# designed to run with zero secrets and zero external services unless you
# explicitly opt in via `.env` files. Needs Python 3.11+ and Node.js already
# installed on this machine; everything else is automatic.
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
  Write-Host "[*] Installing backend packages from the lockfile (one-time, needs internet, ~2-4 min)..." -ForegroundColor Yellow
  & $venvPy -m pip install --quiet --upgrade pip
  $backendLock = Join-Path $root "backend\requirements-lock.txt"
  $backendReq = if (Test-Path $backendLock) { $backendLock } else { (Join-Path $root "backend\requirements.txt") }
  & $venvPy -m pip install --quiet -r $backendReq
  Write-Host "[OK] Backend environment ready." -ForegroundColor Green
} else {
  Write-Host "[*] Using existing venv: .venv" -ForegroundColor DarkGray
}

# --- 2. Dashboard packages (first run only) ---
$nodeModules = Join-Path $root "dashboard\node_modules"
if (-not (Test-Path $nodeModules)) {
  Write-Host "[*] First run: installing dashboard packages from package-lock.json (one-time, needs internet)..." -ForegroundColor Yellow
  Push-Location (Join-Path $root "dashboard")
  npm ci --silent
  Pop-Location
  Write-Host "[OK] Dashboard packages ready." -ForegroundColor Green
} else {
  Write-Host "[*] Using existing dashboard\node_modules" -ForegroundColor DarkGray
}

# --- 3. Model artifacts (auto-train if missing) ---
$modelDir = Join-Path $root "backend\app\ml\models"
$modelChecks = @(
  @{ path = (Join-Path $modelDir "url_xgb.pkl"); train = "training/train_url.py"; label = "URL model" },
  @{ path = (Join-Path $modelDir "payload_clf.pkl"); train = "training/train_payload.py"; label = "payload model" },
  @{ path = (Join-Path $modelDir "anomaly_iforest.pkl"); train = "training/train_anomaly.py"; label = "anomaly model" }
)
foreach ($item in $modelChecks) {
  if (-not (Test-Path $item.path)) {
    Write-Host "[*] Missing $($item.label) - training it now..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "backend")
    & $venvPy $item.train
    Pop-Location
  }
}

# --- 4. Backend ---
Write-Host "[*] Starting backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\backend'; & '$venvPy' -m uvicorn app.main:app --port 8000"
)

Start-Sleep -Seconds 3

# --- 5. Dashboard ---
Write-Host "[*] Starting dashboard on http://127.0.0.1:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\dashboard'; npm run dev"
)

Start-Sleep -Seconds 4
Write-Host "[OK] Dashboard: http://127.0.0.1:5173   API docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"
