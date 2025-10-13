import { NextResponse } from 'next/server';

type Verdict = 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'UNVERIFIED';

interface ValidationSource {
  url: string;
  type: 'text' | 'images' | 'videos' | 'audio';
}

interface ValidationRequest {
  sources: ValidationSource[];
  claim: string;
}

interface AggregateResult {
  overallVerdict: Verdict;
  confidenceScore: number;
  breakdown: {
    textSources: {
      supporting: number;
      refuting: number;
      unverified: number;
      totalSources: number;
      averageCredibility: number;
    };
    images: {
      verified: number;
      manipulated: number;
      total: number;
      averageManipulationScore: number;
    };
    videos: {
      authentic: number;
      deepfake: number;
      total: number;
      averageDeepfakeScore: number;
    };
    audio: {
      authentic: number;
      cloned: number;
      edited: number;
      total: number;
    };
  };
  reasoning: string;
  sources: {
    text: Array<{
      url: string;
      credibility: number;
      isValid: boolean;
      confidence: number;
    }>;
    images: Array<{
      url: string;
      isValid: boolean;
      manipulationScore: number;
      confidence: number;
    }>;
    videos: Array<{
      url: string;
      isValid: boolean;
      isDeepfake: boolean;
      confidence: number;
    }>;
    audio: Array<{
      url: string;
      isValid: boolean;
      isCloned: boolean;
      hasEdits: boolean;
      confidence: number;
    }>;
  };
}

interface ValidationResult {
  url: string;
  isValid: boolean;
  confidence: number;
  sourceCredibility?: number;
  manipulationScore?: number;
  faceDetection?: {
    isDeepfake: boolean;
    deepfakeProbability: number;
  };
  voiceAnalysis?: {
    isCloned: boolean;
  };
  audioForensics?: {
    hasEdits: boolean;
  };
}

