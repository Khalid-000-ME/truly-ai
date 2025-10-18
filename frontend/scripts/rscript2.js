import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

/**
 * Check if Reddit API is configured and log the mode
 */
function checkRedditAPIMode() {
  console.log('🔍 Checking Reddit API Configuration...');
  console.log('-'.repeat(50));
  
  const hasUserAgent = !!process.env.REDDIT_USER_AGENT;
  const hasClientId = !!process.env.REDDIT_CLIENT_ID;
  const hasClientSecret = !!process.env.REDDIT_CLIENT_SECRET;
  const hasUsername = !!process.env.REDDIT_USERNAME;
  const hasPassword = !!process.env.REDDIT_PASSWORD;
  
  console.log('📋 Environment Variables Status:');
  console.log(`   REDDIT_USER_AGENT: ${hasUserAgent ? '✅ Set' : '❌ Missing'}`);
  console.log(`   REDDIT_CLIENT_ID: ${hasClientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   REDDIT_CLIENT_SECRET: ${hasClientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`   REDDIT_USERNAME: ${hasUsername ? '✅ Set' : '❌ Missing'}`);
  console.log(`   REDDIT_PASSWORD: ${hasPassword ? '✅ Set' : '❌ Missing'}`);
  
  const isFullyConfigured = hasUserAgent && hasClientId && hasClientSecret && hasUsername && hasPassword;
  const isDevelopmentMode = process.env.NODE_ENV === 'development';
  
  if (isFullyConfigured && !isDevelopmentMode) {
    console.log('\n🚀 API Mode: LIVE REDDIT API');
    console.log('   ✅ All credentials configured');
    console.log('   ✅ Production mode enabled');
    console.log('   📡 Will attempt real Reddit API calls');
  } else {
    console.log('\n🎭 API Mode: MOCK DATA');
    if (!isFullyConfigured) {
      console.log('   ⚠️  Missing Reddit API credentials');
    }
    if (isDevelopmentMode) {
      console.log('   ⚠️  Development mode enabled');
    }
    console.log('   📋 Will use mock Reddit data');
  }
  
  return {
    isLiveMode: isFullyConfigured && !isDevelopmentMode,
    isMockMode: !isFullyConfigured || isDevelopmentMode
  };
}

/**
 * Analyze response to determine if it's mock or real data
 */
function analyzeResponseMode(posts) {
  if (!posts || posts.length === 0) return 'unknown';
  
  // Check for mock data indicators
  const mockAuthors = ['TechExplorer2025', 'ExperiencedDev', 'CreativeBuilder', 'FutureThinker', 'CuriousLearner', 'StartupNews', 'WeekendCoder', 'OpenSourceFan'];
  const mockDomains = ['example.com', 'self.programming', 'self.technology'];
  
  const hasMockAuthors = posts.some(post => mockAuthors.includes(post.author));
  const hasMockDomains = posts.some(post => mockDomains.includes(post.domain));
  const hasExampleUrls = posts.some(post => post.url && post.url.includes('example.com'));
  
  if (hasMockAuthors || hasMockDomains || hasExampleUrls) {
    return 'mock';
  }
  
  // Check for real Reddit data indicators
  const hasRealRedditUrls = posts.some(post => post.url && (post.url.includes('reddit.com') || post.url.includes('redd.it')));
  const hasVariedAuthors = new Set(posts.map(p => p.author)).size > posts.length * 0.7;
  
  if (hasRealRedditUrls && hasVariedAuthors) {
    return 'live';
  }
  
  return 'unknown';
}

/**
 * Log the detected API mode based on response data
 */
function logDetectedMode(posts, testName) {
  const detectedMode = analyzeResponseMode(posts);
  
  switch (detectedMode) {
    case 'mock':
      console.log(`🎭 [${testName}] DETECTED: Mock data response`);
      console.log('   📋 Using fallback mock Reddit posts');
      break;
    case 'live':
      console.log(`🚀 [${testName}] DETECTED: Live Reddit API response`);
      console.log('   📡 Real data from Reddit servers');
      break;
    default:
      console.log(`❓ [${testName}] DETECTED: Unknown data source`);
      break;
  }
}

/**
 * Test the main Reddit API route (/api/reddit)
 */
async function testRedditMainAPI() {
  console.log('🚀 Testing Main Reddit API (/api/reddit)...');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: GET request - Hot posts from r/programming
    console.log('\n📋 Test 1: GET Hot Posts from r/programming');
    console.log('-'.repeat(50));
    
    const getParams = new URLSearchParams({
      subreddit: 'programming',
      sort: 'hot',
      limit: '10',
      min_score: '50'
    });
    
    const getUrl = `http://localhost:3000/api/reddit?${getParams.toString()}`;
    console.log('📡 Making GET request to:', getUrl);
    
    const getResponse = await fetch(getUrl);
    console.log('📡 Response status:', getResponse.status, getResponse.statusText);
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET Request successful!');
      console.log('📊 Response summary:');
      console.log(`   Success: ${getData.success}`);
      console.log(`   Total posts: ${getData.count}`);
      console.log(`   Subreddit: r/${getData.subreddit}`);
      console.log(`   Sort: ${getData.sort}`);
      console.log(`   Min score: ${getData.min_score}`);
      
      if (getData.posts && getData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(getData.posts, 'GET Main API');
        
        console.log('\n🐦 Top Posts:');
        getData.posts.slice(0, 3).forEach((post, index) => {
          console.log(`\n${index + 1}. ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   📊 ${post.score} points (${(post.upvote_ratio * 100).toFixed(1)}% upvoted)`);
          console.log(`   💬 ${post.num_comments} comments`);
          console.log(`   🔗 ${post.url}`);
          if (post.flair) console.log(`   🏷️  ${post.flair}`);
        });
      }
    } else {
      const errorData = await getResponse.json();
      console.error('❌ GET Request failed:', errorData);
    }
    
    // Test 2: POST request - Search for AI posts
    console.log('\n\n📋 Test 2: POST Search for "artificial intelligence" posts');
    console.log('-'.repeat(50));
    
    const postBody = {
      query: 'artificial intelligence',
      subreddit: 'all',
      sort: 'top',
      time_filter: 'week',
      limit: 8,
      min_score: 100
    };
    
    console.log('📡 Making POST request with body:', JSON.stringify(postBody, null, 2));
    
    const postResponse = await fetch('http://localhost:3000/api/reddit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postBody)
    });
    
    console.log('📡 Response status:', postResponse.status, postResponse.statusText);
    
    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log('✅ POST Request successful!');
      console.log('📊 Response summary:');
      console.log(`   Success: ${postData.success}`);
      console.log(`   Total posts: ${postData.count}`);
      console.log(`   Query: "${postData.query}"`);
      console.log(`   Subreddit: r/${postData.subreddit}`);
      console.log(`   Sort: ${postData.sort}`);
      console.log(`   Time filter: ${postData.time_filter}`);
      console.log(`   Min score: ${postData.min_score}`);
      
      if (postData.posts && postData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(postData.posts, 'POST Main API');
        
        console.log('\n🔍 Search Results:');
        postData.posts.slice(0, 3).forEach((post, index) => {
          console.log(`\n${index + 1}. ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   📊 ${post.score} points | 💬 ${post.num_comments} comments`);
          console.log(`   📅 Posted: ${new Date(post.created_utc).toLocaleString()}`);
          console.log(`   🔗 ${post.url}`);
          if (post.is_self && post.selftext) {
            console.log(`   📝 ${post.selftext.substring(0, 100)}...`);
          }
        });
      }
    } else {
      const errorData = await postResponse.json();
      console.error('❌ POST Request failed:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Main Reddit API test failed:', error.message);
  }
}

