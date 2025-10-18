#!/bin/bash

# Simple test script for /api/handle route using curl
# Make sure your Next.js dev server is running on localhost:3000

API_URL="http://localhost:3000/api/handle"

echo "🚀 Testing TrulyAI /api/handle endpoint"
echo "======================================"

# Test 1: GET request
echo -e "\n🔍 Test 1: GET request"
curl -X GET "$API_URL" | jq '.'

# Test 2: Simple text prompt
echo -e "\n📝 Test 2: Simple text prompt"
curl -X POST "$API_URL" \
  -F "prompt=Analyze this content for truthfulness and accuracy." | jq '.'

# Test 3: Text with links
echo -e "\n🔗 Test 3: Text with links"
curl -X POST "$API_URL" \
  -F "prompt=Check the claims made in this article: https://example.com/news-article and also verify information from www.wikipedia.org/wiki/Climate_change. Additionally, see https://github.com/user/repo for technical details." | jq '.'

# Test 4: Create a sample file and upload it
echo -e "\n📁 Test 4: Text with file upload"
echo "Sample test content" > test-file.txt
curl -X POST "$API_URL" \
  -F "prompt=Analyze this uploaded file for any suspicious content." \
  -F "file_0=@test-file.txt" | jq '.'

# Test 5: Complex scenario
echo -e "\n🧪 Test 5: Complex scenario with links and file"
curl -X POST "$API_URL" \
  -F "prompt=I found this suspicious content online at https://suspicious-site.com/content and want to verify if it matches my uploaded file. Also check www.factcheck.org/recent-claims." \
  -F "file_0=@test-file.txt" | jq '.'

# Cleanup
rm -f test-file.txt

echo -e "\n✅ All tests completed!"
echo "Check the JSON responses above for results."
