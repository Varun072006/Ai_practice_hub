# ============================================================
# build_and_push.ps1 — Build & Push Docker Images to Docker Hub
# ============================================================
# Usage:
#   .\build_and_push.ps1           → builds with tag from .env.prod (IMAGE_TAG)
#   .\build_and_push.ps1 v1.0.4   → builds with tag v1.0.4
# ============================================================

param(
    [string]$Tag
)

# Read IMAGE_TAG from .env.prod if not provided
if (-not $Tag) {
    $envLine = Get-Content ".env.prod" | Where-Object { $_ -match "^IMAGE_TAG=" }
    if ($envLine) {
        $Tag = ($envLine -split "=", 2)[1].Trim()
    } else {
        $Tag = "latest"
    }
}

$DOCKER_USER = "varun072006"
$FRONTEND_IMAGE = "$DOCKER_USER/practice_hub_frontend"
$BACKEND_IMAGE  = "$DOCKER_USER/practice_hub_backend"
$MYSQL_IMAGE    = "$DOCKER_USER/practice_hub_mysql"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Building & Pushing with tag: $Tag" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ------ Step 1: Build images using docker compose (uses .env.prod for build args) ------
Write-Host "[1/4] Loading environment variables from .env.prod for build args..." -ForegroundColor Yellow
$envLines = Get-Content ".env.prod" | Where-Object { $_ -match "=" -and -not $_.StartsWith("#") }
foreach ($line in $envLines) {
    if ($line -match "^.*=$") { continue } # Skip empty values
    $parts = $line -split "=", 2
    $varName = $parts[0].Trim()
    $varValue = $parts[1].Trim()
    Set-Item -Path "Env:$varName" -Value $varValue
}

Write-Host "VITE_API_URL: $env:VITE_API_URL" -ForegroundColor Cyan
Write-Host "GOOGLE_CLIENT_ID: $env:GOOGLE_CLIENT_ID" -ForegroundColor Cyan

Write-Host "[1.5/4] Building Docker images..." -ForegroundColor Yellow
docker compose --env-file .env.prod build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    exit 1
}

# ------ Step 2: Tag images ------
Write-Host "[2/4] Tagging images as $Tag ..." -ForegroundColor Yellow
docker tag "${FRONTEND_IMAGE}:latest" "${FRONTEND_IMAGE}:${Tag}"
docker tag "${BACKEND_IMAGE}:latest"  "${BACKEND_IMAGE}:${Tag}"
docker tag "${MYSQL_IMAGE}:latest"    "${MYSQL_IMAGE}:${Tag}"

# ------ Step 3: Push to Docker Hub ------
Write-Host "[3/4] Pushing to Docker Hub..." -ForegroundColor Yellow
docker push "${FRONTEND_IMAGE}:${Tag}"
docker push "${BACKEND_IMAGE}:${Tag}"
docker push "${MYSQL_IMAGE}:${Tag}"

# Also push latest
docker push "${FRONTEND_IMAGE}:latest"
docker push "${BACKEND_IMAGE}:latest"
docker push "${MYSQL_IMAGE}:latest"

# ------ Step 4: Summary ------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DONE! Pushed images with tag: $Tag" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Images pushed:" -ForegroundColor White
Write-Host "  - ${FRONTEND_IMAGE}:${Tag}"
Write-Host "  - ${BACKEND_IMAGE}:${Tag}"
Write-Host "  - ${MYSQL_IMAGE}:${Tag}"
Write-Host ""
Write-Host "Next step - On the server, run:" -ForegroundColor Cyan
Write-Host "  export IMAGE_TAG=$Tag" -ForegroundColor White
Write-Host "  ./deploy.sh" -ForegroundColor White
Write-Host ""
