"""
Audio analysis service
"""
import logging
import time
import tempfile
import os
from typing import Dict, Any
from fastapi import UploadFile

from app.models.model_manager import model_manager
from app.schemas.audio_schemas import AudioAnalysisRequest
from app.utils.file_validator import FileValidator

logger = logging.getLogger(__name__)


class AudioService:
    """Service for audio analysis operations"""
    
    @staticmethod
    async def transcribe_audio(
        file: UploadFile,
        request: AudioAnalysisRequest
    ) -> Dict[str, Any]:
        """
        Transcribe an uploaded audio file
        
        Args:
            file: Uploaded audio file
            request: Analysis request parameters
            
        Returns:
            Transcription results dictionary
        """
        start_time = time.time()
        temp_path = None
        
        try:
            # Validate file
            FileValidator.validate_upload(file, "audio")
            
            # Save to temporary file
            file_extension = os.path.splitext(file.filename)[1] if file.filename else ".wav"
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                temp_path = temp_file.name
                content = await file.read()
                temp_file.write(content)
            
            # Get audio duration (approximate)
            duration = AudioService._estimate_audio_duration(temp_path)
            
            # Get model and transcribe
            whisper_model = model_manager.get_whisper_model()
            
            # Determine language
            language = request.language if request.language != "auto" else None
            
            result = whisper_model.transcribe_audio(
                audio_path=temp_path,
                language=language,
                include_timestamps=request.options.include_timestamps,
                word_level_timestamps=request.options.word_level_timestamps
            )
            
            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000
            
            # Format response
            return {
                "transcription": result["transcription"],
                "language": result["language"],
                "confidence": result["confidence"],
                "segments": result["segments"],
                "metadata": {
                    "duration_seconds": duration,
                    "processing_time_ms": processing_time_ms,
                    "model": result["model"]
                }
            }
            
        except Exception as e:
            logger.error(f"Audio transcription failed: {str(e)}")
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
    async def detect_language(file: UploadFile) -> Dict[str, Any]:
        """
        Detect language of an uploaded audio file
        
        Args:
            file: Uploaded audio file
            
        Returns:
            Language detection results
        """
        temp_path = None
        
        try:
            # Validate file
            FileValidator.validate_upload(file, "audio")
            
            # Save to temporary file
            file_extension = os.path.splitext(file.filename)[1] if file.filename else ".wav"
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                temp_path = temp_file.name
                content = await file.read()
                temp_file.write(content)
            
            # Get model and detect language
            whisper_model = model_manager.get_whisper_model()
            result = whisper_model.detect_language(temp_path)
            
            return result
            
        except Exception as e:
            logger.error(f"Language detection failed: {str(e)}")
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
    def _estimate_audio_duration(audio_path: str) -> float:
        """
        Estimate audio duration using file size heuristics
        This is a rough estimate - actual duration will be determined during transcription
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Estimated duration in seconds
        """
        try:
            file_size = os.path.getsize(audio_path)
            
            # Rough estimates based on common formats
            # These are very approximate and will be replaced by actual duration from Whisper
            if audio_path.lower().endswith('.mp3'):
                # Assume ~128kbps MP3
                estimated_duration = file_size / (128 * 1024 / 8)
            elif audio_path.lower().endswith('.wav'):
                # Assume 16-bit, 44.1kHz stereo WAV
                estimated_duration = file_size / (44100 * 2 * 2)
            else:
                # Generic estimate
                estimated_duration = file_size / 32000  # Very rough estimate
            
            return max(1.0, estimated_duration)  # At least 1 second
            
        except Exception as e:
            logger.warning(f"Failed to estimate audio duration: {str(e)}")
            return 30.0  # Default estimate
