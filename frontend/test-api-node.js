/**
 * Simple Node.js test script for /api/handle route
 * Run with: node test-api-node.js
 * Make sure your Next.js dev server is running on localhost:3000
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/handle';

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
const tests = [
  {
    name: 'Simple Text Query',
    data: { prompt: 'Analyze this content for truthfulness and accuracy.' }
  },
  {
    name: 'Text with Links',
    data: { 
      prompt: 'Check claims at https://example.com/news and verify info from www.wikipedia.org/wiki/Climate_change. Also see https://github.com/user/repo for details.' 
    }
  },
  {
    name: 'Text with File Upload',
    data: { 
      prompt: 'Analyze this uploaded file for suspicious content.',
      files: [{ name: 'test-file.txt', content: 'Sample test file content for analysis.' }]
    }
  },
  {
    name: 'Complex Scenario',
    data: { 
      prompt: 'Found suspicious content at https://suspicious-site.com/content and want to verify against my file. Check www.factcheck.org too.',
      files: [{ name: 'evidence.txt', content: 'Evidence file with important data to cross-reference.' }]
    }
  }
];

async function makeRequest(method, data = null) {
  const options = {
    method,
    headers: {}
  };

  if (data) {
    const formData = new SimpleFormData();
    
    // Add prompt
    if (data.prompt) {
      formData.append('prompt', data.prompt);
    }
    
    // Add files
    if (data.files) {
      data.files.forEach((file, index) => {
        formData.append(`file_${index}`, Buffer.from(file.content), file.name);
      });
    }
    
    options.body = formData.getBuffer();
    options.headers = { ...options.headers, ...formData.getHeaders() };
  }

  try {
    const response = await fetch(API_URL, options);
    const result = await response.json();
    return { success: response.ok, data: result, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 TrulyAI API Test Suite');
  console.log('========================');
  console.log(`Target: ${API_URL}\n`);

  // Test GET endpoint
  console.log('🔍 Testing GET endpoint...');
  const getResult = await makeRequest('GET');
  if (getResult.success) {
    console.log('✅ GET Success:', JSON.stringify(getResult.data, null, 2));
  } else {
    console.log('❌ GET Failed:', getResult.error || getResult.data);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test POST scenarios
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`🧪 Test ${i + 1}: ${test.name}`);
    console.log(`📝 Prompt: ${test.data.prompt.substring(0, 80)}...`);
    
    if (test.data.files) {
      console.log(`📁 Files: ${test.data.files.map(f => f.name).join(', ')}`);
    }

    const result = await makeRequest('POST', test.data);
    
    if (result.success) {
      console.log('✅ Success!');
      
      if (result.data.data) {
        const { originalPrompt, refinedText, extractedLinks, mediaFiles } = result.data.data;
        
        console.log('\n📊 Results:');
        console.log(`- Original prompt: ${originalPrompt.length} chars`);
        console.log(`- Refined text: ${refinedText.length} chars`);
        console.log(`- Extracted links: ${extractedLinks.length}`);
        console.log(`- Media files: ${mediaFiles.length}`);
        
        if (extractedLinks.length > 0) {
          console.log('\n🔗 Found Links:');
          extractedLinks.forEach((link, idx) => {
            console.log(`  ${idx + 1}. ${link}`);
          });
        }
        
        if (mediaFiles.length > 0) {
          console.log('\n📁 Saved Files:');
          mediaFiles.forEach((file, idx) => {
            console.log(`  ${idx + 1}. ${file.originalName} -> ${path.basename(file.path)}`);
          });
        }
        
        console.log('\n📝 Refined Text:');
        console.log(`"${refinedText}"`);
      }
    } else {
      console.log('❌ Failed!');
      console.log('Error:', result.error || JSON.stringify(result.data, null, 2));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('🎉 All tests completed!');
  console.log('\n📋 Summary:');
  console.log(`- Total tests: ${tests.length + 1} (including GET)`);
  console.log('- Check console output for detailed results');
  console.log('- Files are saved to /uploads directory');
  console.log('- Ensure GEMINI_API_KEY is set in your .env file');
}

// Check Node.js version and fetch availability
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ for fetch support');
  console.log('Alternative: Install node-fetch with "npm install node-fetch@2"');
  process.exit(1);
}

// Run the tests
console.log('Starting tests in 2 seconds...\n');
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);
