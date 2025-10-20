'use client';

import React from 'react';
import Image from 'next/image';
import Button from '@/components/button';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    console.log('🚀 Start Fact-Checking button clicked');
    try {
      router.push('/ask');
      console.log('✅ Navigation to /ask initiated');
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* Hero Background with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="relative w-full h-full">
          <Image
            src="/hero.png"
            alt="Truth illumination"
            fill
            className="object-cover object-top"
            priority
          />
          {/* Gradient overlay from hero to white */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-5xl mx-auto text-center">
          
          {/* Logo */}
          <div className="mb-12">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <Image
                src="/logo.png"
                alt="TrulyAI Logo"
                fill
                className="object-cover rounded-full"
                priority
              />
            </div>
          </div>

          {/* Hero Text */}
          <div className="mb-16">
            <h1 className="font-instrument-serif text-6xl md:text-7xl lg:text-8xl font-light text-gray-800 mb-6 tracking-wide leading-tight">
              TrulyAI
            </h1>
            <h2 className="font-instrument-serif text-3xl md:text-4xl lg:text-5xl font-extralight text-gray-700 mb-8 tracking-wide">
              Where Truth Meets Technology
            </h2>
            
            {/* Catchy taglines */}
            <div className="max-w-4xl mx-auto space-y-4 mb-12">
              <p className="text-xl md:text-2xl text-gray-600 font-light leading-relaxed">
                Combat misinformation with AI-powered multimodal analysis
              </p>
              <p className="text-lg md:text-xl text-gray-500 font-light">
                Verify claims through comprehensive analysis of text, images, videos, and audio
              </p>
              <p className="text-base md:text-lg text-gray-400 italic">
                "Your journey to truth starts with a single question"
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="font-semibold text-gray-800 mb-2">Multimodal Analysis</h3>
                <p className="text-sm text-gray-600">Analyze text, images, videos, and audio with advanced AI models</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-800 mb-2">Credibility Scoring</h3>
                <p className="text-sm text-gray-600">Get transparent 0-100% credibility ratings with supporting evidence</p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="font-semibold text-gray-800 mb-2">Authentic Sources</h3>
                <p className="text-sm text-gray-600">Cross-reference with 19+ curated news sources and fact-checkers</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mb-12">
            <Button
              onClick={handleGetStarted}
              size="md"
              className="mx-auto transform hover:scale-105 transition-all duration-300 rounded-full"
              type="button"
            >
              Start Fact-Checking
            </Button>
            
            {/* Debug info - remove in production */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              <p>Debug: Button should navigate to /ask</p>
              <p>Check browser console for navigation logs</p>
            </div>
          </div>

          {/* Subtitle */}
          <div className="max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 leading-relaxed">
              Powered by AWS Bedrock Nova models, Google Gemini AI, and advanced multimodal analysis
              <br />
              <span className="text-gray-400">
                Join the fight against misinformation with cutting-edge AI technology
              </span>
            </p>
          </div>

          {/* Stats or badges */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Real-time Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Multi-platform Support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>Evidence-based Results</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              <span>Transparent Scoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements for Visual Interest */}
      <div className="absolute top-20 left-10 w-3 h-3 bg-amber-300 rounded-full opacity-60 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-2 h-2 bg-blue-400 rounded-full opacity-40 animate-pulse delay-1000"></div>
      <div className="absolute bottom-32 left-1/4 w-2.5 h-2.5 bg-green-300 rounded-full opacity-50 animate-pulse delay-2000"></div>
      <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-purple-300 rounded-full opacity-30 animate-pulse delay-3000"></div>
      <div className="absolute top-1/3 left-20 w-1.5 h-1.5 bg-pink-300 rounded-full opacity-40 animate-pulse delay-4000"></div>
      <div className="absolute top-2/3 right-16 w-1 h-1 bg-indigo-300 rounded-full opacity-50 animate-pulse delay-5000"></div>
    </div>
  );
}
