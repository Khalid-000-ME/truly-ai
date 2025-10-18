#!/usr/bin/env node

/**
 * Test script for /api/handle route
 * Tests the API with various scenarios including text with links and file uploads
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:3000/api/handle';
const TEST_FILES_DIR = './test-files';

// Create test files directory if it doesn't exist
if (!fs.existsSync(TEST_FILES_DIR)) {
  fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
}

// Create sample test files
function createTestFiles() {
  console.log('📁 Creating test files...');
  
  // Create a sample image file (1x1 pixel PNG)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-image.png'), pngData);
  
  // Create a sample text file (simulating audio metadata)
  const audioData = 'Sample audio file content for testing';
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-audio.txt'), audioData);
  
  console.log('✅ Test files created successfully!');
}

// Test scenarios
const testScenarios = [
  {
    name: 'Text Only - Simple Query',
    prompt: 'Analyze this content for truthfulness and accuracy.',
    files: []
  },
  {
    name: 'Text with Links',
    prompt: 'Check the claims made in this article: https://example.com/news-article and also verify information from www.wikipedia.org/wiki/Climate_change. Additionally, see https://github.com/user/repo for technical details.',
    files: []
  },
  {
    name: 'Text with Files',
    prompt: 'Analyze these uploaded media files for authenticity and extract any relevant information.',
    files: ['test-image.png', 'test-audio.txt']
  },
  {
    name: 'Complex Query with Links and Files',
    prompt: 'I found this suspicious image online at https://suspicious-site.com/image.jpg and want to verify if it matches the content in my uploaded files. Also check the claims made at www.factcheck.org/recent-claims.',
    files: ['test-image.png']
  },
  {
    name: 'Social Media Link Analysis',
    prompt: 'Verify the authenticity of this social media post: https://twitter.com/user/status/123456789 and cross-reference with https://facebook.com/page/post/987654321',
    files: []
  }
];

// Function to make API request
async function testAPIEndpoint(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 Prompt: ${scenario.prompt.substring(0, 100)}${scenario.prompt.length > 100 ? '...' : ''}`);
  
  try {
    const formData = new FormData();
    formData.append('prompt', scenario.prompt);
    
    // Add files if specified
    scenario.files.forEach((filename, index) => {
      const filePath = path.join(TEST_FILES_DIR, filename);
      if (fs.existsSync(filePath)) {
        const fileStream = fs.createReadStream(filePath);
        formData.append(`file_${index}`, fileStream, filename);
        console.log(`📎 Added file: ${filename}`);
      } else {
        console.log(`⚠️  File not found: ${filename}`);
      }
    });
    
    // Make the request
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('📊 Response Data:');
      console.log(JSON.stringify(result, null, 2));
      
      // Analyze the response
      if (result.data) {
        console.log('\n📋 Analysis:');
        console.log(`- Original Prompt Length: ${result.data.originalPrompt.length} chars`);
        console.log(`- Refined Text Length: ${result.data.refinedText.length} chars`);
        console.log(`- Extracted Links: ${result.data.extractedLinks.length}`);
        console.log(`- Media Files Processed: ${result.data.mediaFiles.length}`);
        
        if (result.data.extractedLinks.length > 0) {
          console.log('🔗 Found Links:');
          result.data.extractedLinks.forEach((link, i) => {
            console.log(`  ${i + 1}. ${link}`);
          });
        }
        
        if (result.data.mediaFiles.length > 0) {
          console.log('📁 Saved Files:');
          result.data.mediaFiles.forEach((file, i) => {
            console.log(`  ${i + 1}. ${file.originalName} (${file.type}) -> ${file.path}`);
          });
        }
      }
    } else {
      console.log('❌ Error!');
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.log('💥 Request Failed!');
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
}

// Main test function
async function runTests() {
  console.log('🚀 Starting TrulyAI API Tests');
  console.log('Target URL:', API_URL);
  console.log('='.repeat(80));
  
  // Create test files
  createTestFiles();
  
  // Test GET endpoint first
  console.log('\n🔍 Testing GET endpoint...');
  try {
    const response = await fetch(API_URL, { method: 'GET' });
    const result = await response.json();
    console.log('GET Response:', result);
  } catch (error) {
    console.log('GET Error:', error.message);
  }
  
  // Run all test scenarios
  for (const scenario of testScenarios) {
    await testAPIEndpoint(scenario);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📝 Summary:');
  console.log(`- Total scenarios tested: ${testScenarios.length}`);
  console.log('- Check the console output above for detailed results');
  console.log('- Uploaded files are stored in the /uploads directory');
  console.log('- Make sure your GEMINI_API_KEY is set in your .env file');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ or you need to install node-fetch');
  console.log('Run: npm install node-fetch@2');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
