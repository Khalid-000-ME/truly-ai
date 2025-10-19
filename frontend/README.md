# 🚀 TrulyAI Frontend Setup Guide

## 📋 Complete Fact-Checking Pipeline

TrulyAI is an advanced fact-checking platform with comprehensive multimodal analysis:

1. **Frontend** (Next.js) - User interface, pipeline orchestration, and fact-checking visualization
2. **Backend** (Python) - AWS Bedrock Nova models for multimodal analysis
3. **Gemini AI** - Intelligent claim processing and search query optimization
4. **Truth Verification** - Real-time fact-checking with credibility scoring

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
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Python Backend (.env):**
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
1. Go to http://localhost:3000 (welcome page)
2. Click "Start Fact-Checking" → redirected to `/ask`
3. Enter a query: "Coldplay concert incident Mumbai"
4. Upload image/video/audio files (max 3) - optional
5. Click "Discover Truth" → redirected to `/clarity`
6. Watch initial processing and social media search
7. Click "Start Deep Analysis" → redirected to `/clarity/process`
8. Watch real-time segregation and multimodal analysis
9. Click "Start Fact-Checking" → redirected to `/truth`
10. Watch fact-checking pipeline with credibility scoring
11. Review comprehensive results with supporting/contradicting evidence

## 📊 API Endpoints

### Frontend APIs
- `GET /api/handle` - System status
- `POST /api/handle` - Process text + files
- `GET /api/initial` - Pipeline info  
- `POST /api/initial` - Complete analysis pipeline
- `POST /api/segregate` - Extract and download media from social posts
- `POST /api/analyze_handler` - Multimodal content analysis
- `POST /api/analyze_handler/final` - Fact-checking with verification sources
- `GET /api/search/internet` - Curated news source search
- `POST /api/cleanup` - File cleanup management

### Python Backend APIs
- `GET /api/info` - Backend information
- `POST /api/analyze/image/path` - Image analysis (AWS Bedrock Nova Pro)
- `POST /api/analyze/video/path` - Video analysis (AWS Bedrock Nova Pro)
- `POST /api/analyze/audio/path` - Audio analysis (AWS Transcribe/OpenAI Whisper)
- `POST /api/analyze/text` - Text analysis with context

## 🔍 Complete Fact-Checking Flow

### Phase 1: Initial Processing
1. **User submits** query via main page → redirected to `/ask`
2. **User uploads** media files and enters prompt → redirected to `/clarity`
3. **Initial API** processes text using Gemini AI and finds social media posts
4. **Search API** finds relevant social media content
5. **User sees** initial analysis results and social media posts found

### Phase 2: Deep Analysis
6. **User clicks** "Start Deep Analysis" → redirected to `/clarity/process`
7. **Segregate API** extracts and downloads media from social posts
8. **Analysis Handler** performs multimodal analysis on all media
9. **User watches** real-time progress of each analysis step

### Phase 3: Fact-Checking
10. **User clicks** "Start Fact-Checking" → redirected to `/truth`
11. **Final Analysis Handler** processes claims using Gemini AI
12. **Internet Search** finds verification sources from curated news outlets
13. **Verification Analysis** analyzes media from verification sources
14. **Credibility Scoring** calculates 0-100% credibility scores
15. **User receives** comprehensive fact-check results with evidence

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
- Welcome page displays with logo and "Start Fact-Checking" button
- Ask page accepts queries and file uploads
- Clarity page shows initial analysis and social media posts
- Process page displays real-time analysis progress
- Truth page shows fact-checking results with credibility scores
- Files are automatically cleaned up after analysis
- AWS Bedrock models respond successfully
- Gemini AI processes claims intelligently
- Internet search finds curated news sources
- Credibility scores are calculated transparently

## 🌟 Key Features

- **Multimodal Analysis**: Images, videos, audio, and text
- **Social Media Integration**: YouTube, Twitter, Facebook post analysis
- **Fact-Checking Pipeline**: Claims → Evidence → Verification → Scoring
- **Curated Sources**: 19+ authenticated news sources with credibility scores
- **Real-Time Visualization**: Live progress tracking and updates
- **Transparent Scoring**: 0-100% credibility with supporting evidence
- **Automatic Cleanup**: Smart file management and storage optimization

The system is now ready for comprehensive fact-checking and misinformation detection! 🎉
