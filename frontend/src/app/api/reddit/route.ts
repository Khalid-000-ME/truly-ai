import { NextResponse } from 'next/server';
import snoowrap from 'snoowrap';

interface RedditPost {
  title: string;
  author: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: string;
  url: string;
  post_url: string;
  is_video: boolean;
  is_self: boolean;
  selftext: string;
  flair?: string;
  nsfw: boolean;
  spoiler: boolean;
  awards: number;
}

interface RedditApiResponse {
  data: {
    children: Array<{
      data: any;
    }>;
  };
}

interface RedditAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Generate mock Reddit data for development/API error scenarios
 */
function generateMockRedditData(query?: string, subreddit: string = 'all', limit: number = 25): RedditPost[] {
  console.log('🎭 [generateMockRedditData] Generating mock Reddit data');
  console.log('   Query:', query || 'N/A');
  console.log('   Subreddit:', subreddit);
  console.log('   Limit:', limit);
  
  const searchTerm = query || 'technology';
  
  const mockPosts: RedditPost[] = [
    {
      title: `Revolutionary breakthrough in ${searchTerm} that could change everything we know`,
      author: 'TechExplorer2025',
      subreddit: query ? 'technology' : subreddit === 'all' ? 'technology' : subreddit,
      score: 15420,
      upvote_ratio: 0.94,
      num_comments: 892,
      created_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      url: 'https://reddit.com/r/technology/comments/abc123/revolutionary_breakthrough',
      post_url: 'https://example.com/breakthrough-article',
      is_video: false,
      is_self: false,
      selftext: '',
      flair: 'Breaking News',
      nsfw: false,
      spoiler: false,
      awards: 23
    },
    {
      title: `I've been working with ${searchTerm} for 10 years, here's what I learned`,
      author: 'ExperiencedDev',
      subreddit: query ? 'programming' : subreddit === 'all' ? 'programming' : subreddit,
      score: 8930,
      upvote_ratio: 0.91,
      num_comments: 456,
      created_utc: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      url: 'https://reddit.com/r/programming/comments/def456/10_years_experience',
      post_url: 'https://reddit.com/r/programming/comments/def456/10_years_experience',
      is_video: false,
      is_self: true,
      selftext: `After a decade of working in ${searchTerm}, I want to share some insights that might help others. The field has evolved dramatically...`,
      flair: 'Discussion',
      nsfw: false,
      spoiler: false,
      awards: 12
    },
    {
      title: `Amazing ${searchTerm} project that took me 6 months to build`,
      author: 'CreativeBuilder',
      subreddit: query ? 'programming' : subreddit === 'all' ? 'programming' : subreddit,
      score: 6780,
      upvote_ratio: 0.89,
      num_comments: 234,
      created_utc: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      url: 'https://reddit.com/r/programming/comments/ghi789/amazing_project',
      post_url: 'https://github.com/user/amazing-project',
      is_video: false,
      is_self: false,
      selftext: '',
      flair: 'Project',
      nsfw: false,
      spoiler: false,
      awards: 8
    },
    {
      title: `The future of ${searchTerm}: What experts are saying`,
      author: 'FutureThinker',
      subreddit: query ? 'Futurology' : subreddit === 'all' ? 'Futurology' : subreddit,
      score: 4560,
      upvote_ratio: 0.87,
      num_comments: 312,
      created_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      url: 'https://reddit.com/r/Futurology/comments/jkl012/future_of_tech',
      post_url: 'https://example.com/future-predictions',
      is_video: false,
      is_self: false,
      selftext: '',
      flair: 'Predictions',
      nsfw: false,
      spoiler: false,
      awards: 15
    },
    {
      title: `ELI5: How does ${searchTerm} actually work?`,
      author: 'CuriousLearner',
      subreddit: query ? 'explainlikeimfive' : subreddit === 'all' ? 'explainlikeimfive' : subreddit,
      score: 3240,
      upvote_ratio: 0.92,
      num_comments: 189,
      created_utc: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
      url: 'https://reddit.com/r/explainlikeimfive/comments/mno345/eli5_how_does_tech_work',
      post_url: 'https://reddit.com/r/explainlikeimfive/comments/mno345/eli5_how_does_tech_work',
      is_video: false,
      is_self: true,
      selftext: `I keep hearing about ${searchTerm} everywhere but I don't really understand how it works. Can someone explain it in simple terms?`,
      flair: 'Technology',
      nsfw: false,
      spoiler: false,
      awards: 5
    },
    {
      title: `${searchTerm} startup raises $50M in Series A funding`,
      author: 'StartupNews',
      subreddit: query ? 'startups' : subreddit === 'all' ? 'startups' : subreddit,
      score: 2890,
      upvote_ratio: 0.85,
      num_comments: 156,
      created_utc: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      url: 'https://reddit.com/r/startups/comments/pqr678/startup_funding',
      post_url: 'https://techcrunch.com/startup-funding-news',
      is_video: false,
      is_self: false,
      selftext: '',
      flair: 'Funding News',
      nsfw: false,
      spoiler: false,
      awards: 7
    }
  ];

  // Limit results and add some randomization to scores
  const limitedPosts = mockPosts.slice(0, Math.min(limit, mockPosts.length));
  
  // Add some randomization to make it feel more realistic
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
 * Get Reddit OAuth2 access token
 */
async function getRedditAccessToken(): Promise<string | null> {
  console.log('🔐 [getRedditAccessToken] Attempting to get Reddit access token');
  
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'TrulyAI/1.0';
  
  if (!clientId || !clientSecret) {
    console.log('⚠️ [getRedditAccessToken] Reddit credentials not configured');
    return null;
  }
  
  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent
      },
      body: 'grant_type=client_credentials'
    });
    
    console.log('📡 [getRedditAccessToken] Reddit auth response status:', response.status);
    
    if (response.status === 200) {
      const data: RedditAccessTokenResponse = await response.json();
      console.log('✅ [getRedditAccessToken] Successfully obtained access token');
      return data.access_token;
    } else {
      const errorText = await response.text();
      console.error('❌ [getRedditAccessToken] Reddit auth error:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ [getRedditAccessToken] Network error:', error);
    return null;
  }
}

