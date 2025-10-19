# TrulyAI Python Backend API

A FastAPI-based backend service that provides multimodal analysis capabilities for images, videos, and audio files using AWS Bedrock Nova models and cloud-based transcription services.

## Features

- **Image Analysis**: Detailed description generation using AWS Bedrock Nova Pro
- **Video Analysis**: Frame-by-frame analysis with temporal understanding
- **Audio Transcription**: Speech-to-text using AWS Transcribe or OpenAI Whisper API
- **Text Analysis**: Content analysis and insights using AWS Bedrock
- **Cloud-Native**: Leverages AWS infrastructure for scalable processing
- **Multi-Service Fallback**: Automatic fallback between AWS and OpenAI services

## Quick Start

### Prerequisites

- Python 3.11+
- AWS Account with Bedrock access
- AWS credentials configured
- Optional: OpenAI API key for Whisper fallback

### Installation

1. **Clone and navigate to the project:**
```bash
cd Python_backend
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure AWS credentials:**
```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-west-2
```

5. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your preferred settings
```

6. **Start the server:**
```bash
python -m uvicorn app.main:app --reload
```

The API will be available at:
- **API Base**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## API Endpoints

### Core Analysis Endpoints

#### Image Analysis
```http
POST /api/analyze/image/path
Content-Type: multipart/form-data

Parameters:
- image_path: Path to image file or image file
- prompt: Custom analysis prompt (optional)
```

#### Video Analysis
```http
POST /api/analyze/video/path
Content-Type: multipart/form-data

Parameters:
- video_path: Path to video file or video file
- num_frames: Number of frames to analyze (default: 5)
- prompt: Custom analysis prompt (optional)
```

#### Audio Analysis
```http
POST /api/analyze/audio/path
Content-Type: multipart/form-data

Parameters:
- audio_path: Path to audio file or audio file
- language: Language code or "auto" (default: "auto")
```

#### Text Analysis
```http
POST /api/analyze/text
Content-Type: application/json

Parameters:
- text: Text content to analyze
- analysis_type: Type of analysis (default: "insights")
- context: Additional context (optional)
```

#### Batch Analysis
```http
POST /api/analyze/batch
Content-Type: multipart/form-data

Parameters:
- files: Multiple files (up to 10 files)
```

### Utility Endpoints

#### Health Check
```http
GET /api/health
```

#### Language Detection
```http
POST /api/analyze/audio/detect-language
Content-Type: multipart/form-data

Parameters:
- audio: Audio file for language detection
```

#### API Information
```http
GET /api/info
```

## Example Usage

### Python Client

```python
import requests

# Image Analysis
with open("image.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/analyze/image",
        files={"image": f},
        data={"prompt": "What's in this image?"}
    )
    result = response.json()
    print(result["data"]["result"]["description"])

# Video Analysis
with open("video.mp4", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/analyze/video",
        files={"video": f},
        data={"num_frames": 3}
    )
    result = response.json()
    for frame in result["data"]["result"]["frames"]:
        print(f"Frame {frame['frame_number']}: {frame['description']}")

# Audio Transcription
with open("audio.mp3", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/analyze/audio",
        files={"audio": f},
        data={"language": "en"}
    )
    result = response.json()
    print(result["data"]["result"]["transcription"])
```

### JavaScript/Next.js Client

```javascript
// Image Analysis
const formData = new FormData();
formData.append('image', imageFile);
formData.append('prompt', 'Describe this image in detail');

const response = await fetch('http://localhost:8000/api/analyze/image', {
  method: 'POST',
  body: formData
});
const result = await response.json();
console.log(result.data.result.description);

// Video Analysis
const videoFormData = new FormData();
videoFormData.append('video', videoFile);
videoFormData.append('num_frames', '5');

const videoResponse = await fetch('http://localhost:8000/api/analyze/video', {
  method: 'POST',
  body: videoFormData
});
const videoResult = await videoResponse.json();
console.log(videoResult.data.result.summary);
```

### cURL Examples

```bash
# Image Analysis
curl -X POST "http://localhost:8000/api/analyze/image" \
  -F "image=@image.jpg" \
  -F "prompt=What objects are in this image?"

# Video Analysis
curl -X POST "http://localhost:8000/api/analyze/video" \
  -F "video=@video.mp4" \
  -F "num_frames=3"

# Audio Transcription
curl -X POST "http://localhost:8000/api/analyze/audio" \
  -F "audio=@audio.mp3" \
  -F "language=auto"

# Health Check
curl -X GET "http://localhost:8000/api/health"
```

## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": {
    "type": "image|video|audio",
    "result": {
      // Analysis results specific to type
    },
    "metadata": {
      "processing_time_ms": 1250.5,
      "model": "model_name",
      // Additional metadata
    }
  },
  "timestamp": "2025-10-17T12:34:56Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  },
  "timestamp": "2025-10-17T12:34:56Z"
}
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_DEFAULT_REGION=us-west-2

# Optional: OpenAI API Key (for Whisper fallback)
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
HOST=0.0.0.0
PORT=8000

# File Upload Limits
MAX_UPLOAD_SIZE_MB=100

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=INFO
```

### File Size Limits

- **Images**: 10MB maximum
- **Videos**: 100MB maximum  
- **Audio**: 50MB maximum

### Supported Formats

- **Images**: JPG, JPEG, PNG, WEBP, BMP, GIF
- **Videos**: MP4, AVI, MOV, MKV
- **Audio**: MP3, WAV, M4A, FLAC, OGG

## Performance

### Expected Response Times

- **Image Analysis**: 2-5 seconds (AWS Bedrock)
- **Video Analysis**: 3-8 seconds per frame
- **Audio Transcription**: Variable (AWS Transcribe: 1-2x realtime, OpenAI Whisper: ~0.5x realtime)

### System Requirements

- **CPU**: Any modern processor (cloud processing)
- **RAM**: 4GB minimum
- **Storage**: Minimal (temporary file storage only)
- **Network**: Stable internet connection for AWS API calls
- **OS**: Windows, Linux, or macOS

## Models Used

### AWS Bedrock Nova Pro (Image/Video Analysis)
- **Service**: Amazon Bedrock
- **Purpose**: Multimodal understanding
- **Capabilities**: Detailed image/video description, scene understanding

### AWS Transcribe (Audio Transcription - Primary)
- **Service**: Amazon Transcribe
- **Purpose**: Speech-to-text transcription
- **Capabilities**: Multi-language support, high accuracy

### OpenAI Whisper API (Audio Transcription - Fallback)
- **Service**: OpenAI API
- **Purpose**: Speech-to-text transcription
- **Capabilities**: 99+ languages, high accuracy

## Error Codes

- `INVALID_FILE_TYPE`: Unsupported file format
- `FILE_TOO_LARGE`: File exceeds size limit
- `PROCESSING_FAILED`: Analysis failed during processing
- `MODEL_NOT_LOADED`: Models not initialized
- `TIMEOUT`: Request exceeded time limit
- `OUT_OF_MEMORY`: Insufficient memory
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

## Development

### Project Structure

```
Python_backend/
├── app/
│   ├── models/          # ML model wrappers
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   ├── schemas/         # Pydantic models
│   ├── utils/           # Utilities
│   ├── config.py        # Configuration
│   └── main.py          # FastAPI app
├── tests/               # Test files
├── requirements.txt     # Dependencies
├── run.py              # Server startup
└── README.md           # This file
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest tests/
```

### Adding New Features

1. **Models**: Add new model wrappers in `app/models/`
2. **Services**: Add business logic in `app/services/`
3. **Endpoints**: Add API routes in `app/routers/`
4. **Schemas**: Define request/response models in `app/schemas/`

## Troubleshooting

### Common Issues

1. **Models not loading**
   - Check internet connection for initial download
   - Verify sufficient disk space (5GB+)
   - Check logs for specific error messages

2. **Out of memory errors**
   - Reduce `MAX_CONCURRENT_REQUESTS` to 1
   - Use smaller Whisper model (`tiny` instead of `base`)
   - Process files sequentially instead of in batch

3. **Slow performance**
   - Ensure no other heavy processes are running
   - Consider using smaller models for faster inference
   - Check CPU usage and available RAM

4. **File upload errors**
   - Verify file format is supported
   - Check file size against limits
   - Ensure proper Content-Type headers

### Logs

Check application logs for detailed error information:

```bash
# View logs in real-time
tail -f logs/app.log

# Check startup logs
python run.py
```

## Production Deployment

### Docker (Recommended)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "run.py"]
```

### Systemd Service

```ini
[Unit]
Description=Multimodal Analysis API
After=network.target

[Service]
Type=simple
User=api
WorkingDirectory=/path/to/Python_backend
ExecStart=/path/to/venv/bin/python run.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;
    }
}
```

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check application logs
4. Create an issue with detailed error information
