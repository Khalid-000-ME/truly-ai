@echo off
REM Simple test script for /api/handle route using curl (Windows)
REM Make sure your Next.js dev server is running on localhost:3000
REM Requires curl to be installed (available in Windows 10+)

set API_URL=http://localhost:3000/api/handle

echo 🚀 Testing TrulyAI /api/handle endpoint
echo ======================================

REM Test 1: GET request
echo.
echo 🔍 Test 1: GET request
curl -X GET "%API_URL%"

REM Test 2: Simple text prompt
echo.
echo 📝 Test 2: Simple text prompt
curl -X POST "%API_URL%" -F "prompt=Analyze this content for truthfulness and accuracy."

REM Test 3: Text with links
echo.
echo 🔗 Test 3: Text with links
curl -X POST "%API_URL%" -F "prompt=Check the claims made in this article: https://example.com/news-article and also verify information from www.wikipedia.org/wiki/Climate_change."

REM Test 4: Create a sample file and upload it
echo.
echo 📁 Test 4: Text with file upload
echo Sample test content > test-file.txt
curl -X POST "%API_URL%" -F "prompt=Analyze this uploaded file for any suspicious content." -F "file_0=@test-file.txt"

REM Test 5: Complex scenario
echo.
echo 🧪 Test 5: Complex scenario with links and file
curl -X POST "%API_URL%" -F "prompt=I found suspicious content at https://suspicious-site.com and want to verify it matches my file." -F "file_0=@test-file.txt"

REM Cleanup
del test-file.txt

echo.
echo ✅ All tests completed!
echo Check the JSON responses above for results.
pause
