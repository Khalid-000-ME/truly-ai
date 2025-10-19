import { logger } from '@/utils/logger';

interface PerplexitySearchResult {
  title: string;
  url: string;
}

interface PerplexitySearchResponse {
  results: PerplexitySearchResult[];
}

interface InternetSearchRequest {
  query: string;
  extractedLinks: string[];
  viralContentAnalysis: string;
}

interface NewsSource {
  domain: string;
  name: string;
  credibilityScore: number; // 0-100 scale
  category: 'mainstream' | 'tech' | 'fact-check' | 'academic';
}

// Curated list of authentic news sources with credibility scores
const AUTHENTIC_NEWS_SOURCES: NewsSource[] = [
  // Mainstream News (High Credibility)
  { domain: 'reuters.com', name: 'Reuters', credibilityScore: 95, category: 'mainstream' },
  { domain: 'apnews.com', name: 'Associated Press', credibilityScore: 95, category: 'mainstream' },
  { domain: 'bbc.com', name: 'BBC News', credibilityScore: 90, category: 'mainstream' },
  { domain: 'cnn.com', name: 'CNN', credibilityScore: 85, category: 'mainstream' },
  { domain: 'nytimes.com', name: 'New York Times', credibilityScore: 90, category: 'mainstream' },
  { domain: 'washingtonpost.com', name: 'Washington Post', credibilityScore: 88, category: 'mainstream' },
  { domain: 'theguardian.com', name: 'The Guardian', credibilityScore: 87, category: 'mainstream' },
  { domain: 'npr.org', name: 'NPR', credibilityScore: 92, category: 'mainstream' },
  
  // Tech & Digital Culture (High Credibility for Tech/Social Media)
  { domain: 'techcrunch.com', name: 'TechCrunch', credibilityScore: 85, category: 'tech' },
  { domain: 'theverge.com', name: 'The Verge', credibilityScore: 83, category: 'tech' },
  { domain: 'wired.com', name: 'Wired', credibilityScore: 88, category: 'tech' },
  { domain: 'arstechnica.com', name: 'Ars Technica', credibilityScore: 90, category: 'tech' },
  
  // Fact-Checking Organizations (Highest Credibility)
  { domain: 'snopes.com', name: 'Snopes', credibilityScore: 95, category: 'fact-check' },
  { domain: 'factcheck.org', name: 'FactCheck.org', credibilityScore: 98, category: 'fact-check' },
  { domain: 'politifact.com', name: 'PolitiFact', credibilityScore: 92, category: 'fact-check' },
  { domain: 'truthorfiction.com', name: 'Truth or Fiction', credibilityScore: 88, category: 'fact-check' },
  
  // Academic & Research (Very High Credibility)
  { domain: 'nature.com', name: 'Nature', credibilityScore: 98, category: 'academic' },
  { domain: 'science.org', name: 'Science Magazine', credibilityScore: 97, category: 'academic' },
  { domain: 'nejm.org', name: 'New England Journal of Medicine', credibilityScore: 98, category: 'academic' },
  { domain: 'pubmed.ncbi.nlm.nih.gov', name: 'PubMed', credibilityScore: 96, category: 'academic' },
  
  // Health & Medical (High Credibility)
  { domain: 'cdc.gov', name: 'CDC', credibilityScore: 95, category: 'mainstream' },
  { domain: 'fda.gov', name: 'FDA', credibilityScore: 95, category: 'mainstream' },
  { domain: 'who.int', name: 'World Health Organization', credibilityScore: 94, category: 'mainstream' },
  { domain: 'mayoclinic.org', name: 'Mayo Clinic', credibilityScore: 92, category: 'mainstream' },
  { domain: 'webmd.com', name: 'WebMD', credibilityScore: 85, category: 'mainstream' },
  { domain: 'healthline.com', name: 'Healthline', credibilityScore: 83, category: 'mainstream' },
  { domain: 'pnas.org', name: 'PNAS', credibilityScore: 96, category: 'academic' }
];

function isAuthenticNewsSource(url: string): NewsSource | null {
  const lowerUrl = url.toLowerCase();
  return AUTHENTIC_NEWS_SOURCES.find(source => lowerUrl.includes(source.domain)) || null;
}

function isSocialMediaUrl(url: string): boolean {
  const socialMediaDomains = [
    'youtube.com', 'youtu.be', 'instagram.com', 'twitter.com', 'x.com', 'reddit.com',
    'facebook.com', 'tiktok.com', 'snapchat.com', 'linkedin.com'
  ];
  return socialMediaDomains.some(domain => url.toLowerCase().includes(domain));
}

