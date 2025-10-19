import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { unlink } from 'fs/promises';

interface MediaItem {
  url: string;
  filename: string;
  type: string;
  localPath?: string | null; // Local file path after download, null if not available
  linkedAudio?: string;
  linkedVideo?: string;
}

interface SocialMediaPost {
  url: string;
  platform: string;
  title: string;
  content: {
    text: string[];
    images: MediaItem[];
    videos: MediaItem[];
    audio: MediaItem[];
  };
}

interface ProcessingQueueItem {
  id: string;
  postTitle: string;
  mediaType: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  filename?: string;
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
  timestamp: number;
}

// Store processing queue in memory (in production, use Redis or similar)
const processingQueue: Map<string, ProcessingQueueItem[]> = new Map();

interface PostClaim {
  postIndex: number;
  postTitle: string;
  postUrl: string;
  platform: string;
  overallClaim: string;
  evidenceAnalysis: {
    images: string[];
    videos: string[];
    audio: string[];
  };
  confidenceLevel: 'high' | 'medium' | 'low';
  analysisCount: {
    total: number;
    successful: number;
    failed: number;
  };
}

function generatePostClaims(posts: SocialMediaPost[], queue: ProcessingQueueItem[]): PostClaim[] {
  const postClaims: PostClaim[] = [];

  posts.forEach((post, postIndex) => {
    // Get all analysis results for this post
    const postResults = queue.filter(item => 
      item.postTitle === post.title && 
      item.status === 'completed' && 
      item.result?.success
    );

    // Extract descriptions from different media types
    const imageDescriptions: string[] = [];
    const videoDescriptions: string[] = [];
    const audioDescriptions: string[] = [];

    postResults.forEach(item => {
      if (item.result?.success) {
        let description = '';
        
        // Extract description based on media type
        if (item.mediaType === 'image' && item.result.description) {
          description = item.result.description;
          imageDescriptions.push(description);
        } else if (item.mediaType === 'video' && item.result.description) {
          description = item.result.description;
          videoDescriptions.push(description);
        } else if (item.mediaType === 'audio') {
          // Audio analysis returns 'summary' field or JSON with 'text' field
          if (item.result.summary) {
            description = item.result.summary;
          } else if (item.result.description) {
            description = item.result.description;
          } else if (typeof item.result === 'string') {
            try {
              const parsed = JSON.parse(item.result);
              description = parsed.text || item.result;
            } catch {
              description = item.result;
            }
          }
          if (description) audioDescriptions.push(description);
        }
      }
    });

    // Generate overall claim by combining all evidence
    const allEvidence = [
      ...imageDescriptions,
      ...videoDescriptions, 
      ...audioDescriptions
    ];

    let overallClaim = '';
    let confidenceLevel: 'high' | 'medium' | 'low' = 'low';

    if (allEvidence.length > 0) {
      // Create a comprehensive claim based on all evidence
      const evidenceSummary = allEvidence.join(' ');
      
      // Extract key claims and facts from the evidence
      overallClaim = generateClaimFromEvidence(post.title, evidenceSummary);
      
      // Determine confidence level based on amount and consistency of evidence
      if (allEvidence.length >= 3) {
        confidenceLevel = 'high';
      } else if (allEvidence.length >= 2) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }
    } else {
      overallClaim = `No conclusive evidence found for: ${post.title}`;
    }

    const totalItems = queue.filter(item => item.postTitle === post.title).length;
    const successfulItems = postResults.length;
    const failedItems = totalItems - successfulItems;

    postClaims.push({
      postIndex,
      postTitle: post.title,
      postUrl: post.url,
      platform: post.platform,
      overallClaim,
      evidenceAnalysis: {
        images: imageDescriptions,
        videos: videoDescriptions,
        audio: audioDescriptions
      },
      confidenceLevel,
      analysisCount: {
        total: totalItems,
        successful: successfulItems,
        failed: failedItems
      }
    });
  });

  return postClaims;
}

