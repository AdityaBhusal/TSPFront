# TSPFront Stop Script
Write-Host "🛑 Stopping TSPFront Application..." -ForegroundColor Cyan

# Stop Backend Job
Write-Host "`n📦 Stopping Backend..." -ForegroundColor Yellow
$job = Get-Job -Name BackendServer -ErrorAction SilentlyContinue
if ($job) {
    Stop-Job -Name BackendServer
    Remove-Job -Name BackendServer
    Write-Host "✅ Backend stopped" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No backend job found" -ForegroundColor Gray
}

# Kill any process on port 5000 (just in case)
$connections = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connections) {
    Write-Host "🔧 Cleaning up port 5000..." -ForegroundColor Yellow
    $connections | ForEach-Object { 
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Port 5000 cleaned" -ForegroundColor Green
}

Write-Host "`n✅ Application stopped successfully!" -ForegroundColor Green
