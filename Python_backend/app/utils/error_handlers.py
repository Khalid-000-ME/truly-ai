"""
Global error handlers for the FastAPI application
"""
import logging
import traceback
from typing import Dict, Any

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.utils.response_formatter import ResponseFormatter, ErrorCodes

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle HTTP exceptions
    
    Args:
        request: FastAPI request object
        exc: HTTP exception
        
    Returns:
        JSON error response
    """
    # Map HTTP status codes to error codes
    status_code_mapping = {
        400: ErrorCodes.INVALID_REQUEST,
        404: "NOT_FOUND",
        413: ErrorCodes.FILE_TOO_LARGE,
        422: ErrorCodes.INVALID_PARAMETER,
        500: ErrorCodes.INTERNAL_ERROR,
        503: ErrorCodes.SERVICE_UNAVAILABLE
    }
    
    error_code = status_code_mapping.get(exc.status_code, ErrorCodes.INTERNAL_ERROR)
    
    response = ResponseFormatter.error_response(
        error_code=error_code,
        message=str(exc.detail),
        status_code=exc.status_code
    )
    
    logger.warning(f"HTTP {exc.status_code}: {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handle request validation errors
    
    Args:
        request: FastAPI request object
        exc: Validation exception
        
    Returns:
        JSON error response
    """
    error_details = []
    for error in exc.errors():
        error_details.append({
            "field": " -> ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    response = ResponseFormatter.error_response(
        error_code=ErrorCodes.INVALID_PARAMETER,
        message="Request validation failed",
        status_code=422,
        details={"validation_errors": error_details}
    )
    
    logger.warning(f"Validation error: {error_details}")
    
    return JSONResponse(
        status_code=422,
        content=response
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions
    
    Args:
        request: FastAPI request object
        exc: General exception
        
    Returns:
        JSON error response
    """
    # Log the full traceback
    logger.error(f"Unexpected error: {str(exc)}")
    logger.error(traceback.format_exc())
    
    # Check for specific exception types
    if "out of memory" in str(exc).lower() or "oom" in str(exc).lower():
        error_code = ErrorCodes.OUT_OF_MEMORY
        message = "Server is out of memory. Please try again later."
        status_code = 503
    elif "timeout" in str(exc).lower():
        error_code = ErrorCodes.TIMEOUT
        message = "Request timed out. Please try again."
        status_code = 504
    else:
        error_code = ErrorCodes.INTERNAL_ERROR
        message = "An unexpected error occurred. Please try again."
        status_code = 500
    
    response = ResponseFormatter.error_response(
        error_code=error_code,
        message=message,
        status_code=status_code
    )
    
    return JSONResponse(
        status_code=status_code,
        content=response
    )


def setup_error_handlers(app):
    """
    Setup error handlers for the FastAPI app
    
    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
