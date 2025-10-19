'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Squares from '@/components/Squares';

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  data?: any;
  error?: string;
}

interface MediaItem {
  filename: string;
  type: 'image' | 'video' | 'audio';
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

interface PostProgress {
  title: string;
  url: string;
  platform: string;
  mediaItems: MediaItem[];
  overallStatus: 'pending' | 'processing' | 'completed' | 'error';
}

function ProcessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');
  const query = searchParams.get('query');
  
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'initial', name: 'Initial Analysis', status: 'pending' },
    { id: 'search', name: 'Social Media Search', status: 'pending' },
    { id: 'segregate', name: 'Content Segregation', status: 'pending' },
    { id: 'analyze', name: 'Multimodal Analysis', status: 'pending' }
  ]);
  
  const [posts, setPosts] = useState<PostProgress[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const hasStartedRef = useRef(false);

  const updateStepStatus = (stepId: string, status: ProcessingStep['status'], data?: any, error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status, 
            data,
            error,
            startTime: status === 'processing' ? Date.now() : step.startTime,
            endTime: status === 'completed' || status === 'error' ? Date.now() : undefined
          }
        : step
    ));
  };

  const loadInitialData = async () => {
    updateStepStatus('initial', 'processing');
    
    try {
      // Get initial data from sessionStorage (passed from clarity page)
      const initialDataStr = typeof window !== 'undefined' ? sessionStorage.getItem('trulyai_initial_data') : null;
      
      if (!initialDataStr) {
        throw new Error('No initial data found. Please start from the clarity page.');
      }
      
      const initialData = JSON.parse(initialDataStr);
      updateStepStatus('initial', 'completed', initialData);
      
      // Move to search step
      setCurrentStep(1);
      return initialData;
    } catch (error) {
      updateStepStatus('initial', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const loadSearchData = async (initialData: any) => {
    updateStepStatus('search', 'processing');
    
    try {
      // Use the search data from initial analysis
      if (!initialData.socialMediaSearch || !initialData.socialMediaSearch.success) {
        throw new Error('No social media search results found in initial data');
      }
      
      const searchResult = {
        success: true,
        socialMediaResults: initialData.socialMediaSearch.socialMediaResults,
        totalResults: initialData.socialMediaSearch.totalResults
      };
      
      updateStepStatus('search', 'completed', searchResult);
      
      // Move to segregate step
      setCurrentStep(2);
      return searchResult;
    } catch (error) {
      updateStepStatus('search', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const runSegregation = async (searchData: any) => {
    updateStepStatus('segregate', 'processing');
    
    try {
      const response = await fetch('/api/segregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          socialMediaResults: searchData.socialMediaResults || []
        })
      });

      if (!response.ok) throw new Error(`Segregation failed: ${response.statusText}`);
      
      const result = await response.json();
      updateStepStatus('segregate', 'completed', result);
      
      // Initialize post progress tracking
      const postProgress: PostProgress[] = result.posts?.map((post: any) => ({
        title: post.title,
        url: post.url,
        platform: post.platform,
        overallStatus: 'pending' as const,
        mediaItems: [
          ...post.content.images.map((img: any) => ({
            filename: img.filename,
            type: 'image' as const,
            status: 'pending' as const
          })),
          ...post.content.videos.map((vid: any) => ({
            filename: vid.filename,
            type: 'video' as const,
            status: 'pending' as const
          })),
          ...post.content.audio.map((aud: any) => ({
            filename: aud.filename,
            type: 'audio' as const,
            status: 'pending' as const
          }))
        ]
      })) || [];
      
      setPosts(postProgress);
      
      // Move to analyze step
      setCurrentStep(3);
      return result;
    } catch (error) {
      updateStepStatus('segregate', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const runAnalysis = async (segregateData: any) => {
    updateStepStatus('analyze', 'processing');
    
    try {
      // Start analysis
      const response = await fetch('/api/analyze_handler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId,
          posts: segregateData.posts || []
        })
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);
      
      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/analyze_handler?sessionId=${sessionId}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            updatePostProgress(statusData.queueItems || []);
          }
        } catch (error) {
          console.error('Error polling analysis status:', error);
        }
      }, 1000);

      const result = await response.json();
      clearInterval(pollInterval);
      
      updateStepStatus('analyze', 'completed', result);
      
      // Store analysis results for display
      setAnalysisResults(result);
      
      // Final update of post progress
      if (result.postClaims) {
        setPosts(prev => prev.map(post => ({
          ...post,
          overallStatus: 'completed' as const,
          mediaItems: post.mediaItems.map(item => ({
            ...item,
            status: 'completed' as const
          }))
        })));

        // Auto-redirect to truth page for fact-checking after a brief delay
        setTimeout(() => {
          const sessionId = `fact_check_${Date.now()}`;
          // Store analysis results in sessionStorage instead of URL params to avoid 431 error
          sessionStorage.setItem('trulyai_analysis_results', JSON.stringify(result));
          router.push(`/truth?sessionId=${sessionId}`);
        }, 3000); // 3 second delay to show completion
      }
      
      return result;
    } catch (error) {
      updateStepStatus('analyze', 'error', null, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  };

  const updatePostProgress = (queueItems: any[]) => {
    setPosts(prev => prev.map(post => {
      const postItems = queueItems.filter(item => item.postTitle === post.title);
      
      const updatedMediaItems = post.mediaItems.map(mediaItem => {
        const queueItem = postItems.find(item => 
          item.filename === mediaItem.filename && 
          item.mediaType === mediaItem.type
        );
        
        if (queueItem) {
          return {
            ...mediaItem,
            status: queueItem.status === 'completed' ? 'completed' as const : 
                   queueItem.status === 'error' ? 'error' as const : 'processing' as const,
            result: queueItem.result,
            error: queueItem.error
          };
        }
        
        return mediaItem;
      });
      
      const overallStatus = updatedMediaItems.every(item => item.status === 'completed') ? 'completed' :
                          updatedMediaItems.some(item => item.status === 'error') ? 'error' :
                          updatedMediaItems.some(item => item.status === 'processing') ? 'processing' : 'pending';
      
      return {
        ...post,
        mediaItems: updatedMediaItems,
        overallStatus
      };
    }));
  };

  const runFullPipeline = async () => {
    if (hasStartedRef.current || isProcessing) return;
    
    hasStartedRef.current = true;
    setIsProcessing(true);
    
    try {
      const initialResult = await loadInitialData();
      const searchResult = await loadSearchData(initialResult);
      const segregateResult = await runSegregation(searchResult);
      await runAnalysis(segregateResult);
    } catch (error) {
      console.error('Pipeline failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (sessionId && query && !hasStartedRef.current) {
      runFullPipeline();
    }
  }, [sessionId, query]);

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'error': return '❌';
      default: return '⭕';
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      default: return '📄';
    }
  };

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return '';
    const duration = (endTime || Date.now()) - startTime;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Animated Squares Background */}
      <div className="absolute inset-0 z-0">
        <Squares
          direction="diagonal"
          speed={0.5}
          borderColor="rgba(255, 255, 255, 0.1)"
          squareSize={60}
          hoverFillColor="rgba(255, 255, 255, 0.05)"
          className="w-full h-full"
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 font-unbounded">
            Social media posts analysis
          </h1>
          <p className="text-gray-300 text-lg">
            Analyzing: <span className="text-blue-400 font-medium">{query}</span>
          </p>
          <p className="text-gray-400 text-sm">
            Session: {sessionId}
          </p>
        </div>

        {/* Pipeline Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 transition-all duration-300 ${
                currentStep === index ? 'ring-2 ring-blue-400/50 bg-blue-500/10' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">
                  {step.name}
                </h3>
                <span className="text-2xl">
                  {getStepIcon(step.status)}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className={`text-sm font-medium ${
                  step.status === 'completed' ? 'text-green-400' :
                  step.status === 'processing' ? 'text-blue-400' :
                  step.status === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                </div>
                
                {step.startTime && (
                  <div className="text-xs text-gray-400">
                    Duration: {formatDuration(step.startTime, step.endTime)}
                  </div>
                )}
                
                {step.error && (
                  <div className="text-xs text-red-400 mt-2">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Post Processing Details */}
        {posts.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4 font-unbounded">
              Content Analysis Progress
            </h2>
            
            {posts.map((post, postIndex) => (
              <div
                key={postIndex}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">
                      {post.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="bg-gray-700 px-2 py-1 rounded">
                        {post.platform}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        post.overallStatus === 'completed' ? 'bg-green-600 text-green-100' :
                        post.overallStatus === 'processing' ? 'bg-blue-600 text-blue-100' :
                        post.overallStatus === 'error' ? 'bg-red-600 text-red-100' :
                        'bg-gray-600 text-gray-100'
                      }`}>
                        {post.overallStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Media Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {post.mediaItems.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className={`bg-white/5 border border-white/10 rounded-lg p-4 transition-all duration-300 ${
                        item.status === 'processing' ? 'ring-1 ring-blue-400/50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {getMediaIcon(item.type)}
                          </span>
                          <span className="text-white text-sm font-medium">
                            {item.type}
                          </span>
                        </div>
                        <span className="text-lg">
                          {getStepIcon(item.status)}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-400 mb-2 truncate">
                        {item.filename}
                      </div>
                      
                      <div className={`text-xs font-medium ${
                        item.status === 'completed' ? 'text-green-400' :
                        item.status === 'processing' ? 'text-blue-400' :
                        item.status === 'error' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </div>
                      
                      {item.error && (
                        <div className="text-xs text-red-400 mt-1">
                          {item.error}
                        </div>
                      )}
                      
                      {item.result?.success && item.result.description && (
                        <div className="text-xs text-gray-300 mt-2 line-clamp-2">
                          {item.result.description.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResults && analysisResults.postClaims && (
          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4 font-unbounded">
              🎯 Analysis Results
            </h2>
            
            {/* Summary Statistics */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold text-white mb-4">📊 Analysis Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{analysisResults.totalItems}</div>
                  <div className="text-sm text-gray-300">Total Items</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{analysisResults.completed}</div>
                  <div className="text-sm text-gray-300">Completed</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{analysisResults.errors}</div>
                  <div className="text-sm text-gray-300">Errors</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{analysisResults.postClaims.length}</div>
                  <div className="text-sm text-gray-300">Claims</div>
                </div>
              </div>
            </div>

            {/* Detailed Claims Analysis */}
            {analysisResults.postClaims.map((claim: any, index: number) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">
                      {claim.postTitle}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                      <span className="bg-gray-700 px-2 py-1 rounded">
                        {claim.platform}
                      </span>
                      <span className={`px-2 py-1 rounded ${
                        claim.confidenceLevel === 'high' ? 'bg-green-600 text-green-100' :
                        claim.confidenceLevel === 'medium' ? 'bg-yellow-600 text-yellow-100' :
                        'bg-red-600 text-red-100'
                      }`}>
                        {claim.confidenceLevel} confidence
                      </span>
                      <span className="text-xs">
                        {claim.analysisCount.successful}/{claim.analysisCount.total} analyzed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Claim */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <h4 className="text-blue-300 font-medium mb-2">🎯 Overall Claim</h4>
                  <p className="text-gray-200 text-sm">{claim.overallClaim}</p>
                </div>

                {/* Evidence Analysis */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">🔍 Evidence Analysis</h4>
                  
                  {/* Images */}
                  {claim.evidenceAnalysis.images && claim.evidenceAnalysis.images.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <h5 className="text-gray-300 font-medium mb-2 flex items-center">
                        🖼️ Images ({claim.evidenceAnalysis.images.length})
                      </h5>
                      {claim.evidenceAnalysis.images.map((image: string, imgIndex: number) => (
                        <div key={imgIndex} className="text-gray-300 text-sm mb-2 last:mb-0">
                          <span className="text-gray-400">#{imgIndex + 1}:</span> {image.substring(0, 200)}
                          {image.length > 200 && <span className="text-gray-500">...</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Videos */}
                  {claim.evidenceAnalysis.videos && claim.evidenceAnalysis.videos.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <h5 className="text-gray-300 font-medium mb-2 flex items-center">
                        🎥 Videos ({claim.evidenceAnalysis.videos.length})
                      </h5>
                      {claim.evidenceAnalysis.videos.map((video: string, vidIndex: number) => (
                        <div key={vidIndex} className="text-gray-300 text-sm mb-2 last:mb-0">
                          <span className="text-gray-400">#{vidIndex + 1}:</span> {video.substring(0, 200)}
                          {video.length > 200 && <span className="text-gray-500">...</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audio */}
                  {claim.evidenceAnalysis.audio && claim.evidenceAnalysis.audio.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <h5 className="text-gray-300 font-medium mb-2 flex items-center">
                        🎵 Audio ({claim.evidenceAnalysis.audio.length})
                      </h5>
                      {claim.evidenceAnalysis.audio.map((audio: any, audIndex: number) => (
                        <div key={audIndex} className="text-gray-300 text-sm mb-2 last:mb-0">
                          <span className="text-gray-400">#{audIndex + 1}:</span> 
                          {typeof audio === 'string' ? audio.substring(0, 200) : 
                           audio.text ? audio.text.substring(0, 200) : 'Audio analysis available'}
                          {((typeof audio === 'string' ? audio : audio.text || '').length > 200) && 
                           <span className="text-gray-500">...</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post URL */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <a 
                    href={claim.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    🔗 View Original Post
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Fact-Check Button */}
        {analysisResults && analysisResults.postClaims && (
          <div className="text-center mt-12">
            <button
              onClick={() => {
                const sessionId = `fact_check_${Date.now()}`;
                // Store analysis results in sessionStorage instead of URL params to avoid 431 error
                sessionStorage.setItem('trulyai_analysis_results', JSON.stringify(analysisResults));
                router.push(`/truth?sessionId=${sessionId}`);
              }}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:from-amber-500 hover:to-amber-600 transform hover:scale-105 transition-all duration-200"
            >
              <span>🔍 Start Fact-Checking</span>
              <span className="text-lg">→</span>
            </button>
            <p className="text-sm text-gray-400 mt-3">
              Proceeding to comprehensive fact-checking and verification
            </p>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="fixed bottom-6 right-6 bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProcessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading process page...</p>
        </div>
      </div>
    }>
      <ProcessPageContent />
    </Suspense>
  );
}