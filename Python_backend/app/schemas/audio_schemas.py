"""
Pydantic schemas for audio analysis endpoints
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class AudioAnalysisOptions(BaseModel):
    """Options for audio analysis"""
    include_timestamps: bool = Field(default=True, description="Include segment timestamps")
    word_level_timestamps: bool = Field(default=False, description="Include word-level timestamps")


class AudioAnalysisRequest(BaseModel):
    """Request schema for audio analysis"""
    language: Optional[str] = Field(default="auto", description="Language code or 'auto' for detection")
    options: Optional[AudioAnalysisOptions] = Field(default_factory=AudioAnalysisOptions)


class AudioWordTimestamp(BaseModel):
    """Word-level timestamp information"""
    word: str = Field(description="The word")
    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    confidence: Optional[float] = Field(description="Confidence score for the word")


class AudioSegment(BaseModel):
    """Audio segment with timestamps"""
    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    text: str = Field(description="Transcribed text for this segment")
    confidence: Optional[float] = Field(description="Confidence score for the segment")
    words: Optional[List[AudioWordTimestamp]] = Field(description="Word-level timestamps if requested")


class AudioMetadata(BaseModel):
    """Metadata for audio analysis"""
    duration_seconds: Optional[float] = Field(description="Audio duration in seconds")
    processing_time_ms: float = Field(description="Processing time in milliseconds")
    model: str = Field(description="Model used for transcription")


class AudioAnalysisResult(BaseModel):
    """Result of audio analysis"""
    transcription: str = Field(description="Full transcription text")
    language: str = Field(description="Detected or specified language")
    confidence: float = Field(description="Overall confidence score")
    segments: List[AudioSegment] = Field(description="Transcription segments with timestamps")
    metadata: AudioMetadata


class AudioAnalysisResponse(BaseModel):
    """Response schema for audio analysis"""
    success: bool = Field(description="Whether the analysis was successful")
    type: str = Field(default="audio", description="Type of analysis")
    data: AudioAnalysisResult
    timestamp: str = Field(description="ISO timestamp of response")
