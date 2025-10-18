"""
Moondream2 model wrapper for image and video analysis
"""
import logging
import torch
from PIL import Image
from typing import Optional, Dict, Any
from transformers import AutoModelForCausalLM, AutoTokenizer

from app.config import MOONDREAM_CONFIG, DEFAULT_PROMPTS, DEFAULT_MAX_LENGTH

logger = logging.getLogger(__name__)


class MoondreamModel:
    """Wrapper for Moondream2 vision-language model"""
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = MOONDREAM_CONFIG["device"]
        self.loaded = False
    
    def load_model(self) -> bool:
        """
        Load the Moondream2 model and tokenizer
        
        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            logger.info("Loading Moondream2 model...")
            
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                MOONDREAM_CONFIG["model_name"],
                torch_dtype=getattr(torch, MOONDREAM_CONFIG["torch_dtype"]),
                device_map=self.device,
                trust_remote_code=MOONDREAM_CONFIG["trust_remote_code"]
            )
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                MOONDREAM_CONFIG["model_name"],
                trust_remote_code=MOONDREAM_CONFIG["trust_remote_code"]
            )
            
            # Set to evaluation mode
            self.model.eval()
            
            self.loaded = True
            logger.info("Moondream2 model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load Moondream2 model: {str(e)}")
            self.loaded = False
            return False
    
    def analyze_image(
        self, 
        image: Image.Image, 
        prompt: Optional[str] = None,
        max_length: int = DEFAULT_MAX_LENGTH
    ) -> Dict[str, Any]:
        """
        Analyze an image with the given prompt
        
        Args:
            image: PIL Image object
            prompt: Text prompt for analysis
            max_length: Maximum length of generated text
            
        Returns:
            Dictionary with analysis results
        """
        if not self.loaded:
            raise RuntimeError("Model not loaded")
        
        if prompt is None:
            prompt = DEFAULT_PROMPTS["image"]
        
        try:
            # Encode the image and prompt
            enc_image = self.model.encode_image(image)
            
            # Generate response
            response = self.model.answer_question(
                enc_image, 
                prompt, 
                self.tokenizer,
                max_new_tokens=max_length
            )
            
            return {
                "description": response.strip(),
                "prompt_used": prompt,
                "model": "moondream2",
                "image_size": list(image.size)
            }
            
        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}")
            raise RuntimeError(f"Image analysis failed: {str(e)}")
    
    def analyze_video_frame(
        self,
        frame: Image.Image,
        prompt: Optional[str] = None,
        frame_number: int = 0,
        timestamp: float = 0.0,
        max_length: int = DEFAULT_MAX_LENGTH
    ) -> Dict[str, Any]:
        """
        Analyze a single video frame
        
        Args:
            frame: PIL Image object of the frame
            prompt: Text prompt for analysis
            frame_number: Frame number in video
            timestamp: Timestamp of frame in seconds
            max_length: Maximum length of generated text
            
        Returns:
            Dictionary with frame analysis results
        """
        if not self.loaded:
            raise RuntimeError("Model not loaded")
        
        if prompt is None:
            prompt = DEFAULT_PROMPTS["video"]
        
        try:
            # Analyze the frame as an image
            result = self.analyze_image(frame, prompt, max_length)
            
            # Add video-specific metadata
            result.update({
                "frame_number": frame_number,
                "timestamp": timestamp,
                "frame_size": list(frame.size)
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Video frame analysis failed: {str(e)}")
            raise RuntimeError(f"Video frame analysis failed: {str(e)}")
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.loaded
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_name": MOONDREAM_CONFIG["model_name"],
            "device": self.device,
            "loaded": self.loaded,
            "torch_dtype": MOONDREAM_CONFIG["torch_dtype"]
        }
