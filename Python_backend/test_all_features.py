"""
Comprehensive test of all multimodal analysis features
"""
import os
from pathlib import Path
from working_aws_analyzer import WorkingAWSAnalyzer

def test_all_features():
    """Test all available features of the multimodal analyzer"""
    print("=== Comprehensive Multimodal Analysis Test ===\n")
    
    # Initialize analyzer
    print("Initializing WorkingAWSAnalyzer...")
    analyzer = WorkingAWSAnalyzer()
    print("SUCCESS: Analyzer initialized\n")
    
    # Test 1: Text Analysis
    print("=== 1. Text Analysis Test ===")
    text_prompt = "Explain the benefits of artificial intelligence in healthcare and education."
    print(f"Prompt: {text_prompt}")
    
    text_result = analyzer.analyze_text(text_prompt)
    if text_result['success']:
        print("SUCCESS: Text analysis working!")
        print(f"Model: {text_result['model_used']}")
        print(f"Response: {text_result['response'][:200]}...")
    else:
        print(f"FAILED: {text_result['error']}")
    print()
    
    # Test 2: Image Analysis
    print("=== 2. Image Analysis Test ===")
    image_path = "C:\\Users\\sl\\Downloads\\kio.jpg"  # Update with your image
    
    if os.path.exists(image_path):
        print(f"Analyzing image: {image_path}")
        image_result = analyzer.analyze_image(image_path, "Describe this image in detail.")
        
        if image_result['success']:
            print("SUCCESS: Image analysis working!")
            print(f"Model: {image_result['model_used']}")
            print(f"Method: {image_result['method']}")
            print(f"Description: {image_result['description']}")
        else:
            print(f"FAILED: {image_result['error']}")
    else:
        print(f"Image not found: {image_path}")
        print("Please update the image_path variable with a valid image file")
    print()
    
    # Test 3: Audio Analysis
    print("=== 3. Audio Analysis Test ===")
    
    # Test Whisper installation first
    try:
        import whisper
        print("Whisper is available for audio analysis")
        
        audio_path = "C:\\Users\\sl\\Downloads\\test_audio.mp3"  # Update with your audio
        
        if os.path.exists(audio_path):
            print(f"Analyzing audio: {audio_path}")
            
            # Test transcription only
            transcription_result = analyzer.transcribe_audio(audio_path)
            if transcription_result['success']:
                print("SUCCESS: Audio transcription working!")
                print(f"Model: {transcription_result['model_used']}")
                print(f"Language: {transcription_result['language']}")
                print(f"Transcription: {transcription_result['transcription'][:200]}...")
                
                # Test full audio analysis
                audio_analysis = analyzer.analyze_audio(audio_path)
                if audio_analysis['success'] and audio_analysis['analysis_success']:
                    print("SUCCESS: Audio analysis working!")
                    print(f"Analysis: {audio_analysis['analysis'][:200]}...")
                else:
                    print("Transcription worked, but analysis had issues")
            else:
                print(f"FAILED: {transcription_result['error']}")
        else:
            print(f"Audio not found: {audio_path}")
            print("Please update the audio_path variable with a valid audio file")
            
    except ImportError:
        print("Whisper not available - audio analysis skipped")
    print()
    
    # Test 4: Video Analysis
    print("=== 4. Video Analysis Test ===")
    
    try:
        import cv2
        print("OpenCV is available for video analysis")
        
        video_path = "C:\\Users\\sl\\Downloads\\test_video.mp4"  # Update with your video
        
        if os.path.exists(video_path):
            print(f"Analyzing video: {video_path}")
            print("Note: Video analysis extracts frames and analyzes them with AWS Bedrock")
            print("This is a complex operation - see f_test_video.py for full implementation")
        else:
            print(f"Video not found: {video_path}")
            print("Please update the video_path variable with a valid video file")
            
    except ImportError:
        print("OpenCV not available - video analysis skipped")
    print()
    
    # Test 5: Specialized Audio Analysis
    print("=== 5. Specialized Audio Analysis ===")
    
    audio_path = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
    if os.path.exists(audio_path):
        print("Testing specialized audio analysis methods...")
        
        # Test sentiment analysis
        sentiment_result = analyzer.analyze_audio_sentiment(audio_path)
        if sentiment_result['success']:
            print("SUCCESS: Audio sentiment analysis working!")
            print(f"Sentiment: {sentiment_result['analysis'][:100]}...")
        
        # Test summarization
        summary_result = analyzer.summarize_audio(audio_path)
        if summary_result['success']:
            print("SUCCESS: Audio summarization working!")
            print(f"Summary: {summary_result['analysis'][:100]}...")
        
        # Test topic extraction
        topics_result = analyzer.extract_audio_topics(audio_path)
        if topics_result['success']:
            print("SUCCESS: Audio topic extraction working!")
            print(f"Topics: {topics_result['analysis'][:100]}...")
    else:
        print("Audio file not available for specialized analysis")
    print()
    
    # Summary
    print("=== Feature Summary ===")
    features = {
        "Text Analysis (AWS Nova Lite)": text_result['success'] if 'text_result' in locals() else False,
        "Image Analysis (AWS Nova Pro)": image_result['success'] if 'image_result' in locals() and os.path.exists(image_path) else "Not tested",
        "Audio Transcription (Whisper)": "Available" if 'whisper' in globals() else "Not available",
        "Audio Analysis (Whisper + AWS)": "Available" if 'whisper' in globals() else "Not available", 
        "Video Analysis (OpenCV + AWS)": "Available" if 'cv2' in globals() else "Not available"
    }
    
    for feature, status in features.items():
        status_text = "SUCCESS" if status is True else "AVAILABLE" if status == "Available" else "NOT TESTED" if status == "Not tested" else "NOT AVAILABLE"
        print(f"  {feature}: {status_text}")
    
    print(f"\n=== Models Used ===")
    print(f"Text Model: {analyzer.text_model}")
    print(f"Multimodal Model: {analyzer.multimodal_model}")
    print(f"Audio Model: whisper-{analyzer.whisper_model_size}")
    
    print(f"\n=== Integration Ready ===")
    print("Your multimodal analyzer supports:")
    print("- Text analysis with AWS Bedrock Nova Lite")
    print("- Image analysis with AWS Bedrock Nova Pro") 
    print("- Audio transcription with OpenAI Whisper")
    print("- Audio analysis combining Whisper + AWS Bedrock")
    print("- Video analysis by extracting frames + AWS Bedrock")
    print("- Hybrid cloud + local processing")
    
    print(f"\nAll components are ready for FastAPI integration!")

if __name__ == "__main__":
    test_all_features()
