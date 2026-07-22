# Zenithal — one-command PUBLIC DEMO LINK for judges (Windows PowerShell).
#
# Spins up the backend, tunnels it publicly via Cloudflare Quick Tunnel (free,
# no signup, no account), builds the dashboard pointed at that public backend
# URL, serves the build, and tunnels that too. Prints one link to share.
#
# This is NOT a permanent deployment — quick tunnels are free and instant but
# explicitly "no uptime guarantee" (Cloudflare's own terms) and the URL
# changes every time you run this. Keep this window open for the whole demo;
# closing it kills both tunnels. See docs/DEPLOYMENT.md for the real
# production path (Docker Compose, a real domain, TLS) for after the event.
#
#   powershell -ExecutionPolicy Bypass -File deploy_demo_tunnel.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$venvPy = Join-Path $root ".venv\Scripts\python.exe"
$tools = Join-Path $root "tools"
$cloudflared = Join-Path $tools "cloudflared.exe"
$logDir = Join-Path $root "tunnel-logs"
New-Item -ItemType Directory -Force $tools, $logDir | Out-Null

function Wait-ForUrl($logPath, $timeoutSec = 30) {
  $elapsed = 0
  while ($elapsed -lt $timeoutSec) {
    if (Test-Path $logPath) {
      $m = Select-String -Path $logPath -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($m) { return $m.Matches[0].Value }
    }
    Start-Sleep -Seconds 1
    $elapsed++
  }
  throw "Timed out waiting for tunnel URL in $logPath"
}

# --- 0. cloudflared binary (downloaded once, gitignored) ---
if (-not (Test-Path $cloudflared)) {
  Write-Host "[*] Downloading cloudflared (one-time, ~55MB)..." -ForegroundColor Yellow
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cloudflared
}

# --- 1. Backend ---
Write-Host "[*] Starting backend on :8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command", "cd '$root\backend'; & '$venvPy' -m uvicorn app.main:app --port 8000"
)
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try { Invoke-RestMethod "http://127.0.0.1:8000/api/v1/health" -TimeoutSec 2 | Out-Null; $ready = $true; break } catch {}
}
if (-not $ready) { throw "Backend did not become healthy on :8000" }
Write-Host "[OK] Backend healthy." -ForegroundColor Green

# --- 2. Tunnel the backend ---
Write-Host "[*] Opening public tunnel for the backend ..." -ForegroundColor Yellow
$beLog = Join-Path $logDir "backend-tunnel.log"
Remove-Item $beLog -ErrorAction SilentlyContinue
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command", "& '$cloudflared' tunnel --url http://localhost:8000 *> '$beLog'"
)
$backendUrl = Wait-ForUrl $beLog
Write-Host "[OK] Backend public URL: $backendUrl" -ForegroundColor Green

# --- 3. Build the dashboard against that public backend URL ---
Write-Host "[*] Building dashboard against the tunneled backend ..." -ForegroundColor Yellow
$wsUrl = $backendUrl -replace "^https://", "wss://"
@"
VITE_API_URL=$backendUrl
VITE_WS_URL=$wsUrl
"@ | Set-Content (Join-Path $root "dashboard\.env.production") -Encoding utf8
Push-Location (Join-Path $root "dashboard")
npm run build | Out-Null
Pop-Location
Write-Host "[OK] Dashboard built." -ForegroundColor Green

# --- 4. Serve the build, then tunnel THAT ---
Write-Host "[*] Serving the built dashboard on :4173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command", "cd '$root\dashboard'; npx serve -s dist -l 4173"
)
Start-Sleep -Seconds 4

Write-Host "[*] Opening public tunnel for the dashboard ..." -ForegroundColor Yellow
$feLog = Join-Path $logDir "dashboard-tunnel.log"
Remove-Item $feLog -ErrorAction SilentlyContinue
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command", "& '$cloudflared' tunnel --url http://localhost:4173 *> '$feLog'"
)
$dashboardUrl = Wait-ForUrl $feLog

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  SHARE THIS LINK WITH JUDGES:  $dashboardUrl" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Keep all 4 opened PowerShell windows running until judging ends."
Write-Host "If any window is closed, re-run this script for a fresh link."
Start-Process $dashboardUrl
