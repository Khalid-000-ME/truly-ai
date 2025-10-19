# TrulyAI - Comprehensive Application Documentation

## 🌟 Overview

**TrulyAI** is an advanced fact-checking and misinformation detection platform that combines multimodal AI analysis with social media monitoring to verify claims and detect potentially false information. The application uses a sophisticated pipeline to analyze text, images, videos, and audio content from various sources to provide credibility assessments.

### 🎯 Core Mission
- **Fact-Checking**: Verify claims using multiple evidence sources
- **Misinformation Detection**: Identify potentially false or misleading content
- **Multimodal Analysis**: Analyze text, images, videos, and audio comprehensively
- **Social Media Monitoring**: Track viral content across platforms
- **Credibility Scoring**: Provide transparent, evidence-based credibility assessments

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Python         │    │   External      │
│   (Next.js)     │◄──►│   Backend        │◄──►│   Services      │
│                 │    │   (FastAPI)      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ • React Pages   │    │ • AWS Bedrock    │    │ • Google Search │
│ • API Routes    │    │ • Nova Models    │    │ • Perplexity    │
│ • File Upload   │    │ • Multimodal AI  │    │ • YouTube       │
│ • Real-time UI  │    │ • Audio Analysis │    │ • Social Media  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🖥️ Frontend Architecture (Next.js)

### 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── analyze/       # Media analysis endpoints
│   │   │   ├── analyze_handler/ # Analysis orchestration
│   │   │   ├── cleanup/       # File cleanup management
│   │   │   ├── handle/        # Input processing
│   │   │   ├── initial/       # Initial analysis pipeline
│   │   │   ├── search/        # Search functionality
│   │   │   ├── segregate/     # Content segregation
│   │   │   └── validate/      # Content validation
│   │   ├── ask/              # Query input page
│   │   ├── clarity/          # Analysis results page
│   │   ├── truth/            # Fact-checking results
│   │   └── globals.css       # Global styles
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utility libraries
│   ├── utils/                # Helper functions
│   └── types/                # TypeScript definitions
├── public/                   # Static assets
├── uploads/                  # Temporary file storage
└── package.json             # Dependencies
```

### 🔄 Analysis Pipeline Flow

```mermaid
graph TD
    A[User Input] --> B[/handle API]
    B --> C[/initial API]
    C --> D[/segregate API]
    D --> E[/analyze_handler API]
    E --> F[/analyze_handler/final API]
    F --> G[Truth Verification Page]
    
    C --> H[Clarity Page]
    H --> I[Process Page]
    I --> E
