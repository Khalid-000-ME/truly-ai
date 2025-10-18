"""
Batch analysis endpoints
"""
import logging
import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any

from app.services.image_service import ImageService
from app.services.video_service import VideoService
from app.services.audio_service import AudioService
from app.schemas.image_schemas import ImageAnalysisRequest
from app.schemas.video_schemas import VideoAnalysisRequest
from app.schemas.audio_schemas import AudioAnalysisRequest
from app.utils.response_formatter import ResponseFormatter, ErrorCodes
from app.utils.file_validator import FileValidator
from app.models.model_manager import model_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["batch"])


@router.post("/batch")
async def analyze_batch(
    files: List[UploadFile] = File(..., description="Multiple files to analyze")
):
    """
    Analyze multiple files in batch
    
    Args:
        files: List of files to analyze (images, videos, audio)
        
    Returns:
        Batch analysis results
    """
    try:
        # Check if models are loaded
        if not model_manager.is_ready():
            raise HTTPException(
                status_code=503,
                detail="Models not loaded. Please wait for initialization to complete."
            )
        
        if len(files) > 10:  # Limit batch size
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 files allowed per batch request"
            )
        
        results = []
        total_start_time = asyncio.get_event_loop().time()
        
        # Process files sequentially to avoid memory issues
        for i, file in enumerate(files):
            try:
                # Determine file type
                file_type = _determine_file_type(file)
                
                if file_type == "image":
                    request = ImageAnalysisRequest()
                    result = await ImageService.analyze_image(file, request)
                    
                elif file_type == "video":
                    request = VideoAnalysisRequest()
                    result = await VideoService.analyze_video(file, request)
                    
                elif file_type == "audio":
                    request = AudioAnalysisRequest()
                    result = await AudioService.transcribe_audio(file, request)
                    
                else:
                    raise ValueError(f"Unsupported file type: {file_type}")
                
                results.append({
                    "file_index": i,
                    "filename": file.filename,
                    "file_type": file_type,
                    "success": True,
                    "result": result
                })
                
            except Exception as e:
                logger.error(f"Failed to process file {i} ({file.filename}): {str(e)}")
                results.append({
                    "file_index": i,
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        total_processing_time = (asyncio.get_event_loop().time() - total_start_time) * 1000
        
        return ResponseFormatter.success_response({
            "results": results,
            "total_files": len(files),
            "successful": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]]),
            "total_processing_time_ms": round(total_processing_time, 2)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch analysis endpoint failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch analysis failed: {str(e)}"
        )


def _determine_file_type(file: UploadFile) -> str:
    """
    Determine file type based on filename and content type
    
    Args:
        file: Uploaded file
        
    Returns:
        File type string ('image', 'video', 'audio')
    """
    if not file.filename:
        raise ValueError("No filename provided")
    
    filename_lower = file.filename.lower()
    
    # Check by file extension
    image_exts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']
    video_exts = ['.mp4', '.avi', '.mov', '.mkv']
    audio_exts = ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
    
    for ext in image_exts:
        if filename_lower.endswith(ext):
            return "image"
    
    for ext in video_exts:
        if filename_lower.endswith(ext):
            return "video"
    
    for ext in audio_exts:
        if filename_lower.endswith(ext):
            return "audio"
    
    # Check by content type if extension check fails
    if file.content_type:
        content_type = file.content_type.lower()
        if content_type.startswith('image/'):
            return "image"
        elif content_type.startswith('video/'):
            return "video"
        elif content_type.startswith('audio/'):
            return "audio"
    
    raise ValueError(f"Unable to determine file type for {file.filename}")
