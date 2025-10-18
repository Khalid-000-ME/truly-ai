import { NextRequest, NextResponse } from 'next/server';
import snoowrap from 'snoowrap';

// Types for Reddit posts
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
  post_url: string;
  is_video: boolean;
  is_self: boolean;
  selftext: string;
  flair?: string;
  nsfw: boolean;
  spoiler: boolean;
  awards: number;
  permalink: string;
  domain?: string;
  stickied: boolean;
  controversy_level?: string;
}

interface ControversialApiResponse {
  success: boolean;
  count: number;
  subreddit: string;
  time_filter: string;
  min_score: number;
  posts: RedditPost[];
  viral_metrics?: {
    total_score: number;
    average_score: number;
    highest_score: number;
    total_comments: number;
    controversy_stats: {
      highly_controversial: number;
      very_controversial: number;
      controversial: number;
    };
  };
}

/**
 * Generate mock controversial Reddit data for development/fallback
 */
function generateMockControversialData(subreddit: string = 'all', limit: number = 25): RedditPost[] {
  const mockPosts: RedditPost[] = [
    {
      id: 'mock_controversial_1',
      title: 'Unpopular opinion: This widely loved thing is actually overrated',
      author: 'ControversialThinker',
      subreddit: 'unpopularopinion',
      score: 8420,
      upvote_ratio: 0.58, // Highly controversial
      num_comments: 2847,
      created_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/unpopularopinion/comments/mock1',
      post_url: 'https://reddit.com/r/unpopularopinion/comments/mock1',
      is_video: false,
      is_self: true,
      selftext: 'I know this will be controversial, but I think this popular thing everyone loves is actually not that great...',
      flair: 'Controversial',
      nsfw: false,
      spoiler: false,
      awards: 15,
      permalink: '/r/unpopularopinion/comments/mock1',
      domain: 'self.unpopularopinion',
      stickied: false,
      controversy_level: 'highly_controversial'
    },
    {
      id: 'mock_controversial_2',
      title: 'This political decision will have major consequences (DEBATE THREAD)',
      author: 'PoliticalDebater',
      subreddit: 'politics',
      score: 12650,
      upvote_ratio: 0.64, // Very controversial
      num_comments: 4521,
      created_utc: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/politics/comments/mock2',
      post_url: 'https://example.com/political-news',
      is_video: false,
      is_self: false,
      selftext: '',
      flair: 'Discussion',
      nsfw: false,
      spoiler: false,
      awards: 28,
      permalink: '/r/politics/comments/mock2',
      domain: 'example.com',
      stickied: false,
      controversy_level: 'very_controversial'
    },
    {
      id: 'mock_controversial_3',
      title: 'Why this popular movie is actually terrible (detailed analysis)',
      author: 'MovieCritic2025',
      subreddit: 'movies',
      score: 6890,
      upvote_ratio: 0.72, // Controversial
      num_comments: 1923,
      created_utc: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/movies/comments/mock3',
      post_url: 'https://reddit.com/r/movies/comments/mock3',
      is_video: false,
      is_self: true,
      selftext: 'I know everyone loves this movie, but here\'s why I think it\'s overrated...',
      flair: 'Analysis',
      nsfw: false,
      spoiler: true,
      awards: 8,
      permalink: '/r/movies/comments/mock3',
      domain: 'self.movies',
      stickied: false,
      controversy_level: 'controversial'
    },
    {
      id: 'mock_controversial_4',
      title: 'Controversial take on current social issue that divides people',
      author: 'SocialCommentator',
      subreddit: 'changemyview',
      score: 9240,
      upvote_ratio: 0.61, // Very controversial
      num_comments: 3156,
      created_utc: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/changemyview/comments/mock4',
      post_url: 'https://reddit.com/r/changemyview/comments/mock4',
      is_video: false,
      is_self: true,
      selftext: 'CMV: This social issue that everyone has strong opinions about...',
      flair: 'Social Issues',
      nsfw: false,
      spoiler: false,
      awards: 22,
      permalink: '/r/changemyview/comments/mock4',
      domain: 'self.changemyview',
      stickied: false,
      controversy_level: 'very_controversial'
    },
    {
      id: 'mock_controversial_5',
      title: 'This technology everyone praises has serious hidden problems',
      author: 'TechSkeptic',
      subreddit: 'technology',
      score: 11420,
      upvote_ratio: 0.68, // Very controversial
      num_comments: 2847,
      created_utc: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
      url: 'https://reddit.com/r/technology/comments/mock5',
      post_url: 'https://example.com/tech-criticism',
      is_video: false,
      is_self: false,
      selftext: '',
      flair: 'Critical Analysis',
      nsfw: false,
      spoiler: false,
      awards: 18,
      permalink: '/r/technology/comments/mock5',
      domain: 'example.com',
      stickied: false,
      controversy_level: 'very_controversial'
    }
  ];

  // Filter by subreddit if specified
  let filteredPosts = mockPosts;
  if (subreddit !== 'all') {
    filteredPosts = mockPosts.filter(post => post.subreddit.toLowerCase() === subreddit.toLowerCase());
  }

  // Limit results
  const limitedPosts = filteredPosts.slice(0, limit);

  // Add some randomization to scores and comments
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
  console.log('🔐 [createRedditClient] Initializing Reddit client for controversial posts');
  
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
    r.config({ 
      warnings: false,
      continueAfterRatelimitError: true,
      debug: false
    });
    
    console.log('✅ [createRedditClient] Reddit client initialized successfully');
    return r;
  } catch (error) {
    console.error('❌ [createRedditClient] Error initializing Reddit client:', error);
    return null;
  }
}

