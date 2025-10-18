/**
 * Test script for /api/initial route - Complete analysis pipeline
 * Run with: node test-initial-api.cjs
 * 
 * Prerequisites:
 * 1. Next.js dev server running on localhost:3000
 * 2. Python backend running on localhost:8000
 * 3. GEMINI_API_KEY set in .env.local
 */

const fs = require('fs');
const path = require('path');

const INITIAL_API_URL = 'http://localhost:3000/api/initial';
const TEST_FILES_DIR = './test-files';

// Create test files if they don't exist
function createTestFiles() {
  console.log('📁 Setting up test files...');
  
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

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
  
  // Create a sample text file (simulating audio)
  const audioData = 'Sample audio file content for testing';
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-audio.txt'), audioData);
  
  console.log('✅ Test files created successfully!');
}

// Simple FormData implementation for Node.js
class SimpleFormData {
  constructor() {
    this.boundary = '----formdata-' + Math.random().toString(36);
    this.data = [];
  }

  append(name, value, filename) {
    let header = `--${this.boundary}\r\n`;
    
    if (filename) {
      header += `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\n`;
      header += `Content-Type: application/octet-stream\r\n\r\n`;
    } else {
      header += `Content-Disposition: form-data; name="${name}"\r\n\r\n`;
    }
    
    this.data.push(Buffer.from(header));
    this.data.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
    this.data.push(Buffer.from('\r\n'));
  }

  getBuffer() {
    const end = Buffer.from(`--${this.boundary}--\r\n`);
    return Buffer.concat([...this.data, end]);
  }

  getHeaders() {
    return {
      'Content-Type': `multipart/form-data; boundary=${this.boundary}`
    };
  }
}

// Test scenarios
const testScenarios = [
  {
    name: 'Simple Text Correction',
    prompt: 'Hw long will i taj fo a chth to finish a 2km lap?',
    files: []
  },
  {
    name: 'Text with Links',
    prompt: 'Check the claims at https://example.com/news and verify against www.nasa.gov/climate data.',
    files: []
  },
  {
    name: 'Multi-modal Analysis',
    prompt: 'Analyze these files for authenticity and extract information.',
    files: ['test-image.png', 'test-audio.txt']
  }
];

// Function to check system status
async function checkSystemStatus() {
  console.log('🔍 Checking system status...\n');
  
  // Check Next.js API
  try {
    const response = await fetch('http://localhost:3000/api/initial');
    const result = await response.json();
    console.log('✅ Next.js API Status:', response.ok ? 'Running' : 'Error');
    if (response.ok) {
      console.log('   📋 Pipeline steps:', result.pipeline?.length || 0);
    }
  } catch (error) {
    console.log('❌ Next.js API Status: Not running');
    console.log('   💡 Start with: npm run dev');
  }
  
  // Check Python backend
  try {
    const response = await fetch('http://localhost:8000/api/info');
    const result = await response.json();
    console.log('✅ Python Backend Status:', response.ok ? 'Running' : 'Error');
    if (response.ok) {
      console.log('   📋 Version:', result.version || 'Unknown');
    }
  } catch (error) {
    console.log('❌ Python Backend Status: Not running');
    console.log('   💡 Start with: python -m uvicorn app.main:app --reload');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Function to test the initial API
async function testInitialAPI(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 Prompt: ${scenario.prompt}`);
  
  const startTime = Date.now();
  
  try {
    const formData = new SimpleFormData();
    formData.append('prompt', scenario.prompt);
    
    // Add files if specified
    scenario.files.forEach((filename, index) => {
      const filePath = path.join(TEST_FILES_DIR, filename);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        formData.append(`file_${index}`, fileBuffer, filename);
        console.log(`📎 Added file: ${filename}`);
      }
    });
    
    console.log('🚀 Sending request to initial API...');
    
    // Make the request
    const response = await fetch(INITIAL_API_URL, {
      method: 'POST',
      body: formData.getBuffer(),
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    const totalTime = Date.now() - startTime;
    
    if (response.ok && result.success) {
      console.log('✅ Analysis Completed Successfully!');
      console.log(`⏱️  Total Time: ${totalTime}ms`);
      
      // Log complete response for validation
      console.log('\n🔍 COMPLETE RESPONSE:');
      console.log('='.repeat(50));
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(50));
      
      // Summary
      const data = result.data;
      console.log('\n📊 ANALYSIS SUMMARY:');
      console.log(`   📝 Original: "${data.textAnalysis.originalPrompt}"`);
      console.log(`   ✨ Refined: "${data.textAnalysis.refinedText}"`);
      console.log(`   🔗 Links: ${data.textAnalysis.extractedLinks.length}`);
      console.log(`   📁 Files: ${data.processingStats.totalFiles}`);
      console.log(`   ✅ Success: ${data.processingStats.successfulAnalyses}`);
      console.log(`   🎯 Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      console.log(`   🏁 Conclusion: "${data.aggregatedConclusion}"`);
      
    } else {
      console.log('❌ Analysis Failed!');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('💥 Request Failed!');
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
}

// Main test function
async function runTests() {
  console.log('🚀 TrulyAI Initial API Test Suite');
  console.log('==================================');
  
  await checkSystemStatus();
  createTestFiles();
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 Test ${i + 1}/${testScenarios.length}`);
    
    await testInitialAPI(scenario);
    
    // Small delay between tests
    if (i < testScenarios.length - 1) {
      console.log('⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📝 Summary:');
  console.log(`- Tested ${testScenarios.length} scenarios`);
  console.log('- Check responses above for validation');
  console.log('- Verify text correction and media analysis');
}

// Check Node.js version and fetch availability
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ for fetch support');
  process.exit(1);
}

// Run the tests
console.log('Starting tests in 2 seconds...\n');
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);
