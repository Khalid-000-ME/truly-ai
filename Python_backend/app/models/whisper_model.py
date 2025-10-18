"""
Whisper model wrapper for audio transcription
"""
import logging
import whisper
import numpy as np
from typing import Dict, Any, Optional, List

from app.config import WHISPER_CONFIG

logger = logging.getLogger(__name__)


class WhisperModel:
    """Wrapper for OpenAI Whisper model"""
    
    def __init__(self):
        self.model = None
        self.model_size = WHISPER_CONFIG["model_size"]
        self.device = WHISPER_CONFIG["device"]
        self.loaded = False
    
    def load_model(self) -> bool:
        """
        Load the Whisper model
        
        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            logger.info(f"Loading Whisper {self.model_size} model...")
            
            self.model = whisper.load_model(
                self.model_size,
                device=self.device
            )
            
            self.loaded = True
            logger.info(f"Whisper {self.model_size} model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            self.loaded = False
            return False
    
    def transcribe_audio(
        self,
        audio_path: str,
        language: Optional[str] = None,
        include_timestamps: bool = True,
        word_level_timestamps: bool = False
    ) -> Dict[str, Any]:
        """
        Transcribe audio file
        
        Args:
            audio_path: Path to audio file
            language: Language code (None for auto-detection)
            include_timestamps: Whether to include segment timestamps
            word_level_timestamps: Whether to include word-level timestamps
            
        Returns:
            Dictionary with transcription results
        """
        if not self.loaded:
            raise RuntimeError("Model not loaded")
        
        try:
            # Transcribe with Whisper
            options = {
                "language": language,
                "task": "transcribe",
                "fp16": WHISPER_CONFIG["fp16"]
            }
            
            if word_level_timestamps:
                options["word_timestamps"] = True
            
            result = self.model.transcribe(audio_path, **options)
            
            # Format response
            response = {
                "transcription": result["text"].strip(),
                "language": result["language"],
                "segments": [],
                "model": f"whisper-{self.model_size}"
            }
            
            # Add segments with timestamps if requested
            if include_timestamps and "segments" in result:
                for segment in result["segments"]:
                    segment_data = {
                        "start": segment["start"],
                        "end": segment["end"],
                        "text": segment["text"].strip()
                    }
                    
                    # Add confidence if available
                    if "avg_logprob" in segment:
                        # Convert log probability to confidence (approximate)
                        confidence = min(1.0, max(0.0, np.exp(segment["avg_logprob"])))
                        segment_data["confidence"] = round(confidence, 3)
                    
                    # Add word-level timestamps if requested
                    if word_level_timestamps and "words" in segment:
                        segment_data["words"] = []
                        for word in segment["words"]:
                            word_data = {
                                "word": word["word"],
                                "start": word["start"],
                                "end": word["end"]
                            }
                            if "probability" in word:
                                word_data["confidence"] = round(word["probability"], 3)
                            segment_data["words"].append(word_data)
                    
                    response["segments"].append(segment_data)
            
            # Calculate overall confidence from segments
            if response["segments"]:
                confidences = [s.get("confidence", 0.5) for s in response["segments"]]
                response["confidence"] = round(sum(confidences) / len(confidences), 3)
            else:
                response["confidence"] = 0.8  # Default confidence
            
            return response
            
        except Exception as e:
            logger.error(f"Audio transcription failed: {str(e)}")
            raise RuntimeError(f"Audio transcription failed: {str(e)}")
    
    def detect_language(self, audio_path: str) -> Dict[str, Any]:
        """
        Detect language of audio file
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary with language detection results
        """
        if not self.loaded:
            raise RuntimeError("Model not loaded")
        
        try:
            # Load audio and detect language
            audio = whisper.load_audio(audio_path)
            audio = whisper.pad_or_trim(audio)
            
            # Make log-Mel spectrogram and move to device
            mel = whisper.log_mel_spectrogram(audio).to(self.model.device)
            
            # Detect language
            _, probs = self.model.detect_language(mel)
            
            # Get top language
            detected_language = max(probs, key=probs.get)
            confidence = probs[detected_language]
            
            return {
                "language": detected_language,
                "confidence": round(confidence, 3),
                "all_probabilities": {k: round(v, 3) for k, v in probs.items()}
            }
            
        except Exception as e:
            logger.error(f"Language detection failed: {str(e)}")
            raise RuntimeError(f"Language detection failed: {str(e)}")
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.loaded
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_size": self.model_size,
            "device": self.device,
            "loaded": self.loaded,
            "fp16": WHISPER_CONFIG["fp16"]
        }
