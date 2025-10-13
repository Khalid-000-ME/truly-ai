'use client';

interface LoadingOverlayProps {
  currentStep: string;
}

export function LoadingOverlay({ currentStep }: LoadingOverlayProps) {
  const steps = {
    segregate: {
      emoji: '🔍',
      text: 'Analyzing content and finding media...',
      animation: 'scanning'
    },
    validate: {
      emoji: '⚡',
      text: 'Validating each source...',
      animation: 'processing'
    },
    aggregate: {
      emoji: '🧠',
      text: 'Aggregating results...',
      animation: 'combining'
    }
  };

  const currentStepInfo = steps[currentStep as keyof typeof steps];

  return (
    <div className="my-8 p-6 border-2 border-black bg-white">
      <div className="flex flex-col items-center space-y-4">
        <div className={`text-4xl ${currentStepInfo?.animation}`}>
          {currentStepInfo?.emoji || '⏳'}
        </div>
        <p className="font-bold text-center">
          {currentStepInfo?.text || 'Processing...'}
        </p>
        <div className="w-full h-2 bg-gray-200">
          <div className="h-full bg-black loading-bar"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scanning {
          0% { transform: translateX(-20px); }
          100% { transform: translateX(20px); }
        }

        @keyframes processing {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        @keyframes combining {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .scanning {
          animation: scanning 1s ease-in-out infinite alternate;
        }

        .processing {
          animation: processing 1s ease-in-out infinite;
        }

        .combining {
          animation: combining 2s linear infinite;
        }

        .loading-bar {
          width: 30%;
          animation: loading 2s ease-in-out infinite;
        }

        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
