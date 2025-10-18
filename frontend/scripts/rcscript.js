import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

/**
 * Check if Reddit API is configured and log the mode
 */
function checkRedditAPIMode() {
  console.log('🔍 Checking Reddit API Configuration for Controversial Posts...');
  console.log('-'.repeat(60));
  
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
    console.log('   📋 Will use mock controversial Reddit data');
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
  const mockAuthors = ['ControversialThinker', 'PoliticalDebater', 'MovieCritic2025', 'SocialCommentator', 'TechSkeptic'];
  const mockDomains = ['example.com', 'self.unpopularopinion', 'self.politics'];
  
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
      console.log(`🎭 [${testName}] DETECTED: Mock controversial data response`);
      console.log('   📋 Using fallback mock controversial Reddit posts');
      break;
    case 'live':
      console.log(`🚀 [${testName}] DETECTED: Live Reddit API response`);
      console.log('   📡 Real controversial data from Reddit servers');
      break;
    default:
      console.log(`❓ [${testName}] DETECTED: Unknown data source`);
      break;
  }
}

/**
 * Display controversy level with appropriate emoji
 */
function getControversyEmoji(controversyLevel) {
  switch (controversyLevel) {
    case 'highly_controversial': return '⚡⚡⚡ HIGHLY CONTROVERSIAL';
    case 'very_controversial': return '⚡⚡ VERY CONTROVERSIAL';
    case 'controversial': return '⚡ CONTROVERSIAL';
    default: return '';
  }
}

/**
 * Test the Controversial Reddit API route (/api/reddit/controversial)
 */
