"""
Health check endpoint
"""
from fastapi import APIRouter, HTTPException
from app.models.model_manager import model_manager
from app.utils.response_formatter import ResponseFormatter

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health_check():
    """
    Health check endpoint
    
    Returns:
        Health status and system information
    """
    try:
        health_data = model_manager.health_check()
        return ResponseFormatter.success_response(health_data)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )
