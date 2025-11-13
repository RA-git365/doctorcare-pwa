@echo off
set PORT=8000
echo Starting local server at http://localhost:%PORT%
python -m http.server %PORT%
pause