"""
File validation utilities for multimodal analysis
"""
import os
import mimetypes
from pathlib import Path
from typing import Tuple, Optional
from fastapi import HTTPException, UploadFile

from app.config import FILE_LIMITS, SUPPORTED_FORMATS


class FileValidator:
    """Validates uploaded files for type, size, and format"""
    
    @staticmethod
    def validate_file_type(file: UploadFile, expected_type: str) -> bool:
        """
        Validate if file type matches expected type
        
        Args:
            file: Uploaded file
            expected_type: Expected type ('image', 'video', 'audio')
            
        Returns:
            True if valid, raises HTTPException if invalid
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        file_ext = Path(file.filename).suffix.lower()
        
        if file_ext not in SUPPORTED_FORMATS[expected_type]:
            supported = ", ".join(SUPPORTED_FORMATS[expected_type])
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_ext}' is not supported for {expected_type}. Supported types: {supported}"
            )
        
        return True
    
    @staticmethod
    def validate_file_size(file: UploadFile, file_type: str) -> bool:
        """
        Validate file size against limits
        
        Args:
            file: Uploaded file
            file_type: Type of file ('image', 'video', 'audio')
            
        Returns:
            True if valid, raises HTTPException if too large
        """
        # Get file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        max_size = FILE_LIMITS[file_type]
        
        if file_size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            file_size_mb = file_size / (1024 * 1024)
            raise HTTPException(
                status_code=413,
                detail=f"File size {file_size_mb:.1f}MB exceeds maximum allowed size of {max_size_mb:.0f}MB"
            )
        
        return True
    
    @staticmethod
    def validate_content_type(file: UploadFile, expected_type: str) -> bool:
        """
        Validate MIME type of uploaded file
        
        Args:
            file: Uploaded file
            expected_type: Expected type ('image', 'video', 'audio')
            
        Returns:
            True if valid
        """
        if not file.content_type:
            return True  # Skip if no content type provided
        
        main_type = file.content_type.split('/')[0]
        
        type_mapping = {
            'image': 'image',
            'video': 'video', 
            'audio': 'audio'
        }
        
        expected_main_type = type_mapping.get(expected_type)
        
        if expected_main_type and main_type != expected_main_type:
            raise HTTPException(
                status_code=400,
                detail=f"Content type '{file.content_type}' does not match expected type '{expected_type}'"
            )
        
        return True
    
    @classmethod
    def validate_upload(cls, file: UploadFile, file_type: str) -> bool:
        """
        Complete validation of uploaded file
        
        Args:
            file: Uploaded file
            file_type: Expected file type ('image', 'video', 'audio')
            
        Returns:
            True if all validations pass
        """
        cls.validate_file_type(file, file_type)
        cls.validate_file_size(file, file_type)
        cls.validate_content_type(file, file_type)
        
        return True
    
    @staticmethod
    def get_file_info(file: UploadFile) -> dict:
        """
        Get basic information about uploaded file
        
        Args:
            file: Uploaded file
            
        Returns:
            Dictionary with file information
        """
        # Get file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": file_size,
            "size_mb": round(file_size / (1024 * 1024), 2),
            "extension": Path(file.filename).suffix.lower() if file.filename else None
        }
