"""
Enhanced Video Analysis Router
Uses AWS Bedrock Nova Pro for frame-by-frame video analysis
"""
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import logging

from app.services.multimodal_service import multimodal_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/analyze",
    tags=["video"],
    responses={404: {"description": "Not found"}},
)

class FrameAnalysis(BaseModel):
    frame_number: int
    timestamp: float
    description: str
    model: str

class VideoInfo(BaseModel):
    duration: float
    fps: float
    resolution: str
    total_frames: int
    analyzed_frames: int

class VideoAnalysisResponse(BaseModel):
    success: bool
    description: Optional[str] = None
    error: Optional[str] = None
    frame_analyses: List[FrameAnalysis] = []
    video_info: Optional[VideoInfo] = None
    file_size: int
    filename: str

@router.post("/video", response_model=VideoAnalysisResponse)
async def analyze_video(
    video: UploadFile = File(..., description="Video file to analyze"),
    num_frames: int = Form(5, description="Number of frames to extract and analyze"),
    prompt_prefix: Optional[str] = Form(None, description="Custom prefix for frame analysis prompts")
):
    """
    Analyze an uploaded video by extracting and analyzing key frames
    
    - **video**: Video file (MP4, AVI, MOV, MKV)
    - **num_frames**: Number of frames to extract and analyze (default: 5)
    - **prompt_prefix**: Optional prefix for frame analysis prompts
    
    Returns analysis of key frames and overall video summary.
    """
    # Validate file type
    allowed_types = {'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'}
    if video.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {video.content_type}. Supported: MP4, AVI, MOV, MKV"
        )
    
    # Check file size (max 100MB)
    max_size = 100 * 1024 * 1024  # 100MB
    if video.size and video.size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )
    
    # Validate num_frames
    if num_frames < 1 or num_frames > 20:
        raise HTTPException(
            status_code=400,
            detail="num_frames must be between 1 and 20"
        )
    
    temp_path = None
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(video.filename)[1]) as temp_file:
            temp_path = temp_file.name
            content = await video.read()
            temp_file.write(content)
        
        logger.info(f"Analyzing video: {video.filename} ({len(content)} bytes, {num_frames} frames)")
        
        # Analyze video
        result = await multimodal_service.analyze_video(
            video_path=temp_path,
            num_frames=num_frames
        )
        
        if not result["success"]:
            logger.error(f"Video analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Video analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        # Convert frame analyses to response format
        frame_analyses = []
        for frame in result.get("frame_analyses", []):
            frame_analyses.append(FrameAnalysis(
                frame_number=frame["frame_number"],
                timestamp=frame["timestamp"],
                description=frame["description"],
                model=frame["model"]
            ))
        
        # Convert video info to response format
        video_info_data = result.get("video_info", {})
        video_info = VideoInfo(
            duration=video_info_data.get("duration", 0),
            fps=video_info_data.get("fps", 0),
            resolution=video_info_data.get("resolution", "unknown"),
            total_frames=video_info_data.get("total_frames", 0),
            analyzed_frames=video_info_data.get("analyzed_frames", 0)
        )
        
        return VideoAnalysisResponse(
            success=True,
            description=result["description"],
            frame_analyses=frame_analyses,
            video_info=video_info,
            file_size=len(content),
            filename=video.filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in video analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

@router.post("/video/path")
async def analyze_video_by_path(
    video_path: str = Form(..., description="Path to video file or HTTP URL"),
    num_frames: int = Form(5, description="Number of frames to extract and analyze"),
    start_time: Optional[float] = Form(None, description="Start time in seconds for timeframe analysis"),
    end_time: Optional[float] = Form(None, description="End time in seconds for timeframe analysis")
):
    """
    Analyze a video by file path or HTTP URL
    
    - **video_path**: Full path to the video file or HTTP/HTTPS URL
    - **num_frames**: Number of frames to extract and analyze (default: 5)
    
    Supports both local files and remote videos via HTTP URLs.
    """
    # Check if it's a URL or local path
    is_url = video_path.startswith(('http://', 'https://'))
    
    if not is_url:
        # Local file validation
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail=f"Video file not found: {video_path}")
        
        # Check if it's a video file
        valid_extensions = {'.mp4', '.avi', '.mov', '.mkv'}
        file_ext = os.path.splitext(video_path)[1].lower()
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: {file_ext}. Supported: {', '.join(valid_extensions)}"
            )
    
    # Validate num_frames
    if num_frames < 1 or num_frames > 20:
        raise HTTPException(
            status_code=400,
            detail="num_frames must be between 1 and 20"
        )
    
    try:
        source_type = "URL" if is_url else "local path"
        timeframe_info = ""
        if start_time is not None and end_time is not None:
            timeframe_info = f" (timeframe: {start_time}s-{end_time}s)"
        logger.info(f"Analyzing video by {source_type}: {video_path} ({num_frames} frames){timeframe_info}")
        
        result = await multimodal_service.analyze_video(
            video_path_or_url=video_path,
            num_frames=num_frames,
            start_time=start_time,
            end_time=end_time
        )
        
        if not result["success"]:
            logger.error(f"Video analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Video analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        # Convert frame analyses to response format
        frame_analyses = []
        for frame in result.get("frame_analyses", []):
            frame_analyses.append(FrameAnalysis(
                frame_number=frame["frame_number"],
                timestamp=frame["timestamp"],
                description=frame["description"],
                model=frame["model"]
            ))
        
        # Convert video info to response format
        video_info_data = result.get("video_info", {})
        video_info = VideoInfo(
            duration=video_info_data.get("duration", 0),
            fps=video_info_data.get("fps", 0),
            resolution=video_info_data.get("resolution", "unknown"),
            total_frames=video_info_data.get("total_frames", 0),
            analyzed_frames=video_info_data.get("analyzed_frames", 0)
        )
        
        filename = os.path.basename(video_path) if not is_url else f"video_from_url.{video_path.split('.')[-1] if '.' in video_path else 'mp4'}"
        
        return VideoAnalysisResponse(
            success=True,
            description=result["description"],
            frame_analyses=frame_analyses,
            video_info=video_info,
            file_size=result.get("file_size", 0),
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in video analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
