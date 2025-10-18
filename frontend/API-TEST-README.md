# TrulyAI API Testing Guide

## 🚀 Overview

The `/api/handle` route processes user prompts and uploaded files, extracting links using Gemini AI and storing files locally.

## 📋 API Functionality

### Input
- **Text Prompt**: User instructions/questions
- **Files**: Up to 3 media files (image, video, audio)

### Processing
1. **Link Extraction**: Uses Gemini AI to find and extract URLs from text
2. **Text Refinement**: Improves clarity of user instructions
3. **File Storage**: Saves uploaded files to `/uploads` directory
4. **JSON Response**: Returns structured data with all processed information

### Output JSON Structure
```json
{
  "success": true,
  "data": {
    "originalPrompt": "User's original text",
    "refinedText": "AI-improved version of the text", 
    "extractedLinks": ["https://example.com", "www.site.org"],
    "mediaFiles": [
      {
        "path": "/absolute/path/to/file",
        "type": "image/jpeg",
        "originalName": "photo.jpg"
      }
    ]
  },
  "message": "Request processed successfully"
}
```

## 🛠️ Setup Requirements

### 1. Environment Variables
Create a `.env.local` file in the frontend directory:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Dependencies
The API uses these packages (already included):
- `@google/generative-ai` - Gemini AI integration
- `next` - Next.js framework

### 3. Directory Structure
The API automatically creates an `/uploads` directory for file storage.

## 🧪 Testing the API

### Option 1: Node.js Test Script (Recommended)
```bash
# Make sure your dev server is running
npm run dev

# In another terminal, run the test
node test-api-node.js
```

### Option 2: Windows Batch File
```cmd
# Make sure your dev server is running
npm run dev

# Run the batch file
test-api.bat
```

### Option 3: Bash Script (Linux/Mac)
```bash
# Make sure your dev server is running
npm run dev

# Make executable and run
chmod +x test-api-simple.sh
./test-api-simple.sh
```

### Option 4: Manual curl Commands
```bash
# Test GET endpoint
curl -X GET http://localhost:3000/api/handle

# Test with text prompt
curl -X POST http://localhost:3000/api/handle \
  -F "prompt=Check this link: https://example.com for accuracy"

# Test with file upload
echo "test content" > test.txt
curl -X POST http://localhost:3000/api/handle \
  -F "prompt=Analyze this file" \
  -F "file_0=@test.txt"
```

## 📊 Test Scenarios

The test scripts include these scenarios:

1. **Simple Text Query**
   - Basic prompt without links or files
   - Tests text refinement functionality

2. **Text with Links**
   - Prompt containing multiple URLs
   - Tests link extraction with Gemini AI

3. **File Upload**
   - Text prompt with uploaded files
   - Tests file storage and processing

4. **Complex Scenario**
   - Combination of text, links, and files
   - Tests full API functionality

## 🔍 Expected Results

### Successful Response
- `success: true`
- `data` object with all processed information
- Files saved to `/uploads` directory
- Links extracted and listed in `extractedLinks` array
- Text refined and improved in `refinedText` field

### Error Response
- `success: false`
- `error` field with error description
- `details` field with technical error info

## 📁 File Storage

- Files are stored in `/uploads` directory
- Filenames format: `{timestamp}_{index}_{originalName}`
- Supports: images, videos, audio files
- Maximum: 3 files per request

## 🔗 Link Extraction

The Gemini AI processes text to:
- Find URLs (http, https, www, domain.com patterns)
- Extract and clean link formats
- Fallback to regex if AI fails
- Return deduplicated link list

## 🚨 Troubleshooting

### Common Issues

1. **"GEMINI_API_KEY not found"**
   - Add your API key to `.env.local`
   - Restart the dev server

2. **"File upload failed"**
   - Check file size and type
   - Ensure `/uploads` directory permissions

3. **"Link extraction failed"**
   - API falls back to regex extraction
   - Check Gemini API quota/limits

4. **"Connection refused"**
   - Ensure dev server is running on port 3000
   - Check firewall settings

### Debug Tips

- Check browser console for frontend errors
- Check terminal for API server logs
- Verify file paths in response data
- Test with simple prompts first

## 📝 Example Usage

```javascript
// Frontend usage example
const formData = new FormData();
formData.append('prompt', 'Analyze this content: https://example.com');
formData.append('file_0', fileInput.files[0]);

const response = await fetch('/api/handle', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Processed data:', result.data);
```

## 🎯 Next Steps

After successful testing:
1. Integrate with your fact-checking pipeline
2. Add authentication if needed
3. Implement rate limiting
4. Add file type validation
5. Set up production file storage (AWS S3, etc.)

---

**Happy Testing! 🚀**
