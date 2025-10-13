interface PerplexitySearchResult {
  title: string;
  url: string;
}

interface PerplexitySearchResponse {
  results: PerplexitySearchResult[];
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
