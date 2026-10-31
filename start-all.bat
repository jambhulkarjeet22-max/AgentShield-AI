@echo off
echo ========================================================
echo Starting Agentra AI Full-Stack Platform...
echo ========================================================

start "Agentra Backend (FastAPI :8000)" cmd /k ".venv\Scripts\uvicorn.exe backend.app.main:app --port 8000 --reload"
start "Agentra ML Microservice (:8001)" cmd /k ".venv\Scripts\uvicorn.exe ml-model.api.app:app --port 8001 --reload"
start "Agentra Frontend (Next.js :3000)" cmd /k "cd frontend && pnpm dev"

echo.
echo All 3 services are launching in separate windows:
echo - Frontend:    http://localhost:3000
echo - Backend API: http://127.0.0.1:8000 (Swagger docs at /docs)
echo - ML Service:  http://127.0.0.1:8001
echo ========================================================

