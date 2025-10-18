# 📁 File Storage Information

## 🗂️ **Storage Location**

All uploaded files are stored in the `/uploads` directory relative to your project root:

```
TrulyAI/frontend/uploads/
```

**Full Path Example:**
```
c:\Users\sl\OneDrive\Documents\Hackathons\TrulyAI\frontend\uploads\
```

## 📋 **File Naming Convention**

Files are renamed using this secure pattern:
```
{timestamp}_{randomId}_{index}{extension}
```

**Example:**
- Original: `photo.jpg`
- Saved as: `1729234567_abc123_0.jpg`

## 🔍 **Console Output**

When you upload files, the console will show:

### File Processing
```
📁 File Storage Location: /full/path/to/uploads
📂 Uploads directory already exists
✅ File saved successfully:
   📄 Original: photo.jpg (image/jpeg, 1024.50 KB)
   💾 Saved as: 1729234567_abc123_0.jpg
   📍 Full path: /full/path/to/uploads/1729234567_abc123_0.jpg
```

### Processing Summary
```
📋 File Processing Summary:
   ✅ Successfully saved: 2 files
   ❌ Failed: 0 files
   📁 Storage directory: /full/path/to/uploads
   📊 Total size: 2048.75 KB
```

### Full API Response
```
🔍 FULL API RESPONSE:
==========================================
{
  "success": true,
  "data": {
    "originalPrompt": "Your input text",
    "refinedText": "AI-improved version",
    "extractedLinks": ["https://example.com"],
    "mediaFiles": [
      {
        "path": "/full/path/to/uploads/1729234567_abc123_0.jpg",
        "type": "image/jpeg",
        "originalName": "photo.jpg",
        "size": 1048576
      }
    ]
  },
  "message": "Request processed successfully",
  "meta": {
    "processingTimeMs": 1250,
    "geminiUsed": true,
    "filesProcessed": 1,
    "linksExtracted": 1
  }
}
==========================================
```

## 🔧 **File Management**

### Supported File Types
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, QuickTime (MOV)
- **Audio**: MP3, WAV, OGG, M4A

### Limits
- **Max files per request**: 3
- **Max file size**: 10MB each
- **Total storage**: Unlimited (manage manually)

### Manual Cleanup
Files are stored permanently until manually deleted. To clean up:

```bash
# View uploaded files
ls -la uploads/

# Remove old files (example: older than 7 days)
find uploads/ -type f -mtime +7 -delete

# Remove all files
rm -rf uploads/*
```

## 🚨 **Important Notes**

1. **File Paths**: The API returns absolute file paths in the response
2. **Security**: Files are renamed to prevent conflicts and security issues
3. **Persistence**: Files remain until manually deleted
4. **Permissions**: Ensure the uploads directory has write permissions
5. **Backup**: Consider backing up important uploaded files

## 🔍 **Debugging**

If files aren't being saved:

1. **Check Console**: Look for file storage location and error messages
2. **Verify Permissions**: Ensure write access to the uploads directory
3. **Check File Size**: Ensure files are under 10MB
4. **Validate Type**: Only supported file types are accepted
5. **Disk Space**: Ensure sufficient disk space available

---

**The console output will show you exactly where your files are being stored!** 📍
