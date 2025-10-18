"""
Test health check endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "status" in data["data"]
    assert "models_loaded" in data["data"]
    assert "system_info" in data["data"]


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert data["message"] == "Multimodal Analysis API"


def test_api_info():
    """Test API info endpoint"""
    response = client.get("/api/info")
    assert response.status_code == 200
    
    data = response.json()
    assert "title" in data
    assert "version" in data
    assert "endpoints" in data
    assert "supported_formats" in data