/**
 * Test the Reddit Hot Posts API route (/api/reddit/hots)
 */
async function testRedditHotsAPI() {
  console.log('\n\n🔥 Testing Reddit Hot Posts API (/api/reddit/hots)...');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: GET request - Hot posts from r/technology
    console.log('\n📋 Test 1: GET Hot Posts from r/technology');
    console.log('-'.repeat(50));
    
    const getParams = new URLSearchParams({
      subreddit: 'technology',
      limit: '15',
      min_score: '200'
    });
    
    const getUrl = `http://localhost:3000/api/reddit/hots?${getParams.toString()}`;
    console.log('📡 Making GET request to:', getUrl);
    
    const getResponse = await fetch(getUrl);
    console.log('📡 Response status:', getResponse.status, getResponse.statusText);
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET Request successful!');
      console.log('📊 Response summary:');
      console.log(`   Success: ${getData.success}`);
      console.log(`   Total hot posts: ${getData.count}`);
      console.log(`   Subreddit: r/${getData.subreddit}`);
      console.log(`   Min score: ${getData.min_score}`);
      
      if (getData.posts && getData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(getData.posts, 'GET Hot Posts API');
        
        console.log('\n🔥 Hot Posts:');
        getData.posts.slice(0, 4).forEach((post, index) => {
          console.log(`\n🏆 #${index + 1} ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   🔥 ${post.score} points (${(post.upvote_ratio * 100).toFixed(1)}% upvoted)`);
          console.log(`   💬 ${post.num_comments} comments | 🏅 ${post.total_awards_received} awards`);
          console.log(`   📅 ${new Date(post.created_utc).toLocaleString()}`);
          console.log(`   🔗 ${post.permalink}`);
          if (post.link_flair_text) console.log(`   🏷️  ${post.link_flair_text}`);
          if (post.over_18) console.log('   ⚠️  NSFW');
          if (post.spoiler) console.log('   ⚠️  Spoiler');
        });
        
        // Show engagement statistics
        const totalScore = getData.posts.reduce((sum, post) => sum + post.score, 0);
        const avgScore = Math.round(totalScore / getData.posts.length);
        const maxScore = Math.max(...getData.posts.map(p => p.score));
        
        console.log('\n📈 Engagement Statistics:');
        console.log(`   Total upvotes: ${totalScore.toLocaleString()}`);
        console.log(`   Average score: ${avgScore.toLocaleString()}`);
        console.log(`   Highest score: ${maxScore.toLocaleString()}`);
      }
    } else {
      const errorData = await getResponse.json();
      console.error('❌ GET Request failed:', errorData);
    }
    
    // Test 2: POST request - Hot posts from r/all with high threshold
    console.log('\n\n📋 Test 2: POST Hot Posts from r/all (High Score Threshold)');
    console.log('-'.repeat(50));
    
    const postBody = {
      subreddit: 'all',
      limit: 12,
      min_score: 1000
    };
    
    console.log('📡 Making POST request with body:', JSON.stringify(postBody, null, 2));
    
    const postResponse = await fetch('http://localhost:3000/api/reddit/hots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postBody)
    });
    
    console.log('📡 Response status:', postResponse.status, postResponse.statusText);
    
    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log('✅ POST Request successful!');
      console.log('📊 Response summary:');
      console.log(`   Success: ${postData.success}`);
      console.log(`   Total hot posts: ${postData.count}`);
      console.log(`   Subreddit: r/${postData.subreddit}`);
      console.log(`   Min score threshold: ${postData.min_score}`);
      
      if (postData.posts && postData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(postData.posts, 'POST Hot Posts API');
        
        console.log('\n🌟 Trending Posts (1000+ upvotes):');
        postData.posts.slice(0, 5).forEach((post, index) => {
          console.log(`\n⭐ Trending #${index + 1}`);
          console.log(`   📰 ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   🚀 ${post.score.toLocaleString()} points | 💬 ${post.num_comments.toLocaleString()} comments`);
          console.log(`   📊 ${(post.upvote_ratio * 100).toFixed(1)}% upvoted`);
          console.log(`   🔗 ${post.url}`);
          
          // Show content type
          if (post.is_video) console.log('   🎥 Video');
          if (post.is_self) console.log('   📝 Text Post');
          if (post.domain && !post.is_self) console.log(`   🌐 ${post.domain}`);
        });
      } else {
        console.log('📭 No posts found with score >= 1000');
      }
    } else {
      const errorData = await postResponse.json();
      console.error('❌ POST Request failed:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Hot Posts API test failed:', error.message);
  }
}

