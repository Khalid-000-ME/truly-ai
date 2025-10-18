/**
 * Test script for /api/initial route - Complete analysis pipeline
 * Run with: node test-initial-api.js
 * 
 * Prerequisites:
 * 1. Next.js dev server running on localhost:3000
 * 2. Python backend running on localhost:8000
 * 3. GEMINI_API_KEY set in .env.local
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  
  // Create a sample audio file (minimal MP3 header)
  const mp3Data = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-audio.mp3'), mp3Data);
  
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

// Test scenarios for the initial API
const testScenarios = [
  {
    name: 'Text Only Analysis',
    prompt: 'Is climate change real? Verify the scientific consensus.',
    files: []
  },
  {
    name: 'Text with Links',
    prompt: 'Check the claims made in this article: https://example.com/climate-news and verify against https://nasa.gov/climate data.',
    files: []
  },
  {
    name: 'Multi-modal Analysis',
    prompt: 'Analyze these media files for authenticity and extract any relevant information about climate data.',
    files: ['test-image.png', 'test-audio.mp3']
  },
  {
    name: 'Complex Fact-checking',
    prompt: 'I found this suspicious content claiming vaccines are dangerous at https://fake-news-site.com. Please analyze my evidence files and cross-reference with https://cdc.gov/vaccines.',
    files: ['test-image.png']
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
      console.log('   📋 Pipeline:', result.pipeline);
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
      console.log('   📋 Version:', result.version);
      console.log('   📋 Endpoints:', Object.keys(result.endpoints).length, 'available');
    }
  } catch (error) {
    console.log('❌ Python Backend Status: Not running');
    console.log('   💡 Start with: cd Python_backend && python -m uvicorn app.main:app --reload');
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Function to make API request
async function testInitialAPI(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`📝 Prompt: ${scenario.prompt.substring(0, 100)}${scenario.prompt.length > 100 ? '...' : ''}`);
  
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
        console.log(`📎 Added file: ${filename} (${fileBuffer.length} bytes)`);
      } else {
        console.log(`⚠️  File not found: ${filename}`);
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
      console.log('✅ Analysis Pipeline Completed Successfully!');
      console.log(`⏱️  Total Time: ${totalTime}ms`);
      
      // Log the complete response for validation
      console.log('\n🔍 COMPLETE ANALYSIS RESULT:');
      console.log('==========================================');
      console.log(JSON.stringify(result, null, 2));
      console.log('==========================================\n');
      
      // Summary analysis
      const data = result.data;
      console.log('📊 Analysis Summary:');
      console.log(`   📝 Original: "${data.textAnalysis.originalPrompt}"`);
      console.log(`   ✨ Refined: "${data.textAnalysis.refinedText}"`);
      console.log(`   🔗 Links found: ${data.textAnalysis.extractedLinks.length}`);
      console.log(`   📁 Files analyzed: ${data.processingStats.totalFiles}`);
      console.log(`   ✅ Successful analyses: ${data.processingStats.successfulAnalyses}`);
      console.log(`   ❌ Failed analyses: ${data.processingStats.failedAnalyses}`);
      console.log(`   🎯 Confidence: ${(data.confidence * 100).toFixed(1)}%`);
      
      if (data.textAnalysis.extractedLinks.length > 0) {
        console.log('\n🔗 Extracted Links:');
        data.textAnalysis.extractedLinks.forEach((link, i) => {
          console.log(`   ${i + 1}. ${link}`);
        });
      }
      
      if (data.mediaAnalysis.length > 0) {
        console.log('\n📁 Media Analysis Results:');
        data.mediaAnalysis.forEach((analysis, i) => {
          console.log(`   ${i + 1}. ${analysis.file} (${analysis.type})`);
          if (analysis.error) {
            console.log(`      ❌ Error: ${analysis.error}`);
          } else {
            console.log(`      ✅ Analysis completed successfully`);
          }
        });
      }
      
      console.log('\n🎯 Final Conclusion:');
      console.log(`"${data.aggregatedConclusion}"`);
      
      console.log('\n⚡ Performance Metrics:');
      console.log(`   🔧 Handle API: ${result.meta.handleApiTime}ms`);
      console.log(`   🧠 Media Analysis: ${result.meta.mediaAnalysisTime}ms`);
      console.log(`   🤖 Gemini Used: ${result.meta.geminiUsed ? 'Yes' : 'No'}`);
      console.log(`   🐍 Python Backend: ${result.meta.pythonBackendUsed ? 'Yes' : 'No'}`);
      
    } else {
      console.log('❌ Analysis Pipeline Failed!');
      console.log('Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('💥 Request Failed!');
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
}

// Main test function
async function runTests() {
  console.log('🚀 TrulyAI Initial API Test Suite');
  console.log('==================================');
  console.log('Testing complete multi-modal analysis pipeline\n');
  
  // Check system status
  await checkSystemStatus();
  
  // Create test files
  createTestFiles();
  
  // Run test scenarios
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n📋 Test ${i + 1}/${testScenarios.length}`);
    
    await testInitialAPI(scenario);
    
    // Add delay between tests
    if (i < testScenarios.length - 1) {
      console.log('⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📝 Test Summary:');
  console.log(`- Total scenarios: ${testScenarios.length}`);
  console.log('- Check console output for detailed analysis results');
  console.log('- Verify that both text and media analyses are working');
  console.log('- Ensure aggregated conclusions are meaningful');
  
  console.log('\n🔧 Troubleshooting:');
  console.log('- If Python backend fails: Check if it\'s running on port 8000');
  console.log('- If Gemini fails: Check GEMINI_API_KEY in .env.local');
  console.log('- If files fail: Check upload permissions and file formats');
}

// Check Node.js version and fetch availability
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ for fetch support');
  console.log('Alternative: Install node-fetch with "npm install node-fetch@2"');
  process.exit(1);
}

// Run the tests
console.log('Starting initial API tests in 2 seconds...\n');
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);
