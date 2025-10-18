"""
Pydantic schemas for video analysis endpoints
"""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class VideoAnalysisOptions(BaseModel):
    """Options for video analysis"""
    include_timestamps: bool = Field(default=True, description="Include timestamps in frame analysis")
    frame_sampling: Literal["uniform", "keyframes"] = Field(default="uniform", description="Frame sampling method")


class VideoAnalysisRequest(BaseModel):
    """Request schema for video analysis"""
    num_frames: int = Field(default=5, ge=1, le=20, description="Number of frames to analyze")
    prompt: Optional[str] = Field(default=None, description="Custom prompt for frame analysis")
    options: Optional[VideoAnalysisOptions] = Field(default_factory=VideoAnalysisOptions)


class VideoFrameAnalysis(BaseModel):
    """Analysis result for a single video frame"""
    timestamp: float = Field(description="Timestamp of frame in seconds")
    frame_number: int = Field(description="Frame number in video")
    description: str = Field(description="Description of what's happening in the frame")


class VideoMetadata(BaseModel):
    """Metadata for video analysis"""
    duration_seconds: float = Field(description="Video duration in seconds")
    fps: float = Field(description="Frames per second")
    resolution: List[int] = Field(description="Video resolution [width, height]")
    total_frames: int = Field(description="Total number of frames in video")
    processing_time_ms: float = Field(description="Processing time in milliseconds")


class VideoAnalysisResult(BaseModel):
    """Result of video analysis"""
    metadata: VideoMetadata
    frames: List[VideoFrameAnalysis] = Field(description="Analysis of individual frames")
    summary: str = Field(description="Overall video description")


class VideoAnalysisResponse(BaseModel):
    """Response schema for video analysis"""
    success: bool = Field(description="Whether the analysis was successful")
    type: str = Field(default="video", description="Type of analysis")
    data: VideoAnalysisResult
    timestamp: str = Field(description="ISO timestamp of response")
