import { load } from 'cheerio';
import { NextResponse } from 'next/server';

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  sourceCredibility: number;
  publicationDate?: string;
  crossReferences: {
    supporting: number;
    refuting: number;
  };
}

interface SourceCredibility {
  domain: string;
  score: number;
  bias: string;
}

// Media Bias/Fact Check simplified database
const CREDIBILITY_DB: SourceCredibility[] = [
  { domain: 'who.int', score: 0.95, bias: 'SCIENTIFIC' },
  { domain: 'nih.gov', score: 0.95, bias: 'SCIENTIFIC' },
  { domain: 'cdc.gov', score: 0.95, bias: 'SCIENTIFIC' },
  { domain: 'nature.com', score: 0.95, bias: 'SCIENTIFIC' },
  { domain: 'science.org', score: 0.95, bias: 'SCIENTIFIC' },
  { domain: 'mayoclinic.org', score: 0.9, bias: 'SCIENTIFIC' },
  { domain: 'webmd.com', score: 0.8, bias: 'NEUTRAL' },
  { domain: 'reuters.com', score: 0.9, bias: 'NEUTRAL' },
  { domain: 'apnews.com', score: 0.9, bias: 'NEUTRAL' },
];

/**
 * Extracts text content and publication date from a given URL
 * @param url - The URL to extract content from
 * @returns Object containing extracted text and optional publication date
 */
async function extractTextContent(url: string): Promise<{ text: string; date?: string }> {
  console.log('🔍 [extractTextContent] Starting extraction for URL:', url);
  
  try {
    console.log('📡 [extractTextContent] Fetching HTML content...');
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('📄 [extractTextContent] Response status:', response.status, response.statusText);
    const html = await response.text();
    console.log('📝 [extractTextContent] HTML length:', html.length, 'characters');
    
    const $ = load(html);

    // Remove unwanted elements
    console.log('🧹 [extractTextContent] Removing unwanted elements (script, style, nav, etc.)');
    $('script, style, nav, footer, header, aside').remove();

    // Extract main content
    console.log('🎯 [extractTextContent] Extracting main content using selectors...');
    const mainContent = $('article, main, #content, .content, [role="main"]')
      .first()
      .text()
      .trim();
    
    console.log('📊 [extractTextContent] Main content length:', mainContent.length, 'characters');
    console.log('📖 [extractTextContent] Content preview:', mainContent.substring(0, 200) + '...');

    // Look for publication date
    console.log('📅 [extractTextContent] Searching for publication date...');
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="publication_date"]',
      'time[datetime]',
      '[class*="date"]',
      '[class*="publish"]'
    ];

    let date;
    for (const selector of dateSelectors) {
      console.log('🔍 [extractTextContent] Trying date selector:', selector);
      const dateEl = $(selector).first();
      const dateStr = dateEl.attr('content') || dateEl.attr('datetime') || dateEl.text();
      if (dateStr) {
        console.log('📅 [extractTextContent] Found date string:', dateStr);
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          date = parsed.toISOString();
          console.log('✅ [extractTextContent] Successfully parsed date:', date);
          break;
        } else {
          console.log('❌ [extractTextContent] Invalid date format:', dateStr);
        }
      }
    }
    
    if (!date) {
      console.log('⚠️ [extractTextContent] No publication date found');
    }

    const result = { text: mainContent || $.text().trim(), date };
    console.log('✅ [extractTextContent] Extraction complete. Final text length:', result.text.length);
    console.log('📤 [extractTextContent] Returning result with date:', result.date || 'none');
    
    return result;
  } catch (error) {
    console.error('❌ [extractTextContent] Error during extraction:', error);
    throw new Error('Failed to extract text content');
  }
}

/**
 * Determines the credibility score of a source based on its domain
 * @param url - The URL to evaluate
 * @returns Credibility score between 0 and 1
 */
function getSourceCredibility(url: string): number {
  console.log('🔍 [getSourceCredibility] Evaluating credibility for URL:', url);
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    console.log('🌐 [getSourceCredibility] Extracted domain:', domain);
    
    const source = CREDIBILITY_DB.find(s => domain.includes(s.domain));
    
    if (source) {
      console.log('✅ [getSourceCredibility] Found matching source in database:', {
        domain: source.domain,
        score: source.score,
        bias: source.bias
      });
      console.log('📤 [getSourceCredibility] Returning credibility score:', source.score);
      return source.score;
    } else {
      console.log('⚠️ [getSourceCredibility] Domain not found in credibility database');
      console.log('📤 [getSourceCredibility] Returning default score: 0.5');
      return 0.5; // Default to 0.5 for unknown sources
    }
  } catch (error) {
    console.error('❌ [getSourceCredibility] Error parsing URL:', error);
    console.log('📤 [getSourceCredibility] Returning default score due to error: 0.5');
    return 0.5;
  }
}

