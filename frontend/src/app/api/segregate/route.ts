import { fileTypeFromStream } from 'file-type';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';

interface SegregatedContent {
  text: string[];
  images: string[];
  videos: string[];
  audio: string[];
  pdfs: string[];
}

async function analyzeUrl(url: string): Promise<{
  category: keyof SegregatedContent;
  embeddedMedia: { [K in keyof SegregatedContent]: string[] };
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    // Initialize embedded media container
    const embeddedMedia: { [K in keyof SegregatedContent]: string[] } = {
      text: [],
      images: [],
      videos: [],
      audio: [],
      pdfs: []
    };
    
    // Check content type header
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    
    // If it's HTML, parse it for embedded media
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const $ = load(html);
      
      // Find images (including background images)
      $('img, [style*="background-image"]').each((_, el) => {
        const src = $(el).attr('src');
        const style = $(el).attr('style');
        if (src && !src.startsWith('data:')) {
          try {
            embeddedMedia.images.push(new URL(src, url).href);
          } catch (e) {}
        }
        if (style) {
          const match = style.match(/background-image:\s*url\(['"]?([^'"\)]+)/i);
          if (match && match[1] && !match[1].startsWith('data:')) {
            try {
              embeddedMedia.images.push(new URL(match[1], url).href);
            } catch (e) {}
          }
        }
      });
      
      // Find videos (including more providers and data attributes)
      $(`
        video, 
        iframe[src*="youtube"], 
        iframe[src*="vimeo"],
        iframe[src*="dailymotion"],
        iframe[src*="jwplayer"],
        iframe[src*="brightcove"],
        iframe[src*="kaltura"],
        source[type^="video"],
        a[href*="youtube.com/watch"],
        a[href*="vimeo.com"],
        [data-video-id],
        [data-video-url],
        .video-player,
        [class*="video-player"],
        [class*="video-embed"],
        [id*="video-player"],
        div[class*="video"][class*="player"],
        [data-module="video"],
        [data-type="video"],
        .brightcove-player,
        [data-vendor="brightcove"],
        [data-player-type],
        object[type="application/x-shockwave-flash"],
        [data-video-embed],
        meta[property="og:video"],
        meta[property="og:video:url"],
        meta[property="twitter:player"],
        div[data-component*="video"],
        div[class*="VideoPlayer"],
        div[class*="VideoEmbed"],
        [data-testid*="video"],
        [aria-label*="video"],
        [data-element-type="video"]
      `).each((_, el) => {
        // Try various attributes where video URLs might be stored
        const possibleSources = [
          $(el).attr('src') || '',
          $(el).attr('href') || '',
          $(el).attr('data-video-url') || '',
          $(el).attr('data-src') || '',
          $(el).attr('content') || '',
          $(el).attr('value') || '',
          $(el).find('source').attr('src') || '',
          $(el).attr('data-video-id') ? `https://www.youtube.com/watch?v=${$(el).attr('data-video-id')}` : ''
        ].filter(Boolean); // Remove empty strings

        // Also look for video ID in data attributes
        const dataAttrs = el.attribs || {};
        for (const [attr, value] of Object.entries(dataAttrs)) {
          if (attr.toLowerCase().includes('video') && value && value.length > 5) {
            possibleSources.push(value);
          }
        }

        // Process all possible sources
        for (const src of possibleSources) {
          if (!src.startsWith('data:') && !src.startsWith('blob:')) {
            try {
              const videoUrl = new URL(src, url).href;
              // Validate that it's actually a video URL
              const isVideoUrl = (
                /\.(mp4|webm|mov|avi)$/i.test(videoUrl) ||
                /youtube\.com\/(watch|embed)/i.test(videoUrl) ||
                /vimeo\.com\/(video\/)?\d+/i.test(videoUrl) ||
                /dailymotion\.com\/video/i.test(videoUrl) ||
                videoUrl.includes('player') ||
                videoUrl.includes('video') ||
                /\/(embed|watch)\//i.test(videoUrl)
              );
              
              // Exclude common image and document URLs that might contain 'video' in the path
              const isNotImage = !(/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(videoUrl));
              const isNotDocument = !(/\.(pdf|doc|docx)$/i.test(videoUrl));
              
              if (isVideoUrl && isNotImage && isNotDocument && !embeddedMedia.videos.includes(videoUrl)) {
                embeddedMedia.videos.push(videoUrl);
              }
            } catch (e) {}
          }
        }
      });

      // Look for video JSON-LD data
      $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).html();
        if (!content) return;
        
        try {
          const jsonLD = JSON.parse(content);
          const findVideos = (obj: any) => {
            if (!obj) return;
            if (typeof obj === 'object') {
              // Check for various video schemas
              const videoUrls = [
                obj.contentUrl,
                obj.embedUrl,
                obj.url,
                typeof obj.video === 'string' ? obj.video : obj.video?.contentUrl,
                obj['@type'] === 'VideoObject' ? obj.contentUrl : null
              ].filter(Boolean);

              for (const videoUrl of videoUrls) {
                try {
                  const fullUrl = new URL(videoUrl, url).href;
                  if (!embeddedMedia.videos.includes(fullUrl)) {
                    embeddedMedia.videos.push(fullUrl);
                  }
                } catch (e) {}
              }
              
              // Recursively check all object values
              Object.values(obj).forEach(val => {
                if (val && typeof val === 'object') {
                  findVideos(val);
                }
              });
            }
          };
          findVideos(jsonLD);
        } catch (e) {}
      });

      // Look for video-related text in scripts
      $('script:not([src])').each((_, el) => {
        const script = $(el).html() || '';
        const videoPatterns = [
          /videoUrl["']?\s*:\s*["']([^"']+)/i,
          /video["']?\s*:\s*["']([^"']+)/i,
          /videoId["']?\s*:\s*["']([\w-]+)/i,
          /youtube\.com\/embed\/([\w-]+)/i,
          /vimeo\.com\/video\/([\d]+)/i
        ];

        for (const pattern of videoPatterns) {
          const matches = script.match(pattern);
          if (matches && matches[1]) {
            try {
              const videoUrl = matches[1].includes('http') ? 
                matches[1] : 
                `https://www.youtube.com/watch?v=${matches[1]}`;
              const fullUrl = new URL(videoUrl, url).href;
              if (!embeddedMedia.videos.includes(fullUrl)) {
                embeddedMedia.videos.push(fullUrl);
              }
            } catch (e) {}
          }
        }
      });
      
      // Find audio content
      $(`
        audio,
        source[type^="audio"],
        a[href$=".mp3"],
        a[href$=".wav"],
        a[href$=".ogg"],
        a[href$=".m4a"],
        a[href$=".aac"],
        a[href$=".wma"],
        a[href$=".opus"],
        [data-audio-src],
        [data-audio-url],
        [data-podcast-url],
        [data-episode-url],
        .audio-player,
        [class*="audio-player"],
        [class*="podcast-player"],
        [class*="audio-embed"],
        meta[property="og:audio"],
        meta[property="og:audio:url"],
        [data-type="audio"],
        [data-media-type="audio"],
        iframe[src*="spotify.com/embed"],
        iframe[src*="soundcloud.com"],
        iframe[src*="mixcloud.com"],
        iframe[src*="anchor.fm"],
        [data-component="podcast"],
        [data-component="audio"],
        [data-testid*="audio"],
        [aria-label*="audio"],
        [aria-label*="podcast"]
      `).each((_, el) => {
        const possibleSources = [
          $(el).attr('src'),
          $(el).attr('href'),
          $(el).attr('data-audio-src'),
          $(el).attr('data-audio-url'),
          $(el).attr('data-podcast-url'),
          $(el).attr('data-episode-url'),
          $(el).attr('content'),
          $(el).find('source').attr('src'),
          // Check for audio player data attributes
          $(el).attr('data-url'),
          $(el).attr('data-media-url'),
          $(el).attr('data-stream-url')
        ]
        .filter((src): src is string => {
          return typeof src === 'string' && 
                 src.length > 0 && 
                 !src.startsWith('data:') && 
                 !src.startsWith('blob:') &&
                 !src.startsWith('#');
        });

        // Also check for audio-related text in element classes and IDs
        const elementClasses = $(el).attr('class');
        const elementId = $(el).attr('id');
        if (elementClasses?.toLowerCase().includes('podcast') || elementId?.toLowerCase().includes('podcast')) {
          const nearestLink = $(el).find('a').first().attr('href');
          if (nearestLink) {
            possibleSources.push(nearestLink);
          }
        }

        // Look for common audio hosting domains
        const isAudioDomain = (url: string): boolean => {
          const audioHosts = [
            'soundcloud.com',
            'spotify.com',
            'mixcloud.com',
            'anchor.fm',
            'podcasts.apple.com',
            'player.fm',
            'iheart.com',
            'spreaker.com',
            'megaphone.fm',
            'buzzsprout.com'
          ];
          try {
            const hostname = new URL(url).hostname;
            return audioHosts.some(host => hostname.includes(host));
          } catch {
            return false;
          }
        };

        possibleSources.forEach(src => {
          try {
            const audioUrl = new URL(src, url).href;
            const isAudioFile = /\.(mp3|wav|ogg|m4a|aac|wma|opus)$/i.test(audioUrl);
            if ((isAudioFile || isAudioDomain(audioUrl)) && !embeddedMedia.audio.includes(audioUrl)) {
              embeddedMedia.audio.push(audioUrl);
            }
          } catch (e) {}
        });
      });

      // Look for audio in JSON-LD
      $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).html();
        if (!content) return;
        
        try {
          const jsonLD = JSON.parse(content);
          const findAudio = (obj: any) => {
            if (!obj) return;
            if (typeof obj === 'object') {
              if (
                (obj['@type'] === 'AudioObject' && obj.contentUrl) ||
                (obj['@type'] === 'PodcastEpisode' && obj.url)
              ) {
                const audioUrl = obj.contentUrl || obj.url;
                try {
                  const fullUrl = new URL(audioUrl, url).href;
                  if (!embeddedMedia.audio.includes(fullUrl)) {
                    embeddedMedia.audio.push(fullUrl);
                  }
                } catch (e) {}
              }
              Object.values(obj).forEach(val => {
                if (val && typeof val === 'object') {
                  findAudio(val);
                }
              });
            }
          };
          findAudio(jsonLD);
        } catch (e) {}
      });
      
      // Find PDFs
      $('a[href$=".pdf"], embed[type="application/pdf"], object[type="application/pdf"]').each((_, el) => {
        const src = $(el).attr('href') || $(el).attr('src') || $(el).attr('data');
        if (src && !src.startsWith('data:')) {
          try {
            embeddedMedia.pdfs.push(new URL(src, url).href);
          } catch (e) {}
        }
      });

      // Find meta image tags
      $('meta[property="og:image"], meta[name="twitter:image"], link[rel="image_src"]').each((_, el) => {
        const content = $(el).attr('content') || $(el).attr('href');
        if (content && !content.startsWith('data:')) {
          try {
            embeddedMedia.images.push(new URL(content, url).href);
          } catch (e) {}
        }
      });
      
      return { category: 'text', embeddedMedia };
    }
    
    // Handle non-HTML content based on Content-Type
    if (contentType.includes('image/')) {
      return { category: 'images', embeddedMedia: { ...embeddedMedia, images: [url] } };
    }
    if (contentType.includes('video/')) {
      return { category: 'videos', embeddedMedia: { ...embeddedMedia, videos: [url] } };
    }
    if (contentType.includes('audio/')) {
      return { category: 'audio', embeddedMedia: { ...embeddedMedia, audio: [url] } };
    }
    if (contentType.includes('application/pdf')) {
      return { category: 'pdfs', embeddedMedia: { ...embeddedMedia, pdfs: [url] } };
    }
    
    // Fallback to URL pattern matching
    const lowercaseUrl = url.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg)$/i.test(lowercaseUrl)) {
      return { category: 'images', embeddedMedia: { ...embeddedMedia, images: [url] } };
    }
    if (/\.(mp4|webm|mov)$/i.test(lowercaseUrl) || /youtube\.com\/watch|vimeo\.com/.test(lowercaseUrl)) {
      return { category: 'videos', embeddedMedia: { ...embeddedMedia, videos: [url] } };
    }
    if (/\.(mp3|wav|ogg)$/i.test(lowercaseUrl)) {
      return { category: 'audio', embeddedMedia: { ...embeddedMedia, audio: [url] } };
    }
    if (/\.pdf$/i.test(lowercaseUrl)) {
      return { category: 'pdfs', embeddedMedia: { ...embeddedMedia, pdfs: [url] } };
    }
    
    return { category: 'text', embeddedMedia };
  } catch (error) {
    console.error(`Error analyzing URL ${url}:`, error);
    return { 
      category: 'text', 
      embeddedMedia: { text: [], images: [], videos: [], audio: [], pdfs: [] }
    };
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
    console.log('POST /api/segregate - start');
    const body = await request.json();
    console.log('Request body:', body);
    const { url } = body;
    
    if (!url) {
      console.error('URL is missing from request');
      throw new Error('URL is required');
    }
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const analysis = await analyzeUrl(url);
    
    // Initialize segregated content structure with the analyzed content
    const segregatedContent: SegregatedContent = {
      text: [],
      images: [],
      videos: [],
      audio: [],
      pdfs: []
    };

    // Add the main URL to its category
    segregatedContent[analysis.category].push(url);
    
    // Add all embedded media to their respective categories
    Object.entries(analysis.embeddedMedia).forEach(([category, urls]) => {
      segregatedContent[category as keyof SegregatedContent].push(...urls);
    });

    // Remove duplicates from all categories
    Object.keys(segregatedContent).forEach((category) => {
      segregatedContent[category as keyof SegregatedContent] = 
        [...new Set(segregatedContent[category as keyof SegregatedContent])];
    });

    return new Response(JSON.stringify(segregatedContent, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: unknown) {
    console.error('POST /api/segregate - error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      method: request.method
    });

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
