# 🚀 TrulyAI Setup Guide

## 📋 Complete Analysis Pipeline

The system now has a complete multi-modal analysis pipeline:

1. **Frontend** (Next.js) - User interface and API orchestration
2. **Backend** (Python) - Media analysis and ML processing
3. **Gemini AI** - Text refinement and link extraction

## 🔧 Quick Setup

### 1. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
npm run dev
```

### 2. Python Backend Setup
```bash
cd Python_backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env if needed (defaults are fine)
python -m uvicorn app.main:app --reload
```

### 3. Environment Variables

**Frontend (.env.local):**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PYTHON_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Python Backend (.env):**
```bash
MODEL_CACHE_DIR=~/.cache/multimodal_models
WHISPER_MODEL_SIZE=base
HOST=0.0.0.0
PORT=8000
MAX_UPLOAD_SIZE_MB=100
```

## 🧪 Testing

### Test Individual APIs
```bash
# Test handle API (text + file processing)
node test-api-node.js

# Test initial API (complete pipeline)
node test-initial-api.js

# Test Python backend directly
curl http://localhost:8000/api/info
```

### Test via UI
1. Go to http://localhost:3000/ask
2. Enter a prompt with typos: "Hw long will i taj fo a chth to finish a 2km lap"
3. Upload image/video/audio files (max 3)
4. Click "Discover Truth"
5. Check browser console and terminal for detailed logs

## 📊 API Endpoints

### Frontend APIs
- `GET /api/handle` - System status
- `POST /api/handle` - Process text + files
- `GET /api/initial` - Pipeline info  
- `POST /api/initial` - Complete analysis pipeline

### Python Backend APIs
- `GET /api/info` - Backend information
- `POST /api/analyze/image/path` - Image analysis
- `POST /api/analyze/video/path` - Video analysis
- `POST /api/analyze/audio/path` - Audio analysis
- `POST /api/analyze/text` - Text analysis with context

## 🔍 Expected Flow

1. **User submits** text + files via `/ask` page
2. **Initial API** calls handle API to process text and save files
3. **Handle API** uses Gemini to refine text and extract links
4. **Initial API** sends each file to Python backend for analysis
5. **Python backend** analyzes media using ML models
6. **Initial API** aggregates all results into final conclusion
7. **User receives** comprehensive analysis with confidence score

## 🚨 Troubleshooting

### Common Issues

**"Gemini not working"**
- Check GEMINI_API_KEY in .env.local
- Restart Next.js dev server
- Check console for API errors

**"Python backend not responding"**
- Ensure it's running on port 8000
- Check Python dependencies installed
- Verify CORS settings allow localhost:3000

**"Files not uploading"**
- Check file size limits (10MB frontend, 100MB backend)
- Verify file types (image/video/audio only)
- Check uploads directory permissions

**"Text not being refined"**
- Check Gemini API quota/limits
- Look for fallback text correction in logs
- Verify prompt format in console

### Debug Logs

The system provides extensive logging:
- **Frontend**: Check browser console and terminal
- **Backend**: Check Python server logs
- **Files**: Check uploads directory for saved files
- **API**: Full request/response logging available

## 🎯 Success Indicators

✅ **Working correctly when you see:**
- Text gets corrected (typos fixed)
- Links are extracted from text
- Files are saved to uploads directory
- Python backend analyzes each file
- Final aggregated conclusion is generated
- Confidence score is calculated
- Processing times are logged

The system is now ready for comprehensive fact-checking and media analysis! 🎉
