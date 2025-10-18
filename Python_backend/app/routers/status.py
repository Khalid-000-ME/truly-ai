"""
Status and Service Information Router
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
import logging

from app.services.multimodal_service import multimodal_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["status"],
    responses={404: {"description": "Not found"}},
)

class ServiceStatus(BaseModel):
    aws_analyzer_available: bool
    local_audio_analyzer_available: bool
    supported_features: Dict[str, bool]

class ServiceInfo(BaseModel):
    service_name: str
    version: str
    status: ServiceStatus
    endpoints: Dict[str, str]
    supported_formats: Dict[str, list]

@router.get("/status", response_model=ServiceStatus)
async def get_service_status():
    """
    Get the status of all available analysis services
    
    Returns information about which analyzers are available and what features are supported.
    """
    try:
        status = multimodal_service.get_service_status()
        return ServiceStatus(**status)
    except Exception as e:
        logger.error(f"Error getting service status: {e}")
        return ServiceStatus(
            aws_analyzer_available=False,
            local_audio_analyzer_available=False,
            supported_features={
                "text_analysis": False,
                "image_analysis": False,
                "video_analysis": False,
                "audio_transcription": False,
                "comprehensive_audio_analysis": False
            }
        )

@router.get("/info", response_model=ServiceInfo)
async def get_service_info():
    """
    Get comprehensive service information including status, endpoints, and supported formats
    """
    try:
        status = multimodal_service.get_service_status()
        
        return ServiceInfo(
            service_name="TrulyAI Multimodal Analysis API",
            version="1.0.0",
            status=ServiceStatus(**status),
            endpoints={
                "text_analysis": "/api/analyze/text",
                "image_analysis": "/api/analyze/image",
                "image_analysis_by_path": "/api/analyze/image/path",
                "video_analysis": "/api/analyze/video",
                "video_analysis_by_path": "/api/analyze/video/path",
                "audio_transcription": "/api/analyze/transcribe",
                "audio_transcription_by_path": "/api/analyze/transcribe/path",
                "comprehensive_audio_analysis": "/api/analyze/audio",
                "comprehensive_audio_analysis_by_path": "/api/analyze/audio/path",
                "service_status": "/api/status",
                "service_info": "/api/info"
            },
            supported_formats={
                "text": ["plain text"],
                "image": ["jpg", "jpeg", "png", "webp", "bmp", "gif"],
                "video": ["mp4", "avi", "mov", "mkv"],
                "audio": ["mp3", "wav", "m4a", "flac", "ogg"]
            }
        )
    except Exception as e:
        logger.error(f"Error getting service info: {e}")
        # Return basic info even if there's an error
        return ServiceInfo(
            service_name="TrulyAI Multimodal Analysis API",
            version="1.0.0",
            status=ServiceStatus(
                aws_analyzer_available=False,
                local_audio_analyzer_available=False,
                supported_features={}
            ),
            endpoints={},
            supported_formats={}
        )

@router.get("/health")
async def health_check():
    """
    Basic health check endpoint
    """
    return {
        "status": "healthy",
        "message": "TrulyAI Multimodal Analysis API is running"
    }
