"""
Multimodal Analysis Service
Integrates AWS Bedrock and local analysis capabilities
"""
import os
import sys
import tempfile
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging
import aiohttp
import aiofiles
from urllib.parse import urlparse

# Add parent directory to path to import our analyzers
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

try:
    from working_aws_analyzer import WorkingAWSAnalyzer
except ImportError:
    WorkingAWSAnalyzer = None
    print("Warning: AWS Analyzer not available")

try:
    from librosa_audio import LocalAudioAnalyzer
except ImportError:
    LocalAudioAnalyzer = None
    print("Warning: Librosa Audio Analyzer not available")

from .fallback_service import fallback_service

logger = logging.getLogger(__name__)

class MultimodalAnalysisService:
    """
    Service that combines AWS Bedrock and local analysis capabilities
    """
    
    def __init__(self):
        self.aws_analyzer = None
        self.local_audio_analyzer = None
        self._initialize_analyzers()
    
    def _initialize_analyzers(self):
        """Initialize available analyzers"""
        try:
            if WorkingAWSAnalyzer:
                self.aws_analyzer = WorkingAWSAnalyzer()
                logger.info("AWS Analyzer initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize AWS Analyzer: {e}")
        
        try:
            if LocalAudioAnalyzer:
                self.local_audio_analyzer = LocalAudioAnalyzer(whisper_model='base')
                logger.info("Local Audio Analyzer initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize Local Audio Analyzer: {e}")
    
    def _is_http_url(self, path: str) -> bool:
        """Check if the path is an HTTP/HTTPS URL"""
        try:
            parsed = urlparse(path)
            return parsed.scheme in ('http', 'https')
        except:
            return False
    
    async def _download_file_from_url(self, url: str, file_extension: str = None) -> str:
        """
        Download file from HTTP URL to temporary location
        
        Args:
            url: HTTP/HTTPS URL to download
            file_extension: Optional file extension to use
            
        Returns:
            Path to downloaded temporary file
        """
        try:
            # Determine file extension from URL if not provided
            if not file_extension:
                parsed_url = urlparse(url)
                path = parsed_url.path
                if '.' in path:
                    file_extension = os.path.splitext(path)[1]
                else:
                    file_extension = '.tmp'
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
            temp_path = temp_file.name
            temp_file.close()
            
            # Download file
            timeout = aiohttp.ClientTimeout(total=300)  # 5 minute timeout
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}: Failed to download file from {url}")
                    
                    # Check content length
                    content_length = response.headers.get('content-length')
                    if content_length:
                        size_mb = int(content_length) / (1024 * 1024)
                        if size_mb > 100:  # 100MB limit
                            raise Exception(f"File too large: {size_mb:.1f}MB (max 100MB)")
                    
                    # Write file
                    async with aiofiles.open(temp_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            await f.write(chunk)
            
            logger.info(f"Downloaded file from {url} to {temp_path}")
            return temp_path
            
        except Exception as e:
            # Clean up on error
            if 'temp_path' in locals() and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass
            raise Exception(f"Failed to download file from URL: {str(e)}")
    
    async def _resolve_file_path(self, path_or_url: str, expected_extensions: List[str] = None) -> tuple[str, bool]:
        """
        Resolve file path or URL to local file path
        
        Args:
            path_or_url: Local file path or HTTP URL
            expected_extensions: List of expected file extensions
            
        Returns:
            Tuple of (local_file_path, is_temporary_file)
        """
        if self._is_http_url(path_or_url):
            # Download from URL
            file_ext = None
            if expected_extensions:
                # Try to determine extension from URL
                parsed_url = urlparse(path_or_url)
                url_ext = os.path.splitext(parsed_url.path)[1].lower()
                if url_ext in expected_extensions:
                    file_ext = url_ext
                else:
                    file_ext = expected_extensions[0]  # Use first expected extension
            
            temp_path = await self._download_file_from_url(path_or_url, file_ext)
            return temp_path, True
        else:
            # Local file path
            if not os.path.exists(path_or_url):
                raise Exception(f"File not found: {path_or_url}")
            return path_or_url, False
    
    async def analyze_text(self, text: str, analysis_type: str = "summary") -> Dict[str, Any]:
        """
        Analyze text using AWS Bedrock
        
        Args:
            text: Input text to analyze
            analysis_type: Type of analysis (summary, sentiment, topics, etc.)
        
        Returns:
            Analysis results
        """
        if not self.aws_analyzer:
            logger.warning("AWS Analyzer not available, using fallback service")
            return await fallback_service.analyze_text(text, analysis_type)
        
        try:
            # Create appropriate prompt based on analysis type
            prompts = {
                "summary": f"Provide a concise summary of the following text:\n\n{text}",
                "sentiment": f"Analyze the sentiment and emotional tone of this text:\n\n{text}",
                "topics": f"Extract the main topics and themes from this text:\n\n{text}",
                "insights": f"Provide key insights and important points from this text:\n\n{text}"
            }
            
            prompt = prompts.get(analysis_type, prompts["summary"])
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                self.aws_analyzer.analyze_text, 
                prompt
            )
            
            return {
                "success": result.get("success", False),
                "result": result.get("response", ""),
                "model_used": result.get("model_used", ""),
                "analysis_type": analysis_type,
                "original_text_length": len(text)
            }
            
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            if "ExpiredTokenException" in str(e) or "AWS" in str(e):
                logger.warning("AWS error detected, falling back to mock service")
                return await fallback_service.analyze_text(text, analysis_type)
            return {
                "success": False,
                "error": str(e),
                "result": None
            }
    
    async def analyze_image(self, image_path_or_url: str, prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze image using AWS Bedrock Nova Pro
        
        Args:
            image_path_or_url: Path to image file or HTTP URL
            prompt: Optional custom prompt
        
        Returns:
            Image analysis results
        """
        if not self.aws_analyzer:
            logger.warning("AWS Analyzer not available, using fallback service")
            return await fallback_service.analyze_image(image_path_or_url, prompt)
        
        temp_file_path = None
        try:
            # Resolve file path or download from URL
            expected_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']
            local_path, is_temp = await self._resolve_file_path(image_path_or_url, expected_extensions)
            if is_temp:
                temp_file_path = local_path
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.aws_analyzer.analyze_image,
                local_path,
                prompt or "Describe this image in detail, including objects, people, setting, colors, and any text visible."
            )
            
            return {
                "success": result.get("success", False),
                "description": result.get("description", ""),
                "model_used": result.get("model_used", ""),
                "method": result.get("method", ""),
                "image_path": image_path_or_url,
                "file_size": os.path.getsize(local_path) if os.path.exists(local_path) else 0,
                "source_type": "url" if self._is_http_url(image_path_or_url) else "local_path"
            }
            
        except Exception as e:
            logger.error(f"Image analysis failed: {e}")
            if "ExpiredTokenException" in str(e) or "AWS" in str(e):
                logger.warning("AWS error detected, falling back to mock service")
                return await fallback_service.analyze_image(image_path_or_url, prompt)
            return {
                "success": False,
                "error": str(e),
                "description": None
            }
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    async def analyze_video(
        self, 
        video_path_or_url: str, 
        num_frames: int = 5,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Analyze video by extracting frames and analyzing them
        
        Args:
            video_path_or_url: Path to video file or HTTP URL
            num_frames: Number of frames to extract and analyze
            start_time: Start time in seconds for timeframe analysis
            end_time: End time in seconds for timeframe analysis
        
        Returns:
            Video analysis results
        """
        if not self.aws_analyzer:
            logger.warning("AWS Analyzer not available, using fallback service")
            return await fallback_service.analyze_video(
                video_path_or_url, 
                num_frames, 
                start_time, 
                end_time
            )
        
        temp_file_path = None
        try:
            import cv2
            
            # Resolve file path or download from URL
            expected_extensions = ['.mp4', '.avi', '.mov', '.mkv']
            local_path, is_temp = await self._resolve_file_path(video_path_or_url, expected_extensions)
            if is_temp:
                temp_file_path = local_path
            
            # Run video analysis in thread pool
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self._analyze_video_frames,
                local_path,
                num_frames,
                start_time,
                end_time
            )
            
            # Update result with source info
            if result.get("success"):
                result["video_path"] = video_path_or_url
                result["source_type"] = "url" if self._is_http_url(video_path_or_url) else "local_path"
            
            return result
            
        except ImportError:
            return {
                "success": False,
                "error": "OpenCV not available for video analysis",
                "description": None
            }
        except Exception as e:
            logger.error(f"Video analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "description": None
            }
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    def _analyze_video_frames(
        self, 
        video_path: str, 
        num_frames: int,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """Extract and analyze video frames from specified timeframe (runs in thread pool)"""
        import cv2
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {
                "success": False,
                "error": "Could not open video file",
                "description": None
            }
        
        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Calculate timeframe boundaries
        if start_time is not None and end_time is not None:
            # Use specified timeframe
            start_frame = int(start_time * fps)
            end_frame = int(end_time * fps)
            # Ensure boundaries are within video limits
            start_frame = max(0, min(start_frame, total_frames - 1))
            end_frame = max(start_frame + 1, min(end_frame, total_frames))
            timeframe_frames = end_frame - start_frame
            actual_duration = (end_frame - start_frame) / fps
            
            logger.info(f"Analyzing timeframe: {start_time}s-{end_time}s (frames {start_frame}-{end_frame}, {actual_duration:.2f}s)")
        else:
            # Use entire video
            start_frame = 0
            end_frame = total_frames
            timeframe_frames = total_frames
            actual_duration = duration
            
        # Calculate frame indices to extract within the timeframe
        if timeframe_frames < num_frames:
            # If timeframe has fewer frames than requested, extract all available frames
            frame_indices = list(range(start_frame, end_frame))
        else:
            # Extract evenly distributed frames within the timeframe
            frame_indices = [start_frame + int(i * timeframe_frames / num_frames) for i in range(num_frames)]
        
        frame_analyses = []
        temp_files = []
        
        try:
            for i, frame_idx in enumerate(frame_indices):
                # Seek to frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if not ret:
                    continue
                
                # Save frame as temporary image
                temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                temp_path = temp_file.name
                temp_file.close()
                temp_files.append(temp_path)
                
                # Write frame to file
                cv2.imwrite(temp_path, frame)
                
                # Calculate timestamp
                timestamp = frame_idx / fps if fps > 0 else 0
                
                # Analyze frame with AWS Bedrock
                result = self.aws_analyzer.analyze_image(
                    temp_path,
                    f"Describe what's happening in this video frame at {timestamp:.1f} seconds."
                )
                
                if result['success']:
                    frame_analyses.append({
                        'frame_number': frame_idx,
                        'timestamp': timestamp,
                        'description': result['description'],
                        'model': result['model_used']
                    })
        
        finally:
            cap.release()
            # Clean up temporary files
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except:
                    pass
        
        # Generate overall summary
        if frame_analyses:
            descriptions = [f['description'] for f in frame_analyses]
            summary_prompt = f"Based on these video frame descriptions, provide a summary of what happens in this video: {' | '.join(descriptions)}"
            
            summary_result = self.aws_analyzer.analyze_text(summary_prompt)
            overall_summary = summary_result['response'] if summary_result['success'] else "Could not generate summary"
        else:
            overall_summary = "No frames could be analyzed"
        
        return {
            "success": len(frame_analyses) > 0,
            "description": overall_summary,
            "frame_analyses": frame_analyses,
            "video_info": {
                "duration": duration,
                "fps": fps,
                "resolution": f"{width}x{height}",
                "total_frames": total_frames,
                "analyzed_timeframe": {
                    "start_time": start_time,
                    "end_time": end_time,
                    "actual_duration": actual_duration if start_time is not None and end_time is not None else duration
                },
                "analyzed_frames": len(frame_analyses)
            },
            "video_path": video_path,
            "file_size": os.path.getsize(video_path)
        }
    
    async def transcribe_audio(self, audio_path_or_url: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio using Whisper
        
        Args:
            audio_path_or_url: Path to audio file or HTTP URL
            language: Language code (None for auto-detection)
        
        Returns:
            Transcription results
        """
        if not self.aws_analyzer:
            return {
                "success": False,
                "error": "AWS Analyzer not available",
                "transcription": None
            }
        
        temp_file_path = None
        try:
            # Resolve file path or download from URL
            expected_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
            local_path, is_temp = await self._resolve_file_path(audio_path_or_url, expected_extensions)
            if is_temp:
                temp_file_path = local_path
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.aws_analyzer.transcribe_audio,
                local_path,
                language
            )
            
            return {
                "success": result.get("success", False),
                "transcription": result.get("transcription", ""),
                "language": result.get("language", "unknown"),
                "segments": result.get("segments", []),
                "model_used": result.get("model_used", ""),
                "audio_path": audio_path_or_url,
                "file_size": os.path.getsize(local_path) if os.path.exists(local_path) else 0,
                "source_type": "url" if self._is_http_url(audio_path_or_url) else "local_path"
            }
            
        except Exception as e:
            logger.error(f"Audio transcription failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "transcription": None
            }
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    async def analyze_audio_comprehensive(
        self, 
        audio_path_or_url: str,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive audio analysis using librosa
        
        Args:
            audio_path_or_url: Path to audio file or HTTP URL
        
        Returns:
            Comprehensive audio analysis results
        """
        if not self.local_audio_analyzer:
            logger.warning("Local Audio Analyzer not available, using fallback service")
            return await fallback_service.analyze_audio_comprehensive(
                audio_path_or_url,
                start_time,
                end_time
            )
        
        temp_file_path = None
        try:
            # Resolve file path or download from URL
            expected_extensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
            local_path, is_temp = await self._resolve_file_path(audio_path_or_url, expected_extensions)
            if is_temp:
                temp_file_path = local_path
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self.local_audio_analyzer.analyze_complete_audio,
                local_path
            )
            
            return {
                "success": True,
                "analysis": result,
                "audio_path": audio_path_or_url,
                "file_size": os.path.getsize(local_path) if os.path.exists(local_path) else 0,
                "source_type": "url" if self._is_http_url(audio_path_or_url) else "local_path"
            }
            
        except Exception as e:
            logger.error(f"Comprehensive audio analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "analysis": None
            }
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get status of all available services"""
        return {
            "aws_analyzer_available": self.aws_analyzer is not None,
            "local_audio_analyzer_available": self.local_audio_analyzer is not None,
            "supported_features": {
                "text_analysis": self.aws_analyzer is not None,
                "image_analysis": self.aws_analyzer is not None,
                "video_analysis": self.aws_analyzer is not None,
                "audio_transcription": self.aws_analyzer is not None,
                "comprehensive_audio_analysis": self.local_audio_analyzer is not None
            }
        }

# Global service instance
multimodal_service = MultimodalAnalysisService()
