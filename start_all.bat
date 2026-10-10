@echo off
echo ========================================================
echo Launching AI Data Analyst Agent (Full-Stack SaaS)
echo Backend: http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:3000
echo ========================================================
start "AI Data Analyst - Backend" cmd /c "scripts\start_backend.bat"
timeout /t 3 /nobreak >nul
start "AI Data Analyst - Frontend" cmd /c "scripts\start_frontend.bat"
echo Services launched in separate terminal windows.
echo Opening browser...
timeout /t 4 /nobreak >nul
start http://localhost:3000
