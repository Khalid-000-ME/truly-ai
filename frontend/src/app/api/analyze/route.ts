import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { unlink } from 'fs/promises';

// Python backend URL
const PYTHON_BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, sourceType = 'general', language = 'en', mediaUrl, mediaType } = body;

    logger.log('ANALYZE', `Analyzing content: text=${text?.length || 0}chars, type=${sourceType}, mediaType=${mediaType}`);

    let analysisResult;

    if (mediaUrl && mediaType) {
      // Handle media analysis (image, video, audio)
      analysisResult = await analyzeMedia(mediaUrl, mediaType, text);
    } else if (text) {
      // Handle text analysis
      analysisResult = await analyzeText(text, sourceType);
    } else {
      return NextResponse.json({ 
        error: 'Either text or mediaUrl with mediaType is required' 
      }, { status: 400 });
    }

    logger.log('ANALYZE', `Analysis complete: success=${analysisResult.success}`);

    return NextResponse.json(analysisResult);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('ANALYZE', 'Analysis failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: message 
    }, { status: 500 });
  }
}

async function analyzeText(text: string, sourceType: string) {
  try {
    const analysisType = getAnalysisTypeFromSource(sourceType);
    
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/analyze/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        analysis_type: analysisType
      })
    });

    if (!response.ok) {
      throw new Error(`Python backend error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: result.success,
      description: result.result,
      analysis: result.result,
      model_used: result.model_used,
      analysis_type: result.analysis_type,
      sourceType: sourceType,
      error: result.error
    };

  } catch (error) {
    logger.error('ANALYZE', 'Text analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text analysis failed'
    };
  }
}

async function analyzeMedia(mediaUrl: string, mediaType: string, contextText?: string) {
  let shouldCleanup = false;
  let filePath = '';
  
  try {
    // Validate the media URL
    if (!mediaUrl || mediaUrl.trim() === '') {
      logger.error('ANALYZE', '❌ Empty or invalid media URL provided');
      return {
        success: false,
        error: 'Media URL is empty or invalid',
        mediaType: mediaType,
        filename: 'unknown'
      };
    }
    
    // Check if it's a file in uploads directory that should be cleaned up
    shouldCleanup = mediaUrl.includes('/uploads/') || mediaUrl.includes('\\uploads\\');
    filePath = mediaUrl;

    // Check if it's a Google login URL (invalid)
    if (mediaUrl.includes('accounts.google.com/ServiceLogin')) {
      logger.error('ANALYZE', `❌ Google login redirect detected: ${mediaUrl}`);
      return {
        success: false,
        error: 'Invalid media URL: Google login redirect detected. Unable to analyze YouTube content that requires authentication. The segregation process may need to be updated to extract proper video URLs.',
        mediaType: mediaType,
        filename: mediaUrl.split('/').pop() || 'unknown'
      };
    }

    // Check if it's a valid URL or file path
    const isUrl = mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://');
    const isLocalPath = !isUrl;

    // For local files, check if file exists (Node.js environment)
    if (isLocalPath && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        if (!fs.existsSync(mediaUrl)) {
          logger.error('ANALYZE', `❌ File not found: ${mediaUrl}`);
          return {
            success: false,
            error: `File not found at path: ${mediaUrl}`,
            mediaType: mediaType,
            filename: mediaUrl.split('/').pop() || 'unknown'
          };
        }
      } catch (fsError) {
        logger.error('ANALYZE', 'File system check failed:', fsError);
        return {
          success: false,
          error: `File system error: ${fsError instanceof Error ? fsError.message : 'Unknown error'}`,
          mediaType: mediaType,
          filename: mediaUrl.split('/').pop() || 'unknown'
        };
      }
    }

    let endpoint;
    let formData = new FormData();

    switch (mediaType) {
      case 'image':
        endpoint = '/api/analyze/image/path';
        formData.append('image_path', mediaUrl);
        formData.append('prompt', contextText || 'Describe what are all in this image, be precise, your response should clearly make another AI clearly identify this image just with the help of the text you provide');
        break;
      
      case 'video':
        endpoint = '/api/analyze/video/path';
        formData.append('video_path', mediaUrl);
        formData.append('num_frames', '5');
        if (contextText) {
          formData.append('prompt', contextText);
        }
        break;
      
      case 'audio':
        endpoint = '/api/analyze/audio/path';
        formData.append('audio_path', mediaUrl);
        break;
      
      default:
        throw new Error(`Unsupported media type: ${mediaType}`);
    }

    // Debug: Log what we're sending
    logger.log('ANALYZE', `Sending to ${endpoint}: ${mediaType} - ${mediaUrl}`);
    
    const response = await fetch(`${PYTHON_BACKEND_URL}${endpoint}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('ANALYZE', `❌ Python backend error response: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Python backend error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    const analysisResult = {
      success: result.success,
      description: result.description || result.analysis || result.transcription,
      model_used: result.model_used,
      method: result.method,
      file_size: result.file_size,
      filename: mediaUrl.split('/').pop() || 'unknown',
      mediaType: mediaType,
      error: result.error
    };
    
    // Clean up file after successful analysis
    if (shouldCleanup && filePath) {
      try {
        await unlink(filePath);
        logger.log('ANALYZE', `🗑️  Cleaned up file: ${analysisResult.filename}`);
      } catch (cleanupError) {
        logger.warn('ANALYZE', `⚠️  Failed to cleanup file ${analysisResult.filename}: ${cleanupError}`);
      }
    }
    
    return analysisResult;

  } catch (error) {
    logger.error('ANALYZE', `${mediaType} analysis failed:`, error);
    
    // Clean up file even on error
    if (shouldCleanup && filePath) {
      try {
        await unlink(filePath);
        logger.log('ANALYZE', `🗑️  Cleaned up file after error: ${filePath.split('/').pop() || 'unknown'}`);
      } catch (cleanupError) {
        logger.warn('ANALYZE', `⚠️  Failed to cleanup file after error: ${cleanupError}`);
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : `${mediaType} analysis failed`
    };
  }
}

function getAnalysisTypeFromSource(sourceType: string): string {
  const mapping: { [key: string]: string } = {
    'social_media_post': 'insights',
    'news_article': 'summary',
    'general': 'summary',
    'image': 'insights',
    'video': 'insights',
    'audio': 'insights'
  };
  
  return mapping[sourceType] || 'summary';
}
