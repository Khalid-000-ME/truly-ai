'use client';

interface ResultsDisplayProps {
  results: {
    overallVerdict: 'TRUE' | 'FALSE' | 'PARTIALLY_TRUE' | 'UNVERIFIED';
    confidenceScore: number;
    reasoning: string;
    breakdown: {
      textSources: { supporting: number; refuting: number };
      images: { verified: number; manipulated: number };
      videos: { authentic: number; deepfake: number };
      audio: { authentic: number; cloned: number };
    };
  };
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const verdictStyles = {
    TRUE: { emoji: '✅', bgColor: 'bg-[#E8F5E9]' },
    FALSE: { emoji: '❌', bgColor: 'bg-[#FFEBEE]' },
    PARTIALLY_TRUE: { emoji: '⚠️', bgColor: 'bg-[#FFF3E0]' },
    UNVERIFIED: { emoji: '❓', bgColor: 'bg-[#F5F5F5]' }
  };

  const { emoji, bgColor } = verdictStyles[results.overallVerdict];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`p-6 border-2 border-black ${bgColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-4xl">{emoji}</div>
          <div className="text-right">
            <div className="text-2xl font-bold">{results.overallVerdict}</div>
            <div className="text-sm">
              Confidence: {(results.confidenceScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <p className="text-sm whitespace-pre-line">{results.reasoning}</p>
      </div>

      <div className="border-2 border-black">
        <div className="p-4 border-b-2 border-black bg-[#F5F5F5]">
          <h2 className="font-bold">Analysis Breakdown 📊</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-bold mb-2">Text Sources 📝</h3>
            <div className="flex justify-between text-sm">
              <span>Supporting: {results.breakdown.textSources.supporting}</span>
              <span>Refuting: {results.breakdown.textSources.refuting}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Images 🖼️</h3>
            <div className="flex justify-between text-sm">
              <span>Verified: {results.breakdown.images.verified}</span>
              <span>Manipulated: {results.breakdown.images.manipulated}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Videos 🎥</h3>
            <div className="flex justify-between text-sm">
              <span>Authentic: {results.breakdown.videos.authentic}</span>
              <span>Deepfake: {results.breakdown.videos.deepfake}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">Audio 🎵</h3>
            <div className="flex justify-between text-sm">
              <span>Authentic: {results.breakdown.audio.authentic}</span>
              <span>Cloned: {results.breakdown.audio.cloned}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
