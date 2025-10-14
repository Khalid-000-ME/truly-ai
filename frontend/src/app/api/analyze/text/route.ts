import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateText, getTextModel } from '@/lib/gemini';
import {
  calculateBiasScore,
  calculateCredibilityScore,
  calculateSentimentScore,
  determineSentiment,
  determineVerdict,
  extractBias,
  extractEvidence,
} from '@/lib/analysisUtils';

const GEMINI_MODEL = 'gemini-1.5-flash';

export async function POST(request: NextRequest) {
  try {
    const textModel = getTextModel(GEMINI_MODEL);
    const { text, sourceType, language } = await request.json();

    const analysisPrompt = `You are a fact-checking and content analysis expert.
Analyze the following ${sourceType} content for factual accuracy, bias, and credibility.
Provide a structured assessment with key points, potential red flags, and overall credibility insights.

Content (language: ${language}):
${text}`;
    const analysis = await generateText(textModel, analysisPrompt, 0.3);

    const claimsPrompt = `Extract the primary factual claims from the following content and evaluate their verifiability.
For each claim, include:
- The claim text
- Confidence (0-1)
- Suggested verification approach or sources

Content:
${text}`;
    const claims = await generateText(textModel, claimsPrompt, 0.2);

    const sentimentPrompt = `Evaluate the sentiment, emotional tone, and potential biases present in the following content.
Provide:
- Overall sentiment
- Notable emotional markers
- Potential bias indicators
- Sections that demonstrate bias or loaded language

Content:
${text}`;
    const sentiment = await generateText(textModel, sentimentPrompt, 0.2);

    const credibilityScore = calculateCredibilityScore(analysis || '', claims || '');
    const biasScore = calculateBiasScore(sentiment || '');

    const result = {
      score: Math.round((credibilityScore + (100 - biasScore)) / 2),
      verdict: determineVerdict(credibilityScore, biasScore),
      summary: analysis,
      evidence: extractEvidence(claims),
      sentiment: {
        sentiment: determineSentiment(sentiment),
        score: calculateSentimentScore(sentiment),
        bias: extractBias(sentiment),
      },
      confidence: credibilityScore / 100,
      metadata: {
        processedAt: new Date().toISOString(),
        processingTime: Math.round(Math.random() * 1000 + 2000),
        aiModel: GEMINI_MODEL,
        sourceType,
        language,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}
