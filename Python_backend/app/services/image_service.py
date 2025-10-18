"""
Image analysis service
"""
import logging
import time
from io import BytesIO
from PIL import Image
from typing import Dict, Any
from fastapi import UploadFile

from app.models.model_manager import model_manager
from app.schemas.image_schemas import ImageAnalysisRequest
from app.utils.file_validator import FileValidator

logger = logging.getLogger(__name__)


class ImageService:
    """Service for image analysis operations"""
    
    @staticmethod
    async def analyze_image(
        file: UploadFile,
        request: ImageAnalysisRequest
    ) -> Dict[str, Any]:
        """
        Analyze an uploaded image
        
        Args:
            file: Uploaded image file
            request: Analysis request parameters
            
        Returns:
            Analysis results dictionary
        """
        start_time = time.time()
        
        try:
            # Validate file
            FileValidator.validate_upload(file, "image")
            
            # Read and process image
            image_bytes = await file.read()
            image = Image.open(BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Get model and analyze
            moondream_model = model_manager.get_moondream_model()
            
            result = moondream_model.analyze_image(
                image=image,
                prompt=request.prompt,
                max_length=request.options.max_length
            )
            
            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000
            
            # Format response
            return {
                "description": result["description"],
                "metadata": {
                    "processing_time_ms": processing_time_ms,
                    "model": result["model"],
                    "image_size": result["image_size"],
                    "prompt_used": result["prompt_used"]
                }
            }
            
        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}")
            raise
        
        finally:
            # Reset file position for potential reuse
            await file.seek(0)
    
    @staticmethod
    def get_image_info(image: Image.Image) -> Dict[str, Any]:
        """
        Get basic information about an image
        
        Args:
            image: PIL Image object
            
        Returns:
            Image information dictionary
        """
        return {
            "size": list(image.size),
            "mode": image.mode,
            "format": image.format,
            "has_transparency": image.mode in ('RGBA', 'LA') or 'transparency' in image.info
        }
