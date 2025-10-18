import snoowrap from "snoowrap";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

console.log('Checking Reddit credentials...');
console.log('USER_AGENT:', process.env.REDDIT_USER_AGENT ? 'Set' : 'Missing');
console.log('CLIENT_ID:', process.env.REDDIT_CLIENT_ID ? 'Set' : 'Missing');
console.log('CLIENT_SECRET:', process.env.REDDIT_CLIENT_SECRET ? 'Set' : 'Missing');
console.log('USERNAME:', process.env.REDDIT_USERNAME ? 'Set' : 'Missing');
console.log('PASSWORD:', process.env.REDDIT_PASSWORD ? 'Set' : 'Missing');

// Check if all required credentials are available
if (!process.env.REDDIT_USER_AGENT || !process.env.REDDIT_CLIENT_ID || 
    !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USERNAME || 
    !process.env.REDDIT_PASSWORD) {
  
  console.log('\nMissing Reddit API credentials!');
  process.exit(1);
}

async function fetchRedditPosts() {
  try {
    console.log('\nConnecting to Reddit API...');
    
    // Create a new snoowrap requester with OAuth credentials
    const r = new snoowrap({
      userAgent: process.env.REDDIT_USER_AGENT,
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD
    });

    // Remove requestDelay config to avoid the timeout warning
    r.config({ 
      warnings: false,
      continueAfterRatelimitError: true,
      debug: false
    });

    console.log('✓ Successfully connected to Reddit!');
    
    // Test 1: Try to get current user info first (authentication test)
    console.log('\n[Test 1] Testing authentication by fetching user info...');
    try {
      const me = await r.getMe();
      console.log(`✓ Authenticated as: u/${me.name}`);
      console.log(`  Karma: ${me.link_karma + me.comment_karma}`);
    } catch (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.error('\nPlease verify:');
      console.error('1. Your Reddit username and password are correct');
      console.error('2. Your CLIENT_ID and CLIENT_SECRET are correct');
      console.error('3. Your app type is "script" at https://www.reddit.com/prefs/apps');
      return;
    }
    
    // Test 2: Try getting posts from a specific subreddit
    console.log('\n[Test 2] Fetching posts from r/popular...');
    const popularPosts = await r.getSubreddit('popular').getHot({ limit: 5 });
    console.log(`✓ Found ${popularPosts.length} posts from r/popular`);
    
    if (popularPosts.length > 0) {
      console.log('\nSample post from r/popular:');
      console.log(`  Title: ${popularPosts[0].title}`);
      console.log(`  Score: ${popularPosts[0].score}`);
    }
    
    // Test 3: Fetch VIRAL/TRENDING posts from r/all (global Reddit)
    console.log('\n[Test 3] Fetching VIRAL/TRENDING posts from r/all...');
    
    // Get top posts from last 24 hours (most viral recent posts)
    console.log('\n🔥 Top posts from last 24 hours (most viral):');
    const topDay = await r.getSubreddit('all').getTop({ time: 'day', limit: 10 });
    console.log(`✓ Found ${topDay.length} top posts from last day`);
    displayPosts(topDay, 'Top Posts (24h) - Most Viral', true);
    
    // Get rising posts (currently trending upward)
    console.log('\n📈 Rising posts (currently trending):');
    const risingPosts = await r.getSubreddit('all').getRising({ limit: 10 });
    console.log(`✓ Found ${risingPosts.length} rising posts`);
    displayPosts(risingPosts, 'Rising Posts - Currently Trending', true);
    
    // Get top posts from this week (viral posts with staying power)
    console.log('\n🏆 Top posts from this week (viral with staying power):');
    const topWeek = await r.getSubreddit('all').getTop({ time: 'week', limit: 10 });
    console.log(`✓ Found ${topWeek.length} top posts from this week`);
    displayPosts(topWeek, 'Top Posts (Week) - Sustained Viral', true);
    
    // Get hot posts from r/all (Reddit's algorithm for trending)
    console.log('\n🌟 Hot posts from r/all (Reddit algorithm trending):');
    const hotAll = await r.getSubreddit('all').getHot({ limit: 10 });
    console.log(`✓ Found ${hotAll.length} hot posts from r/all`);
    displayPosts(hotAll, 'Hot Posts - Algorithm Trending', true);
    
    // Get controversial posts (highly debated viral content)
    console.log('\n⚡ Controversial posts from last 24 hours (polarizing viral):');
    const controversialDay = await r.getSubreddit('all').getControversial({ time: 'day', limit: 10 });
    console.log(`✓ Found ${controversialDay.length} controversial posts from last day`);
    displayPosts(controversialDay, 'Controversial Posts (24h) - Polarizing Viral', true);
    
    // Get controversial posts from this week
    console.log('\n🔥⚡ Controversial posts from this week (sustained debate):');
    const controversialWeek = await r.getSubreddit('all').getControversial({ time: 'week', limit: 10 });
    console.log(`✓ Found ${controversialWeek.length} controversial posts from this week`);
    displayPosts(controversialWeek, 'Controversial Posts (Week) - Sustained Debate', true);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.statusCode) {
      console.error(`Status Code: ${error.statusCode}`);
    }
    
    if (error.statusCode === 401) {
      console.error('\n⚠️  Authentication failed. Check your credentials.');
    } else if (error.statusCode === 403) {
      console.error('\n⚠️  Access forbidden. Check app permissions.');
    } else if (error.statusCode === 429) {
      console.error('\n⚠️  Rate limited. Wait a few minutes.');
    }
    
    // Show full error for debugging
    console.error('\nFull error details:');
    console.error(error);
  }
}