```

### 🛠️ Key API Endpoints

#### Core Processing Pipeline
- **`/api/handle`** - Input processing and refinement
- **`/api/initial`** - Initial analysis and social media search
- **`/api/segregate`** - Content segregation and media extraction
- **`/api/analyze_handler`** - Multimodal content analysis
- **`/api/analyze_handler/final`** - Fact-checking and credibility scoring

#### Media Analysis
- **`/api/analyze`** - Generic media analysis router
- **`/api/validate/*`** - Content validation endpoints

#### Utility Services
- **`/api/cleanup`** - File cleanup management
- **`/api/search`** - Social media search
- **`/api/search/internet`** - Authentic news source search

### 🎨 User Interface Pages

#### 1. **Ask Page** (`/ask`)
- **Purpose**: Primary input interface
- **Features**: 
  - Text input with file upload support
  - Real-time processing feedback
  - Glass-morphism design with animated background
- **Flow**: Redirects to `/clarity` after processing

#### 2. **Clarity Page** (`/clarity`)
- **Purpose**: Initial analysis results display
- **Features**:
  - Social media posts found
  - Basic analysis statistics
  - "Continue Analysis" button for deep analysis
- **Flow**: Can redirect to `/clarity/process` for detailed analysis

#### 3. **Process Page** (`/clarity/process`)
- **Purpose**: Real-time analysis monitoring
- **Features**:
  - Step-by-step progress tracking
  - Live status updates
  - Detailed analysis results display
  - Auto-redirect to truth verification

#### 4. **Truth Page** (`/truth`)
- **Purpose**: Final fact-checking results
- **Features**:
  - Credibility scoring (0-100%)
  - Supporting/contradicting evidence
  - Verification sources with credibility ratings
  - Color-coded results (Green/Yellow/Red)

### 🔧 Technical Features

#### File Management System
- **Automatic Cleanup**: Files deleted after analysis
- **Age-based Cleanup**: Files older than 1 hour removed automatically
- **Manual Cleanup**: API endpoint for force cleanup
- **Storage Monitoring**: Real-time file statistics

#### Real-time Processing
- **Session Management**: Unique session IDs for tracking
- **Progress Polling**: Live updates every 2 seconds
- **Error Handling**: Graceful fallback mechanisms
- **State Persistence**: SessionStorage for data continuity

#### YouTube Integration
- **yt-dlp Integration**: Download YouTube videos/audio
- **Parallel Processing**: Simultaneous video and audio extraction
- **Format Support**: Multiple video/audio formats
- **Error Handling**: Graceful fallback to URLs if download fails

---

## 🐍 Python Backend Architecture (FastAPI)

### 📁 Project Structure

```
Python_backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── models/              # Data models
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic
│   └── utils/               # Helper utilities
├── working_aws_analyzer.py  # AWS Bedrock integration
├── requirements.txt         # Python dependencies
└── run.py                  # Application runner
```

### 🤖 AI/ML Integration

#### AWS Bedrock Models
- **Nova Pro v1:0**: Primary multimodal model
  - Image analysis and understanding
  - Video frame analysis
  - Audio transcription (multimodal approach)
  - Text analysis and reasoning

- **Nova Lite/Micro**: Fallback models
  - Lighter processing for simple tasks
  - Cost-effective alternatives

#### Model Selection Strategy
```python
potential_models = [
    "amazon.nova-pro-v1:0",     # Primary choice
    "amazon.nova-lite-v1:0",    # Fallback option
    "amazon.nova-micro-v1:0"    # Lightweight option
]
```

### 🔊 Audio Processing

#### Cloud-Based Transcription
1. **AWS Transcribe** (Primary)
   - Native AWS integration
   - Automatic S3 bucket management
   - Batch processing with job management
   - Cost: ~$0.024/minute

2. **OpenAI Whisper API** (Secondary)
   - High accuracy transcription
   - 99+ language support
   - Direct file upload
   - Cost: ~$0.006/minute

#### Audio Processing Flow
```python
def transcribe_audio(audio_path, language=None):
    # 1. Detect available services
    # 2. Upload/prepare audio file
    # 3. Process with cloud service
    # 4. Return standardized results
    # 5. Cleanup temporary resources
```

### 📊 API Endpoints

#### Core Analysis Endpoints
- **`/api/analyze/text`** - Text content analysis
- **`/api/analyze/image/path`** - Image analysis by file path
- **`/api/analyze/video/path`** - Video analysis by file path
- **`/api/analyze/audio/path`** - Comprehensive audio analysis
- **`/api/analyze/transcribe/path`** - Audio transcription only

#### Service Management
- **`/api/health`** - Health check endpoint
- **`/api/status`** - Service status and model availability
- **`/api/info`** - API information and capabilities

### 🛡️ Error Handling & Reliability

#### Graceful Degradation
- **Model Fallback**: Automatic fallback between Nova models
- **Service Detection**: Dynamic detection of available services
- **Error Recovery**: Comprehensive error handling with informative messages
- **Resource Cleanup**: Automatic cleanup of temporary files and resources

#### Logging & Monitoring
- **Structured Logging**: Comprehensive logging with different levels
- **Performance Tracking**: Request timing and resource usage
- **Error Tracking**: Detailed error reporting and debugging information

---

## 🔍 Fact-Checking Pipeline

### 📋 Pipeline Stages

#### 1. **Initial Processing**
- Input refinement using Gemini AI
- Link extraction and validation
- Media file processing and storage
- Social media search initiation

#### 2. **Content Segregation**
- Platform-specific content extraction
- Media download and local storage
- URL validation and cleanup
- Content categorization

#### 3. **Multimodal Analysis**
- **Images**: Visual content analysis, object detection, text extraction
- **Videos**: Frame-by-frame analysis, scene understanding
- **Audio**: Transcription, speaker identification, content analysis
- **Text**: Sentiment analysis, fact extraction, claim identification

#### 4. **Evidence Collection**
- Social media post analysis
- External source verification
- Cross-reference checking
- Evidence quality assessment

#### 5. **Credibility Scoring**
```typescript
// Credibility Algorithm
base_score = 50  // Neutral starting point
+ evidence_quality_bonus (±20)
+ source_credibility_bonus (±20) 
+ confidence_level_adjustment (±10)
= final_credibility_score (0-100)
```

#### 6. **Final Assessment**
- **70%+ (Green)**: LIKELY TRUE
- **40-69% (Yellow)**: PARTIALLY VERIFIED  
- **<40% (Red)**: QUESTIONABLE

### 🌐 Source Verification

#### Curated News Sources (19 sources)
- **Fact-Check** (88-98%): FactCheck.org, Snopes, PolitiFact
- **Mainstream** (85-95%): Reuters, AP News, BBC, NPR
- **Tech** (83-90%): Ars Technica, Wired, TechCrunch
- **Academic** (96-98%): Nature, Science Magazine, PNAS

#### Search Strategy
```typescript
const verification_queries = [
  `${claim} site:snopes.com OR site:factcheck.org`,
  `${claim} fact check verification debunk`,
  `${claim} site:reuters.com OR site:apnews.com`,
  `${claim} news report authentic source`
];
```

---

## 🛠️ Setup & Installation

### 📋 Prerequisites

#### System Requirements
- **Node.js**: v18+ 
- **Python**: 3.11+
- **AWS Account**: For Bedrock access
- **API Keys**: Google Gemini, OpenAI (optional)

#### Required Tools
- **yt-dlp**: YouTube content download
- **FFmpeg**: Media processing
- **Git**: Version control

### 🚀 Frontend Setup

```bash
# Navigate to frontend directory
cd frontend/

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Configure environment
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key

# Start development server
npm run dev
```

### 🐍 Python Backend Setup

```bash
# Navigate to backend directory
cd Python_backend/

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Setup AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (e.g., us-west-2)

# Setup environment variables
export OPENAI_API_KEY=your_openai_key  # Optional

# Start backend server
python run.py
```

### 🎬 YouTube Integration Setup

```bash
# Install yt-dlp
pip install yt-dlp

# Or using winget (Windows)
winget install yt-dlp

# Verify installation
yt-dlp --version
```

### ☁️ AWS Bedrock Setup

#### 1. **Enable Bedrock Models**
```bash
# Request access to Nova models in AWS Console
# Navigate to: AWS Bedrock > Model Access
# Request access to:
# - Amazon Nova Pro v1:0
# - Amazon Nova Lite v1:0
# - Amazon Nova Micro v1:0
```

#### 2. **Configure IAM Permissions**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": "*"
        }
    ]
}
```

#### 3. **Test Connection**
```bash
cd Python_backend/
python test_aws_setup.py
```

---

## 📊 Usage Examples

### 🔍 Basic Fact-Checking

1. **Navigate to Ask Page**: `http://localhost:3000/ask`
2. **Enter Claim**: "Climate change is a hoax"
3. **Submit for Analysis**: Click "Analyze" button
4. **View Initial Results**: Redirected to clarity page
5. **Deep Analysis**: Click "Continue Analysis" 
6. **Monitor Progress**: Watch real-time processing
7. **View Results**: Automatic redirect to truth page
8. **Review Evidence**: Examine supporting/contradicting evidence

### 📱 Social Media Verification

1. **Input Social Media Claim**: Paste viral social media content
2. **Automatic Source Detection**: System identifies platforms
3. **Content Extraction**: Downloads and analyzes media
4. **Cross-Reference**: Compares with authentic news sources
5. **Credibility Assessment**: Provides scored verification

### 🎥 Multimodal Analysis

1. **Upload Media Files**: Images, videos, or audio
2. **AI Processing**: Nova models analyze content
3. **Content Understanding**: Extract text, objects, scenes
4. **Context Analysis**: Understand content meaning
5. **Evidence Integration**: Combine with other sources

---

## 🔧 Configuration

### 🌐 Environment Variables

#### Frontend (.env.local)
```bash
# API Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# External APIs
GEMINI_API_KEY=your_gemini_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Optional Services
OPENAI_API_KEY=your_openai_api_key
```

#### Backend Environment
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-west-2

# Optional APIs
OPENAI_API_KEY=your_openai_key

# Service Configuration
LOG_LEVEL=INFO
MAX_UPLOAD_SIZE_MB=100
```

### ⚙️ Advanced Configuration

#### File Cleanup Settings
```typescript
// frontend/src/utils/cleanup.ts
const MAX_FILE_AGE_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
```

#### Analysis Timeouts
```typescript
// API timeout configurations
const ANALYSIS_TIMEOUT = 120000; // 2 minutes
const DOWNLOAD_TIMEOUT = 90000;  // 1.5 minutes
```

#### Credibility Scoring
```typescript
// Scoring algorithm weights
const EVIDENCE_WEIGHT = 20;      // ±20 points
const SOURCE_WEIGHT = 20;        // ±20 points  
const CONFIDENCE_WEIGHT = 10;    // ±10 points
```

---

## 🧪 Testing

### 🔬 API Testing

#### Frontend API Tests
```bash
# Test individual endpoints
node test-api.js

# Test complete pipeline
node test-initial-api.js

# Test file handling
node test-handle-only.cjs
```

#### Backend Testing
```bash
# Test AWS integration
python test_aws_setup.py

# Test all features
python test_all_features.py

# Test specific models
python f_test_image.py
python f_test_video.py
python f_test_audio.py
```

### 📋 Test Cases

#### 1. **Basic Text Analysis**
```bash
curl -X POST http://localhost:3000/api/initial \
  -H "Content-Type: application/json" \
  -d '{"prompt": "The Earth is flat"}'
```

#### 2. **Image Analysis**
```bash
curl -X POST http://localhost:8000/api/analyze/image/path \
  -F "image_path=test-image.jpg" \
  -F "prompt=Analyze this image"
```

#### 3. **YouTube Content Analysis**
```bash
curl -X POST http://localhost:3000/api/segregate \
  -H "Content-Type: application/json" \
  -d '{"socialMediaResults": ["Test: https://youtube.com/watch?v=example"]}'
```

---

## 🚨 Troubleshooting

### ❗ Common Issues

#### 1. **AWS Bedrock Access Denied**
```bash
# Solution: Check IAM permissions and model access
aws bedrock list-foundation-models --region us-west-2
```

#### 2. **YouTube Download Failures**
```bash
# Solution: Update yt-dlp
pip install --upgrade yt-dlp

# Alternative: Use different extraction method
yt-dlp --list-formats "https://youtube.com/watch?v=example"
```

#### 3. **File Upload Errors**
```bash
# Solution: Check file permissions and disk space
ls -la uploads/
df -h
```

#### 4. **API Timeout Issues**
```bash
# Solution: Increase timeout values in configuration
# Check network connectivity
curl -I http://localhost:8000/api/health
```

### 🔍 Debug Mode

#### Enable Detailed Logging
```bash
# Frontend
export DEBUG=trulyai:*

# Backend  
export LOG_LEVEL=DEBUG
python run.py
```

#### Monitor File System
```bash
# Watch uploads directory
watch -n 1 'ls -la uploads/'

# Monitor API calls
tail -f logs.txt
```

---

## 🔒 Security Considerations

### 🛡️ Data Protection

#### File Security
- **Automatic Cleanup**: Files deleted after processing
- **Temporary Storage**: No permanent file retention
- **Access Control**: Local file system only
- **Size Limits**: Maximum upload size restrictions

#### API Security
- **CORS Configuration**: Restricted origins
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: Request throttling (recommended)
- **Error Handling**: No sensitive information exposure

#### Credential Management
- **Environment Variables**: Secure credential storage
- **AWS IAM**: Principle of least privilege
- **API Key Rotation**: Regular key updates recommended
- **Local Storage**: No credentials in code

### 🔐 Best Practices

#### Production Deployment
- **HTTPS Only**: Secure communication
- **Environment Separation**: Dev/staging/production
- **Monitoring**: Comprehensive logging and alerting
- **Backup Strategy**: Regular data backups
- **Update Management**: Regular dependency updates

---

## 📈 Performance Optimization

### ⚡ Frontend Optimization

#### Code Splitting
- **Dynamic Imports**: Lazy load components
- **Route-based Splitting**: Page-level code splitting
- **Bundle Analysis**: Regular bundle size monitoring

#### Caching Strategy
- **Static Assets**: Long-term caching
- **API Responses**: Appropriate cache headers
- **Session Storage**: Efficient data persistence

### 🚀 Backend Optimization

#### Model Management
- **Model Caching**: Reuse loaded models
- **Batch Processing**: Group similar requests
- **Resource Pooling**: Efficient resource utilization

#### Database Optimization
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized database queries
- **Indexing Strategy**: Proper database indexing

---

## 🔮 Future Enhancements

### 🎯 Planned Features

#### Advanced AI Integration
- **GPT-4 Vision**: Enhanced image understanding
- **Claude 3**: Alternative text analysis
- **Specialized Models**: Domain-specific analysis models

#### Real-time Features
- **Live Monitoring**: Real-time social media monitoring
- **Push Notifications**: Alert system for new claims
- **Streaming Analysis**: Real-time content processing

#### Enhanced Verification
- **Blockchain Verification**: Immutable fact-checking records
- **Expert Network**: Human expert verification
- **Community Voting**: Crowdsourced verification

#### Platform Expansion
- **Mobile App**: Native mobile applications
- **Browser Extension**: In-browser fact-checking
- **API Marketplace**: Public API access

### 🛠️ Technical Improvements

#### Scalability
- **Microservices**: Service decomposition
- **Container Orchestration**: Kubernetes deployment
- **Load Balancing**: Horizontal scaling
- **CDN Integration**: Global content delivery

#### Analytics
- **Usage Analytics**: User behavior tracking
- **Performance Metrics**: System performance monitoring
- **A/B Testing**: Feature testing framework
- **Business Intelligence**: Advanced reporting

---

## 📚 Resources & References

### 📖 Documentation Links
- **Next.js**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **AWS Bedrock**: https://docs.aws.amazon.com/bedrock/
- **yt-dlp**: https://github.com/yt-dlp/yt-dlp

### 🔗 API References
- **Google Gemini**: https://ai.google.dev/docs
- **OpenAI**: https://platform.openai.com/docs
- **Perplexity**: https://docs.perplexity.ai/

### 🎓 Learning Resources
- **Multimodal AI**: Research papers and tutorials
- **Fact-Checking**: Best practices and methodologies
- **Social Media Analysis**: Platform-specific guides
- **AWS AI Services**: Training and certification

---

## 🤝 Contributing

### 📋 Development Guidelines

#### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting and formatting
- **Python PEP 8**: Python code standards
- **Documentation**: Comprehensive code documentation

#### Testing Requirements
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end testing
- **API Tests**: Comprehensive API testing
- **Performance Tests**: Load and stress testing

#### Pull Request Process
1. **Fork Repository**: Create personal fork
2. **Feature Branch**: Create feature-specific branch
3. **Code Changes**: Implement changes with tests
4. **Documentation**: Update relevant documentation
5. **Pull Request**: Submit for review
6. **Code Review**: Address feedback
7. **Merge**: Merge after approval

---

## 📞 Support & Contact

### 🆘 Getting Help

#### Issue Reporting
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Check existing documentation
- **Community**: Community forums and discussions

---

## 📄 License & Legal

### 📜 License Information
This project is licensed under the MIT License. See the LICENSE file for details.

### ⚖️ Terms of Use
- **Fair Use**: Educational and research purposes
- **API Limits**: Respect third-party API limitations
- **Data Privacy**: User data protection compliance
- **Content Policy**: Responsible content analysis

### 🔒 Privacy Policy
- **Data Collection**: Minimal data collection
- **Data Storage**: Temporary processing only
- **Data Sharing**: No unauthorized data sharing
- **User Rights**: Data access and deletion rights

---

*Last Updated: October 2025*
*Version: 1.0.0*
*Documentation Status: Complete*
