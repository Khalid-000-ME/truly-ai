# Product Requirements Document (PRD)
## Multimodal Analysis Backend API

---

## 1. Overview

### 1.1 Purpose
Build a Python FastAPI backend service that provides multimodal analysis capabilities (images, videos, audio) running locally on a laptop with limited resources (16GB RAM, Intel Core i5 13th Gen, integrated graphics).

### 1.2 Goals
- Provide REST API endpoints for analyzing images, videos, and audio files
- Run completely offline after initial model downloads
- Optimize for CPU inference on consumer hardware
- Support concurrent requests efficiently
- Integrate seamlessly with Next.js frontend

### 1.3 Non-Goals
- GPU acceleration (no dedicated GPU available)
- Real-time streaming analysis
- Model training or fine-tuning
- Cloud deployment (initially local only)

---

## 2. Technical Stack

### 2.1 Core Technologies
- **Framework**: FastAPI 0.104+
- **ML Models**:
  - Image/Video: Moondream2 (1.6GB)
  - Audio: Whisper Base (142MB)
- **Libraries**:
  - `transformers` - Model loading
  - `openai-whisper` - Audio transcription
  - `opencv-python` - Video processing
  - `pillow` - Image handling
  - `torch` - CPU inference
  - `uvicorn` - ASGI server

### 2.2 Hardware Constraints
- **RAM**: 16GB (limit model memory usage to ~4GB max)
- **CPU**: Intel Core i5 13th Gen (optimize for multi-threading)
- **Storage**: ~2GB for models (cache in user home directory)

---

## 3. Functional Requirements

### 3.1 Core Features

#### F1: Image Analysis Endpoint
**Endpoint**: `POST /api/analyze/image`

**Input**:
```json
{
  "image": "base64_encoded_image OR multipart/form-data",
  "prompt": "optional custom prompt (default: 'Describe this image in detail')",
  "options": {
    "max_length": 200
  }
}
```

**Output**:
```json
{
  "success": true,
  "type": "image",
  "description": "Detailed description of the image...",
  "metadata": {
    "processing_time_ms": 1250,
    "model": "moondream2",
    "image_size": [1920, 1080]
  }
}
```

**Requirements**:
- Support formats: JPG, PNG, WEBP, BMP, GIF
- Max file size: 10MB
- Response time: <3 seconds for typical images
- Handle malformed images gracefully

---

#### F2: Video Analysis Endpoint
**Endpoint**: `POST /api/analyze/video`

**Input**:
```json
{
  "video": "multipart/form-data",
  "num_frames": 5,
  "prompt": "optional custom prompt",
  "options": {
    "include_timestamps": true,
    "frame_sampling": "uniform" // or "keyframes"
  }
}
```

**Output**:
```json
{
  "success": true,
  "type": "video",
  "metadata": {
    "duration_seconds": 30.5,
    "fps": 30,
    "resolution": [1920, 1080],
    "total_frames": 915
  },
  "frames": [
    {
      "timestamp": 0.0,
      "frame_number": 0,
      "description": "Opening scene shows..."
    },
    {
      "timestamp": 6.1,
      "frame_number": 183,
      "description": "Camera pans to reveal..."
    }
  ],
  "summary": "Overall video description...",
  "processing_time_ms": 8500
}
```

**Requirements**:
- Support formats: MP4, AVI, MOV, MKV
- Max file size: 100MB
- Configurable frame extraction (default: 5 frames)
- Uniform or keyframe sampling
- Response time: <15 seconds for 30s video

---

#### F3: Audio Transcription Endpoint
**Endpoint**: `POST /api/analyze/audio`

**Input**:
```json
{
  "audio": "multipart/form-data",
  "language": "auto", // or "en", "es", "fr", etc.
  "options": {
    "include_timestamps": true,
    "word_level_timestamps": false
  }
}
```