/**
 * Determine controversy level based on upvote ratio
 */
function getControversyLevel(upvoteRatio: number): string {
  if (upvoteRatio < 0.6) return 'highly_controversial';
  if (upvoteRatio < 0.7) return 'very_controversial';
  if (upvoteRatio < 0.8) return 'controversial';
  return 'normal';
}

/**
 * Fetch controversial Reddit posts using snoowrap
 */
async function fetchControversialPosts(
  subreddit: string = 'all',
  timeFilter: string = 'day',
  limit: number = 25,
  minScore: number = 0
): Promise<RedditPost[] | null> {
  console.log('⚡ [fetchControversialPosts] Fetching controversial Reddit posts');
  console.log('   Subreddit:', subreddit);
  console.log('   Time filter:', timeFilter);
  console.log('   Limit:', limit);
  console.log('   Min score:', minScore);
  
  // Check if we should use mock data
  const useMockData = !process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET;
  
  if (useMockData) {
    console.log('🎭 [fetchControversialPosts] Using mock data (no credentials or development mode)');
    return generateMockControversialData(subreddit, limit);
  }
  
  // Create Reddit client using snoowrap
  const r = createRedditClient();
  if (!r) {
    console.log('🎭 [fetchControversialPosts] Failed to create Reddit client, falling back to mock data');
    return generateMockControversialData(subreddit, limit);
  }
  
  try {
    console.log('📡 [fetchControversialPosts] Making request to Reddit API using snoowrap...');
    
    let posts;
    
    // Get controversial posts from subreddit
    console.log('⚡ [fetchControversialPosts] Getting controversial posts from subreddit:', subreddit);
    if (subreddit === 'all') {
      posts = (await r.getSubreddit('all').getControversial({ time: timeFilter as any })).slice(0, limit);
    } else {
      const subredditObj = r.getSubreddit(subreddit);
      posts = (await subredditObj.getControversial({ time: timeFilter as any })).slice(0, limit);
    }
    
    console.log('✅ [fetchControversialPosts] Successfully fetched', posts.length, 'controversial posts');
    
    // Log score distribution for debugging
    if (posts.length > 0) {
      const scores = posts.map((p: any) => p.score).sort((a: number, b: number) => b - a);
      console.log('📊 [fetchControversialPosts] Score distribution:');
      console.log(`   Highest: ${scores[0]?.toLocaleString() || 0}`);
      console.log(`   Median: ${scores[Math.floor(scores.length/2)]?.toLocaleString() || 0}`);
      console.log(`   Lowest: ${scores[scores.length-1]?.toLocaleString() || 0}`);
      console.log(`   Min score filter: ${minScore.toLocaleString()}`);
    }
    
    // Convert snoowrap posts to our format
    const formattedPosts: RedditPost[] = posts.map((post: any) => {
      const controversyLevel = getControversyLevel(post.upvote_ratio || 0.5);
      
      return {
        id: post.id,
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
        awards: post.total_awards_received || 0,
        permalink: post.permalink,
        domain: post.domain,
        stickied: post.stickied || false,
        controversy_level: controversyLevel
      };
    });
    
    // Return all controversial posts without filtering
    // Controversial posts are inherently different from viral posts - they're controversial due to low upvote ratios, not high scores
    console.log('✅ [fetchControversialPosts] Returning all controversial posts without score filtering');
    
    return formattedPosts;
  } catch (error) {
    console.error('❌ [fetchControversialPosts] Network error:', error);
    console.log('🎭 [fetchControversialPosts] Falling back to mock data due to network error');
    return generateMockControversialData(subreddit, limit);
  }
}

