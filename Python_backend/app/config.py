"""
Configuration settings for the Multimodal Analysis API
"""
import os
from pathlib import Path
from typing import Dict, Any

# Environment variables with defaults
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", str(Path.home() / ".cache" / "multimodal_models"))
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "2"))
REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "60"))
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Model configurations
MOONDREAM_CONFIG: Dict[str, Any] = {
    "model_name": "vikhyatk/moondream2",
    "torch_dtype": "float32",  # CPU inference
    "device": "cpu",
    "trust_remote_code": True
}

WHISPER_CONFIG: Dict[str, Any] = {
    "model_size": WHISPER_MODEL_SIZE,
    "device": "cpu",
    "fp16": False  # Must be False for CPU
}

# File size limits (in bytes)
FILE_LIMITS: Dict[str, int] = {
    "image": 10 * 1024 * 1024,  # 10MB
    "video": 100 * 1024 * 1024,  # 100MB
    "audio": 50 * 1024 * 1024   # 50MB
}

# Supported file formats
SUPPORTED_FORMATS: Dict[str, list] = {
    "image": [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"],
    "video": [".mp4", ".avi", ".mov", ".mkv"],
    "audio": [".mp3", ".wav", ".m4a", ".flac", ".ogg"]
}

# API settings
API_TITLE = "Multimodal Analysis API"
API_DESCRIPTION = "FastAPI backend for analyzing images, videos, and audio files"
API_VERSION = "1.0.0"

# Default prompts
DEFAULT_PROMPTS: Dict[str, str] = {
    "image": "Describe this image in detail",
    "video": "Describe what's happening in this video frame"
}

# Performance settings
DEFAULT_MAX_LENGTH = 200
DEFAULT_NUM_FRAMES = 5
DEFAULT_FRAME_SAMPLING = "uniform"  # or "keyframes"
