@echo off
title DoctorCare Local Server
cls

echo Starting the DoctorCare app...
echo.

REM Check for python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python not detected in PATH.
    echo Please install Python or add it to PATH.
    echo.
    pause
    exit /b
)

set PORT=8000

echo Serving DoctorCare on http://localhost:%PORT%
echo (Press CTRL + C to stop the server)
echo.

python -m http.server %PORT%

echo.
pause
