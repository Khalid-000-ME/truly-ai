export function calculateCredibilityScore(analysis: string, claims: string): number {
  const positiveIndicators = [
    'verified', 'credible', 'accurate', 'supported', 'evidence',
    'reliable', 'trustworthy', 'confirmed', 'factual'
  ];
  const negativeIndicators = [
    'unverified', 'questionable', 'inaccurate', 'misleading', 'false',
    'unreliable', 'biased', 'unsupported', 'speculative'
  ];

  let score = 70;
  const text = (analysis + claims).toLowerCase();

  positiveIndicators.forEach(indicator => {
    if (text.includes(indicator)) score += 5;
  });

  negativeIndicators.forEach(indicator => {
    if (text.includes(indicator)) score -= 5;
  });

  return Math.max(0, Math.min(100, score));
}

export function calculateBiasScore(sentiment: string): number {
  const text = sentiment.toLowerCase();
  const biasIndicators = [
    'bias', 'slant', 'prejudice', 'partisan', 'one-sided',
    'unfair', 'subjective', 'propaganda', 'loaded language'
  ];

  let score = 0;
  biasIndicators.forEach(indicator => {
    if (text.includes(indicator)) score += 10;
  });

  return Math.min(100, score);
}

export function determineVerdict(credibilityScore: number, biasScore: number): string {
  const overallScore = (credibilityScore + (100 - biasScore)) / 2;
  if (overallScore >= 80) return 'True';
  if (overallScore >= 60) return 'Partially True';
  if (overallScore >= 40) return 'Unverified';
  return 'False';
}

export function determineSentiment(sentiment: string): string {
  const text = sentiment.toLowerCase();
  if (text.includes('positive')) return 'positive';
  if (text.includes('negative')) return 'negative';
  return 'neutral';
}

export function calculateSentimentScore(sentiment: string): number {
  const text = sentiment.toLowerCase();
  if (text.includes('strongly positive')) return 90;
  if (text.includes('positive')) return 75;
  if (text.includes('strongly negative')) return 10;
  if (text.includes('negative')) return 25;
  return 50;
}

export function extractBias(sentiment: string): { type: string; score: number } | undefined {
  const text = sentiment.toLowerCase();
  const biasTypes = [
    'political', 'cultural', 'gender', 'racial',
    'religious', 'ideological', 'commercial'
  ];

  for (const type of biasTypes) {
    if (text.includes(type)) {
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
        score: calculateBiasScore(sentiment)
      };
    }
  }

  return undefined;
}

export function extractEvidence(claims: string): Array<{
  type: 'supporting' | 'refuting';
  content: string;
  source: { url: string; title: string; credibility: number };
  confidence: number;
}> {
  const lines = claims.split('\n');
  const evidence: Array<{
    type: 'supporting' | 'refuting';
    content: string;
    source: { url: string; title: string; credibility: number };
    confidence: number;
  }> = [];

  for (const line of lines) {
    if (line.toLowerCase().includes('claim:')) {
      const lower = line.toLowerCase();
      const isSupporting = !lower.includes('false') &&
                         !lower.includes('incorrect') &&
                         !lower.includes('misleading');

      evidence.push({
        type: isSupporting ? 'supporting' : 'refuting',
        content: line.replace(/^claim:\s*/i, ''),
        source: {
          url: 'https://example.com/verification',
          title: 'Verification Source',
          credibility: 0.85
        },
        confidence: Math.random() * 0.3 + 0.7
      });
    }
  }

  return evidence;
}
