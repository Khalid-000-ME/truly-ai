import { load } from 'cheerio';
import { logger } from '@/utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

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

interface MediaItem {
  url: string;
  filename: string;
  type: string;
  localPath?: string | null; // Local file path after download, null if not available
  linkedAudio?: string; // For videos with separated audio
  linkedVideo?: string; // For audio that was separated from video
}

function detectPlatform(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
  if (hostname.includes('instagram.com')) return 'instagram';
  if (hostname.includes('reddit.com')) return 'reddit';
  return 'other';
}

function generateFilename(url: string, type: string, index: number): string {
  const timestamp = Date.now();
  const platform = detectPlatform(url);
  const extension = type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : type === 'image' ? 'jpg' : 'file';
  return `${platform}_${timestamp}_${index}.${extension}`;
}

const execAsync = promisify(exec);

let ytDlpCommand: string | null = null;

async function checkYtDlpInstallation(): Promise<boolean> {
  try {
    // Try direct command first
    await execAsync('yt-dlp --version');
    ytDlpCommand = 'yt-dlp';
    return true;
  } catch (error) {
    try {
      // Try Python module approach (common on Windows)
      await execAsync('python -m yt_dlp --version');
      ytDlpCommand = 'python -m yt_dlp';
      logger.log('SEGREGATE', '✅ yt-dlp found via Python module');
      return true;
    } catch (pythonError) {
      ytDlpCommand = null;
      logger.error('SEGREGATE', '❌ yt-dlp not found! This is a system CLI tool, not an npm package.');
      logger.error('SEGREGATE', '📋 Installation options:');
      logger.error('SEGREGATE', '   • pip: pip install yt-dlp (recommended)');
      logger.error('SEGREGATE', '   • winget: winget install yt-dlp.yt-dlp');
      logger.error('SEGREGATE', '   • Download: https://github.com/yt-dlp/yt-dlp/releases');
      return false;
    }
  }
}

async function downloadMediaFile(url: string, filename: string): Promise<string | null> {
  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, filename);
    
    // Download the file
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      logger.error('SEGREGATE', `Failed to download ${url}: ${response.status}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(filePath, buffer);
    
    logger.log('SEGREGATE', `Downloaded: ${filename} (${buffer.length} bytes)`);
    return filePath;
    
  } catch (error) {
    logger.error('SEGREGATE', `Download failed for ${url}:`, error);
    return null;
  }
}

async function downloadYouTubeVideo(url: string, filename: string): Promise<string | null> {
  try {
    // Check if yt-dlp is installed
    const isInstalled = await checkYtDlpInstallation();
    if (!isInstalled) {
      logger.error('SEGREGATE', 'yt-dlp not available, skipping video download');
      return null;
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const outputPath = path.join(uploadsDir, filename);
    const baseOutputPath = outputPath.replace('.mp4', ''); // Remove extension for yt-dlp
    
    logger.log('SEGREGATE', `🎥 Downloading YouTube video: ${url}`);
    
    // Use yt-dlp to download video (720p max for reasonable file size)
    // Download best video format up to 720p, this will include audio by default
    const command = `${ytDlpCommand} -f "best[height<=720]" --no-playlist -o "${baseOutputPath}.%(ext)s" "${url}"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 120000, // 2 minute timeout for videos
      cwd: uploadsDir 
    });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.error('SEGREGATE', `yt-dlp stderr: ${stderr}`);
    }
    
    // Find the actual downloaded video file (should be .mp4, .webm, .mkv, etc., NOT .mp3)
    const files = await fs.readdir(uploadsDir);
    const baseName = path.basename(baseOutputPath);
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
    const downloadedFile = files.find(file => 
      file.startsWith(baseName) && 
      videoExtensions.some(ext => file.endsWith(ext))
    );
    
    if (downloadedFile) {
      const actualPath = path.join(uploadsDir, downloadedFile);
      const stats = await fs.stat(actualPath);
      logger.log('SEGREGATE', `✅ YouTube video downloaded: ${downloadedFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return actualPath;
    } else {
      logger.error('SEGREGATE', 'Downloaded video file not found');
      return null;
    }
    
  } catch (error) {
    logger.error('SEGREGATE', `YouTube video download failed for ${url}:`, error);
    return null;
  }
}

async function downloadYouTubeAudio(url: string, filename: string): Promise<string | null> {
  try {
    // Check if yt-dlp is installed
    const isInstalled = await checkYtDlpInstallation();
    if (!isInstalled) {
      logger.error('SEGREGATE', 'yt-dlp not available, skipping audio download');
      return null;
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const outputPath = path.join(uploadsDir, filename);
    const baseOutputPath = outputPath.replace('.mp3', ''); // Remove extension for yt-dlp
    
    logger.log('SEGREGATE', `🎵 Downloading YouTube audio: ${url}`);
    
    // Use yt-dlp to download audio only
    const command = `${ytDlpCommand} -f "bestaudio" --extract-audio --audio-format mp3 --no-playlist -o "${baseOutputPath}.%(ext)s" "${url}"`;
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 90000, // 90 second timeout for audio
      cwd: uploadsDir 
    });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.error('SEGREGATE', `yt-dlp stderr: ${stderr}`);
    }
    
    // Find the actual downloaded file
    const files = await fs.readdir(uploadsDir);
    const downloadedFile = files.find(file => 
      file.startsWith(path.basename(baseOutputPath)) && file.endsWith('.mp3')
    );
    
    if (downloadedFile) {
      const actualPath = path.join(uploadsDir, downloadedFile);
      const stats = await fs.stat(actualPath);
      logger.log('SEGREGATE', `✅ YouTube audio downloaded: ${downloadedFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      return actualPath;
    } else {
      logger.error('SEGREGATE', 'Downloaded audio file not found');
      return null;
    }
    
  } catch (error) {
    logger.error('SEGREGATE', `YouTube audio download failed for ${url}:`, error);
    return null;
  }
}

