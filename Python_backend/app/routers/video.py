"""
Video analysis endpoints
"""
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional

from app.services.video_service import VideoService
from app.schemas.video_schemas import VideoAnalysisRequest, VideoAnalysisOptions
from app.utils.response_formatter import ResponseFormatter, ErrorCodes
from app.models.model_manager import model_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["video"])


def get_video_request(
    num_frames: int = Form(5),
    prompt: Optional[str] = Form(None),
    include_timestamps: bool = Form(True),
    frame_sampling: str = Form("uniform")
) -> VideoAnalysisRequest:
    """
    Parse form data into VideoAnalysisRequest
    """
    options = VideoAnalysisOptions(
        include_timestamps=include_timestamps,
        frame_sampling=frame_sampling
    )
    return VideoAnalysisRequest(
        num_frames=num_frames,
        prompt=prompt,
        options=options
    )


@router.post("/video")
async def analyze_video(
    video: UploadFile = File(..., description="Video file to analyze"),
    request: VideoAnalysisRequest = Depends(get_video_request)
):
    """
    Analyze an uploaded video
    
    Args:
        video: Video file (MP4, AVI, MOV, MKV)
        request: Analysis parameters
        
    Returns:
        Video analysis results
    """
    try:
        # Check if models are loaded
        if not model_manager.is_ready():
            raise HTTPException(
                status_code=503,
                detail="Models not loaded. Please wait for initialization to complete."
            )
        
        # Analyze video
        result = await VideoService.analyze_video(video, request)
        
        return ResponseFormatter.analysis_response(
            analysis_type="video",
            result=result,
            metadata=result["metadata"],
            processing_time_ms=result["metadata"]["processing_time_ms"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video analysis endpoint failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Video analysis failed: {str(e)}"
        )
