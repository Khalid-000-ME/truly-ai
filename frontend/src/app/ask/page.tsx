'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Button from '@/components/button';
import { useRouter } from 'next/navigation';

// Load Google Fonts
const loadGoogleFonts = () => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

interface TimeframeSelection {
  fileIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
}

interface TimeframeSelectorProps {
  file: File;
  fileIndex: number;
  onSelect: (fileIndex: number, startTime: number, endTime: number, duration: number) => void;
  onClose: () => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ file, fileIndex, onSelect, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileUrl, setFileUrl] = useState<string>('');

  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleLoadedMetadata = () => {
    const mediaElement = isVideo ? videoRef.current : audioRef.current;
    if (mediaElement) {
      const dur = mediaElement.duration;
      setDuration(dur);
      setEndTime(dur);
    }
  };

  const handleTimeUpdate = () => {
    const mediaElement = isVideo ? videoRef.current : audioRef.current;
    if (mediaElement) {
      setCurrentTime(mediaElement.currentTime);
    }
  };

  const handlePlayPause = () => {
    const mediaElement = isVideo ? videoRef.current : audioRef.current;
    if (mediaElement) {
      if (isPlaying) {
        mediaElement.pause();
      } else {
        mediaElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    const mediaElement = isVideo ? videoRef.current : audioRef.current;
    if (mediaElement) {
      mediaElement.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    if (startTime < endTime) {
      onSelect(fileIndex, startTime, endTime, duration);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Select Timeframe</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            📁 {file.name} ({isVideo ? 'Video' : 'Audio'})
          </p>
          
          {/* Media Player */}
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            {isVideo ? (
              <video
                ref={videoRef}
                src={fileUrl}
                className="w-full max-h-64 rounded"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                controls={false}
              />
            ) : (
              <div className="flex items-center justify-center h-32 bg-gray-200 rounded">
                <span className="text-4xl">🎵</span>
                <audio
                  ref={audioRef}
                  src={fileUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                />
              </div>
            )}
            
            {/* Custom Controls */}
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <span className="text-sm text-gray-600">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              {/* Timeline */}
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Timeframe Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={startTime}
                  onChange={(e) => setStartTime(parseFloat(e.target.value))}
                  className="w-full mb-1"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{formatTime(startTime)}</span>
                  <button
                    onClick={() => handleSeek(startTime)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Go to
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={endTime}
                  onChange={(e) => setEndTime(parseFloat(e.target.value))}
                  className="w-full mb-1"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{formatTime(endTime)}</span>
                  <button
                    onClick={() => handleSeek(endTime)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Go to
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📍 Selected Duration: {formatTime(Math.max(0, endTime - startTime))}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This segment will be analyzed for fact-checking and content verification.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={startTime >= endTime}
            className={`px-4 py-2 rounded-lg font-medium ${
              startTime < endTime
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AskPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeframeSelections, setTimeframeSelections] = useState<TimeframeSelection[]>([]);
  const [showTimeframeSelector, setShowTimeframeSelector] = useState<number | null>(null);

  // Load fonts on component mount
  useEffect(() => {
    loadGoogleFonts();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const allowedTypes = ['image/', 'video/', 'audio/'];
    
    const validFiles = files.filter(file => 
      allowedTypes.some(type => file.type.startsWith(type))
    );
    
    if (uploadedFiles.length + validFiles.length > 3) {
      alert('Maximum 3 files allowed');
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...validFiles].slice(0, 3));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    // Remove associated timeframe selection
    setTimeframeSelections(prev => prev.filter(selection => selection.fileIndex !== index));
    // Update indices for remaining selections
    setTimeframeSelections(prev => 
      prev.map(selection => ({
        ...selection,
        fileIndex: selection.fileIndex > index ? selection.fileIndex - 1 : selection.fileIndex
      }))
    );
  };

  const handleTimeframeSelection = (fileIndex: number, startTime: number, endTime: number, duration: number) => {
    const newSelection: TimeframeSelection = {
      fileIndex,
      startTime,
      endTime,
      duration
    };
    
    setTimeframeSelections(prev => {
      const existing = prev.findIndex(sel => sel.fileIndex === fileIndex);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newSelection;
        return updated;
      }
      return [...prev, newSelection];
    });
    
    setShowTimeframeSelector(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!query.trim() && uploadedFiles.length === 0) {
      alert('Please enter a prompt or upload files');
      return;
    }
    
    if (!query.trim()) {
      alert('Please enter a prompt to analyze your uploaded files');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData with files and prompt
      const formData = new FormData();
      formData.append('prompt', query);
      
      uploadedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      // Add timeframe selections
      if (timeframeSelections.length > 0) {
        formData.append('timeframeSelections', JSON.stringify(timeframeSelections));
      }

      // Store the FormData and query data for the clarity page
      const queryData = {
        prompt: query,
        fileCount: uploadedFiles.length,
        timeframeSelections: timeframeSelections,
        timestamp: Date.now(),
        formData: formData // Pass the actual FormData
      };

      if (typeof window !== 'undefined') {
        // Store query metadata
        sessionStorage.setItem('trulyai_query_data', JSON.stringify({
          prompt: query,
          fileCount: uploadedFiles.length,
          timeframeSelections: timeframeSelections,
          timestamp: Date.now()
        }));
        
        // Store FormData in a way that can be accessed by clarity page
        // We'll use a global variable since FormData can't be serialized
        (window as any).trulyaiFormData = formData;
      }

      // Redirect to clarity page
      router.push('/clarity');
    } catch (error) {
      console.error('Error preparing data:', error);
      alert('Error preparing your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
        <div className="w-full max-w-4xl mx-auto">
          
          {/* Header Text */}
          <div className="text-center mb-16">
            <h1 className="font-instrument-serif text-5xl md:text-6xl lg:text-7xl font-light text-gray-800 mb-4 tracking-wide leading-tight">
              Know the Truth,
            </h1>
            <h2 className="font-instrument-serif text-4xl md:text-5xl lg:text-6xl font-extralight text-gray-700 tracking-wide">
              all by yourself.
            </h2>
          </div>

          {/* Main Input Area */}
          <div className="w-full max-w-3xl mx-auto">
            
            {/* File Upload Area */}
            {uploadedFiles.length > 0 && (
              <div className="mb-6 p-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Files ({uploadedFiles.length}/3)</h3>
                <div className="grid grid-cols-1 gap-3">
                  {uploadedFiles.map((file, index) => {
                    const isVideo = file.type.startsWith('video/');
                    const isAudio = file.type.startsWith('audio/');
                    const hasTimeframe = timeframeSelections.find(sel => sel.fileIndex === index);
                    
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {file.type.startsWith('image/') ? '🖼️' : 
                               file.type.startsWith('video/') ? '🎥' : '🎵'}
                            </span>
                            <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 text-lg font-bold"
                          >
                            ×
                          </button>
                        </div>
                        
                        {/* Timeframe Selection for Video/Audio */}
                        {(isVideo || isAudio) && (
                          <div className="mt-2 space-y-2">
                            {hasTimeframe ? (
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                                <span className="text-xs text-green-700">
                                  📍 Selected: {formatTime(hasTimeframe.startTime)} - {formatTime(hasTimeframe.endTime)}
                                  ({formatTime(hasTimeframe.endTime - hasTimeframe.startTime)} duration)
                                </span>
                                <button
                                  onClick={() => setShowTimeframeSelector(index)}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowTimeframeSelector(index)}
                                className="w-full p-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                              >
                                🎯 Select timeframe for focused analysis
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timeframe Selector Modal */}
            {showTimeframeSelector !== null && (
              <TimeframeSelector
                file={uploadedFiles[showTimeframeSelector]}
                fileIndex={showTimeframeSelector}
                onSelect={handleTimeframeSelection}
                onClose={() => setShowTimeframeSelector(null)}
              />
            )}

            {/* Main Textarea Container */}
            <div className="relative bg-white/95 backdrop-blur-sm rounded-[8px] border border-black overflow-hidden">
              
              {/* Textarea */}
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything, upload media files, or paste links to discover the truth..."
                className="w-full h-32 px-8 py-6 text-sm text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none resize-none leading-relaxed m-[10px]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between px-[15px] py-[8px] bg-gray-50/80 border-t border-gray-100">
                
                {/* Left: File Upload Button */}
                <label className="flex items-center gap-2 px-4 py-2 rounded-r-full rounded-l-full transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 cursor-pointer">
                  <span className="text-lg">📎</span>
                  <span className="text-sm font-medium">
                    Upload Files ({uploadedFiles.length}/3)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadedFiles.length >= 3}
                  />
                </label>

                {/* Right: Send Button */}
                <Button
                  onClick={handleSend}
                  disabled={isSubmitting || (!query.trim() && uploadedFiles.length === 0)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                    !isSubmitting && (query.trim() || uploadedFiles.length > 0)
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg hover:shadow-xl hover:from-amber-500 hover:to-amber-600 transform hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>{isSubmitting ? 'Processing...' : 'Discover Truth'}</span>
                  <span className="text-lg">{isSubmitting ? '⏳' : '🚀'}</span>
                </Button>
              </div>
            </div>

            {/* Subtle Helper Text */}
            <div className="text-center mt-8">
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">
                Use the power of Multi-modal analysis to know the real truth against social media misinformations.
                <br />
                <span className="text-gray-400">
                  Your journey to truth starts with a single question.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements for Visual Interest */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-amber-300 rounded-full opacity-60 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-1 h-1 bg-amber-400 rounded-full opacity-40 animate-pulse delay-1000"></div>
      <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-amber-200 rounded-full opacity-50 animate-pulse delay-2000"></div>
      <div className="absolute bottom-20 right-1/3 w-1 h-1 bg-amber-300 rounded-full opacity-30 animate-pulse delay-3000"></div>
    </div>
  );
}