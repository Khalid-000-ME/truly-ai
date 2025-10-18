@echo off
REM Quick test for TrulyAI Initial API - Simple version
echo 🚀 TrulyAI Quick Test
echo ===================

echo.
echo 🔍 Testing system status...

REM Test GET endpoints
echo.
echo 📋 Frontend API Info:
curl -s http://localhost:3000/api/initial

echo.
echo.
echo 📋 Python Backend Info:
curl -s http://localhost:8000/api/info

echo.
echo.
echo 🧪 Testing text correction...
echo ============================

REM Test with garbled text
curl -X POST http://localhost:3000/api/initial ^
  -F "prompt=Hw long will i taj fo a chth to finish a 2km lap?"

echo.
echo.
echo ✅ Quick test completed!
echo.
echo 📝 What to check:
echo - Text should be corrected from garbled to proper English
echo - Response should show refined text and confidence score
echo - Processing times should be logged
echo.
echo For detailed testing run: node test-initial-api.cjs

pause