async function validateSource(url: string, claim: string, type: 'text' | 'images' | 'videos' | 'audio'): Promise<ValidationResult | null> {
  try {
    const response = await fetch(`http://localhost:3000/api/validate/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, claim })
    });

    if (!response.ok) {
      console.error(`Error validating ${type} source:`, await response.text());
      return null;
    }

    const result = await response.json();
    return { url, ...result };
  } catch (error) {
    console.error(`Error validating ${type} source:`, error);
    return null;
  }
}

function determineVerdict(breakdown: AggregateResult['breakdown']): {
  verdict: Verdict;
  confidence: number;
  reasoning: string;
} {
  const textTotal = breakdown.textSources.totalSources;
  const textSupporting = breakdown.textSources.supporting;
  const textRefuting = breakdown.textSources.refuting;
  
  const imageTotal = breakdown.images.total;
  const imageVerified = breakdown.images.verified;
  const imageManipulated = breakdown.images.manipulated;
  
  const videoTotal = breakdown.videos.total;
  const videoAuthentic = breakdown.videos.authentic;
  const videoDeepfake = breakdown.videos.deepfake;

  const audioTotal = breakdown.audio.total;
  const audioAuthentic = breakdown.audio.authentic;
  const audioCloned = breakdown.audio.cloned;
  
  // Calculate support percentages
  const textSupportPercent = textTotal > 0 ? textSupporting / textTotal : 0;
  const imageVerifiedPercent = imageTotal > 0 ? imageVerified / imageTotal : 0;
  const videoAuthenticPercent = videoTotal > 0 ? videoAuthentic / videoTotal : 0;
  const audioAuthenticPercent = audioTotal > 0 ? audioAuthentic / audioTotal : 0;

  // Calculate manipulation percentages
  const textRefutePercent = textTotal > 0 ? textRefuting / textTotal : 0;
  const imageManipulatedPercent = imageTotal > 0 ? imageManipulated / imageTotal : 0;
  const videoDeepfakePercent = videoTotal > 0 ? videoDeepfake / videoTotal : 0;
  const audioClonedPercent = audioTotal > 0 ? audioCloned / audioTotal : 0;

  // Weight factors for different media types
  const weights = {
    text: 0.4,
    image: 0.25,
    video: 0.2,
    audio: 0.15
  };

  // Calculate weighted support score with available sources
  let supportScore = 0;
  let totalWeight = 0;

  if (textTotal > 0) {
    supportScore += textSupportPercent * weights.text;
    totalWeight += weights.text;
  }
  if (imageTotal > 0) {
    supportScore += imageVerifiedPercent * weights.image;
    totalWeight += weights.image;
  }
  if (videoTotal > 0) {
    supportScore += videoAuthenticPercent * weights.video;
    totalWeight += weights.video;
  }
  if (audioTotal > 0) {
    supportScore += audioAuthenticPercent * weights.audio;
    totalWeight += weights.audio;
  }

  // Normalize support score by total weight
  supportScore = totalWeight > 0 ? supportScore / totalWeight : 0;

  // Calculate weighted manipulation score with available sources
  let manipulationScore = 0;
  totalWeight = 0;

  if (textTotal > 0) {
    manipulationScore += textRefutePercent * weights.text;
    totalWeight += weights.text;
  }
  if (imageTotal > 0) {
    manipulationScore += imageManipulatedPercent * weights.image;
    totalWeight += weights.image;
  }
  if (videoTotal > 0) {
    manipulationScore += videoDeepfakePercent * weights.video;
    totalWeight += weights.video;
  }
  if (audioTotal > 0) {
    manipulationScore += audioClonedPercent * weights.audio;
    totalWeight += weights.audio;
  }

  // Normalize manipulation score by total weight
  manipulationScore = totalWeight > 0 ? manipulationScore / totalWeight : 0;

  // Total number of sources
  const totalSources = textTotal + imageTotal + videoTotal + audioTotal;

  if (totalSources === 0) {
    return {
      verdict: 'UNVERIFIED',
      confidence: 0,
      reasoning: 'No sources were available for verification.'
    };
  }

  // Determine verdict based on scores
  if (supportScore > 0.7 && manipulationScore < 0.2) {
    return {
      verdict: 'TRUE',
      confidence: supportScore,
      reasoning: 'Strong support from multiple credible sources with minimal manipulation detected.'
    };
  } else if (manipulationScore > 0.7 && supportScore < 0.2) {
    return {
      verdict: 'FALSE',
      confidence: manipulationScore,
      reasoning: 'High level of manipulation detected and strong refutation from sources.'
    };
  } else if (supportScore > 0.3 && manipulationScore > 0.3) {
    return {
      verdict: 'PARTIALLY_TRUE',
      confidence: Math.max(supportScore, 1 - manipulationScore),
      reasoning: 'Mixed evidence found, with some supporting and some refuting elements.'
    };
  } else {
    return {
      verdict: 'UNVERIFIED',
      confidence: Math.min(supportScore, 1 - manipulationScore),
      reasoning: 'Insufficient evidence to make a definitive determination.'
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as ValidationRequest;

    if (!body.sources || !body.claim || !Array.isArray(body.sources)) {
      return NextResponse.json(
        { error: 'Valid sources array and claim are required' },
        { status: 400 }
      );
    }

    // Group sources by type
    const sourcesByType = body.sources.reduce((acc, source) => {
      if (!acc[source.type]) acc[source.type] = [];
      acc[source.type].push(source.url);
      return acc;
    }, {} as Record<'text' | 'images' | 'videos' | 'audio', string[]>);

    // Validate all sources in parallel
    const [textResults, imageResults, videoResults, audioResults] = await Promise.all([
      Promise.all((sourcesByType.text || []).map(url => validateSource(url, body.claim, 'text'))),
      Promise.all((sourcesByType.images || []).map(url => validateSource(url, body.claim, 'images'))),
      Promise.all((sourcesByType.videos || []).map(url => validateSource(url, body.claim, 'videos'))),
      Promise.all((sourcesByType.audio || []).map(url => validateSource(url, body.claim, 'audio')))
    ]);

    // Filter out null results and prepare source arrays with type assertions
    const validTextResults = textResults.filter(Boolean) as Array<{
      url: string;
      isValid: boolean;
      confidence: number;
      sourceCredibility: number;
    }>;

    const validImageResults = imageResults.filter(Boolean) as Array<{
      url: string;
      isValid: boolean;
      confidence: number;
      manipulationScore: number;
    }>;

    const validVideoResults = videoResults.filter(Boolean) as Array<{
      url: string;
      isValid: boolean;
      confidence: number;
      faceDetection: { isDeepfake: boolean; deepfakeProbability: number };
    }>;

    const validAudioResults = audioResults.filter(Boolean) as Array<{
      url: string;
      isValid: boolean;
      confidence: number;
      voiceAnalysis: { isCloned: boolean };
      audioForensics: { hasEdits: boolean };
    }>;

    // Calculate breakdowns
    const breakdown = {
      textSources: {
        supporting: validTextResults.filter(r => r.isValid).length,
        refuting: validTextResults.filter(r => !r.isValid).length,
        unverified: validTextResults.length - validTextResults.filter(r => typeof r.isValid === 'boolean').length,
        totalSources: validTextResults.length,
        averageCredibility: validTextResults.reduce((acc, r) => acc + (r.sourceCredibility || 0), 0) / validTextResults.length || 0
      },
      images: {
        verified: validImageResults.filter(r => r.isValid && r.manipulationScore < 0.3).length,
        manipulated: validImageResults.filter(r => r.manipulationScore >= 0.3).length,
        total: validImageResults.length,
        averageManipulationScore: validImageResults.reduce((acc, r) => acc + (r.manipulationScore || 0), 0) / validImageResults.length || 0
      },
      videos: {
        authentic: validVideoResults.filter(r => r.isValid && !r.faceDetection.isDeepfake).length,
        deepfake: validVideoResults.filter(r => r.faceDetection.isDeepfake).length,
        total: validVideoResults.length,
        averageDeepfakeScore: validVideoResults.reduce((acc, r) => acc + (r.faceDetection.deepfakeProbability || 0), 0) / validVideoResults.length || 0
      },
      audio: {
        authentic: validAudioResults.filter(r => r.isValid && !r.voiceAnalysis.isCloned && !r.audioForensics.hasEdits).length,
        cloned: validAudioResults.filter(r => r.voiceAnalysis.isCloned).length,
        edited: validAudioResults.filter(r => r.audioForensics.hasEdits).length,
        total: validAudioResults.length
      }
    };

    // Determine overall verdict
    const { verdict, confidence, reasoning } = determineVerdict(breakdown);

    const result: AggregateResult = {
      overallVerdict: verdict,
      confidenceScore: confidence,
      breakdown,
      reasoning,
      sources: {
        text: validTextResults.map(r => ({
          url: r.url,
          credibility: r.sourceCredibility ?? 0,
          isValid: r.isValid,
          confidence: r.confidence
        })),
        images: validImageResults.map(r => ({
          url: r.url,
          isValid: r.isValid,
          manipulationScore: r.manipulationScore ?? 0,
          confidence: r.confidence
        })),
        videos: validVideoResults.map(r => ({
          url: r.url,
          isValid: r.isValid,
          isDeepfake: r.faceDetection?.isDeepfake ?? false,
          confidence: r.confidence
        })),
        audio: validAudioResults.map(r => ({
          url: r.url,
          isValid: r.isValid,
          isCloned: r.voiceAnalysis?.isCloned ?? false,
          hasEdits: r.audioForensics?.hasEdits ?? false,
          confidence: r.confidence
        }))
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Aggregation error:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate validation results' },
      { status: 500 }
    );
  }
}
