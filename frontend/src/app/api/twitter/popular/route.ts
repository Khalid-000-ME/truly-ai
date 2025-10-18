import { NextResponse } from 'next/server';

interface TwitterMetrics {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  verified?: boolean;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: TwitterMetrics;
  lang?: string;
}

interface TwitterApiResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    result_count: number;
  };
}

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

/**
 * Get headers for Twitter API requests
 */
function getHeaders(): HeadersInit {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  if (!bearerToken) {
    console.log('⚠️ [getHeaders] No bearer token available');
    return {
      'Content-Type': 'application/json'
    };
  }
  
  return {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Generate mock Twitter data for development/rate limit scenarios
 */
function generateMockTwitterData(query: string, maxResults: number): TwitterApiResponse {
  console.log('🎭 [generateMockTwitterData] Generating mock data for query:', query);
  
  const mockTweets: TwitterTweet[] = [
    {
      id: '1234567890123456789',
      text: `Amazing breakthrough in ${query} technology that will revolutionize how we work and live. The future is here! #Innovation #Technology`,
      created_at: '2025-01-17T08:30:00.000Z',
      author_id: 'user1',
      public_metrics: {
        like_count: 2450,
        retweet_count: 680,
        reply_count: 145,
        quote_count: 89
      },
      lang: 'en'
    },
    {
      id: '1234567890123456790',
      text: `Just attended an incredible conference about ${query}. The insights shared by industry leaders were mind-blowing! 🚀`,
      created_at: '2025-01-17T07:15:00.000Z',
      author_id: 'user2',
      public_metrics: {
        like_count: 1890,
        retweet_count: 420,
        reply_count: 98,
        quote_count: 56
      },
      lang: 'en'
    },
    {
      id: '1234567890123456791',
      text: `New research shows that ${query} could solve major global challenges. This is the kind of innovation we need! 🌍`,
      created_at: '2025-01-17T06:45:00.000Z',
      author_id: 'user3',
      public_metrics: {
        like_count: 1567,
        retweet_count: 345,
        reply_count: 78,
        quote_count: 34
      },
      lang: 'en'
    },
    {
      id: '1234567890123456792',
      text: `Implementing ${query} solutions in our company has increased productivity by 40%. Highly recommend exploring this! 📈`,
      created_at: '2025-01-17T05:20:00.000Z',
      author_id: 'user4',
      public_metrics: {
        like_count: 1234,
        retweet_count: 289,
        reply_count: 67,
        quote_count: 23
      },
      lang: 'en'
    },
    {
      id: '1234567890123456793',
      text: `The ethical implications of ${query} are fascinating. We need more discussions about responsible innovation. 🤔`,
      created_at: '2025-01-17T04:10:00.000Z',
      author_id: 'user5',
      public_metrics: {
        like_count: 987,
        retweet_count: 178,
        reply_count: 156,
        quote_count: 45
      },
      lang: 'en'
    },
    {
      id: '1234567890123456794',
      text: `Learning ${query} has been one of the best decisions I've made for my career. The opportunities are endless! 💼`,
      created_at: '2025-01-17T03:30:00.000Z',
      author_id: 'user6',
      public_metrics: {
        like_count: 756,
        retweet_count: 134,
        reply_count: 89,
        quote_count: 12
      },
      lang: 'en'
    }
  ];

  const mockUsers: TwitterUser[] = [
    { id: 'user1', name: 'Tech Innovator', username: 'techinnovator', verified: true },
    { id: 'user2', name: 'Sarah Chen', username: 'sarahchen_tech', verified: false },
    { id: 'user3', name: 'Global Research Lab', username: 'globalresearch', verified: true },
    { id: 'user4', name: 'Business Leader', username: 'bizleader2025', verified: false },
    { id: 'user5', name: 'Ethics Professor', username: 'ethicsprof', verified: true },
    { id: 'user6', name: 'Career Coach', username: 'careercoach_ai', verified: false }
  ];

  // Limit to requested number of results
  const limitedTweets = mockTweets.slice(0, Math.min(maxResults, mockTweets.length));
  
  return {
    data: limitedTweets,
    includes: {
      users: mockUsers
    },
    meta: {
      result_count: limitedTweets.length
    }
  };
}

/**
 * Search for popular tweets based on a query
 */
async function searchPopularTweets(query: string, maxResults: number = 50): Promise<TwitterApiResponse | null> {
  console.log('🐦 [searchPopularTweets] Starting Twitter API search');
  console.log('🔍 [searchPopularTweets] Query:', query);
  console.log('📊 [searchPopularTweets] Max results:', maxResults);
  
  // Check if we should use mock data (no API key or development mode)
  const useMockData = !process.env.TWITTER_BEARER_TOKEN || process.env.NODE_ENV === 'development';
  
  if (useMockData) {
    console.log('🎭 [searchPopularTweets] Using mock data (no API key or development mode)');
    return generateMockTwitterData(query, maxResults);
  }
  
  const baseUrl = 'https://api.twitter.com/2/tweets/search/recent';
  
  const params = new URLSearchParams({
    query: query,
    max_results: maxResults.toString(),
    'tweet.fields': 'created_at,public_metrics,author_id,lang',
    'user.fields': 'name,username,verified',
    expansions: 'author_id',
    sort_order: 'relevancy' // Gets most relevant/popular tweets
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  console.log('📡 [searchPopularTweets] Making request to Twitter API...');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });
    
    console.log('📡 [searchPopularTweets] Twitter API response status:', response.status);
    
    if (response.status === 200) {
      const data = await response.json() as TwitterApiResponse;
      console.log('✅ [searchPopularTweets] Successfully fetched tweets:', data.meta?.result_count || 0);
      return data;
    } else if (response.status === 429) {
      // Rate limit hit - fall back to mock data
      console.log('⚠️ [searchPopularTweets] Rate limit hit, falling back to mock data');
      return generateMockTwitterData(query, maxResults);
    } else {
      const errorText = await response.text();
      console.error('❌ [searchPopularTweets] Twitter API error:', response.status, errorText);
      console.log('🎭 [searchPopularTweets] Falling back to mock data due to API error');
      return generateMockTwitterData(query, maxResults);
    }
  } catch (error) {
    console.error('❌ [searchPopularTweets] Network error:', error);
    console.log('🎭 [searchPopularTweets] Falling back to mock data due to network error');
    return generateMockTwitterData(query, maxResults);
  }
}

/**
 * Filter tweets by engagement metrics
 */
function filterByEngagement(tweetsData: TwitterApiResponse, minLikes: number = 100): PopularTweet[] {
  console.log('🔍 [filterByEngagement] Filtering tweets by engagement');
  console.log('📊 [filterByEngagement] Minimum likes threshold:', minLikes);
  
  if (!tweetsData || !tweetsData.data) {
    console.log('❌ [filterByEngagement] No tweet data provided');
    return [];
  }
  
  const popularTweets: PopularTweet[] = [];
  
  // Create user lookup map
  const users: Record<string, TwitterUser> = {};
  if (tweetsData.includes?.users) {
    for (const user of tweetsData.includes.users) {
      users[user.id] = user;
    }
  }
  
  console.log('👥 [filterByEngagement] Processing', tweetsData.data.length, 'tweets');
  
  for (const tweet of tweetsData.data) {
    const metrics = tweet.public_metrics;
    const likes = metrics.like_count || 0;
    const retweets = metrics.retweet_count || 0;
    const replies = metrics.reply_count || 0;
    
    if (likes >= minLikes) {
      const author = users[tweet.author_id];
      
      if (author) {
        popularTweets.push({
          text: tweet.text,
          author: author.username,
          author_name: author.name,
          likes: likes,
          retweets: retweets,
          replies: replies,
          created_at: tweet.created_at,
          url: `https://twitter.com/${author.username}/status/${tweet.id}`,
          tweet_id: tweet.id
        });
        
        console.log(`✅ [filterByEngagement] Added tweet by @${author.username} with ${likes} likes`);
      }
    }
  }
  
  // Sort by likes (descending)
  popularTweets.sort((a, b) => b.likes - a.likes);
  
  console.log('📈 [filterByEngagement] Found', popularTweets.length, 'popular tweets');
  return popularTweets;
}

/**
 * Main GET handler for popular tweets API
 */
export async function GET(request: Request) {
  console.log('🚀 [GET] Popular tweets API called');
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'trending -is:retweet';
    const maxResults = parseInt(searchParams.get('max_results') || '50');
    const minLikes = parseInt(searchParams.get('min_likes') || '50');
    
    console.log('📋 [GET] Request parameters:');
    console.log('   Query:', query);
    console.log('   Max results:', maxResults);
    console.log('   Min likes:', minLikes);
    
    // Validate parameters
    if (maxResults > 100) {
      console.log('❌ [GET] Max results exceeds limit');
      return NextResponse.json(
        { error: 'max_results cannot exceed 100' },
        { status: 400 }
      );
    }
    
    // Log Twitter API credentials status
    if (!process.env.TWITTER_BEARER_TOKEN) {
      console.log('⚠️ [GET] Twitter Bearer Token not configured - will use mock data');
    } else {
      console.log('✅ [GET] Twitter Bearer Token configured - will attempt real API calls');
    }
    
    console.log('🐦 [GET] Step 1: Searching for tweets...');
    const twitterResults = await searchPopularTweets(query, maxResults);
    
    if (!twitterResults) {
      console.log('❌ [GET] Failed to fetch tweets from Twitter API');
      return NextResponse.json(
        { error: 'Failed to fetch tweets from Twitter API' },
        { status: 500 }
      );
    }
    
    console.log('🔍 [GET] Step 2: Filtering by engagement...');
    const popularTweets = filterByEngagement(twitterResults, minLikes);
    
    console.log('📤 [GET] Returning', popularTweets.length, 'popular tweets');
    
    const response = {
      success: true,
      count: popularTweets.length,
      query: query,
      min_likes: minLikes,
      tweets: popularTweets
    };
    
    console.log('✅ [GET] Popular tweets API completed successfully');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [GET] Error in popular tweets API:', error);
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
 * POST handler for popular tweets with custom parameters
 */
export async function POST(request: Request) {
  console.log('🚀 [POST] Popular tweets API called with custom parameters');
  
  try {
    const body = await request.json();
    const { 
      query = 'trending -is:retweet',
      max_results = 50,
      min_likes = 50 
    } = body;
    
    console.log('📋 [POST] Request body parameters:');
    console.log('   Query:', query);
    console.log('   Max results:', max_results);
    console.log('   Min likes:', min_likes);
    
    // Validate parameters
    if (max_results > 100) {
      return NextResponse.json(
        { error: 'max_results cannot exceed 100' },
        { status: 400 }
      );
    }
    
    // Log Twitter API credentials status
    if (!process.env.TWITTER_BEARER_TOKEN) {
      console.log('⚠️ [POST] Twitter Bearer Token not configured - will use mock data');
    } else {
      console.log('✅ [POST] Twitter Bearer Token configured - will attempt real API calls');
    }
    
    console.log('🐦 [POST] Step 1: Searching for tweets...');
    const twitterResults = await searchPopularTweets(query, max_results);
    
    if (!twitterResults) {
      return NextResponse.json(
        { error: 'Failed to fetch tweets from Twitter API' },
        { status: 500 }
      );
    }
    
    console.log('🔍 [POST] Step 2: Filtering by engagement...');
    const popularTweets = filterByEngagement(twitterResults, min_likes);
    
    const response = {
      success: true,
      count: popularTweets.length,
      query: query,
      min_likes: min_likes,
      tweets: popularTweets
    };
    
    console.log('✅ [POST] Popular tweets API completed successfully');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [POST] Error in popular tweets API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}