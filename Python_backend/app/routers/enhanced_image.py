"""
Enhanced Image Analysis Router
Uses AWS Bedrock Nova Pro for image analysis
"""
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from app.services.multimodal_service import multimodal_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/analyze",
    tags=["image"],
    responses={404: {"description": "Not found"}},
)

class ImageAnalysisResponse(BaseModel):
    success: bool
    description: Optional[str] = None
    error: Optional[str] = None
    model_used: Optional[str] = None
    method: Optional[str] = None
    file_size: int
    filename: str

@router.post("/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    image: UploadFile = File(..., description="Image file to analyze"),
    prompt: Optional[str] = Form(None, description="Custom prompt for image analysis")
):
    """
    Analyze an uploaded image using AWS Bedrock Nova Pro
    
    - **image**: Image file (JPG, PNG, WEBP, BMP, GIF)
    - **prompt**: Optional custom prompt for analysis
    
    Returns detailed description of the image content, objects, people, setting, and text.
    """
    # Validate file type
    allowed_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'}
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {image.content_type}. Supported: JPG, PNG, WEBP, BMP, GIF"
        )
    
    # Check file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if image.size and image.size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )
    
    temp_path = None
    try:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(image.filename)[1]) as temp_file:
            temp_path = temp_file.name
            content = await image.read()
            temp_file.write(content)
        
        logger.info(f"Analyzing image: {image.filename} ({len(content)} bytes)")
        
        # Analyze image
        result = await multimodal_service.analyze_image(
            image_path=temp_path,
            prompt=prompt
        )
        
        if not result["success"]:
            logger.error(f"Image analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Image analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        return ImageAnalysisResponse(
            success=True,
            description=result["description"],
            model_used=result.get("model_used", ""),
            method=result.get("method", ""),
            file_size=len(content),
            filename=image.filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in image analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass

@router.post("/image/path")
async def analyze_image_by_path(
    image_path: str = Form(..., description="Path to image file or HTTP URL"),
    prompt: Optional[str] = Form(None, description="Custom prompt for image analysis")
):
    """
    Analyze an image by file path or HTTP URL
    
    - **image_path**: Full path to the image file or HTTP/HTTPS URL
    - **prompt**: Optional custom prompt for analysis
    
    Supports both local files and remote images via HTTP URLs.
    """
    # Check if it's a URL or local path
    is_url = image_path.startswith(('http://', 'https://'))
    
    if not is_url:
        # Local file validation
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")
        
        # Check if it's an image file
        valid_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'}
        file_ext = os.path.splitext(image_path)[1].lower()
        if file_ext not in valid_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension: {file_ext}. Supported: {', '.join(valid_extensions)}"
            )
    
    try:
        source_type = "URL" if is_url else "local path"
        logger.info(f"Analyzing image by {source_type}: {image_path}")
        
        result = await multimodal_service.analyze_image(
            image_path_or_url=image_path,
            prompt=prompt
        )
        
        if not result["success"]:
            logger.error(f"Image analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Image analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        filename = os.path.basename(image_path) if not is_url else f"image_from_url.{image_path.split('.')[-1] if '.' in image_path else 'jpg'}"
        
        return ImageAnalysisResponse(
            success=True,
            description=result["description"],
            model_used=result.get("model_used", ""),
            method=result.get("method", ""),
            file_size=result.get("file_size", 0),
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in image analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
