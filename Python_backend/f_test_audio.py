"""
Test audio analysis using OpenAI Whisper and AWS Bedrock
"""
import os
import whisper
import tempfile
from pathlib import Path
from working_aws_analyzer import WorkingAWSAnalyzer

def analyze_audio_file(audio_path):
    """
    Transcribe audio using Whisper and analyze with AWS Bedrock
    """
    print(f"=== Audio Analysis Test ===")
    print(f"Audio: {audio_path}")
    
    if not os.path.exists(audio_path):
        print(f"ERROR: Audio file not found: {audio_path}")
        return
    
    # Initialize analyzer
    analyzer = WorkingAWSAnalyzer()
    
    print(f"\nLoading Whisper model...")
    try:
        # Load Whisper model (base model for good balance of speed/accuracy)
        model = whisper.load_model("base")
        print("Whisper model loaded successfully")
    except Exception as e:
        print(f"Failed to load Whisper model: {e}")
        return
    
    print(f"\nTranscribing audio...")
    try:
        # Transcribe audio
        result = model.transcribe(audio_path, language=None)  # Auto-detect language
        
        transcription = result["text"]
        language = result["language"]
        segments = result.get("segments", [])
        
        print(f"Transcription completed!")
        print(f"Detected language: {language}")
        print(f"Number of segments: {len(segments)}")
        
    except Exception as e:
        print(f"Transcription failed: {e}")
        return
    
    # Display transcription
    print(f"\n=== Transcription Results ===")
    print(f"Full transcription:")
    print(f"{transcription}")
    
    # Display segments with timestamps
    if segments:
        print(f"\n=== Timestamped Segments ===")
        for i, segment in enumerate(segments):
            start_time = segment.get('start', 0)
            end_time = segment.get('end', 0)
            text = segment.get('text', '').strip()
            
            print(f"[{start_time:.2f}s - {end_time:.2f}s]: {text}")
    
    # Analyze transcription with AWS Bedrock
    print(f"\n=== AI Analysis of Transcription ===")
    
    analysis_prompts = [
        "Summarize the main topics discussed in this transcription.",
        "What is the overall sentiment or tone of this audio?",
        "Extract any key points or important information from this text."
    ]
    
    for prompt in analysis_prompts:
        print(f"\nAnalyzing: {prompt}")
        
        full_prompt = f"{prompt}\n\nTranscription: {transcription}"
        analysis_result = analyzer.analyze_text(full_prompt)
        
        if analysis_result['success']:
            print(f"Result: {analysis_result['response']}")
        else:
            print(f"Analysis failed: {analysis_result['error']}")
    
    # Generate comprehensive analysis
    print(f"\n=== Comprehensive Audio Analysis ===")
    
    comprehensive_prompt = f"""
    Please provide a comprehensive analysis of this audio transcription including:
    1. Main topics and themes
    2. Speaker's tone and sentiment
    3. Key information or insights
    4. Summary of important points
    5. Any notable patterns or characteristics
    
    Transcription: {transcription}
    """
    
    comprehensive_result = analyzer.analyze_text(comprehensive_prompt)
    
    if comprehensive_result['success']:
        print(f"Comprehensive Analysis:")
        print(f"{comprehensive_result['response']}")
    else:
        print(f"Comprehensive analysis failed: {comprehensive_result['error']}")
    
    print(f"\n=== Test Complete ===")
    
    return {
        'transcription': transcription,
        'language': language,
        'segments': segments,
        'analysis': comprehensive_result['response'] if comprehensive_result['success'] else None
    }

def test_whisper_installation():
    """Test if Whisper is properly installed"""
    print("=== Testing Whisper Installation ===")
    
    try:
        import whisper
        print("SUCCESS: Whisper module imported successfully")
        
        # Try loading the smallest model
        model = whisper.load_model("tiny")
        print("SUCCESS: Whisper tiny model loaded successfully")
        
        # Test with a simple audio (if available)
        print("SUCCESS: Whisper is ready for use")
        return True
        
    except ImportError:
        print("FAILED: Whisper not installed. Install with: pip install openai-whisper")
        return False
    except Exception as e:
        print(f"FAILED: Whisper installation issue: {e}")
        return False

if __name__ == "__main__":
    # Test Whisper installation first
    if not test_whisper_installation():
        print("\nPlease install Whisper first:")
        print("pip install openai-whisper")
        exit(1)
    
    # Test with an audio file - update this path to your audio
    audio_path = "C:\\Users\\sl\\Downloads\\test_audio.mp3"  # Update this path
    
    # Check if file exists, if not provide instructions
    if not os.path.exists(audio_path):
        print("\nAudio file not found!")
        print("Please update the audio_path variable with a valid audio file path.")
        print("Supported formats: MP3, WAV, M4A, FLAC, OGG")
        print(f"Current path: {audio_path}")
        
        # Offer to test with a simple text-to-speech if available
        print("\nAlternatively, you can:")
        print("1. Record a short audio file")
        print("2. Download a sample audio file")
        print("3. Use any audio file you have available")
    else:
        analyze_audio_file(audio_path)