/**
 * Search Reddit posts or get popular posts from subreddit
 */
async function fetchRedditPosts(
  query?: string, 
  subreddit: string = 'all', 
  sort: string = 'hot', 
  timeFilter: string = 'day', 
  limit: number = 25
): Promise<RedditPost[] | null> {
  console.log('🔍 [fetchRedditPosts] Fetching Reddit posts');
  console.log('   Query:', query || 'N/A');
  console.log('   Subreddit:', subreddit);
  console.log('   Sort:', sort);
  console.log('   Time filter:', timeFilter);
  console.log('   Limit:', limit);
  
  // Check if we should use mock data
  const useMockData = !process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET;
  
  if (useMockData) {
    console.log('🎭 [fetchRedditPosts] Using mock data (no credentials or development mode)');
    return generateMockRedditData(query, subreddit, limit);
  }
  
  // Create Reddit client using snoowrap
  const r = createRedditClient();
  if (!r) {
    console.log('🎭 [fetchRedditPosts] Failed to create Reddit client, falling back to mock data');
    return generateMockRedditData(query, subreddit, limit);
  }
  
  try {
    console.log('📡 [fetchRedditPosts] Making request to Reddit API using snoowrap...');
    
    let posts;
    
    if (query) {
      // Search posts
      console.log('🔍 [fetchRedditPosts] Searching for posts with query:', query);
      if (subreddit === 'all') {
        const searchResults = await r.search({
          query: query,
          sort: sort as any,
          time: timeFilter as any
        });
        posts = searchResults.slice(0, limit);
      } else {
        const subredditObj = r.getSubreddit(subreddit);
        const searchResults = await subredditObj.search({
          query: query,
          sort: sort as any,
          time: timeFilter as any
        });
        posts = searchResults.slice(0, limit);
      }
    } else {
      // Get posts from subreddit
      console.log('🔍 [fetchRedditPosts] Getting posts from subreddit:', subreddit);
      if (subreddit === 'all') {
        switch (sort) {
          case 'hot':
            posts = (await r.getHot()).slice(0, limit);
            break;
          case 'new':
            posts = (await r.getNew()).slice(0, limit);
            break;
          case 'top':
            posts = (await r.getTop(timeFilter as any)).slice(0, limit);
            break;
          case 'rising':
            posts = (await r.getRising()).slice(0, limit);
            break;
          default:
            posts = (await r.getHot()).slice(0, limit);
        }
      } else {
        const subredditObj = r.getSubreddit(subreddit);
        switch (sort) {
          case 'hot':
            posts = (await subredditObj.getHot()).slice(0, limit);
            break;
          case 'new':
            posts = (await subredditObj.getNew()).slice(0, limit);
            break;
          case 'top':
            posts = (await subredditObj.getTop(timeFilter as any)).slice(0, limit);
            break;
          case 'rising':
            posts = (await subredditObj.getRising()).slice(0, limit);
            break;
          default:
            posts = (await subredditObj.getHot()).slice(0, limit);
        }
      }
    }
    
    console.log('✅ [fetchRedditPosts] Successfully fetched', posts.length, 'posts');
    
    // Convert snoowrap posts to our format
    const formattedPosts: RedditPost[] = posts.map((post: any) => ({
      title: post.title,
      author: post.author.name,
      subreddit: post.subreddit.display_name,
      score: post.score,
      upvote_ratio: post.upvote_ratio,
      num_comments: post.num_comments,
      created_utc: new Date(post.created_utc * 1000).toISOString(),
      url: `https://reddit.com${post.permalink}`,
      post_url: post.url,
      is_video: post.is_video || false,
      is_self: post.is_self,
      selftext: (post.selftext || '').substring(0, 200),
      flair: post.link_flair_text || undefined,
      nsfw: post.over_18 || false,
      spoiler: post.spoiler || false,
      awards: post.total_awards_received || 0
    }));
    
    return formattedPosts;
  } catch (error) {
    console.error('❌ [fetchRedditPosts] Network error:', error);
    console.log('🎭 [fetchRedditPosts] Falling back to mock data due to network error');
    return generateMockRedditData(query, subreddit, limit);
  }
}

