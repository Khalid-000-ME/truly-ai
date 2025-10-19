'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

// Load Google Fonts
const loadGoogleFonts = () => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
  error?: string;
}

interface VerificationSource {
  title: string;
  url: string;
  source: string;
  credibilityScore: number;
  category: string;
}

interface FactCheckResult {
  claim: string;
  verificationSources: (string | VerificationSource)[];
  factCheckConclusion: string;
  credibilityScore: number;
  supportingEvidence: any[];
  contradictingEvidence: any[];
}

interface FinalAnalysisResults {
  success: boolean;
  sessionId: string;
  totalClaims: number;
  processedClaims: number;
  factCheckResults: FactCheckResult[];
  processingQueue: any[];
}

export default function TruthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'initial', name: 'Initial Analysis', status: 'pending' },
    { id: 'claims', name: 'Claims Extraction', status: 'pending' },
    { id: 'finalization', name: 'Claim Finalization', status: 'pending' },
    { id: 'verification', name: 'Source Verification', status: 'pending' },
    { id: 'factcheck', name: 'Fact Checking', status: 'pending' }
  ]);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResults, setFinalResults] = useState<FinalAnalysisResults | null>(null);
  const [processingProgress, setProcessingProgress] = useState<any[]>([]);
  const hasStartedRef = useRef(false);

  // Cleanup function to delete uploaded files
  const cleanupUploadedFiles = async () => {
    try {
      logger.log('TRUTH_PAGE', 'Starting cleanup of uploaded files...');
      
      const cleanupResponse = await fetch('/api/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const cleanupResult = await cleanupResponse.json();
      
      if (cleanupResult.success) {
        logger.log('TRUTH_PAGE', `✅ Cleanup completed: ${cleanupResult.filesDeleted} files deleted`);
        if (cleanupResult.errors && cleanupResult.errors.length > 0) {
          logger.log('TRUTH_PAGE', `⚠️ Cleanup warnings: ${cleanupResult.errors.join(', ')}`);
        }
      } else {
        logger.error('TRUTH_PAGE', `❌ Cleanup failed: ${cleanupResult.error}`);
      }
    } catch (error) {
      logger.error('TRUTH_PAGE', 'Cleanup error:', error);
    }
  };

  // Load fonts on component mount
  useEffect(() => {
    loadGoogleFonts();
  }, []);

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], data?: any, error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status, 
            data,
            error,
            completedAt: status === 'completed' ? Date.now() : undefined
          }
        : step
    ));
  };

  const startFactCheckingPipeline = async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setIsProcessing(true);
    
    try {
      // Get session ID from URL params
      const sessionId = searchParams.get('sessionId');
      
      if (!sessionId) {
        throw new Error('Missing session ID');
      }

      // Get analysis results from sessionStorage
      const analysisResultsStr = sessionStorage.getItem('trulyai_analysis_results');
      if (!analysisResultsStr) {
        throw new Error('Missing analysis results in session storage');
      }

      const parsedResults = JSON.parse(analysisResultsStr);
      
      logger.log('TRUTH_PAGE', `Starting fact-checking pipeline for session: ${sessionId}`);
      
      // Step 1: Mark initial analysis as completed (already done)
      updateStepStatus('initial', 'completed', parsedResults);
      setCurrentStep(1);
      
      // Step 2: Mark claims extraction as completed (already done)
      updateStepStatus('claims', 'completed', { 
        claimsCount: parsedResults.postClaims?.length || 0 
      });
      setCurrentStep(2);
      
      // Step 3: Start final analysis pipeline
      updateStepStatus('finalization', 'processing');
      setCurrentStep(3);
      
      const finalAnalysisResponse = await fetch('/api/analyze_handler/final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          analysisResults: parsedResults
        })
      });

      if (!finalAnalysisResponse.ok) {
        throw new Error(`Final analysis failed: ${finalAnalysisResponse.status}`);
      }

      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/analyze_handler/final?sessionId=${sessionId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setProcessingProgress(progressData.queueItems || []);
            
            // Update step status based on latest progress
            const latestItem = progressData.queueItems?.[0];
            if (latestItem) {
              if (latestItem.step === 'sources_found') {
                updateStepStatus('verification', 'processing');
                setCurrentStep(4);
              } else if (latestItem.step === 'fact_check_complete') {
                updateStepStatus('factcheck', 'processing');
                setCurrentStep(5);
              }
            }
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }, 2000);

      const finalResult = await finalAnalysisResponse.json();
      clearInterval(pollInterval);
      
      if (finalResult.success) {
        updateStepStatus('finalization', 'completed');
        updateStepStatus('verification', 'completed');
        updateStepStatus('factcheck', 'completed');
        setFinalResults(finalResult);
        
        logger.log('TRUTH_PAGE', `Fact-checking complete: ${finalResult.processedClaims} claims processed`);
        
        // Clean up uploaded files after successful analysis
        cleanupUploadedFiles();
      } else {
        throw new Error(finalResult.error || 'Final analysis failed');
      }

    } catch (error) {
      console.error('Fact-checking pipeline error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Mark current step as error
      const currentStepId = steps[currentStep]?.id;
      if (currentStepId) {
        updateStepStatus(currentStepId, 'error', null, errorMessage);
      }

      // If it's a session data error, show a helpful message
      if (errorMessage.includes('session') || errorMessage.includes('Missing')) {
        updateStepStatus('initial', 'error', null, 'Session data missing. Please restart the analysis from the beginning.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    startFactCheckingPipeline();
  }, []);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getCredibilityColor = (score: number): string => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCredibilityBg = (score: number): string => {
    if (score >= 70) return 'bg-green-500/10 border-green-500/20';
    if (score >= 40) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
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

      {/* Floating Elements for Visual Interest */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-amber-300 rounded-full opacity-60 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-1 h-1 bg-amber-400 rounded-full opacity-40 animate-pulse delay-1000"></div>
      <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-amber-200 rounded-full opacity-50 animate-pulse delay-2000"></div>
      <div className="absolute bottom-20 right-1/3 w-1 h-1 bg-amber-300 rounded-full opacity-30 animate-pulse delay-3000"></div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen px-6 py-12">
        <div className="w-full max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-instrument-serif text-4xl md:text-5xl lg:text-6xl font-light text-gray-800 mb-4 tracking-wide leading-tight">
              Truth analysis
            </h1>
            <h2 className="font-instrument-serif text-2xl md:text-3xl lg:text-4xl font-extralight text-gray-700 tracking-wide">
              Analysing and fact-checking the claims
            </h2>
          </div>

          {/* Processing Steps */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Processing Pipeline</h3>
              
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center p-4 rounded-xl border transition-all duration-300 ${
                      step.status === 'completed' ? 'bg-green-50 border-green-200' :
                      step.status === 'processing' ? 'bg-blue-50 border-blue-200' :
                      step.status === 'error' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0 mr-4">
                      {step.status === 'completed' ? (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">✓</span>
                        </div>
                      ) : step.status === 'processing' ? (
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : step.status === 'error' ? (
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">✗</span>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{step.name}</h4>
                      {step.status === 'processing' && (
                        <p className="text-sm text-blue-600 mt-1">Processing...</p>
                      )}
                      {step.status === 'completed' && step.data && (
                        <p className="text-sm text-green-600 mt-1">
                          {step.id === 'claims' && `${step.data.claimsCount} claims extracted`}
                          {step.id === 'initial' && 'Analysis completed successfully'}
                          {step.id === 'finalization' && 'Claims finalized and ready for verification'}
                          {step.id === 'verification' && 'Sources verified and analyzed'}
                          {step.id === 'factcheck' && 'Fact-checking completed'}
                        </p>
                      )}
                      {step.status === 'error' && (
                        <p className="text-sm text-red-600 mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Processing Updates */}
          {processingProgress.length > 0 && (
            <div className="mb-12">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-6">🔄 Live Processing Updates</h3>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {processingProgress.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            item.status === 'completed' ? 'bg-green-500' :
                            item.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                            item.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                          }`}></span>
                          <span className="text-sm font-medium text-gray-700">
                            {item.step === 'processing_claim' && `Processing claim: ${item.claimTitle}`}
                            {item.step === 'claim_finalized' && `Claim finalized`}
                            {item.step === 'sources_found' && `Found ${item.sourcesCount} verification sources`}
                            {item.step === 'evidence_analyzed' && `Analyzed ${item.evidenceCount} pieces of evidence`}
                            {item.step === 'fact_check_complete' && `Fact-check complete (Score: ${item.credibilityScore})`}
                            {item.step === 'error' && `Error: ${item.error}`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Final Results */}
          {finalResults && finalResults.factCheckResults && (
            <div className="space-y-8">
              {/* Results Header */}
              <div className="text-center mb-8">
                <h2 className="font-instrument-serif text-3xl md:text-4xl font-light text-gray-800 mb-4">
                  🎯 Fact-Check Results
                </h2>
                <p className="text-gray-600">
                  Comprehensive verification of {finalResults.totalClaims} claims with {finalResults.processedClaims} successfully processed
                </p>
              </div>

              {/* Results Stack (newest on top) */}
              <div className="space-y-6">
                {[...finalResults.factCheckResults].reverse().map((result, index) => (
                  <div
                    key={index}
                    className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100 p-8 shadow-lg"
                  >
                    {/* Credibility Score Header */}
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border mb-6 ${getCredibilityBg(result.credibilityScore)}`}>
                      <span className={`text-2xl font-bold ${getCredibilityColor(result.credibilityScore)}`}>
                        {result.credibilityScore}%
                      </span>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Credibility Score
                      </span>
                    </div>

                    {/* Claim */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Claim</h3>
                      <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border">
                        {result.claim}
                      </p>
                    </div>

                    {/* Fact-Check Conclusion */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">🔍 Fact-Check Conclusion</h3>
                      <div className={`p-4 rounded-lg border ${getCredibilityBg(result.credibilityScore)}`}>
                        <p className="text-gray-800 font-medium">
                          {result.factCheckConclusion}
                        </p>
                      </div>
                    </div>

                    {/* Verification Sources */}
                    {result.verificationSources.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          🔗 Verification Sources ({result.verificationSources.length})
                        </h3>
                        <div className="space-y-2">
                          {result.verificationSources.map((source, sourceIndex) => {
                            // Handle both string URLs and source objects
                            const isStringSource = typeof source === 'string';
                            const sourceUrl = isStringSource ? source : (source as VerificationSource).url;
                            const sourceTitle = isStringSource ? source : (source as VerificationSource).title;
                            const sourceName = isStringSource ? 'Source' : (source as VerificationSource).source;
                            const credibilityScore = isStringSource ? null : (source as VerificationSource).credibilityScore;
                            
                            return (
                              <a
                                key={sourceIndex}
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                      {sourceTitle}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {sourceName} {credibilityScore && `• Credibility: ${credibilityScore}%`}
                                    </div>
                                  </div>
                                  {credibilityScore && (
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                                      credibilityScore >= 90 ? 'bg-green-100 text-green-700' :
                                      credibilityScore >= 80 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {credibilityScore}%
                                    </div>
                                  )}
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Supporting Evidence */}
                    {result.supportingEvidence.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          ✅ Supporting Evidence ({result.supportingEvidence.length})
                        </h3>
                        <div className="space-y-3">
                          {result.supportingEvidence.map((evidence, evidenceIndex) => (
                            <div key={evidenceIndex} className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-green-700">
                                  {evidence.type === 'image' ? '🖼️' : evidence.type === 'video' ? '🎥' : '📄'} {evidence.type}
                                </span>
                                <span className="text-xs text-green-600">
                                  Credibility: {evidence.credibility}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">
                                {evidence.analysis.substring(0, 200)}
                                {evidence.analysis.length > 200 && '...'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contradicting Evidence */}
                    {result.contradictingEvidence.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          ❌ Contradicting Evidence ({result.contradictingEvidence.length})
                        </h3>
                        <div className="space-y-3">
                          {result.contradictingEvidence.map((evidence, evidenceIndex) => (
                            <div key={evidenceIndex} className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-red-700">
                                  {evidence.type === 'image' ? '🖼️' : evidence.type === 'video' ? '🎥' : '📄'} {evidence.type}
                                </span>
                                <span className="text-xs text-red-600">
                                  Credibility: {evidence.credibility}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">
                                {evidence.analysis.substring(0, 200)}
                                {evidence.analysis.length > 200 && '...'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="text-center mt-12 space-y-4">
                <button
                  onClick={() => router.push('/ask')}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:from-amber-500 hover:to-amber-600 transform hover:scale-105 transition-all duration-200"
                >
                  <span>🔍 Analyze Another Query</span>
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {steps.some(step => step.status === 'error') && !finalResults && (
            <div className="text-center mt-12">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-6">
                <h3 className="text-xl font-semibold text-red-800 mb-4">⚠️ Processing Error</h3>
                <p className="text-red-700 mb-6">
                  {steps.find(step => step.status === 'error')?.error || 'An error occurred during fact-checking.'}
                </p>
                <div className="space-x-4">
                  <button
                    onClick={() => router.push('/ask')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:from-amber-500 hover:to-amber-600 transform hover:scale-105 transition-all duration-200"
                  >
                    <span>🔍 Start New Analysis</span>
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:bg-gray-600 transform hover:scale-105 transition-all duration-200"
                  >
                    <span>← Go Back</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && !finalResults && (
            <div className="fixed bottom-6 right-6 bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Processing fact-check...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple logger utility
const logger = {
  log: (tag: string, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [${tag}] ${message}`);
    if (data) {
      console.log(`[${timestamp}] [JSON] [${tag}] ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
    }
  },
  error: (tag: string, message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${tag}] ${message}`);
    if (error) {
      console.error(`[${timestamp}] [ERROR] [${tag}]`, error);
    }
  }
};