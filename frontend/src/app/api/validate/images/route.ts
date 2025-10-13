import { NextResponse } from 'next/server';
// @ts-ignore - exif-parser types not available
import ExifParser from 'exif-parser';

interface ImageValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  metadata: {
    dateCreated?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
    camera?: {
      make?: string;
      model?: string;
    };
  };
  manipulationScore: number;
  reverseSearchResults: {
    earliestAppearance?: string;
    similarImages: number;
    possibleSources: string[];
  };
  visionAnalysis: {
    detectedObjects: string[];
    detectedText: string;
    safeSearchAnnotation?: {
      adult: string;
      violence: string;
      medical: string;
    };
    labelAnnotations: Array<{
      description: string;
      score: number;
    }>;
  };
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download image');
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractExifData(imageBuffer: Buffer) {
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();
    
    return {
      dateCreated: result.tags.DateTimeOriginal ? 
        new Date(result.tags.DateTimeOriginal * 1000).toISOString() : undefined,
      location: result.tags.GPSLatitude ? {
        latitude: result.tags.GPSLatitude,
        longitude: result.tags.GPSLongitude
      } : undefined,
      camera: {
        make: result.tags.Make,
        model: result.tags.Model
      }
    };
  } catch (error) {
    console.error('Error extracting EXIF:', error);
    return {};
  }
}

async function analyzeWithGoogleVision(imageBuffer: Buffer, mockForDev: boolean = false) {
  const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
  
  if (!GOOGLE_VISION_API_KEY || mockForDev) {
    console.log('Using mock Vision API response for development');
    return {
      detectedObjects: ['Person', 'Medical equipment', 'Hospital'],
      detectedText: 'World Health Organization COVID-19 Guidelines',
      safeSearchAnnotation: {
        adult: 'VERY_UNLIKELY',
        violence: 'VERY_UNLIKELY',
        medical: 'POSSIBLE'
      },
      labelAnnotations: [
        { description: 'Medical', score: 0.95 },
        { description: 'Healthcare', score: 0.9 },
        { description: 'Hospital', score: 0.85 }
      ],
      webDetection: {
        pagesWithMatchingImages: [{ pageUrl: 'https://www.who.int/covid-19' }],
        partialMatchingImages: Array(5).fill(null),
      }
    };
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            image: {
              content: imageBuffer.toString('base64')
            },
            features: [
              { type: 'LABEL_DETECTION' },
              { type: 'TEXT_DETECTION' },
              { type: 'SAFE_SEARCH_DETECTION' },
              { type: 'WEB_DETECTION' },
              { type: 'OBJECT_LOCALIZATION' }
            ]
          }]
        })
      }
    );

    const data = await response.json();
    const result = data.responses[0];

    return {
      detectedObjects: result.localizedObjectAnnotations?.map((obj: any) => obj.name) || [],
      detectedText: result.textAnnotations?.[0]?.description || '',
      safeSearchAnnotation: result.safeSearchAnnotation,
      labelAnnotations: result.labelAnnotations || [],
      webDetection: result.webDetection
    };
  } catch (error) {
    console.error('Error analyzing with Google Vision:', error);
    throw error;
  }
}

async function checkDeepfake(imageBuffer: Buffer): Promise<number> {
  // For demo, using a simple heuristic based on metadata consistency
  // In production, would use Azure's Video Analyzer or similar
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();
    
    let manipulationScore = 0;
    
    // Check for missing or inconsistent metadata
    if (!result.tags.Make || !result.tags.Model) manipulationScore += 0.2;
    if (!result.tags.Software) manipulationScore += 0.1;
    if (!result.tags.DateTimeOriginal) manipulationScore += 0.1;
    
    // Check for unusual software tags
    if (result.tags.Software?.toLowerCase().includes('photoshop')) {
      manipulationScore += 0.3;
    }
    
    return manipulationScore;
  } catch {
    return 0.5; // Default score if we can't analyze
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

    // Download image
    const imageBuffer = await downloadImage(url);

    // Parallel processing
    const [
      metadata,
      visionAnalysis,
      manipulationScore
    ] = await Promise.all([
      extractExifData(imageBuffer),
      analyzeWithGoogleVision(imageBuffer, !process.env.GOOGLE_VISION_API_KEY),
      checkDeepfake(imageBuffer)
    ]);

    // Analyze if image content matches claim
    const detectedContent = [
      ...visionAnalysis.detectedObjects,
      ...visionAnalysis.labelAnnotations.map((label: { description: string }) => label.description)
    ].join(', ');

    // Use GPT-4 to analyze if image content matches claim
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    let analysis;
    if (!OPENAI_API_KEY) {
      console.log('Using mock GPT response for development');
      analysis = {
        isValid: false,
        confidence: 0.95,
        reasoning: 'Mock response: The medical images from WHO show standard COVID-19 prevention measures and treatments. There is no indication that drinking water alone can cure COVID-19.'
      };
    } else {
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
            content: 'You are an image fact-checking AI. Analyze if the detected content supports or refutes the given claim.'
          },
          {
            role: 'user',
            content: `Detected in image: ${detectedContent}\nOCR Text: ${visionAnalysis.detectedText}\n\nClaim: ${claim}\n\nDoes this content support or refute the claim? Respond with JSON containing: isValid (boolean), confidence (0-1), and reasoning (string).`
          }
        ]
      })
    });

      const gptData = await gptResponse.json();
      analysis = JSON.parse(gptData.choices[0].message.content);
    }

    const result: ImageValidationResult = {
      isValid: analysis.isValid,
      confidence: analysis.confidence * (1 - manipulationScore), // Adjust confidence based on manipulation score
      reasoning: analysis.reasoning,
      metadata: metadata,
      manipulationScore,
      reverseSearchResults: {
        earliestAppearance: visionAnalysis.webDetection?.pagesWithMatchingImages?.[0]?.pageUrl,
        similarImages: visionAnalysis.webDetection?.partialMatchingImages?.length || 0,
        possibleSources: visionAnalysis.webDetection?.pagesWithMatchingImages?.map((page: { pageUrl: string }) => page.pageUrl) || []
      },
      visionAnalysis: {
        detectedObjects: visionAnalysis.detectedObjects,
        detectedText: visionAnalysis.detectedText,
        safeSearchAnnotation: visionAnalysis.safeSearchAnnotation,
        labelAnnotations: visionAnalysis.labelAnnotations
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Image validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate image' },
      { status: 500 }
    );
  }
}
