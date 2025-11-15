# TSPFront Startup Script
Write-Host "🚀 Starting TSPFront Application..." -ForegroundColor Cyan

# Start Backend in background job
Write-Host "`n📦 Starting Backend (Port 5000)..." -ForegroundColor Yellow
Start-Job -ScriptBlock { 
    Set-Location 'C:\Users\Asus\tsp\TSPFront\backend'
    & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 5000
} -Name BackendServer | Out-Null

# Wait for backend to start
Start-Sleep -Seconds 2

# Check if backend started successfully
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5000/docs' -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend running at http://localhost:5000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend may be starting... continuing anyway" -ForegroundColor Yellow
}

# Start Frontend
Write-Host "`n🌐 Starting Frontend (Port 5173)..." -ForegroundColor Yellow
Write-Host "✅ Frontend will open at http://localhost:5173" -ForegroundColor Green
Write-Host "`n💡 Press Ctrl+C to stop the frontend (backend will keep running)" -ForegroundColor Cyan
Write-Host "💡 To stop backend: Get-Job -Name BackendServer | Stop-Job; Get-Job -Name BackendServer | Remove-Job`n" -ForegroundColor Cyan

npm run dev
