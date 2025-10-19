import { NextRequest, NextResponse } from 'next/server';

interface AnalysisResult {
  success: boolean;
  sessionId: string;
  totalItems: number;
  completed: number;
  errors: number;
  results: any[];
  postClaims: PostClaim[];
}

interface PostClaim {
  postIndex: number;
  postTitle: string;
  postUrl: string;
  platform: string;
  overallClaim: string;
  evidenceAnalysis: {
    images: string[];
    videos: string[];
    audio: any[];
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  analysisCount: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface FinalizedClaim {
  originalClaim: string;
  finalizedClaim: string;
  evidenceSummary: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  keyEvidence: {
    images: string[];
    videos: string[];
    audio: string[];
  };
}

interface FactCheckResult {
  claim: string;
  verificationSources: any[];
  factCheckConclusion: string;
  credibilityScore: number;
  supportingEvidence: any[];
  contradictingEvidence: any[];
}

// Simple logger utility
const logger = {
  log: (tag: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [${tag}] ${message}`);
    if (data) {
      console.log(`[${timestamp}] [JSON] [${tag}] ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
    }
  },
  error: (tag: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${tag}] ${message}`);
    if (error) {
      console.error(`[${timestamp}] [ERROR] [${tag}]`, error);
    }
  }
};

// Processing queue to track final analysis progress
const finalProcessingQueue = new Map<string, any[]>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, analysisResults } = body;

    if (!sessionId || !analysisResults) {
      return NextResponse.json({ 
        error: 'sessionId and analysisResults are required' 
      }, { status: 400 });
    }

    logger.log('FINAL_HANDLER', `Starting final analysis for session ${sessionId}`);
    logger.log('FINAL_HANDLER', `Processing ${analysisResults.postClaims?.length || 0} claims`);

    // Initialize processing queue
    finalProcessingQueue.set(sessionId, []);
    const queue = finalProcessingQueue.get(sessionId)!;

    const finalResults: FactCheckResult[] = [];

    // Process each claim
    for (let i = 0; i < (analysisResults.postClaims?.length || 0); i++) {
      const claim = analysisResults.postClaims[i];
      
      try {
        // Update queue status
        queue.push({
          step: 'processing_claim',
          claimIndex: i,
          claimTitle: claim.postTitle,
          status: 'processing',
          timestamp: Date.now()
        });

        logger.log('FINAL_HANDLER', `🎯 Processing claim ${i + 1}: ${claim.postTitle}`);

        // Step 1: Finalize the claim based on evidence
        const finalizedClaim = await finalizeClaim(claim);
        
        queue.push({
          step: 'claim_finalized',
          claimIndex: i,
          finalizedClaim: finalizedClaim.finalizedClaim,
          status: 'completed',
          timestamp: Date.now()
        });

        logger.log('FINAL_HANDLER', `✅ Finalized claim: ${finalizedClaim.finalizedClaim}`);

        // Step 2: Generate optimized search query and search for verification sources
        const searchQuery = await generateSearchQuery(finalizedClaim.finalizedClaim);
        const searchResults = await searchVerificationSources(searchQuery);
        
        queue.push({
          step: 'sources_found',
          claimIndex: i,
          sourcesCount: searchResults.length,
          searchQuery: searchQuery,
          status: 'completed',
          timestamp: Date.now()
        });

        logger.log('FINAL_HANDLER', `🔍 Generated search query: "${searchQuery}"`);
        logger.log('FINAL_HANDLER', `🔍 Found ${searchResults.length} verification sources`);
        
        // Log the actual search results for debugging
        if (searchResults.length > 0) {
          logger.log('FINAL_HANDLER', `📋 Search results found:`);
          searchResults.forEach((result, index) => {
            logger.log('FINAL_HANDLER', `   ${index + 1}. ${result.title} (${result.source || 'Unknown source'})`);
          });
        } else {
          logger.log('FINAL_HANDLER', `⚠️  No search results found for query: "${searchQuery}"`);
        }

        // Step 3: Segregate and analyze verification sources
        const verificationEvidence = await processVerificationSources(searchResults);
        
        queue.push({
          step: 'evidence_analyzed',
          claimIndex: i,
          evidenceCount: verificationEvidence.length,
          status: 'completed',
          timestamp: Date.now()
        });

        logger.log('FINAL_HANDLER', `📊 Analyzed ${verificationEvidence.length} pieces of evidence`);

        // Step 4: Generate final fact-check conclusion with content analysis
        logger.log('FINAL_HANDLER', `🤖 Starting truthfulness analysis using Gemini API`);
        const factCheckResult = await generateFactCheckConclusion(
          finalizedClaim,
          verificationEvidence,
          searchResults // Pass the search results with credibility scores
        );

        queue.push({
          step: 'fact_check_complete',
          claimIndex: i,
          conclusion: factCheckResult.factCheckConclusion,
          credibilityScore: factCheckResult.credibilityScore,
          status: 'completed',
          timestamp: Date.now()
        });

        logger.log('FINAL_HANDLER', `🎉 Fact-check complete with credibility score: ${factCheckResult.credibilityScore}`);

        finalResults.push(factCheckResult);

      } catch (error) {
        logger.error('FINAL_HANDLER', `Error processing claim ${i + 1}:`, error);
        
        queue.push({
          step: 'error',
          claimIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed',
          timestamp: Date.now()
        });

        // Add a failed result
        finalResults.push({
          claim: claim.overallClaim,
          verificationSources: [],
          factCheckConclusion: 'Unable to verify due to processing error',
          credibilityScore: 0,
          supportingEvidence: [],
          contradictingEvidence: []
        });
      }
    }

    logger.log('FINAL_HANDLER', `🎯 Final analysis complete for session ${sessionId}`);
    logger.log('FINAL_HANDLER', `📊 Processed ${finalResults.length} claims`);

    return NextResponse.json({
      success: true,
      sessionId,
      totalClaims: analysisResults.postClaims?.length || 0,
      processedClaims: finalResults.length,
      factCheckResults: finalResults,
      processingQueue: queue
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('FINAL_HANDLER', 'Final analysis failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'sessionId parameter is required' 
      }, { status: 400 });
    }

    const queue = finalProcessingQueue.get(sessionId);
    if (!queue) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Return the last 10 items for UI display
    const recentItems = queue.slice(-10).reverse();
    
    return NextResponse.json({
      success: true,
      sessionId,
      queueItems: recentItems,
      totalItems: queue.length
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('FINAL_HANDLER', 'Get queue status failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: message 
    }, { status: 500 });
  }
}

// Helper function to finalize claim based on evidence
async function finalizeClaim(claim: PostClaim): Promise<FinalizedClaim> {
  try {
    // Analyze evidence quality and relevance
    const imageEvidence = claim.evidenceAnalysis.images.filter(img => 
      img && img.length > 50 && !img.toLowerCase().includes('sorry') && !img.toLowerCase().includes('deepfake')
    );
    
    const videoEvidence = claim.evidenceAnalysis.videos.filter(vid => 
      vid && vid.length > 50
    );
    
    // Filter audio evidence - only use if it contains meaningful content
    const audioEvidence = claim.evidenceAnalysis.audio
      .filter(audio => {
        if (typeof audio === 'string') {
          return audio.length > 20 && !audio.toLowerCase().includes('music');
        }
        if (audio.text) {
          return audio.text.length > 20 && !audio.text.toLowerCase().includes('music');
        }
        return false;
      })
      .map(audio => typeof audio === 'string' ? audio : audio.text);

    // Combine all evidence into a comprehensive summary
    const combinedEvidence = {
      images: imageEvidence,
      videos: videoEvidence,
      audio: audioEvidence,
      postTitle: claim.postTitle,
      platform: claim.platform
    };

    // Use Gemini API to generate conclusive statement and refined claim
    const conclusiveStatement = await generateConclusiveStatement(combinedEvidence);
    
    // Determine confidence level based on evidence quality
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';
    const totalEvidence = imageEvidence.length + videoEvidence.length + audioEvidence.length;
    
    if (totalEvidence >= 3 && claim.analysisCount.successful >= 3) {
      confidenceLevel = 'high';
    } else if (totalEvidence >= 2 && claim.analysisCount.successful >= 2) {
      confidenceLevel = 'medium';
    }

    // Create detailed evidence summary
    const evidenceSummary = `Combined analysis of ${imageEvidence.length} images, ${videoEvidence.length} videos, and ${audioEvidence.length} audio sources from ${claim.platform} content titled "${claim.postTitle}". ${conclusiveStatement.evidenceSummary}`;

    return {
      originalClaim: claim.overallClaim,
      finalizedClaim: conclusiveStatement.finalizedClaim,
      evidenceSummary,
      confidenceLevel,
      keyEvidence: {
        images: imageEvidence.slice(0, 3), // Top 3 most relevant
        videos: videoEvidence.slice(0, 2), // Top 2 most relevant
        audio: audioEvidence.slice(0, 2)   // Top 2 most relevant
      }
    };

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error finalizing claim:', error);
    // Fallback to simple claim if Gemini fails
    const evidenceSummary = `Based on analysis of ${claim.evidenceAnalysis.images.length} images, ${claim.evidenceAnalysis.videos.length} videos, and ${claim.evidenceAnalysis.audio.length} audio sources.`;
    return {
      originalClaim: claim.overallClaim,
      finalizedClaim: `${claim.overallClaim} - Verification needed for accuracy and context.`,
      evidenceSummary,
      confidenceLevel: 'low',
      keyEvidence: {
        images: claim.evidenceAnalysis.images.slice(0, 3),
        videos: claim.evidenceAnalysis.videos.slice(0, 2),
        audio: claim.evidenceAnalysis.audio.slice(0, 2)
      }
    };
  }
}

// Helper function to generate conclusive statement using Gemini API
async function generateConclusiveStatement(evidence: {
  images: string[];
  videos: string[];
  audio: string[];
  postTitle: string;
  platform: string;
}): Promise<{ finalizedClaim: string; evidenceSummary: string }> {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Prepare evidence context for Gemini
    const evidenceContext = {
      postTitle: evidence.postTitle,
      platform: evidence.platform,
      imageAnalyses: evidence.images.slice(0, 3), // Limit to avoid token limits
      videoAnalyses: evidence.videos.slice(0, 2),
      audioAnalyses: evidence.audio.slice(0, 2),
      totalEvidence: evidence.images.length + evidence.videos.length + evidence.audio.length
    };

    const systemInstruction = `You are an expert fact-checker and claim analyst. Your task is to:

1. Analyze the provided evidence from social media content
2. Generate a clear, specific, and verifiable claim statement
3. Provide a concise evidence summary

INSTRUCTIONS:
- Extract the core claim being made in the social media content
- Make the claim specific and factually testable
- Focus on what can be verified through credible sources
- Avoid vague or subjective statements
- The claim should be something that can be fact-checked

EVIDENCE ANALYSIS GUIDELINES:
- Image evidence: Look for visual proof, data, screenshots, or documentation
- Video evidence: Consider spoken claims, demonstrations, or visual proof
- Audio evidence: Focus on factual statements, not opinions or music

OUTPUT FORMAT:
Return a JSON object with:
{
  "finalizedClaim": "A clear, specific, verifiable claim statement",
  "evidenceSummary": "Brief summary of key evidence that supports or contradicts the claim"
}

EXAMPLE:
Input: Post about "Drinking raw milk cured my allergies"
Output: {
  "finalizedClaim": "Raw milk consumption can cure or significantly reduce allergic reactions",
  "evidenceSummary": "Personal testimonial with before/after photos, but lacks medical documentation or peer-reviewed evidence"
}`;

    const prompt = `Analyze this social media content and generate a conclusive claim statement:

POST DETAILS:
- Title: "${evidence.postTitle}"
- Platform: ${evidence.platform}
- Total Evidence Items: ${evidenceContext.totalEvidence}

EVIDENCE ANALYSIS:
${evidenceContext.imageAnalyses.length > 0 ? `
IMAGE EVIDENCE (${evidenceContext.imageAnalyses.length} items):
${evidenceContext.imageAnalyses.map((img, i) => `${i + 1}. ${img.substring(0, 200)}...`).join('\n')}
` : ''}

${evidenceContext.videoAnalyses.length > 0 ? `
VIDEO EVIDENCE (${evidenceContext.videoAnalyses.length} items):
${evidenceContext.videoAnalyses.map((vid, i) => `${i + 1}. ${vid.substring(0, 200)}...`).join('\n')}
` : ''}

${evidenceContext.audioAnalyses.length > 0 ? `
AUDIO EVIDENCE (${evidenceContext.audioAnalyses.length} items):
${evidenceContext.audioAnalyses.map((aud, i) => `${i + 1}. ${aud.substring(0, 200)}...`).join('\n')}
` : ''}

Generate a conclusive claim statement that can be fact-checked.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      systemInstruction: {
        parts: [{
          text: systemInstruction
        }]
      },
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
      }
    };

    logger.log('FINAL_HANDLER', `🤖 Gemini request body:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('FINAL_HANDLER', `❌ Gemini API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    logger.log('FINAL_HANDLER', `🤖 Gemini API response structure:`, JSON.stringify(result, null, 2));
    
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      logger.error('FINAL_HANDLER', `❌ No text in Gemini response. Full response:`, result);
      throw new Error('No response from Gemini API');
    }

    logger.log('FINAL_HANDLER', `🤖 Gemini generated conclusive statement: ${generatedText.substring(0, 100)}...`);

    // Parse JSON response from Gemini
    let parsedResponse;
    try {
      // Clean the response if it contains markdown code blocks
      const cleanedResponse = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Fallback: extract claim from text response
      logger.error('FINAL_HANDLER', 'Failed to parse Gemini JSON, using fallback extraction');
      parsedResponse = {
        finalizedClaim: generatedText.substring(0, 200) + (generatedText.length > 200 ? '...' : ''),
        evidenceSummary: `Analysis based on ${evidenceContext.totalEvidence} pieces of evidence from ${evidence.platform} content.`
      };
    }

    return {
      finalizedClaim: parsedResponse.finalizedClaim || `Claim from "${evidence.postTitle}" requires verification`,
      evidenceSummary: parsedResponse.evidenceSummary || `Evidence analysis from ${evidenceContext.totalEvidence} sources on ${evidence.platform}`
    };

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error generating conclusive statement with Gemini:', error);
    // Fallback response
    return {
      finalizedClaim: `Claims made in "${evidence.postTitle}" require fact-checking and verification`,
      evidenceSummary: `Analysis of ${evidence.images.length + evidence.videos.length + evidence.audio.length} pieces of evidence from ${evidence.platform} content`
    };
  }
}

