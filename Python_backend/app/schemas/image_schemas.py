"""
Pydantic schemas for image analysis endpoints
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class ImageAnalysisOptions(BaseModel):
    """Options for image analysis"""
    max_length: int = Field(default=200, ge=50, le=500, description="Maximum length of generated description")


class ImageAnalysisRequest(BaseModel):
    """Request schema for image analysis"""
    prompt: Optional[str] = Field(default=None, description="Custom prompt for image analysis")
    options: Optional[ImageAnalysisOptions] = Field(default_factory=ImageAnalysisOptions)


class ImageAnalysisMetadata(BaseModel):
    """Metadata for image analysis response"""
    processing_time_ms: float = Field(description="Processing time in milliseconds")
    model: str = Field(description="Model used for analysis")
    image_size: List[int] = Field(description="Image dimensions [width, height]")
    prompt_used: str = Field(description="Actual prompt used for analysis")


class ImageAnalysisResult(BaseModel):
    """Result of image analysis"""
    description: str = Field(description="Generated description of the image")
    metadata: ImageAnalysisMetadata


class ImageAnalysisResponse(BaseModel):
    """Response schema for image analysis"""
    success: bool = Field(description="Whether the analysis was successful")
    type: str = Field(default="image", description="Type of analysis")
    data: ImageAnalysisResult
    timestamp: str = Field(description="ISO timestamp of response")
