"""
FastAPI main application for Multimodal Analysis API
"""
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import (
    API_TITLE, API_DESCRIPTION, API_VERSION, CORS_ORIGINS, 
    MAX_UPLOAD_SIZE_MB, LOG_LEVEL
)
from app.models.model_manager import model_manager
from app.utils.error_handlers import setup_error_handlers
from app.routers import health, image, video, audio, batch
from app.routers import text, enhanced_image, enhanced_video, enhanced_audio, status

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info("Starting Multimodal Analysis API...")
    
    # Load models in background
    logger.info("Loading ML models...")
    success = model_manager.load_all_models()
    
    if success:
        logger.info("All models loaded successfully")
    else:
        logger.error("Failed to load some models")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Multimodal Analysis API...")


# Create FastAPI application
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    # Ensure docs work on Vercel
    root_path="",
    servers=[
        {"url": "https://truly-ai-backend.vercel.app", "description": "Production"},
        {"url": "http://localhost:8000", "description": "Development"}
    ]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "0.0.0.0", "*.vercel.app", "truly-ai-backend.vercel.app"]
)

# Setup error handlers
setup_error_handlers(app)

# Include routers
app.include_router(health.router)
app.include_router(status.router)

# Original routers
app.include_router(image.router)
app.include_router(video.router)
app.include_router(audio.router)
app.include_router(batch.router)

# Enhanced multimodal routers
app.include_router(text.router)
app.include_router(enhanced_image.router)
app.include_router(enhanced_video.router)
app.include_router(enhanced_audio.router)


@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "Multimodal Analysis API",
        "version": API_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "health": "/api/health",
        "status": "✅ FastAPI is running on Vercel"
    }

@app.get("/test")
async def test_endpoint():
    """
    Simple test endpoint to verify deployment
    """
    return {
        "status": "success",
        "message": "FastAPI backend is working!",
        "docs_url": "https://truly-ai-backend.vercel.app/docs"
    }


@app.get("/api/info")
async def api_info():
    """
    API information endpoint
    """
    return {
        "title": API_TITLE,
        "description": API_DESCRIPTION,
        "version": API_VERSION,
        "max_upload_size_mb": MAX_UPLOAD_SIZE_MB,
        "endpoints": {
            "health": "/api/health",
            "status": "/api/status",
            "service_info": "/api/info",
            "text_analysis": "/api/analyze/text",
            "image_analysis": "/api/analyze/image",
            "image_analysis_by_path": "/api/analyze/image/path",
            "video_analysis": "/api/analyze/video",
            "video_analysis_by_path": "/api/analyze/video/path",
            "audio_transcription": "/api/analyze/transcribe",
            "audio_transcription_by_path": "/api/analyze/transcribe/path",
            "comprehensive_audio_analysis": "/api/analyze/audio",
            "comprehensive_audio_analysis_by_path": "/api/analyze/audio/path",
            "batch_analysis": "/api/analyze/batch"
        },
        "supported_formats": {
            "image": ["jpg", "jpeg", "png", "webp", "bmp", "gif"],
            "video": ["mp4", "avi", "mov", "mkv"],
            "audio": ["mp3", "wav", "m4a", "flac", "ogg"]
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=LOG_LEVEL.lower()
    )
