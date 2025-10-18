"""
Test file validation utilities
"""
import pytest
from io import BytesIO
from fastapi import UploadFile, HTTPException
from app.utils.file_validator import FileValidator


def create_mock_upload_file(filename: str, content: bytes, content_type: str = None):
    """Create a mock UploadFile for testing"""
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        content_type=content_type
    )


def test_validate_image_file_type():
    """Test image file type validation"""
    # Valid image file
    file = create_mock_upload_file("test.jpg", b"fake image data", "image/jpeg")
    assert FileValidator.validate_file_type(file, "image") is True
    
    # Invalid file type
    file = create_mock_upload_file("test.txt", b"text data", "text/plain")
    with pytest.raises(HTTPException) as exc_info:
        FileValidator.validate_file_type(file, "image")
    assert exc_info.value.status_code == 400


def test_validate_video_file_type():
    """Test video file type validation"""
    # Valid video file
    file = create_mock_upload_file("test.mp4", b"fake video data", "video/mp4")
    assert FileValidator.validate_file_type(file, "video") is True
    
    # Invalid file type
    file = create_mock_upload_file("test.jpg", b"image data", "image/jpeg")
    with pytest.raises(HTTPException) as exc_info:
        FileValidator.validate_file_type(file, "video")
    assert exc_info.value.status_code == 400


def test_validate_audio_file_type():
    """Test audio file type validation"""
    # Valid audio file
    file = create_mock_upload_file("test.mp3", b"fake audio data", "audio/mpeg")
    assert FileValidator.validate_file_type(file, "audio") is True
    
    # Invalid file type
    file = create_mock_upload_file("test.mp4", b"video data", "video/mp4")
    with pytest.raises(HTTPException) as exc_info:
        FileValidator.validate_file_type(file, "audio")
    assert exc_info.value.status_code == 400


def test_validate_file_size():
    """Test file size validation"""
    # Small file (should pass)
    small_content = b"x" * 1000  # 1KB
    file = create_mock_upload_file("test.jpg", small_content)
    assert FileValidator.validate_file_size(file, "image") is True
    
    # Large file (should fail)
    large_content = b"x" * (15 * 1024 * 1024)  # 15MB
    file = create_mock_upload_file("test.jpg", large_content)
    with pytest.raises(HTTPException) as exc_info:
        FileValidator.validate_file_size(file, "image")
    assert exc_info.value.status_code == 413


def test_get_file_info():
    """Test file info extraction"""
    content = b"test content"
    file = create_mock_upload_file("test.jpg", content, "image/jpeg")
    
    info = FileValidator.get_file_info(file)
    
    assert info["filename"] == "test.jpg"
    assert info["content_type"] == "image/jpeg"
    assert info["size_bytes"] == len(content)
    assert info["extension"] == ".jpg"


def test_validate_upload_complete():
    """Test complete file validation"""
    # Valid file
    content = b"x" * 1000  # 1KB
    file = create_mock_upload_file("test.jpg", content, "image/jpeg")
    assert FileValidator.validate_upload(file, "image") is True
    
    # Invalid file type
    file = create_mock_upload_file("test.txt", content, "text/plain")
    with pytest.raises(HTTPException):
        FileValidator.validate_upload(file, "image")
