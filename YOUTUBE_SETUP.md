# YouTube Video/Audio Download Setup for Next.js Application

## Prerequisites

To enable YouTube video and audio downloading in TrulyAI (Next.js app), you need to install `yt-dlp` as a **system-wide command-line tool**.

⚠️ **Important**: This is NOT an npm package! `yt-dlp` is a Python CLI tool that your Next.js app calls via system commands.

## Installation Instructions for Windows

### Option 1: Download Binary (Easiest for Windows)
1. Go to: https://github.com/yt-dlp/yt-dlp/releases
2. Download `yt-dlp.exe` from the latest release
3. Create a folder: `C:\yt-dlp\`
4. Place `yt-dlp.exe` in that folder
5. Add `C:\yt-dlp\` to your Windows PATH:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "System Variables", find "Path" → Click "Edit"
   - Click "New" → Add `C:\yt-dlp\`
   - Click OK on all dialogs
   - **Restart your terminal/IDE**

### Option 2: Using Windows Package Manager (winget)
```bash
winget install yt-dlp.yt-dlp
```

### Option 3: Using Chocolatey
```bash
choco install yt-dlp
```

### Option 4: Using pip (if you have Python installed)
```bash
pip install yt-dlp
```

### Option 5: Using Scoop
```bash
scoop install yt-dlp
```

## Quick Installation (Windows)

Run the provided installation script:
```bash
# From the TrulyAI project root
./install-yt-dlp.bat
```

This script will try multiple installation methods automatically.

## Manual Verification

Open a **new terminal/command prompt** and run:
```bash
yt-dlp --version
```

You should see version information if installed correctly.

⚠️ **Important**: After installation, you **must restart your development server** and any open terminals for the PATH changes to take effect.

## How It Works

Once yt-dlp is installed, the TrulyAI segregation process will:

1. **Download YouTube Videos**: Downloads videos at 720p max resolution for reasonable file sizes
2. **Extract Audio**: Downloads audio-only versions in MP3 format
3. **Store Locally**: Saves files in the `uploads/` directory
4. **Analyze Content**: Uses the local files for multimodal analysis

## Expected Behavior

### With yt-dlp Installed:
```
🎥 Downloading YouTube video: https://www.youtube.com/watch?v=...
🎵 Downloading YouTube audio: https://www.youtube.com/watch?v=...
✅ YouTube video downloaded: youtube_123_0.webm (15.2 MB)
✅ YouTube audio downloaded: youtube_123_0.mp3 (3.4 MB)
🎉 YouTube video and audio downloaded successfully!
📁 Using local file: C:\...\uploads\youtube_123_0.webm
📁 Using local file: C:\...\uploads\youtube_123_0.mp3
```

### Without yt-dlp:
```
yt-dlp not found. Please install it: pip install yt-dlp
yt-dlp not available, skipping video download
yt-dlp not available, skipping audio download
❌ Both YouTube video and audio downloads failed
📁 Using URL: https://www.youtube.com/watch?v=... (fallback)
```

## Troubleshooting

### Common Issues:

1. **"yt-dlp not found"**: Make sure yt-dlp is installed and in your PATH
2. **Download timeouts**: Videos are limited to 2 minutes download time, audio to 90 seconds
3. **File not found**: Check the uploads directory for downloaded files
4. **Permission errors**: Ensure the application has write access to the uploads directory

### Performance Notes:

- Videos are downloaded at max 720p resolution to balance quality and file size
- Audio is extracted as MP3 for compatibility
- Downloads happen in parallel for efficiency
- Files are stored with unique timestamps to avoid conflicts

## File Locations

Downloaded files are stored in:
```
frontend/uploads/
├── youtube_1760811592750_0.webm  (video)
├── youtube_1760811592750_0.mp3   (audio)
└── youtube_1760811595100_0.jpg   (thumbnail)
```

The Python backend will analyze these local files instead of trying to access YouTube URLs directly.
