import { load } from 'cheerio';
import { NextResponse } from 'next/server';
import { generateText, getTextModel } from '@/lib/gemini';

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
 * Splits text into manageable chunks for processing
 * @param text - The text to split
 * @param maxChunkSize - Maximum characters per chunk
 * @returns Array of text chunks
 */
function splitTextIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
  console.log('✂️ [splitTextIntoChunks] Splitting text into chunks, max size:', maxChunkSize);
  console.log('📝 [splitTextIntoChunks] Input text length:', text.length, 'characters');
  
  if (text.length <= maxChunkSize) {
    console.log('📤 [splitTextIntoChunks] Text fits in single chunk, returning as-is');
    return [text];
  }
  
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);
  let currentChunk = '';
  
  console.log('📊 [splitTextIntoChunks] Found', sentences.length, 'sentences to process');
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += sentence + '. ';
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        console.log('📦 [splitTextIntoChunks] Created chunk', chunks.length, 'with length:', currentChunk.length);
      }
      currentChunk = sentence + '. ';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
    console.log('📦 [splitTextIntoChunks] Created final chunk', chunks.length, 'with length:', currentChunk.length);
  }
  
  console.log('✅ [splitTextIntoChunks] Split complete. Total chunks:', chunks.length);
  return chunks;
}

