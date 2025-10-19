import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';
import path from 'path';

// Configuration
const PYTHON_BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const HANDLE_API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Initialize Gemini AI
const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

const genAI = initializeGemini();

interface HandleApiResponse {
  success: boolean;
  data: {
    originalPrompt: string;
    refinedText: string;
    extractedLinks: string[];
    mediaFiles: Array<{
      path: string;
      type: string;
      originalName: string;
      size: number;
      timeframe?: {
        startTime: number;
        endTime: number;
        duration: number;
      };
    }>;
  };
  meta: {
    processingTimeMs: number;
    geminiUsed: boolean;
    filesProcessed: number;
    linksExtracted: number;
  };
}

interface MediaAnalysisResult {
  file: string;
  type: 'image' | 'video' | 'audio';
  analysis: any;
  error?: string;
}

interface AggregatedAnalysis {
  textAnalysis: {
    originalPrompt: string;
    refinedText: string;
    extractedLinks: string[];
  };
  mediaAnalysis: MediaAnalysisResult[];
  aggregatedConclusion: string;
  confidence: number;
  viralContentAnalysis: string;
  socialMediaSearch: {
    success: boolean;
    query: string;
    viralContentAnalysis: string;
    extractedLinks: string[];
    socialMediaResults: string[];
    totalResults: number;
    error?: string;
  };
  processingStats: {
    totalFiles: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    totalProcessingTime: number;
  };
}

// Logging function
function logStep(step: string, data: any) {
  logger.log('INITIAL', step);
}