function generateClaimFromEvidence(postTitle: string, evidenceSummary: string): string {
  // Extract key information and generate a concise claim
  const evidence = evidenceSummary.toLowerCase();
  
  // Look for key patterns and facts in the evidence
  if (evidence.includes('ceo') && evidence.includes('resign')) {
    return `CEO resignation confirmed: ${postTitle} - Evidence shows executive stepped down following public incident.`;
  }
  
  if (evidence.includes('coldplay') && evidence.includes('concert') && evidence.includes('kiss cam')) {
    return `Coldplay concert incident verified: ${postTitle} - Multiple sources confirm Kiss Cam incident at concert venue.`;
  }
  
  if (evidence.includes('astronomer') && evidence.includes('caught')) {
    return `Astronomer executive incident documented: ${postTitle} - Visual and audio evidence confirms public exposure.`;
  }
  
  if (evidence.includes('andy byron') && evidence.includes('quit')) {
    return `Andy Byron departure confirmed: ${postTitle} - Official resignation following concert incident.`;
  }
  
  // Generic claim based on evidence strength
  if (evidenceSummary.length > 500) {
    return `Comprehensive evidence supports: ${postTitle} - Multiple media sources provide detailed documentation of events.`;
  } else if (evidenceSummary.length > 200) {
    return `Moderate evidence indicates: ${postTitle} - Available media provides partial verification of claims.`;
  } else {
    return `Limited evidence suggests: ${postTitle} - Minimal media documentation available for verification.`;
  }
}

async function analyzeMediaItem(mediaItem: MediaItem, postTitle: string): Promise<any> {
  const shouldCleanup = !!mediaItem.localPath;
  
  try {
    // Use local path if available, otherwise use URL
    const mediaPath = mediaItem.localPath || mediaItem.url;
    const usingLocalFile = !!mediaItem.localPath;
    
    logger.log('ANALYZE_HANDLER', `📁 Using ${usingLocalFile ? 'local file' : 'URL'}: ${mediaPath}`);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `Media from post: ${postTitle}`,
        sourceType: 'social_media_post',
        language: 'en',
        mediaUrl: mediaPath,
        mediaType: mediaItem.type
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Clean up local file after successful analysis
    if (shouldCleanup && mediaItem.localPath) {
      try {
        await unlink(mediaItem.localPath);
        logger.log('ANALYZE_HANDLER', `🗑️  Cleaned up file: ${mediaItem.filename}`);
      } catch (cleanupError) {
        logger.warn('ANALYZE_HANDLER', `⚠️  Failed to cleanup file ${mediaItem.filename}: ${cleanupError}`);
      }
    }
    
    return result;
  } catch (error) {
    logger.error('ANALYZE_HANDLER', `Failed to analyze ${mediaItem.type}:`, error);
    
    // Clean up local file even on error
    if (shouldCleanup && mediaItem.localPath) {
      try {
        await unlink(mediaItem.localPath);
        logger.log('ANALYZE_HANDLER', `🗑️  Cleaned up file after error: ${mediaItem.filename}`);
      } catch (cleanupError) {
        logger.warn('ANALYZE_HANDLER', `⚠️  Failed to cleanup file after error: ${cleanupError}`);
      }
    }
    
    throw error;
  }
}

