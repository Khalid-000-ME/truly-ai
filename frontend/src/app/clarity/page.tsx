'use client';

import React, { useState, useEffect, useRef } from 'react';
import Galaxy from '@/components/Galaxy';

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
  error?: string;
}

interface SocialMediaPost {
  title: string;
  url: string;
  platform: 'reddit' | 'twitter' | 'other';
}

export default function ClarityPage() {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'handle',
      title: 'Processing Input',
      description: 'Analyzing text, extracting links, and processing uploaded files...',
      status: 'pending'
    },
    {
      id: 'initial',
      title: 'Multi-Modal Analysis',
      description: 'Performing comprehensive analysis to understand your query...',
      status: 'pending'
    },
    {
      id: 'search',
      title: 'Social Media Discovery',
      description: 'Finding related social media posts and discussions...',
      status: 'pending'
    }
  ]);

  const [socialMediaPosts, setSocialMediaPosts] = useState<SocialMediaPost[]>([]);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const hasProcessedRef = useRef(false);

  // Real processing pipeline
  useEffect(() => {
    const processRealData = async () => {
      // Prevent multiple simultaneous executions
      if (hasProcessedRef.current) {
        console.log('Processing already started, skipping...');
        return;
      }
      
      hasProcessedRef.current = true;
      // Get query data from sessionStorage
      const queryDataStr = typeof window !== 'undefined' ? sessionStorage.getItem('trulyai_query_data') : null;
      if (!queryDataStr) {
        console.error('No query data found');
        return;
      }

      const queryData = JSON.parse(queryDataStr);
      const startTime = Date.now();

      try {
        // Step 1: Call Handle API
        updateStepStatus('handle', 'processing');
        
        // Get the actual FormData from the global variable
        let formData = (window as any).trulyaiFormData;
        
        if (!formData) {
          // Fallback: create new FormData if not available
          formData = new FormData();
          formData.append('prompt', queryData.prompt);
          
          if (queryData.timeframeSelections && queryData.timeframeSelections.length > 0) {
            formData.append('timeframeSelections', JSON.stringify(queryData.timeframeSelections));
          }
          
          console.warn('FormData not found, created fallback without files');
        } else {
          console.log(`Using FormData with ${queryData.fileCount} files`);
          // Debug: Log FormData contents
          console.log('FormData keys:', Array.from(formData.keys()));
        }

        const handleResponse = await fetch('/api/handle', {
          method: 'POST',
          body: formData,
        });

        const handleResult = await handleResponse.json();
        
        if (handleResult.success) {
          updateStepStatus('handle', 'completed', {
            filesProcessed: handleResult.meta.filesProcessed,
            linksExtracted: handleResult.meta.linksExtracted,
            textRefined: true
          });
        } else {
          updateStepStatus('handle', 'error', null, handleResult.error);
          return;
        }

        // Step 2: Call Initial Analysis API
        updateStepStatus('initial', 'processing');
        
        const initialResponse = await fetch('/api/initial', {
          method: 'POST',
          body: formData,
        });

        const initialResult = await initialResponse.json();
        
        if (initialResult.success) {
          const data = initialResult.data;
          updateStepStatus('initial', 'completed', {
            mediaAnalyzed: data.processingStats.totalFiles,
            viralContentIdentified: !!data.viralContentAnalysis,
            confidenceScore: data.confidence
          });

          // Step 3: Process Social Media Search Results
          updateStepStatus('search', 'processing');
          
          if (data.socialMediaSearch && data.socialMediaSearch.success) {
            const posts: SocialMediaPost[] = data.socialMediaSearch.socialMediaResults.map((result: string) => {
              const [title, url] = result.split(': ');
              let platform: 'reddit' | 'twitter' | 'other' = 'other';
              
              if (url.includes('reddit.com')) platform = 'reddit';
              else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';
              
              return { title, url, platform };
            });

            setSocialMediaPosts(posts);
            updateStepStatus('search', 'completed', {
              postsFound: posts.length,
              platforms: [...new Set(posts.map(p => p.platform))]
            });
          } else {
            updateStepStatus('search', 'error', null, 'Social media search failed');
          }

          // Complete processing
          const totalTime = Date.now() - startTime;
          setIsProcessingComplete(true);
          setInitialData(data);
          setFinalResults({
            totalProcessingTime: `${(totalTime / 1000).toFixed(1)}s`,
            confidence: `${(data.confidence * 100).toFixed(1)}%`,
            socialMediaPosts: data.socialMediaSearch?.totalResults || 0,
            analysisComplete: true
          });

        } else {
          updateStepStatus('initial', 'error', null, initialResult.error);
        }

      } catch (error) {
        console.error('Processing error:', error);
        const currentStep = steps.find(s => s.status === 'processing');
        if (currentStep) {
          updateStepStatus(currentStep.id, 'error', null, error instanceof Error ? error.message : 'Unknown error');
        }
      } finally {
        // Clean up the global FormData
        if (typeof window !== 'undefined') {
          delete (window as any).trulyaiFormData;
        }
      }
    };

    processRealData();
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const continueAnalysis = async () => {
    if (!initialData || !initialData.socialMediaSearch?.socialMediaResults) {
      console.error('No initial data or social media results found');
      return;
    }

    try {
      // Reset processing state
      setIsProcessingComplete(false);
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));

      const sessionId = `session_${Date.now()}`;
      const socialMediaResults = initialData.socialMediaSearch.socialMediaResults;

      // Step 1: Segregate social media posts
      updateStepStatus('segregate', 'processing');
      
      const segregateResponse = await fetch('/api/segregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          socialMediaResults
        })
      });

      if (!segregateResponse.ok) {
        throw new Error(`Segregation failed: ${segregateResponse.statusText}`);
      }

      const segregateData = await segregateResponse.json();
      updateStepStatus('segregate', 'completed', {
        postsProcessed: segregateData.posts?.length || 0,
        mediaItems: segregateData.posts?.reduce((acc: number, post: any) => 
          acc + post.content.images.length + post.content.videos.length + post.content.audio.length, 0) || 0
      });

      // Step 2: Analyze segregated content
      updateStepStatus('analyze', 'processing');

      const analyzeResponse = await fetch('/api/analyze_handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          posts: segregateData.posts
        })
      });

      if (!analyzeResponse.ok) {
        throw new Error(`Analysis failed: ${analyzeResponse.statusText}`);
      }

      const analyzeData = await analyzeResponse.json();
      updateStepStatus('analyze', 'completed', {
        totalItems: analyzeData.totalItems,
        completed: analyzeData.completed,
        errors: analyzeData.errors
      });

      // Complete the full analysis
      setIsProcessingComplete(true);
      setFinalResults((prev: any) => ({
        ...prev,
        fullAnalysisComplete: true,
        segregatedPosts: segregateData.posts?.length || 0,
        analyzedItems: analyzeData.completed || 0,
        analysisErrors: analyzeData.errors || 0
      }));

    } catch (error) {
      console.error('Continue analysis error:', error);
      const currentStep = steps.find(s => s.status === 'processing');
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error', null, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const updateStepStatus = (stepId: string, status: 'pending' | 'processing' | 'completed' | 'error', result?: any, error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, data: result, error }
        : step
    ));
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'reddit':
        return '🔴';
      case 'twitter':
        return '🐦';
      default:
        return '🌐';
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Galaxy Background */}
      <div className="fixed inset-0 z-0">
        <Galaxy
          focal={[0.5, 0.5]}
          rotation={[1.0, 0.0]}
          starSpeed={0.3}
          density={0.8}
          hueShift={200}
          speed={0.5}
          mouseInteraction={true}
          glowIntensity={0.4}
          saturation={0.3}
          mouseRepulsion={true}
          twinkleIntensity={0.4}
          rotationSpeed={0.05}
          transparent={true}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-4xl mx-auto">
          
          {!isProcessingComplete ? (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 text-shadow-lg">
                  🔍 Discovering Truth
                </h1>
                <p className="text-xl text-gray-200 text-shadow">
                  Analyzing your content through our multi-modal AI pipeline
                </p>
              </div>

              {/* Processing Steps Container */}
              <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-8 mb-8">
                <div className="space-y-6">
                  {steps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-4">
                  {/* Step Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-2xl">
                    {step.status === 'processing' ? (
                      <div className="animate-spin text-blue-400">🔄</div>
                    ) : (
                      getStepIcon(step.status)
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {step.title}
                      </h3>
                      {step.status === 'processing' && (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">
                      {step.description}
                    </p>

                    {/* Step Data */}
                    {step.data && step.status === 'completed' && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <div className="text-xs text-green-300 space-y-1">
                          {step.id === 'handle' && (
                            <>
                              <div>📁 Files processed: {step.data.filesProcessed}</div>
                              <div>🔗 Links extracted: {step.data.linksExtracted}</div>
                              <div>✨ Text refined: {step.data.textRefined ? 'Yes' : 'No'}</div>
                            </>
                          )}
                          {step.id === 'initial' && (
                            <>
                              <div>🎥 Media files analyzed: {step.data.mediaAnalyzed}</div>
                              <div>🌟 Viral content identified: {step.data.viralContentIdentified ? 'Yes' : 'No'}</div>
                              <div>🎯 Confidence score: {(step.data.confidenceScore * 100).toFixed(1)}%</div>
                            </>
                          )}
                          {step.id === 'search' && (
                            <>
                              <div>📱 Social media posts found: {step.data.postsFound}</div>
                              <div>🌐 Platforms searched: {step.data.platforms.join(', ')}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {step.error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-300 text-xs">{step.error}</p>
                      </div>
                    )}
                  </div>

                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-6 mt-12 w-0.5 h-6 bg-gradient-to-b from-white/20 to-transparent"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Posts Preview */}
          {socialMediaPosts.length > 0 && (
            <div className="bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 p-8 mb-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                📱 Related Social Media Posts
                <span className="ml-3 text-sm font-normal text-gray-300">
                  ({socialMediaPosts.length} found)
                </span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {socialMediaPosts.map((post, index) => (
                  <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-all duration-300">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">
                        {getPlatformIcon(post.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                          {post.title}
                        </h4>
                        <a 
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs truncate block transition-colors"
                        >
                          {post.url}
                        </a>
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full capitalize">
                            {post.platform}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
        ) : (
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-md rounded-2xl border border-green-500/20 p-6 text-center">
                <div className="text-4xl mb-3">✅</div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Input Processing Done
                </h2>
                
                {finalResults && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-lg font-bold text-green-400">{finalResults.totalProcessingTime}</div>
                      <div className="text-xs text-gray-300">Time</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-lg font-bold text-blue-400">{finalResults.confidence}</div>
                      <div className="text-xs text-gray-300">Confidence</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-lg font-bold text-purple-400">{finalResults.socialMediaPosts}</div>
                      <div className="text-xs text-gray-300">Posts</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="text-lg font-bold text-yellow-400">
                        {finalResults.fullAnalysisComplete ? finalResults.analyzedItems || '✓' : '✓'}
                      </div>
                      <div className="text-xs text-gray-300">
                        {finalResults.fullAnalysisComplete ? 'Analyzed' : 'Complete'}
                      </div>
                    </div>
                  </div>
                )}

                {!finalResults?.fullAnalysisComplete && (
                  <button 
                    onClick={continueAnalysis}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full transition-all duration-300 transform hover:scale-105 text-sm"
                  >
                    Continue Analysis
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}