async function searchInternetSources(query: string, apiKey: string): Promise<{ url: string; title: string; source: NewsSource; }[]> {
  // Create search queries targeting authentic news sources
  const newsQueries = [
    // Fact-checking specific queries
    `${query} site:snopes.com OR site:factcheck.org OR site:politifact.com`,
    `${query} fact check verification debunk`,
    
    // Mainstream news queries
    `${query} site:reuters.com OR site:apnews.com OR site:bbc.com`,
    `${query} site:nytimes.com OR site:washingtonpost.com OR site:theguardian.com`,
    
    // Tech news for social media/AI content
    `${query} site:techcrunch.com OR site:theverge.com OR site:wired.com`,
    
    // General credible news search
    `${query} news report authentic source verification`
  ];

  const allResults: { url: string; title: string; source: NewsSource; }[] = [];

  for (const searchQuery of newsQueries) {
    try {
      logger.log('INTERNET_SEARCH', `Query: ${searchQuery}`);
      
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
          // Log all results for debugging
          logger.log('INTERNET_SEARCH', `Found ${data.results.length} raw results from Perplexity`);
          data.results.forEach((result: PerplexitySearchResult, index: number) => {
            logger.log('INTERNET_SEARCH', `  ${index + 1}. ${result.title} - ${result.url}`);
          });
          
          const filteredResults = data.results
            .filter((result: PerplexitySearchResult) => 
              result.title && 
              result.url && 
              !isSocialMediaUrl(result.url) // Exclude social media
            );
          
          logger.log('INTERNET_SEARCH', `After social media filtering: ${filteredResults.length} results`);
          
          const authenticResults = filteredResults
            .map((result: PerplexitySearchResult) => {
              const source = isAuthenticNewsSource(result.url);
              if (!source) {
                logger.log('INTERNET_SEARCH', `  ❌ Filtered out (not in curated list): ${result.title} - ${result.url}`);
              }
              return source ? {
                url: result.url,
                title: result.title,
                source
              } : null;
            })
            .filter(Boolean) as { url: string; title: string; source: NewsSource; }[];
          
          logger.log('INTERNET_SEARCH', `After authentic source filtering: ${authenticResults.length} results`);
          allResults.push(...authenticResults);
        }
      }
    } catch (error) {
      console.warn(`Internet search failed for query: ${searchQuery}`, error);
    }
  }

  // Remove duplicates and sort by credibility score (highest first)
  const uniqueResults = Array.from(
    new Map(allResults.map(item => [item.url, item])).values()
  );
  
  const sortedResults = uniqueResults.sort((a, b) => b.source.credibilityScore - a.source.credibilityScore);
  
  // Limit to exactly 2 results as requested
  return sortedResults.slice(0, 2);
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
    const body: InternetSearchRequest = await request.json();
    const { query, extractedLinks, viralContentAnalysis } = body;

    logger.log('INTERNET_SEARCH', `Request: query=${query.length}chars, links=${extractedLinks.length}, analysis=${viralContentAnalysis.length}chars`);

    // Search for authentic internet sources
    const internetResults = await searchInternetSources(query, PERPLEXITY_API_KEY);

    logger.log('INTERNET_SEARCH', `Results: ${internetResults.length} authentic sources found`);
    
    // Format results with credibility scores
    const formattedResults = internetResults.map(result => ({
      title: result.title,
      url: result.url,
      source: result.source.name,
      credibilityScore: result.source.credibilityScore,
      category: result.source.category
    }));

    logger.json('INTERNET_SEARCH', 'Internet Sources', formattedResults);

    // Calculate average credibility score
    const averageCredibility = internetResults.length > 0 
      ? Math.round(internetResults.reduce((sum, result) => sum + result.source.credibilityScore, 0) / internetResults.length)
      : 0;

    const finalResponse = {
      success: true,
      query,
      viralContentAnalysis,
      extractedLinks,
      internetSources: formattedResults,
      totalResults: internetResults.length,
      averageCredibilityScore: averageCredibility,
      searchType: 'authentic_news_sources'
    };
    
    logger.separator('INTERNET_SEARCH', '🌐 INTERNET SEARCH API FINAL RESPONSE');
    logger.json('INTERNET_SEARCH', 'Final Response', finalResponse);

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error('INTERNET_SEARCH', '❌ Error in internet search', error);
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

  // Test query for AI-generated content verification
  const testQuery = "Will Smith eating spaghetti AI generated video verification";

  try {
    const internetResults = await searchInternetSources(testQuery, PERPLEXITY_API_KEY);
    
    const testResponse = {
      testQuery,
      results: internetResults.map(result => ({
        title: result.title,
        url: result.url,
        source: result.source.name,
        credibilityScore: result.source.credibilityScore,
        category: result.source.category
      })),
      totalResults: internetResults.length,
      averageCredibilityScore: internetResults.length > 0 
        ? Math.round(internetResults.reduce((sum, result) => sum + result.source.credibilityScore, 0) / internetResults.length)
        : 0
    };

    return new Response(JSON.stringify(testResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error testing internet search:", error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}