// Function to call /api/handle route
async function callHandleApi(request: NextRequest): Promise<HandleApiResponse> {
  try {
    // Clone the request to avoid consuming the body
    const formData = await request.formData();
    
    const prompt = formData.get('prompt');
    let fileCount = 0;
    for (let i = 0; i < 3; i++) {
      if (formData.get(`file_${i}`)) fileCount++;
    }
    logger.log('INITIAL', `Calling handle API: ${(prompt as string)?.length || 0}chars, ${fileCount}files`);
    
    const response = await fetch(`${HANDLE_API_URL}/api/handle`, {
      method: 'POST',
      body: formData as any
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('INITIAL', '❌ Handle API error response', errorText);
      throw new Error(`Handle API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as HandleApiResponse;
    logStep('HANDLE API RESPONSE', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error calling handle API:', error);
    throw error;
  }
}

// Function to analyze a single media file
async function analyzeMediaFile(
  filePath: string, 
  fileType: string, 
  originalName: string,
  timeframe?: { startTime: number; endTime: number; duration: number }
): Promise<MediaAnalysisResult> {
  logger.log('INITIAL', `Analyzing ${fileType}: ${originalName}`);
  let shouldCleanup = false;
  
  try {
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    
    // Mark for cleanup if it's in uploads directory
    shouldCleanup = filePath.includes('/uploads/') || filePath.includes('\\uploads\\');
    
    // Determine the analysis endpoint based on file type
    let endpoint = '';
    let analysisType: 'image' | 'video' | 'audio';
    
    if (fileType.startsWith('image/')) {
      endpoint = '/api/analyze/image/path';
      analysisType = 'image';
    } else if (fileType.startsWith('video/')) {
      endpoint = '/api/analyze/video/path';
      analysisType = 'video';
    } else if (fileType.startsWith('audio/')) {
      endpoint = '/api/analyze/audio/path';
      analysisType = 'audio';
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    

    // Create form data for the Python backend
    const formData = new FormData();
    
    if (analysisType === 'image') {
      formData.append('image_path', filePath);
      formData.append('prompt', 'Describe what are all in this image, be precise, your response should clearly make another AI clearly identify this  image just with the help of the text you provide');
    } else if (analysisType === 'video') {
      formData.append('video_path', filePath);
      formData.append('num_frames', '5');
      
      // Add timeframe information for video analysis
      if (timeframe) {
        formData.append('start_time', timeframe.startTime.toString());
        formData.append('end_time', timeframe.endTime.toString());
        logger.log('INITIAL', `Video timeframe: ${timeframe.startTime}-${timeframe.endTime}s`);
      }
    } else if (analysisType === 'audio') {
      formData.append('audio_path', filePath);
      
      // Add timeframe information for audio analysis
      if (timeframe) {
        formData.append('end_time', timeframe.endTime.toString());
        logger.log('INITIAL', `Audio timeframe: ${timeframe.startTime}-${timeframe.endTime}s`);
      }
    }
    
    const response = await fetch(`${PYTHON_BACKEND_URL}${endpoint}`, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders()
    });

    logger.log('INITIAL', `Backend response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('INITIAL', '❌ Python backend error response', errorText);
      throw new Error(`Python backend returned ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const analysis = await response.json();
    logger.log('INITIAL', `${analysisType} analysis complete: ${originalName}`);
    logger.json('INITIAL', 'Analysis Result', analysis);
    
    const result = {
      file: originalName,
      type: analysisType,
      analysis
    };
    
    // Clean up file after successful analysis
    if (shouldCleanup) {
      try {
        await unlink(filePath);
        logger.log('INITIAL', `🗑️  Cleaned up file: ${originalName}`);
      } catch (cleanupError) {
        logger.warn('INITIAL', `⚠️  Failed to cleanup file ${originalName}: ${cleanupError}`);
      }
    }
    
    return result;
    
  } catch (error) {
    logger.error('INITIAL', `❌ Error analyzing ${originalName}`, error);
    
    // Clean up file even on error
    if (shouldCleanup) {
      try {
        await unlink(filePath);
        logger.log('INITIAL', `🗑️  Cleaned up file after error: ${originalName}`);
      } catch (cleanupError) {
        logger.warn('INITIAL', `⚠️  Failed to cleanup file after error ${originalName}: ${cleanupError}`);
      }
    }
    
    return {
      file: originalName,
      type: fileType.startsWith('image/') ? 'image' : fileType.startsWith('video/') ? 'video' : 'audio',
      analysis: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Function to analyze viral social media content using Gemini
async function analyzeViralContent(
  textAnalysis: any,
  mediaAnalyses: MediaAnalysisResult[],
  extractedLinks: string[]
): Promise<string> {
  logger.log('INITIAL', 'Analyzing viral content with Gemini...');
  
  if (!genAI) {
    logger.warn('INITIAL', '⚠️  Gemini API not available for viral content analysis');
    return 'Unable to analyze viral content - Gemini API not configured';
  }

  try {
    // Prepare analysis data for Gemini
    const textAnalysisStr = `Original: "${textAnalysis.originalPrompt}" | Refined: "${textAnalysis.refinedText}"`;
    
    const mediaAnalysisStr = mediaAnalyses.length > 0 
      ? mediaAnalyses.map(ma => `${ma.type}: ${ma.error ? `Error: ${ma.error}` : 'Analysis completed'}`).join(' | ')
      : 'No media files analyzed';
    
    const linksStr = extractedLinks.length > 0 
      ? extractedLinks.join(' | ')
      : 'No links extracted';

    const prompt = `Which viral social media content do you think these texts represent: ${textAnalysisStr} ${mediaAnalysisStr} ${linksStr}

Please analyze this content and identify:
1. What type of viral social media content this might represent (meme, news, controversy, etc.)
2. Key topics or themes that would be discussed on Reddit or Twitter
3. Specific search terms that would help find related social media posts
4. The likely social media platforms where this content would be shared

Provide a very short and concise analysis focusing on social media identification.
Your response should not exceed 700 characters`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const viralAnalysis = response.text();

    logger.log('INITIAL', `Viral analysis complete: ${viralAnalysis.length}chars`);
    logger.json('INITIAL', 'Viral Content Analysis', viralAnalysis);
    
    return viralAnalysis;
    
  } catch (error) {
    logger.error('INITIAL', '❌ Error in viral content analysis', error);
    return `Error analyzing viral content: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Function to search social media posts
async function searchSocialMediaPosts(
  query: string,
  extractedLinks: string[],
  viralContentAnalysis: string
): Promise<any> {
  logger.log('INITIAL', 'Searching social media posts...');
  
  try {
    const response = await fetch(`${HANDLE_API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        extractedLinks,
        viralContentAnalysis
      })
    });

    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
    }

    const searchResults = await response.json() as any;
    
    logger.log('INITIAL', `Social media search complete: ${searchResults.totalResults || 0} posts`);
    logger.json('INITIAL', 'Search Results', searchResults);
    
    return searchResults;
    
  } catch (error) {
    logger.error('INITIAL', '❌ Error searching social media posts', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      socialMediaResults: []
    };
  }
}

// Function to generate aggregated conclusion
async function generateAggregatedConclusion(
  textAnalysis: any,
  mediaAnalyses: MediaAnalysisResult[]
): Promise<{ conclusion: string; confidence: number }> {
  logger.log('INITIAL', 'Generating conclusion...');
  
  try {
    // Prepare data for text analysis endpoint - Python backend expects simple format
    const textForAnalysis = `
Original Query: ${textAnalysis.originalPrompt}
Refined Query: ${textAnalysis.refinedText}
Extracted Links: ${textAnalysis.extractedLinks.join(', ')}

Media Analysis Results:
${mediaAnalyses.map(ma => `
- ${ma.file} (${ma.type}): ${ma.error ? `Error: ${ma.error}` : 'Analysis completed successfully'}
${ma.analysis ? `  Analysis: ${JSON.stringify(ma.analysis, null, 2)}` : ''}
`).join('\n')}

Please provide a comprehensive fact-checking conclusion based on the above information.
    `.trim();

    const analysisData = {
      text: textForAnalysis,
      analysis_type: 'insights'
    };

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/analyze/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analysisData)
    });

    if (!response.ok) {
      throw new Error(`Text analysis API returned ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as any;
    
    return {
      conclusion: result.result || 'Unable to generate comprehensive conclusion',
      confidence: result.success ? 0.8 : 0.3
    };
    
  } catch (error) {
    console.error('❌ Error generating aggregated conclusion:', error);
    
    // Fallback conclusion generation
    const successfulAnalyses = mediaAnalyses.filter(ma => !ma.error).length;
    const totalAnalyses = mediaAnalyses.length;
    
    let fallbackConclusion = `Analysis of "${textAnalysis.refinedText}" with ${totalAnalyses} media files. `;
    fallbackConclusion += `Successfully analyzed ${successfulAnalyses} out of ${totalAnalyses} files. `;
    
    if (textAnalysis.extractedLinks.length > 0) {
      fallbackConclusion += `Found ${textAnalysis.extractedLinks.length} links for verification: ${textAnalysis.extractedLinks.join(', ')}. `;
    }
    
    fallbackConclusion += 'Manual review recommended for comprehensive fact-checking.';
    
    return {
      conclusion: fallbackConclusion,
      confidence: successfulAnalyses / Math.max(totalAnalyses, 1) * 0.7 // Lower confidence for fallback
    };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  logger.log('INITIAL', 'Starting analysis pipeline');
  
  try {
    // Step 1: Call /api/handle to process text and files
    const handleResult = await callHandleApi(request);
    
    if (!handleResult.success) {
      throw new Error('Handle API failed: ' + JSON.stringify(handleResult));
    }

    // Step 2: Analyze each media file with Python backend
    logger.log('INITIAL', `Step 2: Analyzing ${handleResult.data.mediaFiles.length} media files`);
    
    const mediaAnalyses: MediaAnalysisResult[] = [];
    
    for (const mediaFile of handleResult.data.mediaFiles) {
      
      // Pass timeframe information if available
      const analysis = await analyzeMediaFile(
        mediaFile.path, 
        mediaFile.type, 
        mediaFile.originalName,
        mediaFile.timeframe
      );
      mediaAnalyses.push(analysis);
    }
    
    logStep('MEDIA ANALYSES COMPLETED', {
      totalFiles: mediaAnalyses.length,
      successful: mediaAnalyses.filter(ma => !ma.error).length,
      failed: mediaAnalyses.filter(ma => ma.error).length,
      analyses: mediaAnalyses
    });

    // Step 3: Generate aggregated conclusion
    logger.log('INITIAL', 'Step 3: Generating conclusion (fallback mode)');
    const successfulAnalyses = mediaAnalyses.filter(ma => !ma.error).length;
    const totalAnalyses = mediaAnalyses.length;
    
    let conclusion = `Analysis of "${handleResult.data.refinedText}" completed. `;
    conclusion += `Processed ${totalAnalyses} media files with ${successfulAnalyses} successful analyses. `;
    
    if (handleResult.data.extractedLinks.length > 0) {
      conclusion += `Found ${handleResult.data.extractedLinks.length} links for verification: ${handleResult.data.extractedLinks.join(', ')}. `;
    }
    
    if (successfulAnalyses > 0) {
      conclusion += `Media analysis results: `;
      mediaAnalyses.forEach(ma => {
        if (!ma.error) {
          conclusion += `${ma.file} (${ma.type}) analyzed successfully. `;
        }
      });
    }
    
    conclusion += 'Review complete.';
    
    const confidence = successfulAnalyses / Math.max(totalAnalyses, 1) * 0.8;

    // Step 4: Analyze viral social media content
    const viralContentAnalysis = await analyzeViralContent(
      handleResult.data,
      mediaAnalyses,
      handleResult.data.extractedLinks
    );

    // Step 5: Search for related social media posts
    const socialMediaSearch = await searchSocialMediaPosts(
      handleResult.data.refinedText,
      handleResult.data.extractedLinks,
      viralContentAnalysis
    );

    // Step 6: Prepare final response
    const totalProcessingTime = Date.now() - startTime;
    
    const aggregatedResult: AggregatedAnalysis = {
      textAnalysis: {
        originalPrompt: handleResult.data.originalPrompt,
        refinedText: handleResult.data.refinedText,
        extractedLinks: handleResult.data.extractedLinks
      },
      mediaAnalysis: mediaAnalyses,
      aggregatedConclusion: conclusion,
      confidence,
      viralContentAnalysis,
      socialMediaSearch,
      processingStats: {
        totalFiles: handleResult.data.mediaFiles.length,
        successfulAnalyses: mediaAnalyses.filter(ma => !ma.error).length,
        failedAnalyses: mediaAnalyses.filter(ma => ma.error).length,
        totalProcessingTime
      }
    };

    const successCount = mediaAnalyses.filter(ma => !ma.error).length;
    const failCount = mediaAnalyses.filter(ma => ma.error).length;
    logger.log('INITIAL', `Complete: ${totalProcessingTime}ms | ${successCount}/${mediaAnalyses.length} media | ${handleResult.data.extractedLinks.length}links | ${socialMediaSearch.totalResults || 0}posts | ${(confidence * 100).toFixed(1)}% confidence`);
    
    logger.separator('INITIAL', '🎉 INITIAL API FINAL RESPONSE');
    logger.json('INITIAL', 'Final Response', aggregatedResult);
    
    return NextResponse.json({
      success: true,
      data: aggregatedResult,
      message: 'Multi-modal analysis completed successfully',
      meta: {
        totalProcessingTime,
        handleApiTime: handleResult.meta.processingTimeMs,
        mediaAnalysisTime: totalProcessingTime - handleResult.meta.processingTimeMs,
        pythonBackendUsed: true,
        geminiUsed: handleResult.meta.geminiUsed
      }
    });

  } catch (error) {
    const totalProcessingTime = Date.now() - startTime;
    console.error('\n❌ ANALYSIS PIPELINE FAILED');
    logger.error('INITIAL', '❌ Initial API Error', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis pipeline failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          totalProcessingTime,
          failurePoint: 'initial_analysis'
        }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'TrulyAI Initial Analysis API - Multi-modal analysis orchestrator',
    version: '1.0.0',
    description: 'Orchestrates the complete analysis pipeline including text processing, media analysis, and aggregated conclusions',
    pipeline: [
      '1. Process text and files via /api/handle',
      '2. Analyze media files with Python backend',
      '3. Generate aggregated conclusion',
      '4. Return comprehensive analysis'
    ],
    endpoints: {
      'POST /api/initial': 'Run complete analysis pipeline',
      'GET /api/initial': 'API information'
    },
    requirements: {
      pythonBackend: `${PYTHON_BACKEND_URL} (must be running)`,
      handleApi: `${HANDLE_API_URL}/api/handle`,
      supportedFiles: ['images', 'videos', 'audio files'],
      maxFiles: 3
    }
  });
}