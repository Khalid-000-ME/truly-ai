@echo off
echo ========================================
echo  TrulyAI - YouTube Downloader Setup
echo ========================================
echo.
echo This script will install yt-dlp for YouTube video/audio downloading
echo.

REM Check if winget is available
winget --version >nul 2>&1
if %errorlevel% == 0 (
    echo Installing yt-dlp using winget...
    winget install yt-dlp.yt-dlp
    if %errorlevel% == 0 (
        echo.
        echo ✅ yt-dlp installed successfully!
        goto verify
    ) else (
        echo ❌ winget installation failed, trying alternative methods...
    )
) else (
    echo winget not available, trying alternative methods...
)

REM Check if Python/pip is available
pip --version >nul 2>&1
if %errorlevel% == 0 (
    echo Installing yt-dlp using pip...
    pip install yt-dlp
    if %errorlevel% == 0 (
        echo.
        echo ✅ yt-dlp installed successfully!
        goto verify
    ) else (
        echo ❌ pip installation failed
    )
) else (
    echo pip not available
)

REM Manual installation instructions
echo.
echo ⚠️  Automatic installation failed. Please install manually:
echo.
echo 1. Go to: https://github.com/yt-dlp/yt-dlp/releases
echo 2. Download yt-dlp.exe
echo 3. Create folder: C:\yt-dlp\
echo 4. Place yt-dlp.exe in that folder
echo 5. Add C:\yt-dlp\ to Windows PATH
echo 6. Restart your terminal/IDE
echo.
goto end

:verify
echo.
echo Verifying installation...
yt-dlp --version
if %errorlevel% == 0 (
    echo.
    echo 🎉 Installation successful! You can now use YouTube downloading in TrulyAI.
    echo.
    echo Next steps:
    echo 1. Restart your development server (npm run dev)
    echo 2. Try the analysis with YouTube videos
) else (
    echo.
    echo ❌ Installation verification failed
    echo Please restart your terminal and try: yt-dlp --version
)

:end
echo.
echo Press any key to exit...
pause >nul