/**
 * Test error scenarios for both APIs
 */
async function testErrorScenarios() {
  console.log('\n\n🧪 Testing Error Scenarios...');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Invalid limit parameter (>100)
    console.log('\n📋 Test 1: Invalid limit parameter (>100)');
    console.log('-'.repeat(50));
    
    const invalidLimitResponse = await fetch('http://localhost:3000/api/reddit?limit=150');
    console.log('📡 Response status:', invalidLimitResponse.status);
    
    if (invalidLimitResponse.status === 400) {
      const error = await invalidLimitResponse.json();
      console.log('✅ Correctly rejected invalid limit:', error.error);
    } else {
      console.log('❌ Should have rejected limit > 100');
    }
    
    // Test 2: Test both APIs with empty/invalid subreddit
    console.log('\n📋 Test 2: Empty subreddit parameter');
    console.log('-'.repeat(50));
    
    const emptySubredditResponse = await fetch('http://localhost:3000/api/reddit/hots?subreddit=');
    console.log('📡 Response status:', emptySubredditResponse.status);
    
    if (emptySubredditResponse.ok) {
      const data = await emptySubredditResponse.json();
      console.log('✅ Empty subreddit handled gracefully, defaulted to:', data.subreddit);
    }
    
    // Test 3: Very high min_score threshold
    console.log('\n📋 Test 3: Very high min_score threshold');
    console.log('-'.repeat(50));
    
    const highScoreResponse = await fetch('http://localhost:3000/api/reddit?min_score=50000');
    
    if (highScoreResponse.ok) {
      const data = await highScoreResponse.json();
      console.log(`✅ High threshold handled gracefully. Found ${data.count} posts with 50k+ score`);
    }
    
  } catch (error) {
    console.error('💥 Error scenario test failed:', error.message);
  }
}