/**
 * Parse Reddit API response into our format
 */
function parseRedditPosts(redditData: RedditApiResponse): RedditPost[] {
  console.log('🔄 [parseRedditPosts] Parsing Reddit API response');
  
  if (!redditData || !redditData.data || !redditData.data.children) {
    console.log('❌ [parseRedditPosts] Invalid Reddit data structure');
    return [];
  }
  
  const posts: RedditPost[] = [];
  
  for (const post of redditData.data.children) {
    const data = post.data;
    
    posts.push({
      title: data.title || '',
      author: data.author || 'unknown',
      subreddit: data.subreddit || '',
      score: data.score || 0,
      upvote_ratio: data.upvote_ratio || 0,
      num_comments: data.num_comments || 0,
      created_utc: new Date((data.created_utc || 0) * 1000).toISOString(),
      url: `https://reddit.com${data.permalink || ''}`,
      post_url: data.url || '',
      is_video: data.is_video || false,
      is_self: data.is_self || false,
      selftext: (data.selftext || '').substring(0, 200),
      flair: data.link_flair_text || undefined,
      nsfw: data.over_18 || false,
      spoiler: data.spoiler || false,
      awards: data.total_awards_received || 0
    });
  }
  
  console.log('✅ [parseRedditPosts] Parsed', posts.length, 'posts');
  return posts;
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
 * GET handler for Reddit posts
 */
export async function GET(request: Request) {
  console.log('🚀 [GET] Reddit API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || undefined;
    const subreddit = searchParams.get('subreddit') || 'all';
    const sort = searchParams.get('sort') || 'hot';
    const timeFilter = searchParams.get('time') || 'day';
    const limit = parseInt(searchParams.get('limit') || '25');
    const minScore = parseInt(searchParams.get('min_score') || '0');
    
    console.log('📋 [GET] Request parameters:');
    console.log('   Query:', query || 'N/A');
    console.log('   Subreddit:', subreddit);
    console.log('   Sort:', sort);
    console.log('   Time filter:', timeFilter);
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
    
    console.log('🔍 [GET] Step 1: Fetching Reddit posts...');
    const posts = await fetchRedditPosts(query, subreddit, sort, timeFilter, limit);
    
    if (!posts) {
      console.log('❌ [GET] Failed to fetch posts');
      return NextResponse.json(
        { error: 'Failed to fetch Reddit posts' },
        { status: 500 }
      );
    }
    
    console.log('🔍 [GET] Step 2: Filtering by score...');
    const filteredPosts = minScore > 0 ? filterByScore(posts, minScore) : posts;
    
    const response = {
      success: true,
      count: filteredPosts.length,
      query: query || null,
      subreddit: subreddit,
      sort: sort,
      time_filter: timeFilter,
      min_score: minScore,
      posts: filteredPosts
    };
    
    console.log('📤 [GET] Returning', filteredPosts.length, 'Reddit posts');
    console.log('✅ [GET] Reddit API completed successfully');
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [GET] Error in Reddit API:', error);
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
 * POST handler for Reddit posts with custom parameters
 */
export async function POST(request: Request) {
  console.log('🚀 [POST] Reddit API called with custom parameters');
  
  try {
    const body = await request.json();
    const { 
      query,
      subreddit = 'all',
      sort = 'hot',
      time_filter = 'day',
      limit = 25,
      min_score = 0
    } = body;
    
    console.log('📋 [POST] Request body parameters:');
    console.log('   Query:', query || 'N/A');
    console.log('   Subreddit:', subreddit);
    console.log('   Sort:', sort);
    console.log('   Time filter:', time_filter);
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
    
    console.log('🔍 [POST] Step 1: Fetching Reddit posts...');
    const posts = await fetchRedditPosts(query, subreddit, sort, time_filter, limit);
    
    if (!posts) {
      return NextResponse.json(
        { error: 'Failed to fetch Reddit posts' },
        { status: 500 }
      );
    }
    
    console.log('🔍 [POST] Step 2: Filtering by score...');
    const filteredPosts = min_score > 0 ? filterByScore(posts, min_score) : posts;
    
    const response = {
      success: true,
      count: filteredPosts.length,
      query: query || null,
      subreddit: subreddit,
      sort: sort,
      time_filter: time_filter,
      min_score: min_score,
      posts: filteredPosts
    };
    
    console.log('✅ [POST] Reddit API completed successfully');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [POST] Error in Reddit API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}