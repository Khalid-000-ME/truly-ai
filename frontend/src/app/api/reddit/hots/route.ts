import { NextResponse } from 'next/server';
import snoowrap from 'snoowrap';

interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: string;
  url: string;
  permalink: string;
  is_video: boolean;
  is_self: boolean;
  selftext: string;
  link_flair_text?: string;
  over_18: boolean;
  spoiler: boolean;
  total_awards_received: number;
  thumbnail?: string;
  domain?: string;
}

/**
 * Generate mock hot Reddit posts for development/API error scenarios
 */
function generateMockHotPosts(limit: number = 25): RedditPost[] {
  console.log('🎭 [generateMockHotPosts] Generating mock hot posts, limit:', limit);
  
  const mockPosts: RedditPost[] = [
    {
      id: 'abc123',
      title: 'Revolutionary breakthrough in AI technology that could change everything we know',
      author: 'TechExplorer2025',
      subreddit: 'technology',
      score: 15420,
      upvote_ratio: 0.94,
      num_comments: 892,
      created_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      url: 'https://example.com/ai-breakthrough',
      permalink: 'https://reddit.com/r/technology/comments/abc123/revolutionary_breakthrough',
      is_video: false,
      is_self: false,
      selftext: '',
      link_flair_text: 'Breaking News',
      over_18: false,
      spoiler: false,
      total_awards_received: 23,
      thumbnail: 'https://example.com/thumb1.jpg',
      domain: 'example.com'
    },
    {
      id: 'def456',
      title: 'I built an amazing project over the weekend, here\'s what I learned',
      author: 'WeekendCoder',
      subreddit: 'programming',
      score: 8930,
      upvote_ratio: 0.91,
      num_comments: 456,
      created_utc: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/programming/comments/def456/weekend_project',
      permalink: 'https://reddit.com/r/programming/comments/def456/weekend_project',
      is_video: false,
      is_self: true,
      selftext: 'After working on this project for the entire weekend, I want to share some insights that might help other developers. The challenges I faced were...',
      link_flair_text: 'Project',
      over_18: false,
      spoiler: false,
      total_awards_received: 12,
      thumbnail: 'self',
      domain: 'self.programming'
    },
    {
      id: 'ghi789',
      title: 'The future of programming: What every developer should know in 2025',
      author: 'FutureDev',
      subreddit: 'programming',
      score: 6780,
      upvote_ratio: 0.89,
      num_comments: 234,
      created_utc: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      url: 'https://medium.com/future-programming-2025',
      permalink: 'https://reddit.com/r/programming/comments/ghi789/future_programming',
      is_video: false,
      is_self: false,
      selftext: '',
      link_flair_text: 'Discussion',
      over_18: false,
      spoiler: false,
      total_awards_received: 8,
      thumbnail: 'https://medium.com/thumb.jpg',
      domain: 'medium.com'
    },
    {
      id: 'jkl012',
      title: 'ELI5: How does machine learning actually work?',
      author: 'CuriousLearner',
      subreddit: 'explainlikeimfive',
      score: 4560,
      upvote_ratio: 0.92,
      num_comments: 312,
      created_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/explainlikeimfive/comments/jkl012/eli5_ml',
      permalink: 'https://reddit.com/r/explainlikeimfive/comments/jkl012/eli5_ml',
      is_video: false,
      is_self: true,
      selftext: 'I keep hearing about machine learning everywhere but I don\'t really understand how it works. Can someone explain it in simple terms?',
      link_flair_text: 'Technology',
      over_18: false,
      spoiler: false,
      total_awards_received: 5,
      thumbnail: 'self',
      domain: 'self.explainlikeimfive'
    },
    {
      id: 'mno345',
      title: 'New startup raises $50M to revolutionize the tech industry',
      author: 'StartupNews',
      subreddit: 'startups',
      score: 3240,
      upvote_ratio: 0.85,
      num_comments: 189,
      created_utc: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      url: 'https://techcrunch.com/startup-funding-news',
      permalink: 'https://reddit.com/r/startups/comments/mno345/startup_funding',
      is_video: false,
      is_self: false,
      selftext: '',
      link_flair_text: 'Funding News',
      over_18: false,
      spoiler: false,
      total_awards_received: 7,
      thumbnail: 'https://techcrunch.com/thumb.jpg',
      domain: 'techcrunch.com'
    },
    {
      id: 'pqr678',
      title: 'Amazing open source project that every developer should know about',
      author: 'OpenSourceFan',
      subreddit: 'opensource',
      score: 2890,
      upvote_ratio: 0.88,
      num_comments: 156,
      created_utc: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      url: 'https://github.com/amazing/project',
      permalink: 'https://reddit.com/r/opensource/comments/pqr678/amazing_project',
      is_video: false,
      is_self: false,
      selftext: '',
      link_flair_text: 'Project',
      over_18: false,
      spoiler: false,
      total_awards_received: 4,
      thumbnail: 'https://github.com/thumb.png',
      domain: 'github.com'
    }
  ];

  // Add some randomization to make it feel more realistic
  const limitedPosts = mockPosts.slice(0, Math.min(limit, mockPosts.length));
  limitedPosts.forEach(post => {
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    post.score = Math.floor(post.score * randomFactor);
    post.num_comments = Math.floor(post.num_comments * randomFactor);
  });
  
  return limitedPosts;
}

