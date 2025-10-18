"""
Fallback Analysis Service
Provides mock responses when AWS Bedrock is not available or credentials are expired
"""
import logging
import asyncio
from typing import Dict, Any, Optional
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class FallbackAnalysisService:
    """
    Fallback service that provides mock analysis results when AWS is unavailable
    """
    
    def __init__(self):
        logger.info("Fallback Analysis Service initialized")
    
    async def analyze_text(self, text: str, analysis_type: str = "summary") -> Dict[str, Any]:
        """
        Provide fallback text analysis
        """
        logger.info(f"Fallback text analysis for type: {analysis_type}")
        
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Generate mock analysis based on type
        if analysis_type == "summary":
            result = f"Summary: This text discusses {text[:50]}... (Length: {len(text)} characters)"
        elif analysis_type == "sentiment":
            result = "Sentiment: Neutral to positive tone detected in the provided text."
        elif analysis_type == "topics":
            result = "Topics: General discussion, information sharing, factual content."
        elif analysis_type == "insights":
            result = f"Key Insights: The text appears to be a fact-checking query or information request. It contains {len(text.split())} words and may require verification of claims or sources mentioned."
        else:
            result = f"Analysis completed for type '{analysis_type}'. Text length: {len(text)} characters."
        
        return {
            "success": True,
            "result": result,
            "model_used": "fallback-mock-analyzer",
            "analysis_type": analysis_type,
            "original_text_length": len(text)
        }
    
    async def analyze_image(self, image_path_or_url: str, prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Provide fallback image analysis
        """
        logger.info(f"Fallback image analysis for: {image_path_or_url}")
        
        # Simulate processing time
        await asyncio.sleep(1.0)
        
        # Check if file exists (for local paths)
        if not image_path_or_url.startswith(('http://', 'https://')):
            if not os.path.exists(image_path_or_url):
                return {
                    "success": False,
                    "error": f"Image file not found: {image_path_or_url}"
                }
        
        # Generate mock analysis
        filename = os.path.basename(image_path_or_url)
        file_ext = Path(image_path_or_url).suffix.lower()
        
        description = f"Mock analysis of {filename}: This appears to be a {file_ext[1:].upper()} image file. "
        
        if prompt and "authenticity" in prompt.lower():
            description += "No obvious signs of manipulation detected in preliminary analysis. "
        if prompt and "fact-checking" in prompt.lower():
            description += "Image appears to be a standard photograph without obvious misleading elements. "
        
        description += "For comprehensive fact-checking, manual verification is recommended."
        
        return {
            "success": True,
            "description": description,
            "model_used": "fallback-mock-analyzer",
            "method": "mock_analysis",
            "file_size": os.path.getsize(image_path_or_url) if os.path.exists(image_path_or_url) else 0,
            "filename": filename
        }
    
    async def analyze_video(
        self, 
        video_path_or_url: str, 
        num_frames: int = 5,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Provide fallback video analysis
        """
        logger.info(f"Fallback video analysis for: {video_path_or_url}")
        
        # Simulate processing time
        await asyncio.sleep(2.0)
        
        # Check if file exists (for local paths)
        if not video_path_or_url.startswith(('http://', 'https://')):
            if not os.path.exists(video_path_or_url):
                return {
                    "success": False,
                    "error": f"Video file not found: {video_path_or_url}"
                }
        
        filename = os.path.basename(video_path_or_url)
        
        # Handle timeframe analysis
        timeframe_info = ""
        if start_time is not None and end_time is not None:
            timeframe_info = f" (timeframe: {start_time}s-{end_time}s)"
        
        # Generate mock frame analyses
        frame_analyses = []
        for i in range(min(num_frames, 5)):
            frame_analyses.append({
                "frame_number": i + 1,
                "timestamp": f"00:00:{i:02d}",
                "description": f"Frame {i + 1}: Standard video content{timeframe_info}, no obvious manipulation detected.",
                "model": "fallback-mock-analyzer"
            })
        
        return {
            "success": True,
            "description": f"Mock analysis of {filename}: Video appears to be standard content with {num_frames} frames analyzed{timeframe_info}. No obvious signs of manipulation detected in preliminary review.",
            "frame_analyses": frame_analyses,
            "video_info": {
                "duration": end_time - start_time if start_time and end_time else 10.0,
                "fps": 30,
                "resolution": "unknown",
                "total_frames": num_frames * 30,
                "analyzed_frames": num_frames
            },
            "file_size": os.path.getsize(video_path_or_url) if os.path.exists(video_path_or_url) else 0,
            "filename": filename
        }
    
    async def analyze_audio_comprehensive(
        self, 
        audio_path: str,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Provide fallback comprehensive audio analysis
        """
        logger.info(f"Fallback audio analysis for: {audio_path}")
        
        # Simulate processing time
        await asyncio.sleep(1.5)
        
        # Check if file exists
        if not os.path.exists(audio_path):
            return {
                "success": False,
                "error": f"Audio file not found: {audio_path}"
            }
        
        filename = os.path.basename(audio_path)
        file_size = os.path.getsize(audio_path)
        
        # Handle timeframe analysis
        timeframe_info = ""
        analyzed_duration = max(file_size / 16000, 1.0)  # Rough estimate
        
        if start_time is not None and end_time is not None:
            timeframe_info = f" (timeframe: {start_time}s-{end_time}s)"
            analyzed_duration = end_time - start_time
        
        return {
            "success": True,
            "analysis": {
                "audio_type": "speech" if file_size > 1000 else "unknown",
                "duration": analyzed_duration,
                "analyzed_timeframe": {
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": analyzed_duration
                } if start_time is not None and end_time is not None else None,
                "transcription": {
                    "text": f"Mock transcription{timeframe_info}: Audio content detected but transcription requires proper audio processing tools.",
                    "language": "en",
                    "segments": [
                        {
                            "start": start_time or 0.0,
                            "end": min(start_time + 5.0 if start_time else 5.0, end_time or 5.0),
                            "text": f"Mock transcription segment{timeframe_info}"
                        }
                    ]
                },
                "mood": {
                    "valence": 0.5,
                    "arousal": 0.5,
                    "dominance": 0.5,
                    "mood_label": "neutral"
                },
                "features": {
                    "tempo": 120,
                    "pitch_mean": 200.0,
                    "energy": 0.5,
                    "spectral_centroid": 1000.0
                },
                "summary": f"Mock analysis of {filename}{timeframe_info}: Audio file processed. For accurate transcription and analysis, proper audio processing tools are required."
            }
        }

# Global fallback service instance
fallback_service = FallbackAnalysisService()
