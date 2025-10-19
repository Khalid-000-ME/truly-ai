"""
Vercel entry point for FastAPI application
"""
import os
import sys
from pathlib import Path

# Add the parent directory to Python path so we can import app
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

from app.main import app

# Export the FastAPI app for Vercel
# This will handle all routes including /docs, /redoc, /openapi.json
handler = app

# Ensure the app is properly configured for Vercel
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
