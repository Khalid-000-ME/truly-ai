import { NextResponse } from 'next/server';

interface AudioValidationResult {
  isValid: boolean;
  confidence: number;
  reasoning: string;
  transcript: string;
  metadata: {
    duration: number;
    format: string;
    sampleRate?: number;
    channels?: number;
    dateCreated?: string;
  };
  voiceAnalysis: {
    isCloned: boolean;
    cloneProbability: number;
    speakers: Array<{
      id: string;
      timeRanges: Array<{
        start: number;
        end: number;
      }>;
    }>;
    emotions: Array<{
      emotion: string;
      confidence: number;
      timeRange: {
        start: number;
        end: number;
      };
    }>;
  };
  audioForensics: {
    hasEdits: boolean;
    noiseInconsistencies: Array<{
      timeRange: {
        start: number;
        end: number;
      };
      type: string;
      confidence: number;
    }>;
    splicePoints: number[];
  };
}

async function downloadAudio(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download audio');
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

  try {
    // Convert buffer to form data for OpenAI Whisper API
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mp3' });
    formData.append('file', blob, 'audio.mp3');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

async function analyzeVoiceCloning(audioBuffer: Buffer): Promise<{
  isCloned: boolean;
  cloneProbability: number;
  speakers: Array<{
    id: string;
    timeRanges: Array<{ start: number; end: number }>;
  }>;
}> {
  // For demo purposes, using a simplified voice analysis
  // In production, would use services like Resemble AI or Microsoft Speaker Recognition
  try {
    // Simulate voice analysis with random data
    const numSpeakers = Math.floor(Math.random() * 2) + 1; // 1 or 2 speakers
    const isCloned = numSpeakers === 1 ? Math.random() > 0.7 : false;
    
    const speakers = Array.from({ length: numSpeakers }, (_, i) => ({
      id: `speaker_${i + 1}`,
      timeRanges: [{
        start: 0,
        end: 30 // Assuming 30-second clip
      }]
    }));

    return {
      isCloned,
      cloneProbability: isCloned ? 0.8 : 0.2,
      speakers
    };
  } catch (error) {
    console.error('Error analyzing voice:', error);
    throw error;
  }
}

async function detectAudioEdits(audioBuffer: Buffer) {
  // For demo purposes, using simplified audio forensics
  // In production, would use professional audio forensics tools
  try {
    // Simulate finding edits with random data
    const hasEdits = Math.random() > 0.5;
    const numSplicePoints = hasEdits ? Math.floor(Math.random() * 3) + 1 : 0;
    
    return {
      hasEdits,
      noiseInconsistencies: hasEdits ? [{
        timeRange: {
          start: Math.random() * 15,
          end: Math.random() * 15 + 15
        },
        type: 'background_noise_mismatch',
        confidence: 0.85
      }] : [],
      splicePoints: Array.from({ length: numSplicePoints }, 
        () => Math.floor(Math.random() * 30))
    };
  } catch (error) {
    console.error('Error detecting audio edits:', error);
    throw error;
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

    // Download audio
    const audioBuffer = await downloadAudio(url);

    // Parallel processing
    const [
      transcript,
      voiceAnalysis,
      audioForensics
    ] = await Promise.all([
      transcribeAudio(audioBuffer),
      analyzeVoiceCloning(audioBuffer),
      detectAudioEdits(audioBuffer)
    ]);

    // Use GPT-4 to analyze if transcript matches claim
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');

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
            content: 'You are an audio fact-checking AI. Analyze if the transcript supports or refutes the given claim.'
          },
          {
            role: 'user',
            content: `Transcript: ${transcript}\n\nClaim: ${claim}\n\nDoes this content support or refute the claim? Consider also that ${voiceAnalysis.isCloned ? 'the voice appears to be cloned' : 'the voice appears authentic'} and the audio ${audioForensics.hasEdits ? 'shows signs of editing' : 'appears unedited'}. Respond with JSON containing: isValid (boolean), confidence (0-1), and reasoning (string).`
          }
        ]
      })
    });

    const gptData = await gptResponse.json();
    const analysis = JSON.parse(gptData.choices[0].message.content);

    // Calculate final confidence score
    const confidenceModifier = (
      (voiceAnalysis.isCloned ? 0.5 : 1) * // Reduce confidence if voice is cloned
      (audioForensics.hasEdits ? 0.7 : 1)   // Reduce confidence if audio is edited
    );

    const result: AudioValidationResult = {
      isValid: analysis.isValid,
      confidence: analysis.confidence * confidenceModifier,
      reasoning: analysis.reasoning,
      transcript,
      metadata: {
        duration: 30, // Placeholder
        format: 'mp3', // Placeholder
        sampleRate: 44100, // Placeholder
        channels: 2 // Placeholder
      },
      voiceAnalysis: {
        isCloned: voiceAnalysis.isCloned,
        cloneProbability: voiceAnalysis.cloneProbability,
        speakers: voiceAnalysis.speakers,
        emotions: [{
          emotion: 'neutral',
          confidence: 0.8,
          timeRange: { start: 0, end: 30 }
        }]
      },
      audioForensics
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Audio validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate audio' },
      { status: 500 }
    );
  }
}
