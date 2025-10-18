"""
Image analysis endpoints
"""
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional

from app.services.image_service import ImageService
from app.schemas.image_schemas import ImageAnalysisRequest, ImageAnalysisOptions
from app.utils.response_formatter import ResponseFormatter, ErrorCodes
from app.models.model_manager import model_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyze", tags=["image"])


def get_image_request(
    prompt: Optional[str] = Form(None),
    max_length: int = Form(200)
) -> ImageAnalysisRequest:
    """
    Parse form data into ImageAnalysisRequest
    """
    options = ImageAnalysisOptions(max_length=max_length)
    return ImageAnalysisRequest(prompt=prompt, options=options)


@router.post("/image")
async def analyze_image(
    image: UploadFile = File(..., description="Image file to analyze"),
    request: ImageAnalysisRequest = Depends(get_image_request)
):
    """
    Analyze an uploaded image
    
    Args:
        image: Image file (JPG, PNG, WEBP, BMP, GIF)
        request: Analysis parameters
        
    Returns:
        Image analysis results
    """
    try:
        # Check if models are loaded
        if not model_manager.is_ready():
            raise HTTPException(
                status_code=503,
                detail="Models not loaded. Please wait for initialization to complete."
            )
        
        # Analyze image
        result = await ImageService.analyze_image(image, request)
        
        return ResponseFormatter.analysis_response(
            analysis_type="image",
            result=result,
            metadata=result["metadata"],
            processing_time_ms=result["metadata"]["processing_time_ms"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image analysis endpoint failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {str(e)}"
        )
