import { logger } from '@/utils/logger';

interface PerplexitySearchResult {
  title: string;
  url: string;
}

interface PerplexitySearchResponse {
  results: PerplexitySearchResult[];
}

interface SocialMediaSearchRequest {
  query: string;
  extractedLinks: string[];
  viralContentAnalysis: string;
}

function isSocialMediaUrl(url: string): boolean {
  const socialMediaDomains = [
    'youtube.com',
    'youtu.be',
    'instagram.com',
    'twitter.com',
    'x.com',
    'reddit.com'
  ];
  
  return socialMediaDomains.some(domain => url.toLowerCase().includes(domain));
}

async function searchSocialMediaContent(query: string, apiKey: string): Promise<string[]> {
  const socialMediaQueries = [
    `${query} site:reddit.com`,
    `${query} site:twitter.com OR site:x.com`,
    `${query} site:youtube.com`,
    `${query} site:instagram.com`,
    `${query} viral social media reddit twitter youtube instagram`
  ];

  const allResults: string[] = [];

  for (const searchQuery of socialMediaQueries) {
    try {
      logger.log('SEARCH', `Query: ${searchQuery}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("https://api.perplexity.ai/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: searchQuery,
          max_results: 3,
          max_tokens_per_page: 512
        }),
        signal: controller.signal,
        cache: "no-store"
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data?.results && Array.isArray(data.results)) {
          const results = data.results
            .filter((result: PerplexitySearchResult) => 
              result.title && 
              result.url && 
              isSocialMediaUrl(result.url)
            )
            .map((result: PerplexitySearchResult) => `${result.title}: ${result.url}`);
          allResults.push(...results);
        }
      }
    } catch (error) {
      console.warn(`Search failed for query: ${searchQuery}`, error);
    }
  }

  // Remove duplicates and return only social media results, limited to 3
  const uniqueResults = Array.from(new Set(allResults));
  const filteredResults = uniqueResults.filter(result => {
    const url = result.split(': ')[1];
    return url && isSocialMediaUrl(url);
  });
  
  // Limit to exactly 3 results
  return filteredResults.slice(0, 3);
}

export async function POST(request: Request) {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

  if (!PERPLEXITY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: SocialMediaSearchRequest = await request.json();
    const { query, extractedLinks, viralContentAnalysis } = body;

    logger.log('SEARCH', `Request: query=${query.length}chars, links=${extractedLinks.length}, analysis=${viralContentAnalysis.length}chars`);

    // Search for social media content
    const socialMediaResults = await searchSocialMediaContent(query, PERPLEXITY_API_KEY);

    logger.log('SEARCH', `Results: ${socialMediaResults.length} posts found`);
    logger.json('SEARCH', 'Social Media Results', socialMediaResults);

    const finalResponse = {
      success: true,
      query,
      viralContentAnalysis,
      extractedLinks,
      socialMediaResults,
      totalResults: socialMediaResults.length
    };
    
    logger.separator('SEARCH', '🔍 SEARCH API FINAL RESPONSE');
    logger.json('SEARCH', 'Final Response', finalResponse);

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error('SEARCH', '❌ Error in social media search', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(request: Request) {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

  if (!PERPLEXITY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const query = "Is the claim 'Drinking 3 liters of water cures COVID-19' true?";
  const maxResults = 5;
  const maxTokensPerPage = 1024;

  try {
    // Call Perplexity Search API with increased timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch("https://api.perplexity.ai/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        max_tokens_per_page: maxTokensPerPage
      }),
      signal: controller.signal,
      cache: "no-store"
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(
        `Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();

    // Validate response structure
    if (!data || !Array.isArray(data.results)) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }

    // Convert to the exact string format printed by main.py: "<title>: <url>"
    const printedStyle = data.results.map((result: PerplexitySearchResult) => {
      if (!result.title || !result.url) {
        console.warn('Missing title or url in result:', result);
        return null;
      }
      return `${result.title}: ${result.url}`;
    }).filter(Boolean) as string[];

    return new Response(JSON.stringify(printedStyle), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error calling Perplexity API:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
