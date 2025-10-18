"""
Enhanced Audio Analysis Router
Provides both transcription and comprehensive audio analysis
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
    tags=["audio"],
    responses={404: {"description": "Not found"}},
)

class AudioSegment(BaseModel):
    start: float
    end: float
    text: str

class TranscriptionResponse(BaseModel):
    success: bool
    transcription: Optional[str] = None
    error: Optional[str] = None
    language: str
    segments: List[AudioSegment] = []
    model_used: Optional[str] = None
    file_size: int
    filename: str

class AudioFeatures(BaseModel):
    tempo: float
    beats_detected: int
    spectral_centroid_mean: float
    spectral_centroid_std: float
    spectral_rolloff_mean: float
    spectral_bandwidth_mean: float
    rms_energy_mean: float
    rms_energy_std: float
    zero_crossing_rate_mean: float
    mfcc_means: List[float]

class MoodAnalysis(BaseModel):
    mood: str
    valence: str
    arousal: str
    tempo: float
    energy: float

class MusicAnalysis(BaseModel):
    tempo: float
    estimated_key: str
    beat_count: int
    instrumentalness: float
    danceability: float
    harmonic_ratio: float

class TranscriptionInfo(BaseModel):
    text: str
    language: str
    segments: int

class ComprehensiveAudioResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    audio_type: str
    duration: float
    transcription: Optional[TranscriptionInfo] = None
    mood: MoodAnalysis
    features: AudioFeatures
    music_analysis: Optional[MusicAnalysis] = None
    summary: str
    file_size: int
    filename: str

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(None, description="Language code (auto-detect if None)")
):
    """
    Transcribe audio to text using Whisper
    
    - **audio**: Audio file (MP3, WAV, M4A, FLAC, OGG)
    - **language**: Optional language code for transcription (auto-detect if not provided)
    
    Returns transcription with timestamps and detected language.
    """
    # Validate file type
    allowed_types = {'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/x-m4a'}
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {audio.content_type}. Supported: MP3, WAV, M4A, FLAC, OGG"
        )
    
    # Check file size (max 25MB)
    max_size = 25 * 1024 * 1024  # 25MB
    if audio.size and audio.size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )
    
    temp_path = None
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio.filename)[1]) as temp_file:
            temp_path = temp_file.name
            content = await audio.read()
            temp_file.write(content)
        
        logger.info(f"Transcribing audio: {audio.filename} ({len(content)} bytes)")
        
        # Transcribe audio
        result = await multimodal_service.transcribe_audio(
            audio_path=temp_path,
            language=language
        )
        
        if not result["success"]:
            logger.error(f"Audio transcription failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Audio transcription failed: {result.get('error', 'Unknown error')}"
            )
        
        # Convert segments to response format
        segments = []
        for segment in result.get("segments", []):
            if isinstance(segment, dict):
                segments.append(AudioSegment(
                    start=segment.get("start", 0),
                    end=segment.get("end", 0),
                    text=segment.get("text", "").strip()
                ))
        
        return TranscriptionResponse(
            success=True,
            transcription=result["transcription"],
            language=result["language"],
            segments=segments,
            model_used=result.get("model_used", ""),
            file_size=len(content),
            filename=audio.filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in audio transcription: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

@router.post("/audio", response_model=ComprehensiveAudioResponse)
async def analyze_audio_comprehensive(
    audio: UploadFile = File(..., description="Audio file to analyze comprehensively")
):
    """
    Comprehensive audio analysis using librosa
    
    - **audio**: Audio file (MP3, WAV, M4A, FLAC, OGG)
    
    Returns detailed analysis including transcription, mood, music features, and audio characteristics.
    """
    # Validate file type
    allowed_types = {'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg', 'audio/x-m4a'}
    if audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {audio.content_type}. Supported: MP3, WAV, M4A, FLAC, OGG"
        )
    
    # Check file size (max 25MB)
    max_size = 25 * 1024 * 1024  # 25MB
    if audio.size and audio.size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )
    
    temp_path = None
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio.filename)[1]) as temp_file:
            temp_path = temp_file.name
            content = await audio.read()
            temp_file.write(content)
        
        logger.info(f"Comprehensively analyzing audio: {audio.filename} ({len(content)} bytes)")
        
        # Analyze audio comprehensively
        result = await multimodal_service.analyze_audio_comprehensive(
            audio_path=temp_path
        )
        
        if not result["success"]:
            logger.error(f"Comprehensive audio analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Comprehensive audio analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        analysis = result["analysis"]
        
        # Convert to response format
        features = AudioFeatures(**analysis["features"])
        mood = MoodAnalysis(**analysis["mood"])
        
        transcription_info = None
        if analysis.get("transcription") and analysis["transcription"].get("text"):
            transcription_info = TranscriptionInfo(
                text=analysis["transcription"]["text"],
                language=analysis["transcription"]["language"],
                segments=analysis["transcription"]["segments"]
            )
        
        music_analysis = None
        if analysis.get("music_analysis"):
            music_analysis = MusicAnalysis(**analysis["music_analysis"])
        
        return ComprehensiveAudioResponse(
            success=True,
            audio_type=analysis["audio_type"],
            duration=analysis["duration"],
            transcription=transcription_info,
            mood=mood,
            features=features,
            music_analysis=music_analysis,
            summary=analysis["summary"],
            file_size=len(content),
            filename=audio.filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in comprehensive audio analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

@router.post("/transcribe/path")
async def transcribe_audio_by_path(
    audio_path: str = Form(..., description="Path to audio file or HTTP URL"),
    language: Optional[str] = Form(None, description="Language code (auto-detect if None)")
):
    """
    Transcribe audio by file path or HTTP URL
    
    - **audio_path**: Full path to the audio file or HTTP/HTTPS URL
    - **language**: Optional language code for transcription
    
    Supports both local files and remote audio via HTTP URLs.
    """
    # Check if it's a URL or local path
    is_url = audio_path.startswith(('http://', 'https://'))
    
    if not is_url:
        # Local file validation
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail=f"Audio file not found: {audio_path}")
        
        # Check if it's an audio file
        valid_extensions = {'.mp3', '.wav', '.m4a', '.flac', '.ogg'}
        file_ext = os.path.splitext(audio_path)[1].lower()
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: {file_ext}. Supported: {', '.join(valid_extensions)}"
            )
    
    try:
        source_type = "URL" if is_url else "local path"
        logger.info(f"Transcribing audio by {source_type}: {audio_path}")
        
        result = await multimodal_service.transcribe_audio(
            audio_path_or_url=audio_path,
            language=language
        )
        
        if not result["success"]:
            logger.error(f"Audio transcription failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Audio transcription failed: {result.get('error', 'Unknown error')}"
            )
        
        # Convert segments to response format
        segments = []
        for segment in result.get("segments", []):
            if isinstance(segment, dict):
                segments.append(AudioSegment(
                    start=segment.get("start", 0),
                    end=segment.get("end", 0),
                    text=segment.get("text", "").strip()
                ))
        
        filename = os.path.basename(audio_path) if not is_url else f"audio_from_url.{audio_path.split('.')[-1] if '.' in audio_path else 'mp3'}"
        
        return TranscriptionResponse(
            success=True,
            transcription=result["transcription"],
            language=result["language"],
            segments=segments,
            model_used=result.get("model_used", ""),
            file_size=result.get("file_size", 0),
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in audio transcription: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/audio/path")
async def analyze_audio_comprehensive_by_path(
    audio_path: str = Form(..., description="Path to audio file or HTTP URL"),
    start_time: Optional[float] = Form(None, description="Start time in seconds for timeframe analysis"),
    end_time: Optional[float] = Form(None, description="End time in seconds for timeframe analysis")
):
    """
    Comprehensive audio analysis by file path or HTTP URL
    
    - **audio_path**: Full path to the audio file or HTTP/HTTPS URL
    
    Supports both local files and remote audio via HTTP URLs.
    """
    # Check if it's a URL or local path
    is_url = audio_path.startswith(('http://', 'https://'))
    
    if not is_url:
        # Local file validation
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail=f"Audio file not found: {audio_path}")
        
        # Check if it's an audio file
        valid_extensions = {'.mp3', '.wav', '.m4a', '.flac', '.ogg'}
        file_ext = os.path.splitext(audio_path)[1].lower()
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: {file_ext}. Supported: {', '.join(valid_extensions)}"
            )
    
    try:
        source_type = "URL" if is_url else "local path"
        timeframe_info = ""
        if start_time is not None and end_time is not None:
            timeframe_info = f" (timeframe: {start_time}s-{end_time}s)"
        logger.info(f"Comprehensively analyzing audio by {source_type}: {audio_path}{timeframe_info}")
        
        result = await multimodal_service.analyze_audio_comprehensive(
            audio_path_or_url=audio_path,
            start_time=start_time,
            end_time=end_time
        )
        
        if not result["success"]:
            logger.error(f"Comprehensive audio analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Comprehensive audio analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        analysis = result["analysis"]
        
        # Convert to response format
        features = AudioFeatures(**analysis["features"])
        mood = MoodAnalysis(**analysis["mood"])
        
        transcription_info = None
        if analysis.get("transcription") and analysis["transcription"].get("text"):
            transcription_info = TranscriptionInfo(
                text=analysis["transcription"]["text"],
                language=analysis["transcription"]["language"],
                segments=analysis["transcription"]["segments"]
            )
        
        music_analysis = None
        if analysis.get("music_analysis"):
            music_analysis = MusicAnalysis(**analysis["music_analysis"])
        
        filename = os.path.basename(audio_path) if not is_url else f"audio_from_url.{audio_path.split('.')[-1] if '.' in audio_path else 'mp3'}"
        
        return ComprehensiveAudioResponse(
            success=True,
            audio_type=analysis["audio_type"],
            duration=analysis["duration"],
            transcription=transcription_info,
            mood=mood,
            features=features,
            music_analysis=music_analysis,
            summary=analysis["summary"],
            file_size=result.get("file_size", 0),
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in comprehensive audio analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
