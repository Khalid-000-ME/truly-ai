"""
Audio analysis endpoints
"""
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional

from app.services.audio_service import AudioService
from app.schemas.audio_schemas import AudioAnalysisRequest, AudioAnalysisOptions
from app.utils.response_formatter import ResponseFormatter, ErrorCodes
from app.models.model_manager import model_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["audio"])


def get_audio_request(
    language: str = Form("auto"),
    include_timestamps: bool = Form(True),
    word_level_timestamps: bool = Form(False)
) -> AudioAnalysisRequest:
    """
    Parse form data into AudioAnalysisRequest
    """
    options = AudioAnalysisOptions(
        include_timestamps=include_timestamps,
        word_level_timestamps=word_level_timestamps
    )
    return AudioAnalysisRequest(language=language, options=options)


@router.post("/audio")
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    request: AudioAnalysisRequest = Depends(get_audio_request)
):
    """
    Transcribe an uploaded audio file
    
    Args:
        audio: Audio file (MP3, WAV, M4A, FLAC, OGG)
        request: Analysis parameters
        
    Returns:
        Audio transcription results
    """
    try:
        # Check if models are loaded
        if not model_manager.is_ready():
            raise HTTPException(
                status_code=503,
                detail="Models not loaded. Please wait for initialization to complete."
            )
        
        # Transcribe audio
        result = await AudioService.transcribe_audio(audio, request)
        
        return ResponseFormatter.analysis_response(
            analysis_type="audio",
            result=result,
            metadata=result["metadata"],
            processing_time_ms=result["metadata"]["processing_time_ms"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio transcription endpoint failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {str(e)}"
        )


@router.post("/audio/detect-language")
async def detect_audio_language(
    audio: UploadFile = File(..., description="Audio file for language detection")
):
    """
    Detect language of an uploaded audio file
    
    Args:
        audio: Audio file (MP3, WAV, M4A, FLAC, OGG)
        
    Returns:
        Language detection results
    """
    try:
        # Check if models are loaded
        if not model_manager.is_ready():
            raise HTTPException(
                status_code=503,
                detail="Models not loaded. Please wait for initialization to complete."
            )
        
        # Detect language
        result = await AudioService.detect_language(audio)
        
        return ResponseFormatter.success_response(result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Language detection endpoint failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Language detection failed: {str(e)}"
        )
