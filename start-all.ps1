Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Agentra AI Full-Stack Platform..." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Agentra FastAPI Core Backend (:8000)' -ForegroundColor Cyan; .venv\Scripts\uvicorn.exe backend.app.main:app --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Agentra ML Microservice (:8001)' -ForegroundColor Magenta; .venv\Scripts\uvicorn.exe ml-model.api.app:app --port 8001 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Agentra Next.js Frontend (:3000)' -ForegroundColor Yellow; Set-Location frontend; pnpm dev"

Write-Host ""
Write-Host "All 3 services are launching in separate PowerShell windows:" -ForegroundColor Green
Write-Host "  -> Frontend:    http://localhost:3000" -ForegroundColor Yellow
Write-Host "  -> Backend API: http://127.0.0.1:8000 (Swagger docs at /docs)" -ForegroundColor Cyan
Write-Host "  -> ML Service:  http://127.0.0.1:8001" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Cyan