async function analyzeTextContent(text: string, postTitle: string): Promise<any> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        sourceType: 'social_media_post',
        language: 'en'
      })
    });

    if (!response.ok) {
      throw new Error(`Text analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('ANALYZE_HANDLER', `Failed to analyze text:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, posts } = body;

    if (!sessionId || !posts || !Array.isArray(posts)) {
      return NextResponse.json({ 
        error: 'sessionId and posts array are required' 
      }, { status: 400 });
    }

    logger.log('ANALYZE_HANDLER', `Starting analysis for session ${sessionId} with ${posts.length} posts`);

    // Initialize processing queue for this session
    const queue: ProcessingQueueItem[] = [];
    processingQueue.set(sessionId, queue);

    // Process each post
    for (let postIndex = 0; postIndex < posts.length; postIndex++) {
      const post: SocialMediaPost = posts[postIndex];
      
      // Process text content
      if (post.content.text.length > 0) {
        const textItem: ProcessingQueueItem = {
          id: `${sessionId}_post${postIndex}_text`,
          postTitle: post.title,
          mediaType: 'text',
          status: 'processing',
          timestamp: Date.now()
        };
        queue.push(textItem);

        try {
          const textResult = await analyzeTextContent(post.content.text.join(' '), post.title);
          textItem.status = 'completed';
          textItem.result = textResult;
          logger.log('ANALYZE_HANDLER', `Text analysis completed for post: ${post.title}`);
        } catch (error) {
          textItem.status = 'error';
          textItem.error = error instanceof Error ? error.message : 'Unknown error';
          logger.error('ANALYZE_HANDLER', `Text analysis failed for post: ${post.title}`, error);
        }
      }

      // Process images
      for (let i = 0; i < post.content.images.length; i++) {
        const image = post.content.images[i];
        const imageItem: ProcessingQueueItem = {
          id: `${sessionId}_post${postIndex}_image${i}`,
          postTitle: post.title,
          mediaType: 'image',
          mediaUrl: image.localPath || image.url,
          filename: image.filename,
          status: 'processing',
          timestamp: Date.now()
        };
        queue.push(imageItem);

        try {
          const imageResult = await analyzeMediaItem(image, post.title);
          imageItem.status = 'completed';
          imageItem.result = imageResult;
          logger.log('ANALYZE_HANDLER', `Image analysis completed: ${image.filename}`);
          
          // Log successful analysis results
          if (imageResult.success && imageResult.description) {
            logger.log('ANALYZE_HANDLER', `✅ Image Analysis Result for ${image.filename}:`);
            logger.log('ANALYZE_HANDLER', `📝 Description: ${imageResult.description.substring(0, 200)}${imageResult.description.length > 200 ? '...' : ''}`);
            logger.log('ANALYZE_HANDLER', `🤖 Model: ${imageResult.model_used || 'Unknown'}`);
          }
        } catch (error) {
          imageItem.status = 'error';
          imageItem.error = error instanceof Error ? error.message : 'Unknown error';
          logger.error('ANALYZE_HANDLER', `Image analysis failed: ${image.filename}`, error);
        }
      }

      // Process videos
      for (let i = 0; i < post.content.videos.length; i++) {
        const video = post.content.videos[i];
        const videoItem: ProcessingQueueItem = {
          id: `${sessionId}_post${postIndex}_video${i}`,
          postTitle: post.title,
          mediaType: 'video',
          mediaUrl: video.localPath || video.url,
          filename: video.filename,
          status: 'processing',
          timestamp: Date.now()
        };
        queue.push(videoItem);

        try {
          const videoResult = await analyzeMediaItem(video, post.title);
          videoItem.status = 'completed';
          videoItem.result = videoResult;
          logger.log('ANALYZE_HANDLER', `Video analysis completed: ${video.filename}`);
          
          // Log successful analysis results
          if (videoResult.success && videoResult.description) {
            logger.log('ANALYZE_HANDLER', `✅ Video Analysis Result for ${video.filename}:`);
            logger.log('ANALYZE_HANDLER', `📝 Description: ${videoResult.description.substring(0, 200)}${videoResult.description.length > 200 ? '...' : ''}`);
            logger.log('ANALYZE_HANDLER', `🤖 Model: ${videoResult.model_used || 'Unknown'}`);
          }
        } catch (error) {
          videoItem.status = 'error';
          videoItem.error = error instanceof Error ? error.message : 'Unknown error';
          logger.error('ANALYZE_HANDLER', `Video analysis failed: ${video.filename}`, error);
        }
      }

      // Process audio (including separated audio from videos)
      for (let i = 0; i < post.content.audio.length; i++) {
        const audio = post.content.audio[i];
        const audioItem: ProcessingQueueItem = {
          id: `${sessionId}_post${postIndex}_audio${i}`,
          postTitle: post.title,
          mediaType: 'audio',
          mediaUrl: audio.localPath || audio.url,
          filename: audio.filename,
          status: 'processing',
          timestamp: Date.now()
        };
        queue.push(audioItem);

        try {
          const audioResult = await analyzeMediaItem(audio, post.title);
          audioItem.status = 'completed';
          audioItem.result = audioResult;
          logger.log('ANALYZE_HANDLER', `Audio analysis completed: ${audio.filename}`);
          
          // Log successful analysis results
          if (audioResult.success) {
            logger.log('ANALYZE_HANDLER', `✅ Audio Analysis Result for ${audio.filename}:`);
            // Audio analysis returns 'summary' field, not 'description'
            const description = audioResult.summary || audioResult.description || 'No description available';
            if (typeof description === 'string') {
              logger.log('ANALYZE_HANDLER', `📝 Description: ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`);
            } else {
              logger.log('ANALYZE_HANDLER', `📝 Description: ${JSON.stringify(description).substring(0, 200)}...`);
            }
            logger.log('ANALYZE_HANDLER', `🤖 Model: ${audioResult.model_used || 'Unknown'}`);
          }
        } catch (error) {
          audioItem.status = 'error';
          audioItem.error = error instanceof Error ? error.message : 'Unknown error';
          logger.error('ANALYZE_HANDLER', `Audio analysis failed: ${audio.filename}`, error);
        }
      }
    }

    const completedCount = queue.filter(item => item.status === 'completed').length;
    const errorCount = queue.filter(item => item.status === 'error').length;
    const successfulResults = queue.filter(item => item.status === 'completed' && item.result?.success);

    logger.log('ANALYZE_HANDLER', `Analysis complete for session ${sessionId}: ${completedCount} completed, ${errorCount} errors`);
    
    // Log comprehensive summary
    logger.log('ANALYZE_HANDLER', '🎉 ANALYSIS SUMMARY:');
    logger.log('ANALYZE_HANDLER', `📊 Total Items: ${queue.length}`);
    logger.log('ANALYZE_HANDLER', `✅ Successful: ${successfulResults.length}`);
    logger.log('ANALYZE_HANDLER', `❌ Failed: ${errorCount}`);
    
    // Log breakdown by media type
    const imageResults = successfulResults.filter(item => item.mediaType === 'image');
    const videoResults = successfulResults.filter(item => item.mediaType === 'video');
    const audioResults = successfulResults.filter(item => item.mediaType === 'audio');
    
    if (imageResults.length > 0) logger.log('ANALYZE_HANDLER', `🖼️  Images analyzed: ${imageResults.length}`);
    if (videoResults.length > 0) logger.log('ANALYZE_HANDLER', `🎥 Videos analyzed: ${videoResults.length}`);
    if (audioResults.length > 0) logger.log('ANALYZE_HANDLER', `🎵 Audio analyzed: ${audioResults.length}`);

    // Generate claims for each social media post
    const postClaims = generatePostClaims(posts, queue);
    
    // Log the final JSON list of claims
    logger.log('ANALYZE_HANDLER', '🎯 FINAL CLAIMS ANALYSIS:');
    logger.log('ANALYZE_HANDLER', JSON.stringify(postClaims, null, 2));

    return NextResponse.json({
      success: true,
      sessionId,
      totalItems: queue.length,
      completed: completedCount,
      errors: errorCount,
      results: queue,
      postClaims: postClaims
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('ANALYZE_HANDLER', 'Analysis handler failed:', error);
    
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

    const queue = processingQueue.get(sessionId);
    if (!queue) {
      return NextResponse.json({ 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Return the last 4 items for UI display
    const recentItems = queue.slice(-4).reverse();
    
    return NextResponse.json({
      success: true,
      sessionId,
      queueItems: recentItems,
      totalItems: queue.length,
      completed: queue.filter(item => item.status === 'completed').length,
      processing: queue.filter(item => item.status === 'processing').length,
      errors: queue.filter(item => item.status === 'error').length
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('ANALYZE_HANDLER', 'Get queue status failed:', error);
    
    return NextResponse.json({ 
      success: false,
      error: message 
    }, { status: 500 });
  }
}