"use client";

import { useState } from 'react';
import { ValidatorForm } from '../components/ValidatorForm';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { LoadingOverlay } from '../components/LoadingOverlay';

export default function Home() {
  const [isValidating, setIsValidating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const handleValidation = async (url: string, claim: string) => {
    setIsValidating(true);
    setResults(null);
    
    try {
      // Step 1: Segregate content
      setCurrentStep('segregate');
      const segregateResponse = await fetch('/api/segregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, claim })
      });
      const media = await segregateResponse.json();

      // Step 2: Validate each type
      setCurrentStep('validate');
      const validationPromises = [
        // Text validation
        ...media.text.map((url: string) =>
          fetch('/api/validate/text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, claim })
          })
        ),
        // Image validation
        ...media.images.map((url: string) =>
          fetch('/api/validate/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, claim })
          })
        ),
      ];

      await Promise.all(validationPromises);

      // Step 3: Aggregate results
      setCurrentStep('aggregate');
      const sources = [
        ...media.text.map((url: string) => ({ url, type: 'text' as const })),
        ...media.images.map((url: string) => ({ url, type: 'images' as const })),
        ...media.videos.map((url: string) => ({ url, type: 'videos' as const })),
        ...media.audio.map((url: string) => ({ url, type: 'audio' as const }))
      ];

      const aggregateResponse = await fetch('/api/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, claim })
      });

      const finalResults = await aggregateResponse.json();
      setResults(finalResults);
    } catch (error) {
      console.error('Validation error:', error);
      // Handle error state here
    } finally {
      setIsValidating(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8 border-b-2 border-black pb-2">TrulyAI 🔍</h1>
        
        <ValidatorForm 
          onSubmit={handleValidation} 
          isValidating={isValidating} 
        />

        {isValidating && (
          <LoadingOverlay 
            currentStep={currentStep} 
          />
        )}

        {results && (
          <ResultsDisplay 
            results={results} 
          />
        )}
      </main>
    </div>
  );
}
