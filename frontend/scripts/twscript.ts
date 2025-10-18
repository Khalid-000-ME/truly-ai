interface PopularTweet {
  text: string;
  author: string;
  author_name: string;
  likes: number;
  retweets: number;
  replies: number;
  created_at: string;
  url: string;
  tweet_id: string;
}

interface TwitterApiResponse {
  success: boolean;
  count: number;
  query: string;
  min_likes: number;
  tweets: PopularTweet[];
}

interface TwitterApiError {
  error: string;
  message?: string;
}

/**
 * Test the Twitter Popular Tweets API with GET request
 */
async function testTwitterGetAPI(query: string = 'AI technology', minLikes: number = 50, maxResults: number = 25): Promise<void> {
  console.log('🚀 Testing Twitter Popular Tweets API (GET)...');
  console.log(`📋 Parameters: query="${query}", min_likes=${minLikes}, max_results=${maxResults}`);
  
  try {
    const params = new URLSearchParams({
      query: query,
      min_likes: minLikes.toString(),
      max_results: maxResults.toString()
    });
    
    const url = `http://localhost:3000/api/twitter/popular?${params.toString()}`;
    console.log('📡 Making GET request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData: TwitterApiError = await response.json();
      console.error('❌ API Error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: TwitterApiResponse = await response.json();
    
    console.log('✅ GET Request successful!');
    console.log('📊 Response summary:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Total tweets found: ${data.count}`);
    console.log(`   Query used: "${data.query}"`);
    console.log(`   Min likes threshold: ${data.min_likes}`);
    
    if (data.tweets && data.tweets.length > 0) {
      console.log('\n🐦 Top Popular Tweets:');
      console.log('=' .repeat(80));
      
      data.tweets.slice(0, 5).forEach((tweet, index) => {
        console.log(`\n📝 Tweet #${index + 1}:`);
        console.log(`   Author: ${tweet.author_name} (@${tweet.author})`);
        console.log(`   Text: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`);
        console.log(`   Engagement: ${tweet.likes.toLocaleString()} likes, ${tweet.retweets.toLocaleString()} retweets, ${tweet.replies.toLocaleString()} replies`);
        console.log(`   Posted: ${new Date(tweet.created_at).toLocaleString()}`);
        console.log(`   URL: ${tweet.url}`);
      });
      
      if (data.tweets.length > 5) {
        console.log(`\n... and ${data.tweets.length - 5} more tweets`);
      }
    } else {
      console.log('📭 No tweets found matching the criteria');
    }
    
  } catch (error) {
    console.error('💥 GET Test Failed:', error);
    throw error;
  }
}

/**
 * Test the Twitter Popular Tweets API with POST request
 */
async function testTwitterPostAPI(query: string = 'climate change', minLikes: number = 100, maxResults: number = 30): Promise<void> {
  console.log('\n🚀 Testing Twitter Popular Tweets API (POST)...');
  console.log(`📋 Parameters: query="${query}", min_likes=${minLikes}, max_results=${maxResults}`);
  
  try {
    const requestBody = {
      query: `${query} -is:retweet`,
      min_likes: minLikes,
      max_results: maxResults
    };
    
    console.log('📡 Making POST request with body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('http://localhost:3000/api/twitter/popular', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorData: TwitterApiError = await response.json();
      console.error('❌ API Error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: TwitterApiResponse = await response.json();
    
    console.log('✅ POST Request successful!');
    console.log('📊 Response summary:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Total tweets found: ${data.count}`);
    console.log(`   Query used: "${data.query}"`);
    console.log(`   Min likes threshold: ${data.min_likes}`);
    
    if (data.tweets && data.tweets.length > 0) {
      console.log('\n🐦 Most Engaging Tweets:');
      console.log('=' .repeat(80));
      
      // Show top 3 most liked tweets
      const topTweets = data.tweets.slice(0, 3);
      topTweets.forEach((tweet, index) => {
        console.log(`\n🏆 Top Tweet #${index + 1}:`);
        console.log(`   Author: ${tweet.author_name} (@${tweet.author})`);
        console.log(`   Text: ${tweet.text.substring(0, 150)}${tweet.text.length > 150 ? '...' : ''}`);
        console.log(`   🔥 Engagement: ${tweet.likes.toLocaleString()} likes, ${tweet.retweets.toLocaleString()} retweets`);
        console.log(`   📅 Posted: ${new Date(tweet.created_at).toLocaleString()}`);
        console.log(`   🔗 URL: ${tweet.url}`);
      });
      
      // Show engagement statistics
      const totalLikes = data.tweets.reduce((sum, tweet) => sum + tweet.likes, 0);
      const avgLikes = Math.round(totalLikes / data.tweets.length);
      const maxLikes = Math.max(...data.tweets.map(t => t.likes));
      
      console.log('\n📈 Engagement Statistics:');
      console.log(`   Total likes across all tweets: ${totalLikes.toLocaleString()}`);
      console.log(`   Average likes per tweet: ${avgLikes.toLocaleString()}`);
      console.log(`   Highest likes on single tweet: ${maxLikes.toLocaleString()}`);
      
    } else {
      console.log('📭 No tweets found matching the criteria');
    }
    
  } catch (error) {
    console.error('💥 POST Test Failed:', error);
    throw error;
  }
}

/**
 * Test error handling scenarios
 */
async function testErrorScenarios(): Promise<void> {
  console.log('\n🧪 Testing Error Scenarios...');
  
  // Test 1: Invalid max_results parameter
  console.log('\n🔍 Test 1: Invalid max_results (>100)');
  try {
    const response = await fetch('http://localhost:3000/api/twitter/popular?max_results=150', {
      method: 'GET'
    });
    
    if (response.status === 400) {
      const error = await response.json();
      console.log('✅ Correctly rejected invalid max_results:', error.error);
    } else {
      console.log('❌ Should have rejected max_results > 100');
    }
  } catch (error) {
    console.log('❌ Unexpected error in test 1:', error);
  }
  
  // Test 2: Empty query
  console.log('\n🔍 Test 2: Empty query parameter');
  try {
    const response = await fetch('http://localhost:3000/api/twitter/popular?query=', {
      method: 'GET'
    });
    
    console.log('📡 Empty query response status:', response.status);
    const data = await response.json();
    console.log('📋 Empty query uses default:', data.query);
  } catch (error) {
    console.log('❌ Error in test 2:', error);
  }
  
  // Test 3: Very high min_likes threshold
  console.log('\n🔍 Test 3: Very high min_likes threshold');
  try {
    const response = await fetch('http://localhost:3000/api/twitter/popular?min_likes=10000', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ High threshold handled gracefully. Found ${data.count} tweets with 10k+ likes`);
    }
  } catch (error) {
    console.log('❌ Error in test 3:', error);
  }
}

/**
 * Performance test - measure response times
 */
async function performanceTest(): Promise<void> {
  console.log('\n⚡ Performance Test...');
  
  const testCases = [
    { query: 'javascript', max_results: 10, min_likes: 25 },
    { query: 'python programming', max_results: 25, min_likes: 50 },
    { query: 'machine learning', max_results: 50, min_likes: 100 }
  ];
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3000/api/twitter/popular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase)
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`⏱️  Query "${testCase.query}" (${testCase.max_results} results): ${duration}ms - Found ${data.count} tweets`);
      } else {
        console.log(`❌ Query "${testCase.query}" failed: ${response.status}`);
      }
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`💥 Query "${testCase.query}" errored after ${duration}ms:`, error);
    }
  }
}

/**
 * Main test runner
 */
async function runTwitterApiTests(): Promise<void> {
  console.log('🎯 Starting Twitter Popular Tweets API Tests...');
  console.log('=' .repeat(80));
  
  try {
    // Test GET endpoint
    await testTwitterGetAPI('AI technology', 50, 25);
    
    // Test POST endpoint  
    await testTwitterPostAPI('climate change', 100, 30);
    
    // Test error scenarios
    await testErrorScenarios();
    
    // Performance tests
    await performanceTest();
    
    console.log('\n🎉 All Twitter API tests completed!');
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  }
}

// Run the tests
runTwitterApiTests().catch(console.error);