"""
Response formatting utilities for consistent API responses
"""
from datetime import datetime
from typing import Any, Dict, Optional
from fastapi import HTTPException


class ResponseFormatter:
    """Formats API responses consistently"""
    
    @staticmethod
    def success_response(data: Any, message: Optional[str] = None) -> Dict[str, Any]:
        """
        Format successful response
        
        Args:
            data: Response data
            message: Optional success message
            
        Returns:
            Formatted success response
        """
        response = {
            "success": True,
            "data": data,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        if message:
            response["message"] = message
            
        return response
    
    @staticmethod
    def error_response(
        error_code: str, 
        message: str, 
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Format error response
        
        Args:
            error_code: Error code identifier
            message: Human readable error message
            status_code: HTTP status code
            details: Optional additional error details
            
        Returns:
            Formatted error response
        """
        response = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        if details:
            response["error"]["details"] = details
            
        return response
    
    @staticmethod
    def analysis_response(
        analysis_type: str,
        result: Any,
        metadata: Dict[str, Any],
        processing_time_ms: float
    ) -> Dict[str, Any]:
        """
        Format analysis response
        
        Args:
            analysis_type: Type of analysis ('image', 'video', 'audio')
            result: Analysis result
            metadata: Analysis metadata
            processing_time_ms: Processing time in milliseconds
            
        Returns:
            Formatted analysis response
        """
        data = {
            "type": analysis_type,
            "result": result,
            "metadata": {
                **metadata,
                "processing_time_ms": round(processing_time_ms, 2)
            }
        }
        
        return ResponseFormatter.success_response(data)
    
    @staticmethod
    def health_response(
        status: str,
        models_loaded: bool,
        system_info: Dict[str, Any],
        available_endpoints: list
    ) -> Dict[str, Any]:
        """
        Format health check response
        
        Args:
            status: Health status
            models_loaded: Whether models are loaded
            system_info: System information
            available_endpoints: List of available endpoints
            
        Returns:
            Formatted health response
        """
        data = {
            "status": status,
            "models_loaded": models_loaded,
            "available_endpoints": available_endpoints,
            "system_info": system_info
        }
        
        return ResponseFormatter.success_response(data)


class ErrorCodes:
    """Standard error codes for the API"""
    
    # File validation errors
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_CONTENT_TYPE = "INVALID_CONTENT_TYPE"
    
    # Processing errors
    PROCESSING_FAILED = "PROCESSING_FAILED"
    MODEL_NOT_LOADED = "MODEL_NOT_LOADED"
    TIMEOUT = "TIMEOUT"
    
    # System errors
    OUT_OF_MEMORY = "OUT_OF_MEMORY"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    
    # Request errors
    INVALID_REQUEST = "INVALID_REQUEST"
    MISSING_PARAMETER = "MISSING_PARAMETER"
    INVALID_PARAMETER = "INVALID_PARAMETER"