**Output**:
```json
{
  "success": true,
  "type": "audio",
  "transcription": "Full transcription text...",
  "language": "en",
  "confidence": 0.92,
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "Hello, this is a test.",
      "confidence": 0.95
    }
  ],
  "metadata": {
    "duration_seconds": 45.2,
    "processing_time_ms": 12000,
    "model": "whisper-base"
  }
}
```

**Requirements**:
- Support formats: MP3, WAV, M4A, FLAC, OGG
- Max file size: 50MB
- Auto language detection
- Segment-level timestamps
- Response time: <30 seconds for 1 minute audio

---

#### F4: Batch Analysis Endpoint
**Endpoint**: `POST /api/analyze/batch`

**Input**:
```json
{
  "files": [
    {"type": "image", "data": "base64..."},
    {"type": "video", "data": "base64..."},
    {"type": "audio", "data": "base64..."}
  ],
  "options": {
    "parallel": false // process sequentially to avoid OOM
  }
}
```

**Output**:
```json
{
  "success": true,
  "results": [
    {"file_index": 0, "result": {...}},
    {"file_index": 1, "result": {...}}
  ],
  "total_processing_time_ms": 15000
}
```

---

#### F5: Health Check Endpoint
**Endpoint**: `GET /api/health`

**Output**:
```json
{
  "status": "healthy",
  "models_loaded": true,
  "available_endpoints": [
    "/api/analyze/image",
    "/api/analyze/video",
    "/api/analyze/audio"
  ],
  "system_info": {
    "memory_usage_mb": 3200,
    "available_memory_mb": 12800,
    "cpu_usage_percent": 45
  }
}
```

---

### 3.2 Model Management

#### F6: Model Initialization
- Load models on server startup (not per-request)
- Implement singleton pattern for model instances
- Lazy loading option for development
- Graceful degradation if model fails to load

#### F7: Memory Management
- Monitor RAM usage
- Implement request queue if memory is constrained
- Clear cache between requests if needed
- Max concurrent requests: 2 (to avoid OOM)

---

## 4. Non-Functional Requirements

### 4.1 Performance
- **Startup Time**: <60 seconds (model loading)
- **Image Analysis**: <3 seconds
- **Video Analysis**: <5 seconds per frame
- **Audio Transcription**: ~0.5x realtime (30s for 1min audio)
- **Concurrent Requests**: Support 2 simultaneous requests

### 4.2 Reliability
- **Uptime**: 99% during development
- **Error Handling**: All errors return proper HTTP status codes
- **Timeout**: 60 seconds max per request
- **Retry Logic**: Client-side retries recommended

### 4.3 Security
- **File Validation**: Check file types and sizes before processing
- **Rate Limiting**: 100 requests/hour per IP (optional for local dev)
- **CORS**: Allow localhost:3000 (Next.js) initially
- **Sanitization**: Sanitize file names and inputs

### 4.4 Scalability (Future)
- Stateless design for horizontal scaling
- Model caching strategy
- Support for distributed inference (future)

---

## 5. API Design Principles

### 5.1 REST Conventions
- Use proper HTTP methods (POST for analysis)
- Consistent response structure
- Meaningful status codes:
  - 200: Success
  - 400: Bad request (invalid file)
  - 413: Payload too large
  - 500: Server error
  - 503: Service unavailable (models not loaded)

### 5.2 Response Format
All responses follow this structure:
```json
{
  "success": true/false,
  "data": {...},
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "timestamp": "2025-10-17T12:34:56Z"
}
```

### 5.3 Error Codes
- `INVALID_FILE_TYPE`: Unsupported file format
- `FILE_TOO_LARGE`: Exceeds size limit
- `PROCESSING_FAILED`: Analysis failed
- `MODEL_NOT_LOADED`: Models not initialized
- `TIMEOUT`: Request exceeded time limit

---

## 6. Project Structure

