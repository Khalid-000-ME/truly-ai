"""
Simple audio analysis test with file discovery
"""
import os
import glob
from pathlib import Path
from working_aws_analyzer import WorkingAWSAnalyzer

def find_audio_files():
    """Find audio files in common locations"""
    common_paths = [
        "C:\\Users\\sl\\Downloads\\",
        "C:\\Users\\sl\\Music\\",
        "C:\\Users\\sl\\Documents\\",
        "C:\\Users\\sl\\Desktop\\",
        "."  # Current directory
    ]
    
    audio_extensions = ["*.mp3", "*.wav", "*.m4a", "*.flac", "*.ogg"]
    found_files = []
    
    for path in common_paths:
        if os.path.exists(path):
            for ext in audio_extensions:
                files = glob.glob(os.path.join(path, ext))
                found_files.extend(files)
    
    return found_files[:5]  # Return first 5 files found

def test_audio_with_file(audio_path):
    """Test audio analysis with a specific file"""
    print(f"=== Testing Audio Analysis ===")
    print(f"File: {audio_path}")
    print(f"Size: {os.path.getsize(audio_path) / (1024*1024):.2f} MB")
    
    analyzer = WorkingAWSAnalyzer()
    
    # Test transcription
    print("\n1. Testing transcription...")
    transcription_result = analyzer.transcribe_audio(audio_path)
    
    if transcription_result['success']:
        print("SUCCESS: Transcription working!")
        print(f"Language: {transcription_result['language']}")
        print(f"Model: {transcription_result['model_used']}")
        print(f"Transcription: {transcription_result['transcription']}")
        
        if transcription_result['segments']:
            print(f"\nTimestamped segments:")
            for i, segment in enumerate(transcription_result['segments'][:3]):  # Show first 3
                print(f"  [{segment['start']:.1f}s - {segment['end']:.1f}s]: {segment['text']}")
        
        # Test analysis
        print(f"\n2. Testing AI analysis...")
        analysis_result = analyzer.analyze_audio(audio_path)
        
        if analysis_result['success'] and analysis_result['analysis_success']:
            print("SUCCESS: Audio analysis working!")
            print(f"Analysis: {analysis_result['analysis']}")
        else:
            print("Transcription worked, but analysis failed")
            
    else:
        print(f"FAILED: {transcription_result['error']}")
    
    return transcription_result['success']

def create_test_audio():
    """Create a simple test audio using text-to-speech if available"""
    try:
        import pyttsx3
        
        print("Creating test audio with text-to-speech...")
        engine = pyttsx3.init()
        
        test_text = """
        Hello, this is a test audio for the TrulyAI multimodal analysis system.
        We are testing the audio transcription and analysis capabilities.
        This system can transcribe speech and analyze the content using AI models.
        Thank you for testing this feature.
        """
        
        output_file = "test_audio_generated.wav"
        engine.save_to_file(test_text, output_file)
        engine.runAndWait()
        
        if os.path.exists(output_file):
            print(f"Test audio created: {output_file}")
            return output_file
        else:
            print("Failed to create test audio")
            return None
            
    except ImportError:
        print("pyttsx3 not available for creating test audio")
        print("Install with: pip install pyttsx3")
        return None
    except Exception as e:
        print(f"Failed to create test audio: {e}")
        return None

def main():
    print("=== Audio Analysis Test (Smart File Discovery) ===\n")
    
    # Method 1: Look for existing audio files
    print("1. Searching for audio files...")
    audio_files = find_audio_files()
    
    if audio_files:
        print(f"Found {len(audio_files)} audio file(s):")
        for i, file in enumerate(audio_files):
            print(f"  {i+1}. {file}")
        
        # Test with the first file found
        print(f"\nTesting with: {audio_files[0]}")
        success = test_audio_with_file(audio_files[0])
        
        if success:
            print(f"\n🎉 Audio analysis is working perfectly!")
            return
    else:
        print("No audio files found in common locations")
    
    # Method 2: Try to create test audio
    print(f"\n2. Attempting to create test audio...")
    test_file = create_test_audio()
    
    if test_file:
        success = test_audio_with_file(test_file)
        if success:
            print(f"\n🎉 Audio analysis is working perfectly!")
            return
    
    # Method 3: Manual instructions
    print(f"\n3. Manual setup required:")
    print("To test audio analysis, please:")
    print("1. Download any audio file (MP3, WAV, etc.)")
    print("2. Place it in C:\\Users\\sl\\Downloads\\")
    print("3. Update the audio_path in f_test_audio.py")
    print("4. Run the test again")
    
    print(f"\nAlternatively, you can:")
    print("1. Record audio on your phone/computer")
    print("2. Save as MP3 or WAV")
    print("3. Copy to Downloads folder")
    
    print(f"\nSupported formats: MP3, WAV, M4A, FLAC, OGG")
    print(f"Recommended: Short audio clips (30 seconds to 2 minutes)")

if __name__ == "__main__":
    main()