/**
 * Performance test - measure response times
 */
async function performanceTest() {
  console.log('\n\n⚡ Performance Test...');
  console.log('=' .repeat(80));
  
  const testCases = [
    { 
      name: 'Main API - Hot Posts',
      url: 'http://localhost:3000/api/reddit?subreddit=programming&sort=hot&limit=10'
    },
    { 
      name: 'Main API - Search',
      url: 'http://localhost:3000/api/reddit',
      method: 'POST',
      body: { query: 'javascript', limit: 15, min_score: 25 }
    },
    { 
      name: 'Hot Posts API - Technology',
      url: 'http://localhost:3000/api/reddit/hots?subreddit=technology&limit=20'
    },
    { 
      name: 'Hot Posts API - All',
      url: 'http://localhost:3000/api/reddit/hots',
      method: 'POST',
      body: { subreddit: 'all', limit: 25, min_score: 100 }
    }
  ];
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    
    try {
      const options = {
        method: testCase.method || 'GET'
      };
      
      if (testCase.body) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(testCase.body);
      }
      
      const response = await fetch(testCase.url, options);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        console.log(`⏱️  ${testCase.name}: ${duration}ms - Found ${data.count} posts`);
      } else {
        console.log(`❌ ${testCase.name}: Failed (${response.status}) after ${duration}ms`);
      }
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`💥 ${testCase.name}: Error after ${duration}ms - ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runAllRedditAPITests() {
  console.log('🎯 Starting Reddit API Routes Test Suite...');
  console.log('🕒 Started at:', new Date().toLocaleString());
  console.log('=' .repeat(80));
  
  // Check API configuration mode
  const apiMode = checkRedditAPIMode();
  
  try {
    // Test main Reddit API
    await testRedditMainAPI();
    
    // Test hot posts API
    await testRedditHotsAPI();
    
    // Test error scenarios
    await testErrorScenarios();
    
    // Performance tests
    await performanceTest();
    
    console.log('\n\n🎉 All Reddit API tests completed successfully!');
    console.log('🕒 Finished at:', new Date().toLocaleString());
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run the comprehensive test suite
runAllRedditAPITests().catch(console.error);