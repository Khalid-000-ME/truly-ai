"""
Singleton model manager for loading and managing ML models
"""
import logging
import psutil
from typing import Dict, Any, Optional
from threading import Lock

from app.models.moondream_model import MoondreamModel
from app.models.whisper_model import WhisperModel

logger = logging.getLogger(__name__)


class ModelManager:
    """Singleton class to manage all ML models"""
    
    _instance: Optional['ModelManager'] = None
    _lock = Lock()
    
    def __new__(cls) -> 'ModelManager':
        """Ensure singleton pattern"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize model manager"""
        if hasattr(self, 'initialized'):
            return
        
        self.moondream_model = MoondreamModel()
        self.whisper_model = WhisperModel()
        self.models_loaded = False
        self.initialization_error = None
        self.initialized = True
        
        logger.info("ModelManager initialized")
    
    def load_all_models(self) -> bool:
        """
        Load all models
        
        Returns:
            True if all models loaded successfully
        """
        logger.info("Starting to load all models...")
        
        success = True
        errors = []
        
        try:
            # Load Moondream model
            if not self.moondream_model.load_model():
                success = False
                errors.append("Failed to load Moondream model")
            
            # Load Whisper model
            if not self.whisper_model.load_model():
                success = False
                errors.append("Failed to load Whisper model")
            
            if success:
                self.models_loaded = True
                logger.info("All models loaded successfully")
            else:
                self.initialization_error = "; ".join(errors)
                logger.error(f"Model loading failed: {self.initialization_error}")
            
        except Exception as e:
            success = False
            self.initialization_error = str(e)
            logger.error(f"Unexpected error during model loading: {str(e)}")
        
        return success
    
    def get_moondream_model(self) -> MoondreamModel:
        """Get Moondream model instance"""
        if not self.models_loaded:
            raise RuntimeError("Models not loaded")
        return self.moondream_model
    
    def get_whisper_model(self) -> WhisperModel:
        """Get Whisper model instance"""
        if not self.models_loaded:
            raise RuntimeError("Models not loaded")
        return self.whisper_model
    
    def is_ready(self) -> bool:
        """Check if all models are loaded and ready"""
        return self.models_loaded and self.moondream_model.is_loaded() and self.whisper_model.is_loaded()
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get current system information"""
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            
            return {
                "memory_usage_mb": round((memory.total - memory.available) / (1024 * 1024), 1),
                "available_memory_mb": round(memory.available / (1024 * 1024), 1),
                "memory_percent": memory.percent,
                "cpu_usage_percent": cpu_percent,
                "total_memory_mb": round(memory.total / (1024 * 1024), 1)
            }
        except Exception as e:
            logger.warning(f"Failed to get system info: {str(e)}")
            return {
                "memory_usage_mb": 0,
                "available_memory_mb": 0,
                "memory_percent": 0,
                "cpu_usage_percent": 0,
                "total_memory_mb": 0
            }
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get status of all models"""
        return {
            "models_loaded": self.models_loaded,
            "initialization_error": self.initialization_error,
            "moondream": {
                "loaded": self.moondream_model.is_loaded(),
                "info": self.moondream_model.get_model_info()
            },
            "whisper": {
                "loaded": self.whisper_model.is_loaded(),
                "info": self.whisper_model.get_model_info()
            }
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        system_info = self.get_system_info()
        model_status = self.get_model_status()
        
        # Determine overall health status
        if self.is_ready():
            if system_info.get("memory_percent", 0) > 90:
                status = "degraded"
            else:
                status = "healthy"
        else:
            status = "unhealthy"
        
        return {
            "status": status,
            "models_loaded": self.models_loaded,
            "system_info": system_info,
            "model_status": model_status,
            "available_endpoints": [
                "/api/analyze/image",
                "/api/analyze/video", 
                "/api/analyze/audio",
                "/api/analyze/batch",
                "/api/health"
            ] if self.is_ready() else []
        }


# Global model manager instance
model_manager = ModelManager()