```
Python_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration (model paths, limits)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── moondream_model.py  # Image/video model wrapper
│   │   ├── whisper_model.py    # Audio model wrapper
│   │   └── model_manager.py    # Singleton model loader
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── image.py            # Image analysis endpoints
│   │   ├── video.py            # Video analysis endpoints
│   │   ├── audio.py            # Audio analysis endpoints
│   │   └── health.py           # Health check endpoint
│   ├── services/
│   │   ├── __init__.py
│   │   ├── image_service.py    # Image processing logic
│   │   ├── video_service.py    # Video processing logic
│   │   └── audio_service.py    # Audio processing logic
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── file_validator.py   # File validation utilities
│   │   ├── response_formatter.py
│   │   └── error_handlers.py
│   └── schemas/
│       ├── __init__.py
│       ├── image_schemas.py    # Pydantic models for image
│       ├── video_schemas.py    # Pydantic models for video
│       └── audio_schemas.py    # Pydantic models for audio
├── tests/
│   ├── test_image.py
│   ├── test_video.py
│   └── test_audio.py
├── requirements.txt
├── .env.example
├── README.md
└── run.py                      # Server startup script
```

---

## 7. Implementation Steps

### Phase 1: Foundation (Week 1)
1. Set up FastAPI project structure
2. Implement model loading and singleton pattern
3. Create health check endpoint
4. Add basic error handling

### Phase 2: Core Features (Week 2)
5. Implement image analysis endpoint
6. Implement audio transcription endpoint
7. Add file validation and size limits
8. Create response formatters

### Phase 3: Advanced Features (Week 3)
9. Implement video analysis endpoint
10. Add batch processing endpoint
11. Optimize memory usage
12. Add request queuing

### Phase 4: Polish (Week 4)
13. Add comprehensive error handling
14. Write API documentation (OpenAPI/Swagger)
15. Add logging and monitoring
16. Performance optimization

---

## 8. Configuration

### 8.1 Environment Variables
```bash
# .env
MODEL_CACHE_DIR=~/.cache/multimodal_models
MAX_UPLOAD_SIZE_MB=100
MAX_CONCURRENT_REQUESTS=2
REQUEST_TIMEOUT_SECONDS=60
WHISPER_MODEL_SIZE=base  # tiny, base, small, medium
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=INFO
```

### 8.2 Model Configuration
```python
# config.py
MOONDREAM_CONFIG = {
    "model_name": "vikhyatk/moondream2",
    "torch_dtype": "float32",  # CPU inference
    "device": "cpu"
}

WHISPER_CONFIG = {
    "model_size": "base",
    "device": "cpu",
    "fp16": False  # Must be False for CPU
}

FILE_LIMITS = {
    "image": 10 * 1024 * 1024,  # 10MB
    "video": 100 * 1024 * 1024,  # 100MB
    "audio": 50 * 1024 * 1024   # 50MB
}
```

---

## 9. Testing Requirements

### 9.1 Unit Tests
- Test each service function independently
- Mock model responses
- Test file validation logic
- Test error handling

### 9.2 Integration Tests
- Test full API endpoints
- Test with actual model inference
- Test concurrent requests
- Test file upload handling

### 9.3 Performance Tests
- Measure response times
- Monitor memory usage
- Test under load (2 concurrent requests)
- Identify bottlenecks

---

## 10. Documentation Requirements

### 10.1 API Documentation
- Auto-generated OpenAPI/Swagger docs at `/docs`
- Example requests and responses
- Authentication guide (if implemented)
- Rate limiting information

### 10.2 Developer Documentation
- Setup instructions
- Model download guide
- Configuration options
- Troubleshooting guide

### 10.3 Deployment Guide
- System requirements
- Installation steps
- Running in production
- Monitoring recommendations

---

## 11. Success Metrics

### 11.1 Performance Metrics
- Image analysis: <3s average
- Video analysis: <5s per frame
- Audio transcription: <0.5x realtime
- Memory usage: <4GB under load

