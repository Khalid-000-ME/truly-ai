
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
        audio_file = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
        
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
