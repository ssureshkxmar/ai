@echo off
echo Starting Local AI Image Generator...

:: Start Backend
:: Using direct path to venv python to avoid environment activation issues
start "AI Backend Service" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn main:app --reload"

:: Start Frontend
start "Web Interface" cmd /k "cd frontend && npm run dev"

echo.
echo Application starting!
echo 1. Backend server loading...
echo 2. Frontend server starting...
echo.
echo NOTE: If you see "ModuleNotFoundError", ensure you ran the installation steps correctly.
pause
