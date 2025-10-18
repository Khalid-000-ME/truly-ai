"""
Video analysis service
"""
import logging
import time
import tempfile
import os
import cv2
from PIL import Image
from typing import Dict, Any, List
from fastapi import UploadFile

from app.models.model_manager import model_manager
from app.schemas.video_schemas import VideoAnalysisRequest
from app.utils.file_validator import FileValidator

logger = logging.getLogger(__name__)


class VideoService:
    """Service for video analysis operations"""
    
    @staticmethod
    async def analyze_video(
        file: UploadFile,
        request: VideoAnalysisRequest
    ) -> Dict[str, Any]:
        """
        Analyze an uploaded video
        
        Args:
            file: Uploaded video file
            request: Analysis request parameters
            
        Returns:
            Analysis results dictionary
        """
        start_time = time.time()
        temp_path = None
        
        try:
            # Validate file
            FileValidator.validate_upload(file, "video")
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
                temp_path = temp_file.name
                content = await file.read()
                temp_file.write(content)
            
            # Extract video metadata and frames
            video_info = VideoService._get_video_info(temp_path)
            frames_data = VideoService._extract_frames(
                temp_path, 
                request.num_frames,
                video_info,
                request.options.frame_sampling
            )
            
            # Analyze each frame
            moondream_model = model_manager.get_moondream_model()
            frame_analyses = []
            
            for frame_data in frames_data:
                try:
                    result = moondream_model.analyze_video_frame(
                        frame=frame_data["image"],
                        prompt=request.prompt,
                        frame_number=frame_data["frame_number"],
                        timestamp=frame_data["timestamp"]
                    )
                    
                    frame_analyses.append({
                        "timestamp": frame_data["timestamp"],
                        "frame_number": frame_data["frame_number"],
                        "description": result["description"]
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to analyze frame {frame_data['frame_number']}: {str(e)}")
                    frame_analyses.append({
                        "timestamp": frame_data["timestamp"],
                        "frame_number": frame_data["frame_number"],
                        "description": f"Analysis failed: {str(e)}"
                    })
            
            # Generate summary
            summary = VideoService._generate_video_summary(frame_analyses)
            
            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000
            
            # Format response
            return {
                "metadata": {
                    "duration_seconds": video_info["duration"],
                    "fps": video_info["fps"],
                    "resolution": video_info["resolution"],
                    "total_frames": video_info["total_frames"],
                    "processing_time_ms": processing_time_ms
                },
                "frames": frame_analyses,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"Video analysis failed: {str(e)}")
            raise
        
        finally:
            # Clean up temporary file
            if temp_path and os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_path}: {str(e)}")
            
            # Reset file position
            await file.seek(0)
    
    @staticmethod
    def _get_video_info(video_path: str) -> Dict[str, Any]:
        """
        Extract basic video information
        
        Args:
            video_path: Path to video file
            
        Returns:
            Video information dictionary
        """
        cap = cv2.VideoCapture(video_path)
        
        try:
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            
            return {
                "fps": fps,
                "total_frames": frame_count,
                "resolution": [width, height],
                "duration": duration
            }
        
        finally:
            cap.release()
    
    @staticmethod
    def _extract_frames(
        video_path: str,
        num_frames: int,
        video_info: Dict[str, Any],
        sampling_method: str = "uniform"
    ) -> List[Dict[str, Any]]:
        """
        Extract frames from video
        
        Args:
            video_path: Path to video file
            num_frames: Number of frames to extract
            video_info: Video information
            sampling_method: Frame sampling method
            
        Returns:
            List of frame data dictionaries
        """
        cap = cv2.VideoCapture(video_path)
        frames_data = []
        
        try:
            total_frames = video_info["total_frames"]
            fps = video_info["fps"]
            
            if sampling_method == "uniform":
                # Extract frames uniformly across the video
                frame_indices = [
                    int(i * total_frames / num_frames) 
                    for i in range(num_frames)
                ]
            else:
                # For now, fallback to uniform sampling
                # TODO: Implement keyframe detection
                frame_indices = [
                    int(i * total_frames / num_frames) 
                    for i in range(num_frames)
                ]
            
            for i, frame_idx in enumerate(frame_indices):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if ret:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    
                    # Convert to PIL Image
                    pil_image = Image.fromarray(frame_rgb)
                    
                    # Calculate timestamp
                    timestamp = frame_idx / fps if fps > 0 else 0
                    
                    frames_data.append({
                        "image": pil_image,
                        "frame_number": frame_idx,
                        "timestamp": timestamp
                    })
                else:
                    logger.warning(f"Failed to read frame at index {frame_idx}")
        
        finally:
            cap.release()
        
        return frames_data
    
    @staticmethod
    def _generate_video_summary(frame_analyses: List[Dict[str, Any]]) -> str:
        """
        Generate a summary of the video based on frame analyses
        
        Args:
            frame_analyses: List of frame analysis results
            
        Returns:
            Video summary string
        """
        if not frame_analyses:
            return "No frames were successfully analyzed."
        
        # Simple summary generation
        descriptions = [frame["description"] for frame in frame_analyses if frame["description"]]
        
        if not descriptions:
            return "Video analysis completed but no descriptions were generated."
        
        # Create a basic summary
        summary_parts = []
        
        if len(descriptions) == 1:
            summary_parts.append(f"This video shows: {descriptions[0]}")
        else:
            summary_parts.append("This video contains the following scenes:")
            for i, desc in enumerate(descriptions):
                timestamp = frame_analyses[i]["timestamp"]
                summary_parts.append(f"At {timestamp:.1f}s: {desc}")
        
        return " ".join(summary_parts)
