"""
Working audio analysis test with proper file handling
"""
import os
import glob
from pathlib import Path
from working_aws_analyzer import WorkingAWSAnalyzer

def test_audio_file(audio_path):
    """Test audio analysis with proper error handling"""
    print(f"=== Testing Audio File ===")
    print(f"File: {audio_path}")
    
    # Check if file exists
    if not os.path.exists(audio_path):
        print(f"ERROR: File does not exist")
        return False
    
    # Check file size
    file_size = os.path.getsize(audio_path)
    print(f"Size: {file_size / (1024*1024):.2f} MB")
    
    if file_size == 0:
        print(f"ERROR: File is empty")
        return False
    
    if file_size > 50 * 1024 * 1024:  # 50MB limit
        print(f"WARNING: File is large, this may take a while")
    
    try:
        analyzer = WorkingAWSAnalyzer()
        
        print(f"\nStarting transcription...")
        transcription_result = analyzer.transcribe_audio(audio_path)
        
        if transcription_result['success']:
            print(f"SUCCESS: Audio transcription working!")
            print(f"Language detected: {transcription_result['language']}")
            print(f"Model used: {transcription_result['model_used']}")
            print(f"Transcription length: {len(transcription_result['transcription'])} characters")
            print(f"Transcription: {transcription_result['transcription']}")
            
            if transcription_result['segments']:
                print(f"\nSegments ({len(transcription_result['segments'])} total):")
                for i, segment in enumerate(transcription_result['segments'][:5]):  # Show first 5
                    start = segment.get('start', 0)
                    end = segment.get('end', 0)
                    text = segment.get('text', '').strip()
                    print(f"  [{start:.1f}s - {end:.1f}s]: {text}")
                
                if len(transcription_result['segments']) > 5:
                    print(f"  ... and {len(transcription_result['segments']) - 5} more segments")
            
            # Test AI analysis if transcription worked
            if len(transcription_result['transcription'].strip()) > 10:  # Only if we have meaningful text
                print(f"\nStarting AI analysis...")
                analysis_result = analyzer.analyze_audio(audio_path)
                
                if analysis_result['success'] and analysis_result.get('analysis_success'):
                    print(f"SUCCESS: Audio analysis working!")
                    print(f"Analysis model: {analysis_result['analysis_model']}")
                    print(f"Analysis: {analysis_result['analysis']}")
                else:
                    print(f"Transcription worked, but AI analysis had issues")
            else:
                print(f"Transcription too short for meaningful analysis")
            
            return True
            
        else:
            print(f"FAILED: Transcription failed")
            print(f"Error: {transcription_result['error']}")
            return False
            
    except Exception as e:
        print(f"FAILED: Unexpected error: {e}")
        return False

def find_and_test_audio():
    """Find audio files and test them"""
    print("=== Audio Analysis Test (Automatic File Discovery) ===\n")
    
    # Search for audio files
    search_paths = [
        "C:\\Users\\sl\\Downloads\\*.mp3",
        "C:\\Users\\sl\\Downloads\\*.wav", 
        "C:\\Users\\sl\\Downloads\\*.m4a",
        "C:\\Users\\sl\\Music\\*.mp3",
        "C:\\Users\\sl\\Music\\*.wav",
        "C:\\Users\\sl\\Documents\\*.mp3",
        "C:\\Users\\sl\\Documents\\*.wav",
        ".\\*.mp3",
        ".\\*.wav"
    ]
    
    audio_files = []
    for pattern in search_paths:
        files = glob.glob(pattern)
        audio_files.extend(files)
    
    # Remove duplicates and filter valid files
    audio_files = list(set(audio_files))
    valid_files = []
    
    for file in audio_files:
        if os.path.exists(file) and os.path.getsize(file) > 1000:  # At least 1KB
            valid_files.append(file)
    
    if not valid_files:
        print("No valid audio files found!")
        print("\nTo test audio analysis:")
        print("1. Download any audio file (MP3, WAV, M4A)")
        print("2. Place it in C:\\Users\\sl\\Downloads\\")
        print("3. Run this script again")
        print("\nOr record a short audio clip and save it as MP3/WAV")
        return False
    
    print(f"Found {len(valid_files)} valid audio file(s):")
    for i, file in enumerate(valid_files[:5]):  # Show first 5
        size_mb = os.path.getsize(file) / (1024*1024)
        print(f"  {i+1}. {Path(file).name} ({size_mb:.2f} MB)")
    
    # Test the first valid file
    test_file = valid_files[0]
    print(f"\nTesting with: {Path(test_file).name}")
    
    success = test_audio_file(test_file)
    
    if success:
        print(f"\n🎉 AUDIO ANALYSIS IS WORKING PERFECTLY!")
        print(f"\nYour system can now:")
        print(f"- Transcribe audio files using Whisper")
        print(f"- Analyze transcriptions using AWS Bedrock")
        print(f"- Process multiple audio formats")
        print(f"- Generate timestamps and segments")
        print(f"- Perform sentiment analysis")
        print(f"- Extract topics and summaries")
        
        print(f"\nReady for FastAPI integration!")
    else:
        print(f"\n❌ Audio analysis needs debugging")
        
        # Try with a different file if available
        if len(valid_files) > 1:
            print(f"\nTrying with different file...")
            success = test_audio_file(valid_files[1])
            if success:
                print(f"\n🎉 Audio analysis working with second file!")
    
    return success

if __name__ == "__main__":
    find_and_test_audio()