async function analyzeSocialMediaPost(url: string): Promise<SocialMediaPost> {
  const platform = detectPlatform(url);
  const post: SocialMediaPost = {
    url,
    platform,
    title: '',
    content: {
      text: [],
      images: [],
      videos: [],
      audio: []
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    const $ = load(html);
    
    // Extract title
    post.title = $('title').text() || $('h1').first().text() || 'Social Media Post';
    
    // Extract text content
    const textContent = $('p, .tweet-text, .post-content, .caption, article').text();
    if (textContent) {
      post.content.text.push(textContent);
    }
    
    // Extract images and download them
    const imagePromises: Promise<void>[] = [];
    $('img, [style*="background-image"]').each((index, el) => {
      const src = $(el).attr('src');
      const style = $(el).attr('style');
      
      if (src && !src.startsWith('data:')) {
        try {
          const imageUrl = new URL(src, url).href;
          const filename = generateFilename(url, 'image', index);
          
          // Add to images array first
          post.content.images.push({
            url: imageUrl,
            filename,
            type: 'image'
          });
          
          // Download the image
          const imagePromise = downloadMediaFile(imageUrl, filename).then(localPath => {
            if (localPath) {
              const imageItem = post.content.images.find(img => img.filename === filename);
              if (imageItem) {
                imageItem.localPath = localPath;
              }
            }
          });
          imagePromises.push(imagePromise);
        } catch (e) {}
      }
      
      if (style) {
        const match = style.match(/background-image:\s*url\(['"]?([^'"\)]+)/i);
        if (match && match[1] && !match[1].startsWith('data:')) {
          try {
            const imageUrl = new URL(match[1], url).href;
            const filename = generateFilename(url, 'image', index + 1000); // Offset to avoid conflicts
            
            post.content.images.push({
              url: imageUrl,
              filename,
              type: 'image'
            });
            
            // Download the image
            const imagePromise = downloadMediaFile(imageUrl, filename).then(localPath => {
              if (localPath) {
                const imageItem = post.content.images.find(img => img.filename === filename);
                if (imageItem) {
                  imageItem.localPath = localPath;
                }
              }
            });
            imagePromises.push(imagePromise);
          } catch (e) {}
        }
      }
    });
    
    // Wait for all image downloads to complete
    await Promise.all(imagePromises);
    
    // Extract videos with audio separation
    if (platform === 'youtube') {
      // For YouTube, download actual video and audio files
      const videoFilename = generateFilename(url, 'video', 0);
      const audioFilename = generateFilename(url, 'audio', 0);
      
      // Download video and audio in parallel
      const [videoPath, audioPath] = await Promise.all([
        downloadYouTubeVideo(url, videoFilename),
        downloadYouTubeAudio(url, audioFilename)
      ]);
      
      // Add video with linked audio reference
      post.content.videos.push({
        url: url, // Keep original URL for reference
        filename: videoFilename,
        type: 'video',
        localPath: videoPath, // Actual downloaded video path
        linkedAudio: audioFilename
      });
      
      // Add corresponding audio track
      post.content.audio.push({
        url: url, // Keep original URL for reference
        filename: audioFilename,
        type: 'audio',
        localPath: audioPath, // Actual downloaded audio path
        linkedVideo: videoFilename
      });
      
      if (videoPath && audioPath) {
        logger.log('SEGREGATE', `🎉 YouTube video and audio downloaded successfully!`);
      } else if (videoPath) {
        logger.log('SEGREGATE', `🎥 YouTube video downloaded, audio failed`);
      } else if (audioPath) {
        logger.log('SEGREGATE', `🎵 YouTube audio downloaded, video failed`);
      } else {
        logger.error('SEGREGATE', `❌ Both YouTube video and audio downloads failed`);
      }
    } else {
      // For other platforms, try to extract from video/iframe elements
      $('video, iframe[src*="youtube"], iframe[src*="vimeo"]').each((index, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
          try {
            const videoUrl = new URL(src, url).href;
            const videoFilename = generateFilename(url, 'video', index);
            const audioFilename = generateFilename(url, 'audio', index);
            
            // Add video with linked audio reference
            post.content.videos.push({
              url: videoUrl,
              filename: videoFilename,
              type: 'video',
              localPath: null, // No local file for other platforms
              linkedAudio: audioFilename
            });
            
            // Add corresponding audio track
            post.content.audio.push({
              url: videoUrl, // Same URL, will be processed to extract audio
              filename: audioFilename,
              type: 'audio',
              localPath: null, // No local file for other platforms
              linkedVideo: videoFilename
            });
          } catch (e) {}
        }
      });
    }
    
    // Extract standalone audio
    $('audio, [href$=".mp3"], [href$=".wav"]').each((index, el) => {
      const src = $(el).attr('src') || $(el).attr('href');
      if (src) {
        try {
          const audioUrl = new URL(src, url).href;
          const filename = generateFilename(url, 'audio', index + 1000); // Offset to avoid conflicts
          post.content.audio.push({
            url: audioUrl,
            filename,
            type: 'audio',
            localPath: null // No local file for standalone audio
          });
        } catch (e) {}
      }
    });
    
    return post;
  } catch (error) {
    logger.error('SEGREGATE', `Error analyzing ${url}:`, error);
    return post;
  }
}

export async function GET(request: Request) {
  return new Response(JSON.stringify({ error: 'Use POST method instead' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request) {
  try {
    logger.log('SEGREGATE', 'Starting segregation process');
    const body = await request.json();
    const { socialMediaResults } = body;
    
    if (!socialMediaResults || !Array.isArray(socialMediaResults)) {
      return new Response(JSON.stringify({ error: 'socialMediaResults array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.log('SEGREGATE', `Processing ${socialMediaResults.length} social media posts`);
    
    const segregatedPosts: SocialMediaPost[] = [];
    
    for (let i = 0; i < socialMediaResults.length; i++) {
      const result = socialMediaResults[i];
      
      let url: string;
      let title: string;
      
      // Handle both old string format and new object format
      if (typeof result === 'string') {
        // Old format: "Title: URL"
        const urlMatch = result.match(/: (https?:\/\/[^\s]+)$/);
        if (urlMatch) {
          url = urlMatch[1];
          title = result.replace(/: https?:\/\/[^\s]+$/, '');
        } else {
          logger.error('SEGREGATE', `Invalid result format: ${result}`);
          continue;
        }
      } else if (typeof result === 'object' && result.url) {
        // New object format: { title, url, ... }
        url = result.url;
        title = result.title || result.snippet || 'Unknown Title';
      } else {
        logger.error('SEGREGATE', `Invalid result format:`, result);
        continue;
      }
      
      logger.log('SEGREGATE', `Analyzing post ${i + 1}: ${title}`);
      
      const post = await analyzeSocialMediaPost(url);
      post.title = title; // Override with the provided title
      segregatedPosts.push(post);
    }

    logger.log('SEGREGATE', `Segregation complete: ${segregatedPosts.length} posts processed`);
    logger.json('SEGREGATE', 'Segregated Posts', segregatedPosts);

    return new Response(JSON.stringify({
      success: true,
      posts: segregatedPosts,
      totalPosts: segregatedPosts.length,
      totalMedia: segregatedPosts.reduce((acc, post) => 
        acc + post.content.images.length + post.content.videos.length + post.content.audio.length, 0
      )
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SEGREGATE', 'Segregation failed:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
