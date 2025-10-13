import { NextResponse } from 'next/server';

interface VideoValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  metadata: {
    duration: number;
    format: string;
    resolution: {
      width: number;
      height: number;
    };
    fps: number;
    dateCreated?: string;
  };
  transcript: string;
  keyFrameAnalysis: Array<{
    timestamp: number;
    imageUrl: string;
    objects: Array<{
      name: string;
      confidence: number;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    text?: string;
  }>;
  faceDetection: {
    isDeepfake: boolean;
    deepfakeProbability: number;
    detectedFaces: Array<{
      id: string;
      timeRanges: Array<{
        start: number;
        end: number;
      }>;
      confidence: number;
    }>;
  };
  sourceInfo?: {
    platform: string;
    channel?: string;
    uploadDate?: string;
    views?: number;
    likes?: number;
    channelSubscribers?: number;
  };
}

async function downloadVideo(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download video');
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractKeyFrames(videoBuffer: Buffer, interval: number = 5): Promise<Array<{
  timestamp: number;
  imageUrl: string;
}>> {
  // For demo purposes, simulating keyframe extraction
  // In production, would use FFmpeg to extract frames
  const duration = 30; // Assume 30-second video
  const frames = [];
  
  for (let t = 0; t < duration; t += interval) {
    frames.push({
      timestamp: t,
      imageUrl: 'placeholder.jpg' // In production, would be actual frame image
    });
  }
  
  return frames;
}

async function analyzeFrame(imageUrl: string) {
  const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
  if (!GOOGLE_VISION_API_KEY) throw new Error('Google Vision API key not configured');

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: [
              { type: 'OBJECT_LOCALIZATION' },
              { type: 'TEXT_DETECTION' },
              { type: 'FACE_DETECTION' }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const result = data.responses[0];

    return {
      objects: result.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score,
        boundingBox: obj.boundingPoly.normalizedVertices.reduce(
          (box: any, vertex: any) => ({
            x: Math.min(box.x, vertex.x),
            y: Math.min(box.y, vertex.y),
            width: Math.max(box.width, vertex.x) - Math.min(box.x, vertex.x),
            height: Math.max(box.height, vertex.y) - Math.min(box.y, vertex.y)
          }),
          { x: 1, y: 1, width: 0, height: 0 }
        )
      })) || [],
      text: result.textAnnotations?.[0]?.description
    };
  } catch (error) {
    console.error('Error analyzing frame:', error);
    throw error;
  }
}

async function detectDeepfake(frames: Array<{ timestamp: number; imageUrl: string }>) {
  // For demo purposes, using a simplified deepfake detection
  // In production, would use Azure Video Analyzer or similar
  try {
    const isDeepfake = Math.random() > 0.8; // 20% chance of being deepfake
    const numFaces = Math.floor(Math.random() * 2) + 1;

    return {
      isDeepfake,
      deepfakeProbability: isDeepfake ? 0.85 : 0.15,
      detectedFaces: Array.from({ length: numFaces }, (_, i) => ({
        id: `face_${i + 1}`,
        timeRanges: [{
          start: 0,
          end: 30 // Assuming 30-second video
        }],
        confidence: 0.95
      }))
    };
  } catch (error) {
    console.error('Error detecting deepfake:', error);
    throw error;
  }
}

async function getYouTubeInfo(url: string) {
  if (!url.includes('youtube.com')) return null;

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  if (!YOUTUBE_API_KEY) return null;

  try {
    const videoId = new URL(url).searchParams.get('v');
    if (!videoId) return null;

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    const data = await response.json();
    const video = data.items[0];

    return {
      platform: 'YouTube',
      channel: video.snippet.channelTitle,
      uploadDate: video.snippet.publishedAt,
      views: parseInt(video.statistics.viewCount),
      likes: parseInt(video.statistics.likeCount),
      channelSubscribers: 0 // Would need another API call to get this
    };
  } catch (error) {
    console.error('Error fetching YouTube info:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { url, claim } = await request.json();

    if (!url || !claim) {
      return NextResponse.json(
        { error: 'URL and claim are required' },
        { status: 400 }
      );
    }

    // Download video
    const videoBuffer = await downloadVideo(url);

    // Extract keyframes
    const keyFrames = await extractKeyFrames(videoBuffer);

    // Parallel processing of frames
    const frameAnalyses = await Promise.all(
      keyFrames.map(async frame => ({
        ...frame,
        ...(await analyzeFrame(frame.imageUrl))
      }))
    );

    // Analyze for deepfakes
    const faceAnalysis = await detectDeepfake(keyFrames);

    // Get source information if it's a YouTube video
    const sourceInfo = await getYouTubeInfo(url) || undefined;

    // Use Whisper API to transcribe audio
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

    // Transcribe audio (simplified for demo)
    const transcript = 'Simulated transcript'; // Would use Whisper API in production

    // Analyze content with GPT-4
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a video fact-checking AI. Analyze if the video content supports or refutes the given claim.'
          },
          {
            role: 'user',
            content: `Video Analysis:\n\nTranscript: ${transcript}\n\nDetected Objects: ${frameAnalyses
              .flatMap(frame => frame.objects?.map((obj: { name: string }) => obj.name) ?? [])
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(', ')}\n\nClaim: ${claim}\n\nDoes this content support or refute the claim? Consider also that ${faceAnalysis.isDeepfake ? 'the video appears to be a deepfake' : 'the video appears authentic'}. Respond with JSON containing: isValid (boolean), confidence (0-1), and reasoning (string).`
          }
        ]
      })
    });

    const gptData = await gptResponse.json();
    const analysis = JSON.parse(gptData.choices[0].message.content);

    // Adjust confidence based on deepfake probability
    const confidenceModifier = 1 - (faceAnalysis.deepfakeProbability * 0.8);

    const result: VideoValidationResult = {
      isValid: analysis.isValid,
      confidence: analysis.confidence * confidenceModifier,
      reasoning: analysis.reasoning,
      metadata: {
        duration: 30, // Placeholder
        format: 'mp4', // Placeholder
        resolution: {
          width: 1920,
          height: 1080
        },
        fps: 30
      },
      transcript,
      keyFrameAnalysis: frameAnalyses,
      faceDetection: faceAnalysis,
      sourceInfo
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Video validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate video' },
      { status: 500 }
    );
  }
}