// Helper function to generate optimized search query using Gemini API
async function generateSearchQuery(claim: string): Promise<string> {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      // Fallback to simple query if no API key
      return claim;
    }

    const systemInstruction = `You are an expert at creating effective search queries for fact-checking. Your task is to:

1. Convert a claim statement into an optimal search query
2. Focus on key terms that would find authoritative sources
3. Include relevant keywords for fact-checking sites
4. Keep the query concise but comprehensive

GUIDELINES:
- Extract the most important keywords from the claim
- Add terms like "fact check", "verification", "study", "research" when appropriate
- Remove unnecessary words and focus on searchable terms
- Make it suitable for finding credible news sources and fact-checkers
- Keep it under 100 characters for optimal search results

OUTPUT FORMAT:
Return only the search query string, nothing else.

EXAMPLES:
Claim: "Raw milk consumption can cure or significantly reduce allergic reactions"
Query: raw milk allergies health benefits safety risks FDA study

Claim: "Vaccines cause autism in children according to recent studies"
Query: vaccines autism children CDC study debunked research

Claim: "Drinking coffee daily prevents diabetes"
Query: coffee diabetes prevention health study research medical

IMPORTANT: Focus on the main subject matter (like "raw milk", "vaccines", "coffee") and add health/safety/research terms, not just generic "fact check" terms.`;

    const prompt = `Generate an optimized search query for fact-checking this claim:

CLAIM: "${claim}"

Create a search query that will help find authoritative sources to verify or debunk this claim.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      systemInstruction: {
        parts: [{
          text: systemInstruction
        }]
      },
      generationConfig: {
        temperature: 0.2,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 100,
      }
    };

    logger.log('FINAL_HANDLER', `🤖 Gemini search query request:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('FINAL_HANDLER', `❌ Gemini API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    logger.log('FINAL_HANDLER', `🤖 Gemini API response structure:`, JSON.stringify(result, null, 2));
    
    const generatedQuery = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedQuery) {
      logger.error('FINAL_HANDLER', `❌ No query in Gemini response. Full response:`, result);
      throw new Error('No response from Gemini API');
    }

    // Clean and format the query
    const cleanQuery = generatedQuery.trim().replace(/['"]/g, '').substring(0, 100);
    
    logger.log('FINAL_HANDLER', `🤖 Gemini generated search query: ${cleanQuery}`);
    
    return cleanQuery;

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error generating search query with Gemini:', error);
    // Fallback: extract key terms from claim and focus on main topic
    const keyWords = claim
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 6);
    
    // Add health/safety terms for better results
    const healthTerms = ['health', 'safety', 'study', 'research', 'FDA', 'CDC'];
    const fallbackQuery = [...keyWords, ...healthTerms.slice(0, 2)].join(' ');
    
    logger.log('FINAL_HANDLER', `🔄 Using fallback search query: "${fallbackQuery}"`);
    return fallbackQuery.substring(0, 100);
  }
}

// Helper function to search for verification sources using internet search
async function searchVerificationSources(claim: string): Promise<any[]> {
  try {
    logger.log('FINAL_HANDLER', `🌐 Searching internet verification sources for: ${claim}`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search/internet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: claim,
        viralContentAnalysis: `Find sources for fact-checking this social media claim: ${claim}`,
        extractedLinks: []
      })
    });

    if (!response.ok) {
      throw new Error(`Internet Search API failed: ${response.status}`);
    }

    const searchResult = await response.json();
    logger.log('FINAL_HANDLER', `Found ${searchResult.internetSources?.length || 0} authentic sources`);
    logger.log('FINAL_HANDLER', `Average credibility score: ${searchResult.averageCredibilityScore || 0}`);
    
    // Convert internet sources to the expected format and return up to 2 sources as requested
    const formattedSources = (searchResult.internetSources || []).map((source: any) => ({
      title: source.title,
      url: source.url,
      source: source.source,
      credibilityScore: source.credibilityScore,
      category: source.category
    }));
    
    return formattedSources.slice(0, 2); // Limit to 2 sources as requested

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error searching internet verification sources:', error);
    return [];
  }
}

// Helper function to process verification sources
async function processVerificationSources(sources: string[]): Promise<any[]> {
  try {
    if (sources.length === 0) {
      return [];
    }

    logger.log('FINAL_HANDLER', `📊 Processing ${sources.length} verification sources`);

    // Segregate sources to extract media
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/segregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        socialMediaResults: sources
      })
    });

    if (!response.ok) {
      throw new Error(`Segregate API failed: ${response.status}`);
    }

    const segregateResult = await response.json();
    const posts = segregateResult.posts || [];
    
    logger.log('FINAL_HANDLER', `Segregated ${posts.length} posts`);

    // Analyze media from segregated posts
    const evidenceResults = [];
    
    for (const post of posts) {
      try {
        // Focus on meaningful media - filter out ads, icons, etc.
        const meaningfulImages = post.content.images.filter((img: any) => 
          img.localPath && !img.filename.includes('icon') && !img.filename.includes('ad')
        );
        
        const meaningfulVideos = post.content.videos.filter((vid: any) => 
          vid.localPath && !vid.filename.includes('ad')
        );

        // Analyze meaningful media
        for (const image of meaningfulImages.slice(0, 2)) { // Limit to 2 images per source
          try {
            const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: `Fact-checking verification: ${post.title}`,
                type: 'fact_check_verification',
                mediaType: 'image',
                mediaUrl: image.localPath
              })
            });

            if (analysisResponse.ok) {
              const result = await analysisResponse.json();
              if (result.success) {
                evidenceResults.push({
                  source: post.url,
                  type: 'image',
                  analysis: result.description,
                  credibility: 'medium' // Default credibility
                });
              }
            }
          } catch (error) {
            logger.error('FINAL_HANDLER', 'Error analyzing image:', error);
          }
        }

        // Analyze videos (limit to 1 per source due to processing time)
        for (const video of meaningfulVideos.slice(0, 1)) {
          try {
            const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: `Fact-checking verification: ${post.title}`,
                type: 'fact_check_verification',
                mediaType: 'video',
                mediaUrl: video.localPath
              })
            });

            if (analysisResponse.ok) {
              const result = await analysisResponse.json();
              if (result.success) {
                evidenceResults.push({
                  source: post.url,
                  type: 'video',
                  analysis: result.description,
                  credibility: 'high' // Videos generally more credible
                });
              }
            }
          } catch (error) {
            logger.error('FINAL_HANDLER', 'Error analyzing video:', error);
          }
        }

      } catch (error) {
        logger.error('FINAL_HANDLER', 'Error processing post:', error);
      }
    }

    logger.log('FINAL_HANDLER', `Collected ${evidenceResults.length} pieces of verification evidence`);
    return evidenceResults;

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error processing verification sources:', error);
    return [];
  }
}

// Helper function to fetch and analyze source content using Gemini API
async function analyzeSourceContent(source: any, claim: string): Promise<{
  supports: boolean;
  confidence: number;
  summary: string;
  reasoning: string;
}> {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    // Fetch the source content
    let sourceContent = '';
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const contentResponse = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // Clear timeout if request completes
      
      if (contentResponse.ok) {
        const html = await contentResponse.text();
        // Extract text content (simple extraction)
        sourceContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 3000); // Limit to 3000 chars to avoid token limits
      }
    } catch (fetchError) {
      logger.error('FINAL_HANDLER', `Failed to fetch content from ${source.url}:`, fetchError);
      // Use source title and description as fallback
      sourceContent = `${source.title} - ${source.source}`;
    }

    const systemInstruction = `You are an expert fact-checker analyzing whether a source supports or contradicts a given claim. Your task is to:

1. Analyze the source content thoroughly
2. Determine if the source supports, contradicts, or is neutral about the claim
3. Provide a confidence level (0-100) for your assessment
4. Give a brief summary of the source content
5. Explain your reasoning

IMPORTANT GUIDELINES:
- Focus on factual content, not opinions or speculation
- Consider the credibility and authority of the source
- Look for specific evidence that supports or contradicts the claim
- Be objective and avoid bias
- If the source is neutral or doesn't address the claim, indicate that clearly

OUTPUT FORMAT:
Return a JSON object with:
{
  "supports": boolean, // true if supports claim, false if contradicts
  "confidence": number, // 0-100, how confident you are in this assessment
  "summary": "Brief summary of what the source says about the topic",
  "reasoning": "Explanation of why this source supports/contradicts the claim"
}`;

    const prompt = `Analyze whether this source supports or contradicts the given claim:

CLAIM TO VERIFY:
"${claim}"

SOURCE INFORMATION:
- Title: ${source.title}
- Source: ${source.source}
- URL: ${source.url}
- Credibility Score: ${source.credibilityScore}%

SOURCE CONTENT:
${sourceContent || 'Content could not be retrieved - analyze based on title and source information'}

Determine if this source supports or contradicts the claim, and provide your analysis.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      systemInstruction: {
        parts: [{
          text: systemInstruction
        }]
      },
      generationConfig: {
        temperature: 0.2,
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 500,
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('FINAL_HANDLER', `❌ Gemini API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No response from Gemini API');
    }

    // Parse JSON response from Gemini
    let parsedResponse;
    try {
      const cleanedResponse = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      logger.error('FINAL_HANDLER', 'Failed to parse Gemini JSON response:', parseError);
      // Fallback analysis
      return {
        supports: source.credibilityScore > 50,
        confidence: 30,
        summary: `Analysis of ${source.title} from ${source.source}`,
        reasoning: 'Unable to parse detailed analysis, using credibility score as fallback'
      };
    }

    return {
      supports: parsedResponse.supports || false,
      confidence: Math.min(100, Math.max(0, parsedResponse.confidence || 0)),
      summary: parsedResponse.summary || `Content from ${source.source}`,
      reasoning: parsedResponse.reasoning || 'Analysis completed'
    };

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error analyzing source content:', error);
    // Fallback to basic credibility assessment
    return {
      supports: source.credibilityScore > 50,
      confidence: 20,
      summary: `${source.title} - ${source.source}`,
      reasoning: 'Content analysis failed, using basic credibility assessment'
    };
  }
}

// Helper function to generate final fact-check conclusion
async function generateFactCheckConclusion(
  finalizedClaim: FinalizedClaim,
  verificationEvidence: any[],
  verificationSources: any[] = []
): Promise<FactCheckResult> {
  try {
    logger.log('FINAL_HANDLER', `🔍 Analyzing ${verificationSources.length} sources for truthfulness`);
    
    // Analyze each source to determine if it supports or contradicts the claim
    const sourceAnalyses = [];
    for (const source of verificationSources) {
      const analysis = await analyzeSourceContent(source, finalizedClaim.finalizedClaim);
      sourceAnalyses.push({
        source,
        analysis
      });
      logger.log('FINAL_HANDLER', `📊 Source "${source.title}" ${analysis.supports ? 'SUPPORTS' : 'CONTRADICTS'} claim (confidence: ${analysis.confidence}%)`);
    }

    // Calculate truthfulness score based on source content analysis
    let truthfulnessScore = 0;
    let totalWeight = 0;
    
    for (const { source, analysis } of sourceAnalyses) {
      // Weight based on source credibility and analysis confidence
      const sourceWeight = (source.credibilityScore / 100) * (analysis.confidence / 100);
      const scoreContribution = analysis.supports ? sourceWeight * 100 : sourceWeight * 0;
      
      truthfulnessScore += scoreContribution;
      totalWeight += sourceWeight;
      
      logger.log('FINAL_HANDLER', `   Weight: ${sourceWeight.toFixed(2)}, Contribution: ${scoreContribution.toFixed(1)}`);
    }
    
    // Normalize the score
    const finalTruthfulnessScore = totalWeight > 0 ? truthfulnessScore / totalWeight : 50;
    
    // Categorize evidence based on analysis
    const supportingEvidence = sourceAnalyses
      .filter(({ analysis }) => analysis.supports && analysis.confidence > 50)
      .map(({ source, analysis }) => ({
        type: 'source_analysis',
        source: source.url,
        analysis: analysis.summary,
        credibility: analysis.confidence > 80 ? 'high' : analysis.confidence > 50 ? 'medium' : 'low',
        reasoning: analysis.reasoning
      }));
    
    const contradictingEvidence = sourceAnalyses
      .filter(({ analysis }) => !analysis.supports && analysis.confidence > 50)
      .map(({ source, analysis }) => ({
        type: 'source_analysis',
        source: source.url,
        analysis: analysis.summary,
        credibility: analysis.confidence > 80 ? 'high' : analysis.confidence > 50 ? 'medium' : 'low',
        reasoning: analysis.reasoning
      }));

    // Add original verification evidence
    supportingEvidence.push(...verificationEvidence.filter(evidence => 
      evidence.credibility === 'high' || evidence.credibility === 'medium'
    ));
    
    contradictingEvidence.push(...verificationEvidence.filter(evidence => 
      evidence.analysis.toLowerCase().includes('false') || 
      evidence.analysis.toLowerCase().includes('incorrect') ||
      evidence.analysis.toLowerCase().includes('misleading')
    ));

    // Adjust score based on confidence level of original claim
    let adjustedScore = finalTruthfulnessScore;
    if (finalizedClaim.confidenceLevel === 'high') {
      adjustedScore += 5;
    } else if (finalizedClaim.confidenceLevel === 'low') {
      adjustedScore -= 5;
    }
    
    // Ensure score is within bounds
    const credibilityScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

    // Generate conclusion based on truthfulness analysis
    let factCheckConclusion = '';
    const supportingCount = supportingEvidence.length;
    const contradictingCount = contradictingEvidence.length;
    
    if (credibilityScore >= 70) {
      factCheckConclusion = `LIKELY TRUE: The claim is supported by ${supportingCount} credible source(s). Analysis of source content indicates the claim aligns with factual information from reliable sources.`;
    } else if (credibilityScore >= 40) {
      factCheckConclusion = `MIXED EVIDENCE: The claim has conflicting evidence with ${supportingCount} supporting and ${contradictingCount} contradicting source(s). Some aspects may be accurate while others require further verification.`;
    } else {
      factCheckConclusion = `LIKELY FALSE: The claim is contradicted by ${contradictingCount} credible source(s). Analysis of source content indicates the claim does not align with factual information from reliable sources.`;
    }

    // Add source analysis details to conclusion
    if (sourceAnalyses.length > 0) {
      const analysisDetails = sourceAnalyses.map(({ source, analysis }) => 
        `${source.source}: ${analysis.supports ? 'Supports' : 'Contradicts'} (${analysis.confidence}% confidence)`
      ).join('; ');
      factCheckConclusion += ` Source analysis: ${analysisDetails}.`;
    }

    logger.log('FINAL_HANDLER', `🎯 Final truthfulness score: ${credibilityScore}% (${supportingCount} supporting, ${contradictingCount} contradicting)`);

    return {
      claim: finalizedClaim.finalizedClaim,
      verificationSources: verificationSources.map(source => ({
        title: source.title,
        url: source.url,
        source: source.source,
        credibilityScore: source.credibilityScore,
        category: source.category
      })),
      factCheckConclusion,
      credibilityScore,
      supportingEvidence,
      contradictingEvidence
    };

  } catch (error) {
    logger.error('FINAL_HANDLER', 'Error generating fact-check conclusion:', error);
    throw error;
  }
}