function displayPosts(posts, source, showViralMetrics = false) {
  if (!posts || posts.length === 0) {
    console.log('\n⚠️  No posts to display');
    return;
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${source}:`);
  console.log('='.repeat(80));
  
  // Calculate viral metrics if requested
  if (showViralMetrics && posts.length > 0) {
    const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
    const avgScore = Math.round(totalScore / posts.length);
    const maxScore = Math.max(...posts.map(p => p.score));
    const totalComments = posts.reduce((sum, post) => sum + post.num_comments, 0);
    
    console.log(`📊 VIRAL METRICS:`);
    console.log(`   Total upvotes: ${totalScore.toLocaleString()}`);
    console.log(`   Average score: ${avgScore.toLocaleString()}`);
    console.log(`   Highest score: ${maxScore.toLocaleString()}`);
    console.log(`   Total comments: ${totalComments.toLocaleString()}`);
    console.log('');
  }
  
  posts.forEach((post, index) => {
    // Determine viral status based on score
    let viralStatus = '';
    if (post.score >= 50000) viralStatus = '🔥🔥🔥 MEGA VIRAL';
    else if (post.score >= 20000) viralStatus = '🔥🔥 SUPER VIRAL';
    else if (post.score >= 10000) viralStatus = '🔥 VIRAL';
    else if (post.score >= 5000) viralStatus = '📈 TRENDING';
    else if (post.score >= 1000) viralStatus = '⬆️ POPULAR';
    
    // Determine controversy level based on upvote ratio
    let controversyStatus = '';
    if (post.upvote_ratio && post.upvote_ratio < 0.6) {
      controversyStatus = '⚡⚡⚡ HIGHLY CONTROVERSIAL';
    } else if (post.upvote_ratio && post.upvote_ratio < 0.7) {
      controversyStatus = '⚡⚡ VERY CONTROVERSIAL';
    } else if (post.upvote_ratio && post.upvote_ratio < 0.8) {
      controversyStatus = '⚡ CONTROVERSIAL';
    }
    
    console.log(`\n${index + 1}. ${post.title}`);
    console.log(`   👤 u/${post.author.name} | 📍 r/${post.subreddit.display_name}`);
    console.log(`   ⬆️  ${post.score.toLocaleString()} points | 💬 ${post.num_comments.toLocaleString()} comments`);
    
    if (showViralMetrics && viralStatus) {
      console.log(`   ${viralStatus}`);
    }
    
    if (showViralMetrics && controversyStatus) {
      console.log(`   ${controversyStatus}`);
    }
    
    // Show upvote ratio if available
    if (post.upvote_ratio) {
      const upvotePercent = (post.upvote_ratio * 100).toFixed(1);
      const controversyIndicator = post.upvote_ratio < 0.7 ? ' ⚡' : '';
      console.log(`   📊 ${upvotePercent}% upvoted${controversyIndicator}`);
    }
    
    // Show post age
    const postAge = Math.floor((Date.now() - post.created_utc * 1000) / (1000 * 60 * 60));
    console.log(`   ⏰ ${postAge} hours ago`);
    
    console.log(`   🔗 https://reddit.com${post.permalink}`);
    
    // Show content type
    if (post.is_video) console.log(`   🎥 Video Post`);
    if (post.over_18) console.log(`   🔞 NSFW`);
    if (post.spoiler) console.log(`   ⚠️ Spoiler`);
    if (post.stickied) console.log(`   📌 Pinned`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`✓ Successfully fetched ${posts.length} posts!`);
}

// Run the async function
fetchRedditPosts();