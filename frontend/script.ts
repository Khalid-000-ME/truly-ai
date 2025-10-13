import fetch from 'node-fetch';
import { URL } from 'url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';  // Allow self-signed certificates for testing

const BASE_URL = 'http://localhost:3000/api';

interface MediaSources {
  text: string[];
  images: string[];
  videos: string[];
  audio: string[];
}

interface ValidationSource {
  url: string;
  type: 'text' | 'images' | 'videos' | 'audio';
}

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
}

interface AggregateResult {
  overallVerdict: 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'UNVERIFIED';
  confidenceScore: number;
  reasoning: string;
  breakdown: {
    textSources: { supporting: number; refuting: number };
    images: { verified: number; manipulated: number };
    videos: { authentic: number; deepfake: number };
    audio: { authentic: number; cloned: number };
  };
}

async function checkServer() {
  try {
    console.log('Checking server at:', BASE_URL.replace('/api', ''));
    const response = await fetch(BASE_URL.replace('/api', ''));
    console.log('Server response:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response body:', text);
    return response.ok;
  } catch (error) {
    console.error('Server check failed:', error);
    return false;
  }
}

async function testSegregateAPI(url: string): Promise<MediaSources> {
  console.log('\n🔍 Testing Segregate API...');
  try {
    const response = await fetch(`${BASE_URL}/segregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json() as MediaSources;
    
    console.log('✅ Media found:');
    console.log(`   Text sources: ${result.text.length}`);
    console.log(`   Images: ${result.images.length}`);
    console.log(`   Videos: ${result.videos.length}`);
    console.log(`   Audio: ${result.audio.length}`);
    return result;
  } catch (error) {
    console.error('❌ Segregate API Error:', error);
    throw error;
  }
}

async function testValidationAPI(url: string, type: ValidationSource['type'], claim: string): Promise<ValidationResult> {
  console.log(`\n🔍 Testing ${type} validation...`);
  try {
    const response = await fetch(`${BASE_URL}/validate/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, claim })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json() as ValidationResult;
    
    console.log(`✅ ${type} validation result:`);
    console.log(`   Valid: ${result.isValid}`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Reasoning: ${result.reasoning?.slice(0, 100)}...`);
    return result;
  } catch (error) {
    console.error(`❌ ${type} Validation Error:`, error);
    throw error;
  }
}

async function testAggregateAPI(sources: ValidationSource[], claim: string): Promise<AggregateResult> {
  console.log('\n🔍 Testing Aggregate API...');
  try {
    const response = await fetch(`${BASE_URL}/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources, claim })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json() as AggregateResult;
    
    console.log('✅ Aggregate result:');
    console.log(`   Verdict: ${result.overallVerdict}`);
    console.log(`   Confidence: ${result.confidenceScore}`);
    console.log(`   Reasoning: ${result.reasoning}`);
    return result;
  } catch (error) {
    console.error('❌ Aggregate API Error:', error);
    throw error;
  }
}

async function runTest() {
  const testURL = 'https://www.who.int/news-room/fact-sheets/detail/coronavirus-disease-(covid-19)';
  const testClaim = 'Drinking 3 liters of water cures COVID-19';

  console.log('🚀 Starting Validation Test...');
  console.log(`URL: ${testURL}`);
  console.log(`Claim: ${testClaim}`);

  try {
    // Step 1: Find all media in the URL
    const media = await testSegregateAPI(testURL);

    // Step 2: Test individual validations
    const validationPromises = [
      // Always validate the main URL as text
      testValidationAPI(testURL, 'text', testClaim),
      // Test first image if available
      ...(media.images.length > 0 ? [testValidationAPI(media.images[0], 'images', testClaim)] : []),
      // Test first video if available
      ...(media.videos.length > 0 ? [testValidationAPI(media.videos[0], 'videos', testClaim)] : []),
      // Test first audio if available
      ...(media.audio.length > 0 ? [testValidationAPI(media.audio[0], 'audio', testClaim)] : [])
    ];

    await Promise.all(validationPromises);

    // Step 3: Test aggregation
    const sources: ValidationSource[] = [
      { url: testURL, type: 'text' },
      ...media.images.map(url => ({ url, type: 'images' as const })),
      ...media.videos.map(url => ({ url, type: 'videos' as const })),
      ...media.audio.map(url => ({ url, type: 'audio' as const }))
    ];

    const finalResult = await testAggregateAPI(sources, testClaim);
    console.log('\n✨ Final Results:');
    console.log('Overall Verdict:', finalResult.overallVerdict);    
    console.log('Confidence Score:', (finalResult.confidenceScore * 100).toFixed(1) + '%');
    console.log('\nReasoning:', finalResult.reasoning);
    
    console.log('\nBreakdown:');
    console.log('- Text Sources:', 
      `${finalResult.breakdown.textSources.supporting} supporting,`,
      `${finalResult.breakdown.textSources.refuting} refuting`);
    console.log('- Images:', 
      `${finalResult.breakdown.images.verified} verified,`,
      `${finalResult.breakdown.images.manipulated} manipulated`);
    console.log('- Videos:', 
      `${finalResult.breakdown.videos.authentic} authentic,`,
      `${finalResult.breakdown.videos.deepfake} deepfake`);
    console.log('- Audio:', 
      `${finalResult.breakdown.audio.authentic} authentic,`,
      `${finalResult.breakdown.audio.cloned} cloned`);

  } catch (error) {
    console.error('\n💥 Test Failed:', error);
  }
}

// Run the test
runTest();