### 11.2 Reliability Metrics
- 99% uptime during testing
- <1% error rate
- All errors properly handled
- No memory leaks over 24h

### 11.3 Quality Metrics
- Image descriptions: Accurate and detailed
- Video analysis: Captures key moments
- Audio transcription: >90% accuracy
- API response format: Consistent

---

## 12. Future Enhancements (Post-MVP)

### 12.1 Phase 2 Features
- WebSocket support for real-time updates
- Streaming responses for long videos
- Model fine-tuning capabilities
- Support for additional languages

### 12.2 Phase 3 Features
- GPU acceleration support
- Distributed inference
- Caching layer for repeated requests
- Advanced video understanding (object tracking)

### 12.3 Phase 4 Features
- Docker containerization
- Kubernetes deployment
- Monitoring dashboard
- A/B testing for model versions

---

## 13. Dependencies

### 13.1 Python Packages
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
transformers==4.35.0
torch==2.1.0
openai-whisper==20231117
opencv-python==4.8.1.78
pillow==10.1.0
einops==0.7.0
pydantic==2.5.0
python-dotenv==1.0.0
aiofiles==23.2.1
```

### 13.2 System Requirements
- Python 3.11+
- 16GB RAM minimum
- 5GB free disk space
- Windows/Linux/macOS support

---

## 14. Risk Assessment

### 14.1 Technical Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Out of Memory | High | Request queuing, memory limits |
| Slow inference | Medium | Optimize batch size, use smaller models |
| Model download fails | Medium | Retry logic, manual download option |
| Concurrent request issues | Medium | Request serialization, rate limiting |

### 14.2 Operational Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Model files corrupted | Low | Checksum validation |
| Disk space exhausted | Low | Cleanup old temp files |
| Port conflicts | Low | Configurable port |

---

## 15. Acceptance Criteria

### 15.1 MVP Launch Criteria
- ✅ All three core endpoints working (image, video, audio)
- ✅ Health check endpoint functional
- ✅ Error handling for all edge cases
- ✅ API documentation complete
- ✅ Response times meet requirements
- ✅ Memory usage within limits
- ✅ Integration with Next.js tested

### 15.2 Quality Gates
- ✅ 100% of API endpoints tested
- ✅ No critical bugs
- ✅ Performance benchmarks met
- ✅ Documentation reviewed
- ✅ Code review completed

---

## 16. Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| Setup & Planning | 2 days | Project structure, dependencies |
| Core Implementation | 5 days | All API endpoints |
| Testing & Optimization | 3 days | Tests, performance tuning |
| Documentation | 2 days | API docs, README |
| Integration | 2 days | Next.js integration |
| **Total** | **14 days** | Production-ready API |

---

## 17. Stakeholders

- **Developer**: You (full-stack implementation)
- **AI Agent**: Code generation and structure
- **End Users**: Next.js application users
- **Frontend Team**: Next.js integration

---

## Appendix A: Example Usage

### Python Client
```python
import requests

# Analyze image
with open("image.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/analyze/image",
        files={"image": f},
        data={"prompt": "What's in this image?"}
    )
print(response.json())
```

### Next.js Client
```typescript
// Upload and analyze image
const formData = new FormData();
formData.append('image', file);
formData.append('prompt', 'Describe this image');

const response = await fetch('http://localhost:8000/api/analyze/image', {
  method: 'POST',
  body: formData
});
const result = await response.json();
```

---

## Appendix B: Error Response Examples

```json
// Invalid file type
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type 'txt' is not supported. Supported types: jpg, png, webp"
  },
  "timestamp": "2025-10-17T12:34:56Z"
}

// File too large
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size 15MB exceeds maximum allowed size of 10MB"
  },
  "timestamp": "2025-10-17T12:34:56Z"
}
```

---

**Document Version**: 1.0  
**Last Updated**: October 17, 2025  
**Status**: Draft  
**Owner**: Development Team