import fetch from 'node-fetch';
import { URL } from 'url';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';  // Allow self-signed certificates for testing

const BASE_URL = 'http://localhost:3002/api';

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

async function testSearchAPI(): Promise<string[]> {
  console.log('\n🔍 Testing Search API...');
  try {
    const response = await fetch(`${BASE_URL}/search`);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const searchResults = await response.json() as string[];
    
    console.log('✅ Search results found:');
    console.log(`   Total URLs: ${searchResults.length}`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result}`);
    });
    
    return searchResults;
  } catch (error) {
    console.error('❌ Search API Error:', error);
    throw error;
  }
}

async function runTest() {
  const testClaim = 'Drinking 3 liters of water cures COVID-19';

  console.log('🚀 Starting Enhanced Validation Test...');
  console.log(`Claim: ${testClaim}`);

  try {
    // Step 1: Get search results from Perplexity
    const searchResults = await testSearchAPI();
    
    // Extract URLs from search results (format: "Title: URL")
    const urls = searchResults.map(result => {
      const parts = result.split(': ');
      return parts.length > 1 ? parts.slice(1).join(': ') : result;
    }).filter(url => url.startsWith('http'));
    
    console.log(`\n📋 Processing ${urls.length} URLs from search results...`);
    
    // Step 2: Process each URL with segregate API
    const allMediaSources: MediaSources = {
      text: [],
      images: [],
      videos: [],
      audio: []
    };
    
    for (const [index, url] of urls.entries()) {
      console.log(`\n📄 Processing URL ${index + 1}/${urls.length}: ${url}`);
      try {
        const media = await testSegregateAPI(url);
        
        // Aggregate all media sources
        allMediaSources.text.push(...media.text);
        allMediaSources.images.push(...media.images);
        allMediaSources.videos.push(...media.videos);
        allMediaSources.audio.push(...media.audio);
        
        // Output JSON for this URL
        console.log(`📊 Media breakdown for ${url}:`);
        console.log(JSON.stringify(media, null, 2));
        
      } catch (error) {
        console.error(`❌ Failed to process ${url}:`, error);
      }
    }
    
    // Remove duplicates
    allMediaSources.text = [...new Set(allMediaSources.text)];
    allMediaSources.images = [...new Set(allMediaSources.images)];
    allMediaSources.videos = [...new Set(allMediaSources.videos)];
    allMediaSources.audio = [...new Set(allMediaSources.audio)];
    
    console.log('\n📊 Aggregated Media Sources:');
    console.log(`   Total Text sources: ${allMediaSources.text.length}`);
    console.log(`   Total Images: ${allMediaSources.images.length}`);
    console.log(`   Total Videos: ${allMediaSources.videos.length}`);
    console.log(`   Total Audio: ${allMediaSources.audio.length}`);

    // Step 3: Test validation APIs on collected media
    console.log('\n🔬 Testing validation APIs...');
    
    const validationPromises = [
      // Validate text sources (limit to first 3 to avoid overwhelming)
      ...allMediaSources.text.slice(0, 3).map(url => 
        testValidationAPI(url, 'text', testClaim)
      ),
      // Validate images (limit to first 2)
      ...allMediaSources.images.slice(0, 2).map(url => 
        testValidationAPI(url, 'images', testClaim)
      ),
      // Validate videos (limit to first 1)
      ...allMediaSources.videos.slice(0, 1).map(url => 
        testValidationAPI(url, 'videos', testClaim)
      ),
      // Validate audio (limit to first 1)
      ...allMediaSources.audio.slice(0, 1).map(url => 
        testValidationAPI(url, 'audio', testClaim)
      )
    ];

    await Promise.all(validationPromises);

    // Step 4: Test aggregation with all sources
    const sources: ValidationSource[] = [
      ...allMediaSources.text.map(url => ({ url, type: 'text' as const })),
      ...allMediaSources.images.map(url => ({ url, type: 'images' as const })),
      ...allMediaSources.videos.map(url => ({ url, type: 'videos' as const })),
      ...allMediaSources.audio.map(url => ({ url, type: 'audio' as const }))
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