/**
 * Validates text content against a claim using OpenAI's LLM
 * @param text - The extracted text content to analyze
 * @param claim - The claim to validate against
 * @param mockForDev - Whether to use mock response for development
 * @returns Validation result with isValid, confidence, and reasoning
 */
async function validateWithLLM(text: string, claim: string, mockForDev: boolean = false): Promise<{
  isValid: boolean;
  confidence: number;
  reasoning: string;
}> {
  console.log('🤖 [validateWithLLM] Starting LLM validation');
  console.log('📝 [validateWithLLM] Input text length:', text.length, 'characters');
  console.log('🎯 [validateWithLLM] Claim to validate:', claim);
  console.log('🔧 [validateWithLLM] Mock mode:', mockForDev);
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  console.log('🔑 [validateWithLLM] API key available:', !!OPENAI_API_KEY);
  
  // Return mock response for development if no API key
  if (!OPENAI_API_KEY || mockForDev) {
    console.log('🎭 [validateWithLLM] Using mock LLM response for development');
    const mockResult = {
      isValid: false,
      confidence: 0.95,
      reasoning: 'Mock response: This is a development environment without API keys. The WHO website contains authoritative information about COVID-19 and does not support the claim that drinking water cures the disease.'
    };
    console.log('📤 [validateWithLLM] Returning mock result:', mockResult);
    return mockResult;
  }

  try {
    console.log('📡 [validateWithLLM] Sending request to OpenAI API...');
    const requestBody = {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a fact-checking AI. Analyze if the provided text supports or refutes the given claim. Respond with JSON containing: isValid (boolean), confidence (0-1), and reasoning (string).'
        },
        {
          role: 'user',
          content: `Text: ${text}\n\nClaim: ${claim}\n\nAnalyze if this content supports or refutes the claim.`
        }
      ],
      temperature: 0.1
    };
    
    console.log('📊 [validateWithLLM] Request payload prepared, model: gpt-4, temperature: 0.1');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 [validateWithLLM] OpenAI API response status:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('📄 [validateWithLLM] Raw API response received, parsing JSON content...');
    
    const result = JSON.parse(data.choices[0].message.content);
    console.log('✅ [validateWithLLM] Successfully parsed LLM response:', {
      isValid: result.isValid,
      confidence: result.confidence,
      reasoningLength: result.reasoning?.length || 0
    });
    console.log('📤 [validateWithLLM] Returning LLM result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ [validateWithLLM] Error during LLM validation:', error);
    throw new Error('Failed to validate content with LLM');
  }
}

/**
 * Main POST handler for text validation API
 * Orchestrates the entire text validation process
 */
export async function POST(request: Request) {
  console.log('🚀 [POST] Text validation API called');
  
  try {
    console.log('📥 [POST] Parsing request body...');
    const { url, claim } = await request.json();
    
    console.log('📋 [POST] Request parameters received:');
    console.log('   URL:', url);
    console.log('   Claim:', claim);

    if (!url || !claim) {
      console.log('❌ [POST] Missing required parameters');
      return NextResponse.json(
        { error: 'URL and claim are required' },
        { status: 400 }
      );
    }

    console.log('🔄 [POST] Starting validation pipeline...');
    
    // Extract text content and date
    console.log('📝 [POST] Step 1: Extracting text content...');
    const { text, date } = await extractTextContent(url);
    console.log('✅ [POST] Text extraction completed');

    // Get source credibility
    console.log('🏆 [POST] Step 2: Evaluating source credibility...');
    const credibility = getSourceCredibility(url);
    console.log('✅ [POST] Credibility evaluation completed:', credibility);

    // Validate with LLM (use mock in development)
    console.log('🤖 [POST] Step 3: Validating with LLM...');
    const llmResult = await validateWithLLM(text, claim, !process.env.OPENAI_API_KEY);
    console.log('✅ [POST] LLM validation completed');
    
    console.log('🔧 [POST] Step 4: Assembling final result...');
    const adjustedConfidence = llmResult.confidence * credibility;
    console.log('📊 [POST] Confidence adjustment: original =', llmResult.confidence, ', credibility =', credibility, ', adjusted =', adjustedConfidence);

    const result: ValidationResult = {
      isValid: llmResult.isValid,
      confidence: adjustedConfidence, // Adjust confidence by source credibility
      reasoning: llmResult.reasoning,
      sourceCredibility: credibility,
      publicationDate: date,
      crossReferences: {
        supporting: 0, // To be implemented with multiple source comparison
        refuting: 0
      }
    };
    
    console.log('📤 [POST] Final validation result:');
    console.log('   isValid:', result.isValid);
    console.log('   confidence:', result.confidence);
    console.log('   sourceCredibility:', result.sourceCredibility);
    console.log('   publicationDate:', result.publicationDate || 'none');
    console.log('   reasoning length:', result.reasoning?.length || 0, 'characters');
    
    console.log('✅ [POST] Text validation completed successfully');
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [POST] Validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate content' },
      { status: 500 }
    );
  }
}