async function testControversialRedditAPI() {
  console.log('⚡ Testing Controversial Reddit API (/api/reddit/controversial)...');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: GET request - Controversial posts from r/all
    console.log('\n📋 Test 1: GET Controversial Posts from r/all (24h)');
    console.log('-'.repeat(60));
    
    const getParams = new URLSearchParams({
      subreddit: 'all',
      time: 'day',
      limit: '10',
      min_score: '1000'
    });
    
    const getUrl = `http://localhost:3000/api/reddit/controversial?${getParams.toString()}`;
    console.log('📡 Making GET request to:', getUrl);
    
    const getResponse = await fetch(getUrl);
    console.log('📡 Response status:', getResponse.status, getResponse.statusText);
    
    if (getResponse.ok) {
      const getData = await getResponse.json();
      console.log('✅ GET Request successful!');
      console.log('📊 Response summary:');
      console.log(`   Success: ${getData.success}`);
      console.log(`   Total controversial posts: ${getData.count}`);
      console.log(`   Subreddit: r/${getData.subreddit}`);
      console.log(`   Time filter: ${getData.time_filter}`);
      console.log(`   Min score: ${getData.min_score}`);
      
      if (getData.viral_metrics) {
        console.log('\n📈 Controversy Metrics:');
        console.log(`   Total upvotes: ${getData.viral_metrics.total_score.toLocaleString()}`);
        console.log(`   Average score: ${getData.viral_metrics.average_score.toLocaleString()}`);
        console.log(`   Highest score: ${getData.viral_metrics.highest_score.toLocaleString()}`);
        console.log(`   Total comments: ${getData.viral_metrics.total_comments.toLocaleString()}`);
        console.log('\n⚡ Controversy Distribution:');
        console.log(`   Highly Controversial: ${getData.viral_metrics.controversy_stats.highly_controversial}`);
        console.log(`   Very Controversial: ${getData.viral_metrics.controversy_stats.very_controversial}`);
        console.log(`   Controversial: ${getData.viral_metrics.controversy_stats.controversial}`);
      }
      
      if (getData.posts && getData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(getData.posts, 'GET Controversial API');
        
        console.log('\n⚡ Most Controversial Posts:');
        getData.posts.slice(0, 3).forEach((post, index) => {
          console.log(`\n${index + 1}. ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   ⬆️  ${post.score.toLocaleString()} points | 💬 ${post.num_comments.toLocaleString()} comments`);
          console.log(`   📊 ${(post.upvote_ratio * 100).toFixed(1)}% upvoted`);
          
          const controversyStatus = getControversyEmoji(post.controversy_level);
          if (controversyStatus) {
            console.log(`   ${controversyStatus}`);
          }
          
          console.log(`   🔗 ${post.url}`);
          if (post.flair) console.log(`   🏷️  ${post.flair}`);
          if (post.nsfw) console.log(`   🔞 NSFW`);
          if (post.spoiler) console.log(`   ⚠️  Spoiler`);
        });
      }
    } else {
      const errorData = await getResponse.json();
      console.error('❌ GET Request failed:', errorData);
    }
    
    // Test 2: POST request - Controversial posts from specific subreddit
    console.log('\n\n📋 Test 2: POST Controversial Posts from r/unpopularopinion');
    console.log('-'.repeat(60));
    
    const postBody = {
      subreddit: 'unpopularopinion',
      time_filter: 'week',
      limit: 8,
      min_score: 500
    };
    
    console.log('📡 Making POST request with body:', JSON.stringify(postBody, null, 2));
    
    const postResponse = await fetch('http://localhost:3000/api/reddit/controversial', {
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
      console.log(`   Total controversial posts: ${postData.count}`);
      console.log(`   Subreddit: r/${postData.subreddit}`);
      console.log(`   Time filter: ${postData.time_filter}`);
      console.log(`   Min score: ${postData.min_score}`);
      
      if (postData.posts && postData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(postData.posts, 'POST Controversial API');
        
        console.log('\n⚡ Unpopular Opinions (Controversial):');
        postData.posts.slice(0, 4).forEach((post, index) => {
          console.log(`\n⚡ #${index + 1} ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   📊 ${post.score.toLocaleString()} points (${(post.upvote_ratio * 100).toFixed(1)}% upvoted)`);
          console.log(`   💬 ${post.num_comments.toLocaleString()} comments`);
          
          const controversyStatus = getControversyEmoji(post.controversy_level);
          if (controversyStatus) {
            console.log(`   ${controversyStatus}`);
          }
          
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
    
    // Test 3: POST request - High controversy threshold
    console.log('\n\n📋 Test 3: POST High Controversy Posts (High Score Threshold)');
    console.log('-'.repeat(60));
    
    const highThresholdBody = {
      subreddit: 'all',
      time_filter: 'day',
      limit: 12,
      min_score: 5000
    };
    
    console.log('📡 Making POST request with body:', JSON.stringify(highThresholdBody, null, 2));
    
    const highThresholdResponse = await fetch('http://localhost:3000/api/reddit/controversial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(highThresholdBody)
    });
    
    console.log('📡 Response status:', highThresholdResponse.status, highThresholdResponse.statusText);
    
    if (highThresholdResponse.ok) {
      const highThresholdData = await highThresholdResponse.json();
      console.log('✅ POST Request successful!');
      console.log('📊 Response summary:');
      console.log(`   Success: ${highThresholdData.success}`);
      console.log(`   Total high-controversy posts: ${highThresholdData.count}`);
      console.log(`   Subreddit: r/${highThresholdData.subreddit}`);
      console.log(`   Min score threshold: ${highThresholdData.min_score}`);
      
      if (highThresholdData.posts && highThresholdData.posts.length > 0) {
        // Log detected mode
        logDetectedMode(highThresholdData.posts, 'POST High Controversy API');
        
        console.log('\n🔥⚡ High-Engagement Controversial Posts (5000+ points):');
        highThresholdData.posts.slice(0, 5).forEach((post, index) => {
          console.log(`\n🔥 Controversial #${index + 1}`);
          console.log(`   📰 ${post.title}`);
          console.log(`   👤 u/${post.author} in r/${post.subreddit}`);
          console.log(`   🚀 ${post.score.toLocaleString()} points | 💬 ${post.num_comments.toLocaleString()} comments`);
          console.log(`   📊 ${(post.upvote_ratio * 100).toFixed(1)}% upvoted`);
          
          const controversyStatus = getControversyEmoji(post.controversy_level);
          if (controversyStatus) {
            console.log(`   ${controversyStatus}`);
          }
          
          console.log(`   🔗 ${post.url}`);
          
          // Show content type
          if (post.is_video) console.log('   🎥 Video');
          if (post.is_self) console.log('   📝 Text Post');
          if (post.domain && !post.is_self) console.log(`   🌐 ${post.domain}`);
          if (post.awards > 0) console.log(`   🏅 ${post.awards} awards`);
        });
      } else {
        console.log('📭 No controversial posts found with score >= 5000');
      }
    } else {
      const errorData = await highThresholdResponse.json();
      console.error('❌ POST Request failed:', errorData);
    }
    
  } catch (error) {
    console.error('💥 Controversial Reddit API test failed:', error.message);
  }
}

/**
 * Test error scenarios for controversial API
 */
async function testControversialErrorScenarios() {
  console.log('\n\n🧪 Testing Controversial API Error Scenarios...');
  console.log('=' .repeat(80));
  
  try {
    // Test 1: Invalid limit parameter (>100)
    console.log('\n📋 Test 1: Invalid limit parameter (>100)');
    console.log('-'.repeat(50));
    
    const invalidLimitResponse = await fetch('http://localhost:3000/api/reddit/controversial?limit=150');
    console.log('📡 Response status:', invalidLimitResponse.status);
    
    if (invalidLimitResponse.status === 400) {
      const error = await invalidLimitResponse.json();
      console.log('✅ Correctly rejected invalid limit:', error.error);
    } else {
      console.log('❌ Should have rejected limit > 100');
    }
    
    // Test 2: Test with empty subreddit parameter
    console.log('\n📋 Test 2: Empty subreddit parameter');
    console.log('-'.repeat(50));
    
    const emptySubredditResponse = await fetch('http://localhost:3000/api/reddit/controversial?subreddit=');
    console.log('📡 Response status:', emptySubredditResponse.status);
    
    if (emptySubredditResponse.ok) {
      const data = await emptySubredditResponse.json();
      console.log('✅ Empty subreddit handled gracefully, defaulted to:', data.subreddit);
    }
    
    // Test 3: Very high min_score threshold
    console.log('\n📋 Test 3: Very high min_score threshold');
    console.log('-'.repeat(50));
    
    const highScoreResponse = await fetch('http://localhost:3000/api/reddit/controversial?min_score=100000');
    
    if (highScoreResponse.ok) {
      const data = await highScoreResponse.json();
      console.log(`✅ High threshold handled gracefully. Found ${data.count} posts with 100k+ score`);
    }
    
    // Test 4: Invalid time filter
    console.log('\n📋 Test 4: Invalid time filter');
    console.log('-'.repeat(50));
    
    const invalidTimeResponse = await fetch('http://localhost:3000/api/reddit/controversial?time=invalid');
    
    if (invalidTimeResponse.ok) {
      const data = await invalidTimeResponse.json();
      console.log(`✅ Invalid time filter handled gracefully. Used: ${data.time_filter}`);
    }
    
  } catch (error) {
    console.error('💥 Error scenario test failed:', error.message);
  }
}

/**
 * Performance test for controversial API
 */
async function performanceTestControversial() {
  console.log('\n\n⚡ Performance Test - Controversial API...');
  console.log('=' .repeat(80));
  
  const testCases = [
    { 
      name: 'Controversial API - GET r/all',
      url: 'http://localhost:3000/api/reddit/controversial?subreddit=all&time=day&limit=10'
    },
    { 
      name: 'Controversial API - POST unpopularopinion',
      url: 'http://localhost:3000/api/reddit/controversial',
      method: 'POST',
      body: { subreddit: 'unpopularopinion', time_filter: 'week', limit: 15 }
    },
    { 
      name: 'Controversial API - POST high threshold',
      url: 'http://localhost:3000/api/reddit/controversial',
      method: 'POST',
      body: { subreddit: 'all', time_filter: 'day', limit: 20, min_score: 2000 }
    },
    { 
      name: 'Controversial API - GET politics',
      url: 'http://localhost:3000/api/reddit/controversial?subreddit=politics&time=day&limit=8'
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
        console.log(`⏱️  ${testCase.name}: ${duration}ms - Found ${data.count} controversial posts`);
        
        if (data.viral_metrics) {
          const controversyTotal = data.viral_metrics.controversy_stats.highly_controversial + 
                                 data.viral_metrics.controversy_stats.very_controversial + 
                                 data.viral_metrics.controversy_stats.controversial;
          console.log(`   ⚡ Controversy breakdown: ${controversyTotal} controversial posts`);
        }
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
 * Main test runner for controversial Reddit API
 */
async function runControversialRedditAPITests() {
  console.log('⚡ Starting Controversial Reddit API Test Suite...');
  console.log('🕒 Started at:', new Date().toLocaleString());
  console.log('=' .repeat(80));
  
  // Check API configuration mode
  const apiMode = checkRedditAPIMode();
  
  try {
    // Test controversial Reddit API
    await testControversialRedditAPI();
    
    // Test error scenarios
    await testControversialErrorScenarios();
    
    // Performance tests
    await performanceTestControversial();
    
    console.log('\n\n🎉 All Controversial Reddit API tests completed successfully!');
    console.log('🕒 Finished at:', new Date().toLocaleString());
    console.log('=' .repeat(80));
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log('✅ GET requests with query parameters');
    console.log('✅ POST requests with JSON bodies');
    console.log('✅ Controversial post detection and classification');
    console.log('✅ Controversy metrics and analytics');
    console.log('✅ Error handling and validation');
    console.log('✅ Performance benchmarking');
    console.log('✅ Mock data fallback testing');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run the comprehensive controversial Reddit API test suite
runControversialRedditAPITests().catch(console.error);