"""
Debug Whisper audio processing
"""
import os
import whisper
import tempfile
import shutil

def debug_whisper_direct():
    """Test Whisper directly without our wrapper"""
    print("=== Direct Whisper Test ===")
    
    audio_file = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
    
    if not os.path.exists(audio_file):
        print(f"File not found: {audio_file}")
        return False
    
    print(f"File exists: {audio_file}")
    print(f"File size: {os.path.getsize(audio_file)} bytes")
    
    try:
        # Load Whisper model
        print("Loading Whisper model...")
        model = whisper.load_model("tiny")  # Use tiny for faster testing
        print("Model loaded successfully")
        
        # Try transcribing directly
        print("Starting transcription...")
        result = model.transcribe(audio_file)
        
        print("SUCCESS: Direct Whisper transcription working!")
        print(f"Text: {result['text']}")
        print(f"Language: {result['language']}")
        
        return True
        
    except Exception as e:
        print(f"FAILED: Direct Whisper test failed: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_with_copy():
    """Test by copying file to local directory"""
    print("\n=== Test with Local Copy ===")
    
    source_file = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
    local_file = "local_test_audio.mp3"
    
    if not os.path.exists(source_file):
        print(f"Source file not found: {source_file}")
        return False
    
    try:
        # Copy file to local directory
        print(f"Copying file to local directory...")
        shutil.copy2(source_file, local_file)
        print(f"File copied successfully")
        
        # Test with local file
        model = whisper.load_model("tiny")
        result = model.transcribe(local_file)
        
        print("SUCCESS: Local file transcription working!")
        print(f"Text: {result['text']}")
        print(f"Language: {result['language']}")
        
        # Clean up
        os.remove(local_file)
        
        return True
        
    except Exception as e:
        print(f"FAILED: Local copy test failed: {e}")
        # Clean up on failure
        if os.path.exists(local_file):
            os.remove(local_file)
        return False

def test_different_files():
    """Test with different audio files"""
    print("\n=== Testing Different Files ===")
    
    audio_files = [
        "C:\\Users\\sl\\Downloads\\test_audio.mp3",
        "C:\\Users\\sl\\Downloads\\Chin Tapak Dam Dam Notification Tone Download - MobCup.Com.wav.wav",
        "C:\\Users\\sl\\Downloads\\Chin Tapak Dam Dam Notification Tone Download - MobCup.Com.wav.mp3"
    ]
    
    model = whisper.load_model("tiny")
    
    for audio_file in audio_files:
        if os.path.exists(audio_file):
            print(f"\nTesting: {os.path.basename(audio_file)}")
            try:
                result = model.transcribe(audio_file)
                print(f"SUCCESS: {result['text'][:100]}...")
                return True
            except Exception as e:
                print(f"FAILED: {e}")
    
    return False

def main():
    print("=== Whisper Debug Session ===\n")
    
    # Test 1: Direct Whisper
    success1 = debug_whisper_direct()
    
    if not success1:
        # Test 2: Local copy
        success2 = test_with_copy()
        
        if not success2:
            # Test 3: Different files
            success3 = test_different_files()
            
            if not success3:
                print("\n=== All tests failed ===")
                print("Possible issues:")
                print("1. Audio file format not supported")
                print("2. File path contains special characters")
                print("3. File is corrupted")
                print("4. Whisper installation issue")
                print("\nTry:")
                print("1. Use a simple WAV file")
                print("2. Record new audio with simple filename")
                print("3. Check Whisper installation")
            else:
                print("\n=== SUCCESS with different file ===")
        else:
            print("\n=== SUCCESS with local copy ===")
    else:
        print("\n=== SUCCESS with direct test ===")

if __name__ == "__main__":
    main()
