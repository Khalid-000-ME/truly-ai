"""
Fix Whisper FFmpeg dependency issue
"""
import os
import subprocess
import sys

def check_ffmpeg():
    """Check if FFmpeg is available"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("SUCCESS: FFmpeg is already installed")
            return True
        else:
            print("FFmpeg found but not working properly")
            return False
    except FileNotFoundError:
        print("FFmpeg not found in system PATH")
        return False

def install_ffmpeg_python():
    """Install ffmpeg-python package"""
    try:
        print("Installing ffmpeg-python package...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'ffmpeg-python'])
        print("SUCCESS: ffmpeg-python installed")
        return True
    except Exception as e:
        print(f"Failed to install ffmpeg-python: {e}")
        return False

def test_whisper_with_ffmpeg():
    """Test Whisper after FFmpeg setup"""
    try:
        import whisper
        print("Testing Whisper with FFmpeg...")
        
        # Try to load audio using Whisper's load_audio function
        audio_file = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
        
        if os.path.exists(audio_file):
            # This will test if FFmpeg is working
            audio = whisper.load_audio(audio_file)
            print(f"SUCCESS: Audio loaded successfully, shape: {audio.shape}")
            
            # Now try full transcription
            model = whisper.load_model("tiny")
            result = model.transcribe(audio_file)
            
            print(f"SUCCESS: Full transcription working!")
            print(f"Text: {result['text']}")
            print(f"Language: {result['language']}")
            
            return True
        else:
            print("Test audio file not found")
            return False
            
    except Exception as e:
        print(f"Whisper test failed: {e}")
        return False

def provide_ffmpeg_instructions():
    """Provide instructions for installing FFmpeg"""
    print("\n=== FFmpeg Installation Instructions ===")
    print("\nOption 1: Install via Chocolatey (Recommended)")
    print("1. Open PowerShell as Administrator")
    print("2. Install Chocolatey if not installed:")
    print("   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))")
    print("3. Install FFmpeg:")
    print("   choco install ffmpeg")
    
    print("\nOption 2: Manual Installation")
    print("1. Download FFmpeg from: https://ffmpeg.org/download.html#build-windows")
    print("2. Extract to C:\\ffmpeg")
    print("3. Add C:\\ffmpeg\\bin to your system PATH")
    print("4. Restart your terminal/IDE")
    
    print("\nOption 3: Use conda (if you have Anaconda/Miniconda)")
    print("   conda install ffmpeg")
    
    print("\nAfter installation, restart this script to test again.")

def create_alternative_audio_test():
    """Create an alternative test that doesn't require FFmpeg"""
    print("\n=== Creating Alternative Audio Test ===")
    
    # Create a simple test using pydub which can handle more formats
    test_code = '''
"""
Alternative audio test without FFmpeg dependency
"""
try:
    from pydub import AudioSegment
    import numpy as np
    import whisper
    import tempfile
    import os
    
    def convert_audio_for_whisper(input_path):
        """Convert audio to format Whisper can handle"""
        # Load audio with pydub
        audio = AudioSegment.from_file(input_path)
        
        # Convert to mono, 16kHz (Whisper's expected format)
        audio = audio.set_channels(1).set_frame_rate(16000)
        
        # Export as WAV to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        audio.export(temp_file.name, format="wav")
        
        return temp_file.name
    
    def test_audio_alternative():
        audio_file = "C:\\\\Users\\\\sl\\\\Downloads\\\\test_audio.mp3"
        
        if os.path.exists(audio_file):
            print(f"Converting audio file...")
            wav_file = convert_audio_for_whisper(audio_file)
            
            print(f"Testing with converted file...")
            model = whisper.load_model("tiny")
            result = model.transcribe(wav_file)
            
            print(f"SUCCESS: {result['text']}")
            
            # Clean up
            os.unlink(wav_file)
            
            return True
        return False
    
    if __name__ == "__main__":
        test_audio_alternative()
        
except ImportError:
    print("pydub not available. Install with: pip install pydub")
'''
    
    with open("alternative_audio_test.py", "w") as f:
        f.write(test_code)
    
    print("Created alternative_audio_test.py")
    print("This uses pydub instead of FFmpeg")
    print("Install pydub with: pip install pydub")

def main():
    print("=== Fixing Whisper FFmpeg Issue ===\n")
    
    # Check if FFmpeg is available
    if check_ffmpeg():
        print("FFmpeg is working, testing Whisper...")
        if test_whisper_with_ffmpeg():
            print("\n🎉 Everything is working!")
            return
        else:
            print("FFmpeg works but Whisper still has issues")
    
    # Try installing ffmpeg-python
    print("\nTrying to install ffmpeg-python package...")
    if install_ffmpeg_python():
        if test_whisper_with_ffmpeg():
            print("\n🎉 Fixed with ffmpeg-python package!")
            return
    
    # Provide installation instructions
    provide_ffmpeg_instructions()
    
    # Create alternative test
    create_alternative_audio_test()
    
    print("\n=== Summary ===")
    print("Whisper requires FFmpeg to process audio files.")
    print("Please install FFmpeg using one of the methods above.")
    print("Alternatively, try the alternative_audio_test.py script.")

if __name__ == "__main__":
    main()
