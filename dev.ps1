# ============================================================
# dev.ps1 — Start local development environment
# ============================================================
# Usage:  .\dev.ps1
#
# This starts:
#   - MySQL + Judge0 (via Docker)
#   - Backend (local Node.js on port 5000)
#   - Frontend (Vite dev server at http://localhost:5173/)
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Local Dev Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop Docker frontend/backend (they use the same ports)
Write-Host "[1/5] Stopping Docker frontend/backend if running..." -ForegroundColor Yellow
docker stop practice-hub-frontend practice-hub-backend 2>$null | Out-Null

# Step 2: Start only DB + Judge0 services via Docker
Write-Host "[2/5] Starting MySQL + Judge0 in Docker..." -ForegroundColor Yellow
docker-compose up -d mysql judge0-server judge0-worker judge0-db judge0-redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker services!" -ForegroundColor Red
    exit 1
}

# Step 3: Wait for MySQL to be healthy
Write-Host "[3/5] Waiting for MySQL..." -ForegroundColor Yellow
$maxRetries = 15
$retry = 0
do {
    Start-Sleep -Seconds 2
    $retry++
    $status = docker inspect --format='{{.State.Health.Status}}' practice-hub-mysql 2>$null
    if ($status -eq "healthy") { break }
    Write-Host "  Waiting... ($retry/$maxRetries)" -ForegroundColor Gray
} while ($retry -lt $maxRetries)

# Step 4: Start backend locally (override DB + Judge0 to use localhost)
Write-Host "[4/5] Starting backend (local Node.js)..." -ForegroundColor Yellow
$env:DATABASE_URL = "mysql://practicehub:practicehub123@localhost:3306/practice_hub"
$env:JUDGE0_API_URL = "http://localhost:2358"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:DATABASE_URL='mysql://practicehub:practicehub123@localhost:3306/practice_hub'; `$env:JUDGE0_API_URL='http://localhost:2358'; cd '$PSScriptRoot\backend'; npm run dev"

# Step 5: Start frontend
Write-Host "[5/5] Starting frontend (Vite dev server)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173/" -ForegroundColor Green
Write-Host "  Backend:  http://localhost:5000/" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Push-Location "$PSScriptRoot\frontend"
npm run dev
Pop-Location
