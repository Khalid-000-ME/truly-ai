"""
Server startup script for Multimodal Analysis API
"""
import uvicorn
import os
import sys
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

from app.config import LOG_LEVEL


def main():
    """
    Main function to start the server
    """
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() == "true"
    workers = int(os.getenv("WORKERS", "1"))
    
    print(f"Starting Multimodal Analysis API on {host}:{port}")
    print(f"Log level: {LOG_LEVEL}")
    print(f"Reload: {reload}")
    print(f"Workers: {workers}")
    print("Documentation available at: http://localhost:8000/docs")
    print("Health check available at: http://localhost:8000/api/health")
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        workers=workers if not reload else 1,  # Can't use workers with reload
        log_level=LOG_LEVEL.lower(),
        access_log=True
    )


if __name__ == "__main__":
    main()