/**
 * Calculate viral metrics for controversial posts
 */
function calculateViralMetrics(posts: RedditPost[]) {
  if (!posts || posts.length === 0) {
    return {
      total_score: 0,
      average_score: 0,
      highest_score: 0,
      total_comments: 0,
      controversy_stats: {
        highly_controversial: 0,
        very_controversial: 0,
        controversial: 0
      }
    };
  }
  
  const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
  const totalComments = posts.reduce((sum, post) => sum + post.num_comments, 0);
  const maxScore = Math.max(...posts.map(p => p.score));
  
  // Count controversy levels
  const controversyStats = posts.reduce((stats, post) => {
    if (post.controversy_level === 'highly_controversial') stats.highly_controversial++;
    else if (post.controversy_level === 'very_controversial') stats.very_controversial++;
    else if (post.controversy_level === 'controversial') stats.controversial++;
    return stats;
  }, { highly_controversial: 0, very_controversial: 0, controversial: 0 });
  
  return {
    total_score: totalScore,
    average_score: Math.round(totalScore / posts.length),
    highest_score: maxScore,
    total_comments: totalComments,
    controversy_stats: controversyStats
  };
}

/**
 * GET handler for controversial posts
 */
export async function GET(request: NextRequest) {
  console.log('⚡ [GET /api/reddit/controversial] Incoming request');
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const subreddit = searchParams.get('subreddit') || 'all';
    const timeFilter = searchParams.get('time') || searchParams.get('time_filter') || 'day';
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const minScore = parseInt(searchParams.get('min_score') || '0');
    
    console.log('📋 [GET] Parameters:', { subreddit, timeFilter, limit, minScore });
    
    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100', max_limit: 100 },
        { status: 400 }
      );
    }
    
    // Fetch controversial posts
    const posts = await fetchControversialPosts(subreddit, timeFilter, limit, minScore);
    
    if (!posts) {
      return NextResponse.json(
        { error: 'Failed to fetch controversial posts' },
        { status: 500 }
      );
    }
    
    // Calculate metrics
    const viralMetrics = calculateViralMetrics(posts);
    
    const response: ControversialApiResponse = {
      success: true,
      count: posts.length,
      subreddit,
      time_filter: timeFilter,
      min_score: minScore,
      posts,
      viral_metrics: viralMetrics
    };
    
    console.log('✅ [GET] Successfully returning', posts.length, 'controversial posts');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for controversial posts
 */
export async function POST(request: NextRequest) {
  console.log('⚡ [POST /api/reddit/controversial] Incoming request');
  
  try {
    const body = await request.json();
    
    // Parse request body
    const subreddit = body.subreddit || 'all';
    const timeFilter = body.time_filter || body.time || 'day';
    const limit = Math.min(body.limit || 25, 100);
    const minScore = body.min_score || 0;
    
    console.log('📋 [POST] Parameters:', { subreddit, timeFilter, limit, minScore });
    
    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100', max_limit: 100 },
        { status: 400 }
      );
    }
    
    // Fetch controversial posts
    const posts = await fetchControversialPosts(subreddit, timeFilter, limit, minScore);
    
    if (!posts) {
      return NextResponse.json(
        { error: 'Failed to fetch controversial posts' },
        { status: 500 }
      );
    }
    
    // Calculate metrics
    const viralMetrics = calculateViralMetrics(posts);
    
    const response: ControversialApiResponse = {
      success: true,
      count: posts.length,
      subreddit,
      time_filter: timeFilter,
      min_score: minScore,
      posts,
      viral_metrics: viralMetrics
    };
    
    console.log('✅ [POST] Successfully returning', posts.length, 'controversial posts');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}