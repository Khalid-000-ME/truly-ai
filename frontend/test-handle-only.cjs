/**
 * Simple test for /api/handle route only - Debug file upload
 * Run with: node test-handle-only.cjs
 */

const fs = require('fs');
const path = require('path');

const HANDLE_API_URL = 'http://localhost:3000/api/handle';
const TEST_FILES_DIR = './test-files';

// Simple FormData implementation
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

// Create test files
function createTestFiles() {
  console.log('📁 Creating test files...');
  
  if (!fs.existsSync(TEST_FILES_DIR)) {
    fs.mkdirSync(TEST_FILES_DIR, { recursive: true });
  }

  // Create a small PNG file
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
    0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-image.png'), pngData);
  
  // Create a small MP3 file (just header)
  const mp3Data = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  fs.writeFileSync(path.join(TEST_FILES_DIR, 'test-audio.mp3'), mp3Data);
  
  console.log('✅ Test files created');
}

async function testHandleAPI() {
  console.log('🧪 Testing Handle API with files...');
  
  try {
    const formData = new SimpleFormData();
    formData.append('prompt', 'Hw long will i taj fo a chth to finish a 2km lap?');
    
    // Add test files
    const imagePath = path.join(TEST_FILES_DIR, 'test-image.png');
    const audioPath = path.join(TEST_FILES_DIR, 'test-audio.mp3');
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      formData.append('file_0', imageBuffer, 'test-image.png');
      console.log(`📎 Added image: ${imageBuffer.length} bytes`);
    }
    
    if (fs.existsSync(audioPath)) {
      const audioBuffer = fs.readFileSync(audioPath);
      formData.append('file_1', audioBuffer, 'test-audio.mp3');
      console.log(`📎 Added audio: ${audioBuffer.length} bytes`);
    }
    
    console.log('🚀 Sending to handle API...');
    
    const response = await fetch(HANDLE_API_URL, {
      method: 'POST',
      body: formData.getBuffer(),
      headers: formData.getHeaders()
    });
    
    const result = await response.json();
    
    console.log('\n📊 HANDLE API RESPONSE:');
    console.log('='.repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(50));
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Analysis:');
      console.log(`📝 Original: "${result.data.originalPrompt}"`);
      console.log(`✨ Refined: "${result.data.refinedText}"`);
      console.log(`📁 Files processed: ${result.data.mediaFiles.length}`);
      
      result.data.mediaFiles.forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.originalName} -> ${file.path}`);
      });
      
      // Check if files actually exist
      console.log('\n🔍 Verifying saved files:');
      result.data.mediaFiles.forEach((file, i) => {
        const exists = fs.existsSync(file.path);
        console.log(`   ${i + 1}. ${file.path}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        if (exists) {
          const stats = fs.statSync(file.path);
          console.log(`      Size: ${stats.size} bytes`);
        }
      });
      
    } else {
      console.log('❌ FAILED:', result.error);
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
}

// Check Node.js version
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ for fetch support');
  process.exit(1);
}

console.log('🚀 Testing Handle API File Upload');
console.log('=================================');

createTestFiles();
setTimeout(() => {
  testHandleAPI().catch(console.error);
}, 1000);
