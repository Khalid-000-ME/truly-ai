@echo off
REM Quick test for TrulyAI Initial API
REM Make sure both servers are running before executing

echo 🚀 TrulyAI Initial API Quick Test
echo ===================================

REM Check if servers are running
echo.
echo 🔍 Checking system status...

echo Testing Next.js frontend...
curl -s http://localhost:3000/api/initial > nul
if %errorlevel%==0 (
    echo ✅ Frontend: Running on port 3000
) else (
    echo ❌ Frontend: Not running - Start with 'npm run dev'
)

echo Testing Python backend...
curl -s http://localhost:8000/api/info > nul
if %errorlevel%==0 (
    echo ✅ Backend: Running on port 8000
) else (
    echo ❌ Backend: Not running - Start with 'python -m uvicorn app.main:app --reload'
)

echo.
echo 📋 System Information:
echo ----------------------

REM Get frontend info
echo Frontend API Info:
curl -s http://localhost:3000/api/initial

echo.
echo.
echo Backend API Info:
curl -s http://localhost:8000/api/info

echo.
echo.
echo 🧪 Running simple text analysis test...
echo =======================================

REM Test with simple text
curl -X POST http://localhost:3000/api/initial ^
  -F "prompt=Hw long will i taj fo a chth to finish a 2km lap?"

echo.
echo.
echo ✅ Test completed! 
echo Check the JSON response above for results.
echo For detailed testing, run: node test-initial-api.js

pause
