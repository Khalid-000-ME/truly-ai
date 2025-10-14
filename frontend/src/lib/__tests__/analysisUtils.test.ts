import { describe, expect, it } from 'vitest';
import {
  calculateBiasScore,
  calculateCredibilityScore,
  calculateSentimentScore,
  determineSentiment,
  determineVerdict,
  extractBias,
  extractEvidence,
} from '@/lib/analysisUtils';

describe('analysisUtils', () => {
  it('calculates higher credibility with positive indicators', () => {
    const score = calculateCredibilityScore('This claim was verified and confirmed', 'Claim: Accurate and supported');
    expect(score).toBeGreaterThan(70);
  });

  it('reduces credibility with negative indicators', () => {
    const score = calculateCredibilityScore('This claim is misleading and inaccurate', 'Claim: False information');
    expect(score).toBeLessThan(70);
  });

  it('determines verdict based on credibility and bias', () => {
    expect(determineVerdict(90, 10)).toBe('True');
    expect(determineVerdict(65, 40)).toBe('Partially True');
    expect(determineVerdict(45, 40)).toBe('Unverified');
    expect(determineVerdict(30, 80)).toBe('False');
  });

  it('detects sentiment from text', () => {
    expect(determineSentiment('This is a strongly positive message')).toBe('positive');
    expect(determineSentiment('This is a negative message')).toBe('negative');
    expect(determineSentiment('Neutral statement')).toBe('neutral');
  });

  it('calculates sentiment score tiers', () => {
    expect(calculateSentimentScore('strongly positive outlook')).toBe(90);
    expect(calculateSentimentScore('some positive vibes')).toBe(75);
    expect(calculateSentimentScore('negative bias present')).toBe(25);
    expect(calculateSentimentScore('balanced viewpoint')).toBe(50);
  });

  it('extracts bias information when keywords present', () => {
    const bias = extractBias('The article shows political bias in its tone');
    expect(bias).toEqual({ type: 'Political', score: calculateBiasScore('political bias') });
  });

  it('returns undefined bias when no keywords found', () => {
    expect(extractBias('Neutral content with no bias')).toBeUndefined();
  });

  it('extracts evidence entries from claims', () => {
    const evidence = extractEvidence('Claim: The statement is true\nClaim: This is false');
    expect(evidence).toHaveLength(2);
    expect(evidence[0].type).toBe('supporting');
    expect(evidence[1].type).toBe('refuting');
  });
});