/**
 * Initialize snoowrap Reddit client
 */
function createRedditClient(): snoowrap | null {
  console.log('🔐 [createRedditClient] Initializing Reddit client');
  
  const userAgent = process.env.REDDIT_USER_AGENT;
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;
  
  if (!userAgent || !clientId || !clientSecret || !username || !password) {
    console.log('⚠️ [createRedditClient] Reddit credentials not configured');
    return null;
  }
  
  try {
    const r = new snoowrap({
      userAgent: userAgent,
      clientId: clientId,
      clientSecret: clientSecret,
      username: username,
      password: password
    });
    
    // Configure to avoid rate limits and warnings
    r.config({ requestDelay: 1000, warnings: false });
    
    console.log('✅ [createRedditClient] Reddit client initialized successfully');
    return r;
  } catch (error) {
    console.error('❌ [createRedditClient] Error initializing Reddit client:', error);
    return null;
  }
}

/**
 * Fetch hot posts from Reddit using snoowrap
 */
async function fetchHotPosts(subreddit: string = 'all', limit: number = 25): Promise<RedditPost[] | null> {
  console.log('🔥 [fetchHotPosts] Fetching hot posts');
  console.log('   Subreddit:', subreddit);
  console.log('   Limit:', limit);
  
  // Check if we should use mock data
  const useMockData = !process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET;
  
  if (useMockData) {
    console.log('🎭 [fetchHotPosts] Using mock data (no credentials or development mode)');
    return generateMockHotPosts(limit);
  }
  
  const r = createRedditClient();
  if (!r) {
    console.log('🎭 [fetchHotPosts] Failed to create Reddit client, falling back to mock data');
    return generateMockHotPosts(limit);
  }
  
  try {
    console.log('📡 [fetchHotPosts] Making request to Reddit API...');
    
    let posts;
    if (subreddit === 'all') {
      posts = (await r.getHot()).slice(0, limit);
    } else {
      const subredditObj = r.getSubreddit(subreddit);
      posts = (await subredditObj.getHot()).slice(0, limit);
    }
    
    console.log('✅ [fetchHotPosts] Successfully fetched', posts.length, 'hot posts');
    
    // Convert snoowrap posts to our format
    const formattedPosts: RedditPost[] = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      author: post.author.name,
      subreddit: post.subreddit.display_name,
      score: post.score,
      upvote_ratio: post.upvote_ratio,
      num_comments: post.num_comments,
      created_utc: new Date(post.created_utc * 1000).toISOString(),
      url: post.url,
      permalink: `https://reddit.com${post.permalink}`,
      is_video: post.is_video || false,
      is_self: post.is_self,
      selftext: (post.selftext || '').substring(0, 300),
      link_flair_text: post.link_flair_text || undefined,
      over_18: post.over_18 || false,
      spoiler: post.spoiler || false,
      total_awards_received: post.total_awards_received || 0,
      thumbnail: post.thumbnail || undefined,
      domain: post.domain || undefined
    }));
    
    return formattedPosts;
    
  } catch (error) {
    console.error('❌ [fetchHotPosts] Error fetching hot posts:', error);
    console.log('🎭 [fetchHotPosts] Falling back to mock data due to API error');
    return generateMockHotPosts(limit);
  }
}