/**
 * Validates text content against a claim using Gemini LLM
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
  console.log('🤖 [validateWithLLM] Starting Gemini LLM validation');
  console.log('📝 [validateWithLLM] Input text length:', text.length, 'characters');
  console.log('🎯 [validateWithLLM] Claim to validate:', claim);
  console.log('🔧 [validateWithLLM] Mock mode:', mockForDev);
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  console.log('🔑 [validateWithLLM] Gemini API key available:', !!GEMINI_API_KEY);
  
  // Return mock response for development if no API key
  if (!GEMINI_API_KEY || mockForDev) {
    console.log('🎭 [validateWithLLM] Using mock LLM response for development');
    const mockResult = {
      isValid: false,
      confidence: 0.95,
      reasoning: 'Mock response: This is a development environment without Gemini API key. The content analysis suggests the claim about drinking water curing COVID-19 is not supported by scientific evidence.'
    };
    console.log('📤 [validateWithLLM] Returning mock result:', mockResult);
    return mockResult;
  }

  try {
    console.log('📡 [validateWithLLM] Initializing Gemini model...');
    const model = getTextModel();
    
    // Split text into manageable chunks
    const textChunks = splitTextIntoChunks(text, 4000);
    console.log('📊 [validateWithLLM] Processing', textChunks.length, 'text chunks');
    
    const chunkAnalyses: Array<{isValid: boolean, confidence: number, reasoning: string}> = [];
    
    // Analyze each chunk
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`🔍 [validateWithLLM] Analyzing chunk ${i + 1}/${textChunks.length} (${chunk.length} chars)`);
      
      const prompt = `You are a fact-checking AI. Analyze if the provided text content is in phase with (supports) or contradicts the given claim.

Text Content:
${chunk}

Claim: ${claim}

Analyze if this content supports or refutes the claim. Respond with JSON containing:
- isValid (boolean): true if text supports the claim, false if it refutes or contradicts
- confidence (number): confidence level between 0 and 1
- reasoning (string): brief explanation of your analysis

Respond only with valid JSON.`;
      
      console.log(`📤 [validateWithLLM] Sending chunk ${i + 1} to Gemini...`);
      const response = await generateText(model, prompt, 0.1);
      console.log(`📥 [validateWithLLM] Received response for chunk ${i + 1}:`, response.substring(0, 200) + '...');
      
      try {
        // Extract JSON from markdown code blocks if present
        let jsonString = response.trim();
        
        // Check if response is wrapped in markdown code blocks
        if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
          console.log(`🔧 [validateWithLLM] Extracting JSON from markdown code block for chunk ${i + 1}`);
          jsonString = jsonString.slice(7, -3).trim(); // Remove ```json and ```
        } else if (jsonString.startsWith('```') && jsonString.endsWith('```')) {
          console.log(`🔧 [validateWithLLM] Extracting content from generic code block for chunk ${i + 1}`);
          jsonString = jsonString.slice(3, -3).trim(); // Remove ``` and ```
        }
        
        console.log(`🔍 [validateWithLLM] Attempting to parse JSON for chunk ${i + 1}:`, jsonString.substring(0, 100) + '...');
        const chunkResult = JSON.parse(jsonString);
        chunkAnalyses.push(chunkResult);
        console.log(`✅ [validateWithLLM] Chunk ${i + 1} analysis:`, {
          isValid: chunkResult.isValid,
          confidence: chunkResult.confidence
        });
      } catch (parseError) {
        console.error(`❌ [validateWithLLM] Failed to parse JSON for chunk ${i + 1}:`, parseError);
        console.log(`🔍 [validateWithLLM] Raw response for debugging:`, response);
        
        // Enhanced fallback analysis based on response content
        const lowerResponse = response.toLowerCase();
        const containsFalse = lowerResponse.includes('"isvalid": false') || lowerResponse.includes('false');
        const containsRefute = lowerResponse.includes('refute') || lowerResponse.includes('contradict') || lowerResponse.includes('not support');
        const containsSupport = lowerResponse.includes('support') || lowerResponse.includes('confirm') || lowerResponse.includes('true');
        
        // Try to extract confidence if visible in text
        const confidenceMatch = response.match(/"confidence":\s*([0-9.]+)/i);
        const extractedConfidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.6;
        
        const isValid = !containsFalse && !containsRefute && containsSupport;
        
        chunkAnalyses.push({
          isValid,
          confidence: Math.min(Math.max(extractedConfidence, 0), 1), // Clamp between 0 and 1
          reasoning: `Fallback analysis for chunk ${i + 1}: Response parsing failed, analyzed content suggests ${isValid ? 'support' : 'refutation'} of claim.`
        });
        
        console.log(`🔄 [validateWithLLM] Applied fallback analysis for chunk ${i + 1}:`, {
          isValid,
          confidence: extractedConfidence,
          containsFalse,
          containsRefute,
          containsSupport
        });
      }
    }
    
    console.log('🔄 [validateWithLLM] Aggregating results from', chunkAnalyses.length, 'chunks');
    
    // Aggregate results from all chunks
    const supportingChunks = chunkAnalyses.filter(analysis => analysis.isValid);
    const refutingChunks = chunkAnalyses.filter(analysis => !analysis.isValid);
    
    console.log('📊 [validateWithLLM] Chunk analysis summary:');
    console.log('   Supporting chunks:', supportingChunks.length);
    console.log('   Refuting chunks:', refutingChunks.length);
    
    // Calculate overall validity and confidence
    const totalChunks = chunkAnalyses.length;
    const supportRatio = supportingChunks.length / totalChunks;
    const avgConfidence = chunkAnalyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / totalChunks;
    
    const isValid = supportRatio > 0.5; // Majority rule
    const confidence = avgConfidence * (Math.abs(supportRatio - 0.5) * 2); // Adjust by consensus strength
    
    const reasoning = `Analysis of ${totalChunks} text chunks: ${supportingChunks.length} supporting, ${refutingChunks.length} refuting. ${isValid ? 'Majority supports' : 'Majority refutes'} the claim with ${(confidence * 100).toFixed(1)}% confidence.`;
    
    const result = {
      isValid,
      confidence: Math.min(confidence, 1), // Cap at 1.0
      reasoning
    };
    
    console.log('✅ [validateWithLLM] Final aggregated result:', result);
    console.log('📤 [validateWithLLM] Returning Gemini LLM result');
    
    return result;
  } catch (error) {
    console.error('❌ [validateWithLLM] Error during Gemini LLM validation:', error);
    throw new Error('Failed to validate content with Gemini LLM');
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
    console.log('🤖 [POST] Step 3: Validating with Gemini LLM...');
    const llmResult = await validateWithLLM(text, claim, !process.env.GEMINI_API_KEY);
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