/**
 * Filter posts by minimum score
 */
function filterByScore(posts: RedditPost[], minScore: number = 100): RedditPost[] {
  console.log('🔍 [filterByScore] Filtering posts by minimum score:', minScore);
  const filtered = posts.filter(post => post.score >= minScore);
  console.log('📊 [filterByScore] Filtered from', posts.length, 'to', filtered.length, 'posts');
  return filtered;
}

/**
 * GET handler for Reddit hot posts
 */
export async function GET(request: Request) {
  console.log('🚀 [GET] Reddit Hot Posts API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const subreddit = searchParams.get('subreddit') || 'all';
    const limit = parseInt(searchParams.get('limit') || '25');
    const minScore = parseInt(searchParams.get('min_score') || '0');
    
    console.log('📋 [GET] Request parameters:');
    console.log('   Subreddit:', subreddit);
    console.log('   Limit:', limit);
    console.log('   Min score:', minScore);
    
    // Validate parameters
    if (limit > 100) {
      console.log('❌ [GET] Limit exceeds maximum');
      return NextResponse.json(
        { error: 'limit cannot exceed 100' },
        { status: 400 }
      );
    }
    
    // Log Reddit API credentials status
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      console.log('⚠️ [GET] Reddit credentials not configured - will use mock data');
    } else {
      console.log('✅ [GET] Reddit credentials configured - will attempt real API calls');
    }
    
    console.log('🔥 [GET] Step 1: Fetching hot posts...');
    const posts = await fetchHotPosts(subreddit, limit);
    
    if (!posts) {
      console.log('❌ [GET] Failed to fetch hot posts');
      return NextResponse.json(
        { error: 'Failed to fetch Reddit hot posts' },
        { status: 500 }
      );
    }
    
    console.log('🔍 [GET] Step 2: Filtering by score...');
    const filteredPosts = minScore > 0 ? filterByScore(posts, minScore) : posts;
    
    const response = {
      success: true,
      count: filteredPosts.length,
      subreddit: subreddit,
      min_score: minScore,
      posts: filteredPosts
    };
    
    console.log('📤 [GET] Returning', filteredPosts.length, 'hot posts');
    console.log('✅ [GET] Reddit Hot Posts API completed successfully');
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [GET] Error in Reddit Hot Posts API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for Reddit hot posts with custom parameters
 */
export async function POST(request: Request) {
  console.log('🚀 [POST] Reddit Hot Posts API called with custom parameters');
  
  try {
    const body = await request.json();
    const { 
      subreddit = 'all',
      limit = 25,
      min_score = 0
    } = body;
    
    console.log('📋 [POST] Request body parameters:');
    console.log('   Subreddit:', subreddit);
    console.log('   Limit:', limit);
    console.log('   Min score:', min_score);
    
    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'limit cannot exceed 100' },
        { status: 400 }
      );
    }
    
    // Log Reddit API credentials status
    if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
      console.log('⚠️ [POST] Reddit credentials not configured - will use mock data');
    } else {
      console.log('✅ [POST] Reddit credentials configured - will attempt real API calls');
    }
    
    console.log('🔥 [POST] Step 1: Fetching hot posts...');
    const posts = await fetchHotPosts(subreddit, limit);
    
    if (!posts) {
      return NextResponse.json(
        { error: 'Failed to fetch Reddit hot posts' },
        { status: 500 }
      );
    }
    
    console.log('🔍 [POST] Step 2: Filtering by score...');
    const filteredPosts = min_score > 0 ? filterByScore(posts, min_score) : posts;
    
    const response = {
      success: true,
      count: filteredPosts.length,
      subreddit: subreddit,
      min_score: min_score,
      posts: filteredPosts
    };
    
    console.log('✅ [POST] Reddit Hot Posts API completed successfully');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [POST] Error in Reddit Hot Posts API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}