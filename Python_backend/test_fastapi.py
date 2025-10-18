"""
Test script for the enhanced FastAPI multimodal analysis endpoints
"""
import requests
import json
import os
from pathlib import Path

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_service_status():
    """Test service status endpoint"""
    print("=== Testing Service Status ===")
    try:
        response = requests.get(f"{BASE_URL}/api/status")
        if response.status_code == 200:
            status = response.json()
            print("✓ Service status retrieved successfully")
            print(f"AWS Analyzer Available: {status['aws_analyzer_available']}")
            print(f"Local Audio Analyzer Available: {status['local_audio_analyzer_available']}")
            print("Supported Features:")
            for feature, available in status['supported_features'].items():
                print(f"  - {feature}: {'✓' if available else '✗'}")
            return True
        else:
            print(f"✗ Status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Status check error: {e}")
        return False

def test_text_analysis():
    """Test text analysis endpoint"""
    print("\n=== Testing Text Analysis ===")
    try:
        test_text = """
        Artificial intelligence is revolutionizing healthcare by enabling faster diagnosis,
        personalized treatment plans, and improved patient outcomes. Machine learning algorithms
        can analyze medical images, predict disease progression, and assist doctors in making
        more accurate decisions. This technology is particularly valuable in radiology,
        pathology, and drug discovery.
        """
        
        data = {
            "text": test_text.strip(),
            "analysis_type": "summary"
        }
        
        response = requests.post(f"{BASE_URL}/api/analyze/text", json=data)
        if response.status_code == 200:
            result = response.json()
            print("✓ Text analysis successful")
            print(f"Model Used: {result['model_used']}")
            print(f"Analysis Type: {result['analysis_type']}")
            print(f"Result: {result['result'][:200]}...")
            return True
        else:
            print(f"✗ Text analysis failed: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"✗ Text analysis error: {e}")
        return False

def test_image_analysis():
    """Test image analysis endpoint"""
    print("\n=== Testing Image Analysis ===")
    
    # Test with path-based analysis (if image exists)
    test_image_path = "C:\\Users\\sl\\Downloads\\kio.jpg"
    
    if os.path.exists(test_image_path):
        try:
            data = {
                "image_path": test_image_path,
                "prompt": "Describe this image in detail"
            }
            
            response = requests.post(f"{BASE_URL}/api/analyze/image/path", data=data)
            if response.status_code == 200:
                result = response.json()
                print("✓ Image analysis successful (local file)")
                print(f"Model Used: {result['model_used']}")
                print(f"Method: {result['method']}")
                print(f"Description: {result['description'][:200]}...")
                return True
            else:
                print(f"✗ Image analysis failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"✗ Image analysis error: {e}")
            return False
    else:
        print(f"✗ Test image not found: {test_image_path}")
        
        # Try with HTTP URL as fallback
        print("Trying with HTTP URL...")
        try:
            test_image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"
            data = {
                "image_path": test_image_url,
                "prompt": "Describe this image in detail"
            }
            
            response = requests.post(f"{BASE_URL}/api/analyze/image/path", data=data)
            if response.status_code == 200:
                result = response.json()
                print("✓ Image analysis successful (HTTP URL)")
                print(f"Model Used: {result['model_used']}")
                print(f"Method: {result['method']}")
                print(f"Description: {result['description'][:200]}...")
                return True
            else:
                print(f"✗ HTTP URL image analysis failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"✗ HTTP URL image analysis error: {e}")
            return False

def test_audio_transcription():
    """Test audio transcription endpoint"""
    print("\n=== Testing Audio Transcription ===")
    
    # Test with path-based transcription (if audio exists)
    test_audio_path = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
    
    if os.path.exists(test_audio_path):
        try:
            data = {
                "audio_path": test_audio_path,
                "language": None  # Auto-detect
            }
            
            response = requests.post(f"{BASE_URL}/api/analyze/transcribe/path", data=data)
            if response.status_code == 200:
                result = response.json()
                print("✓ Audio transcription successful")
                print(f"Language: {result['language']}")
                print(f"Model Used: {result['model_used']}")
                print(f"Transcription: {result['transcription'][:200]}...")
                print(f"Segments: {len(result['segments'])}")
                return True
            else:
                print(f"✗ Audio transcription failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"✗ Audio transcription error: {e}")
            return False
    else:
        print(f"✗ Test audio not found: {test_audio_path}")
        print("Please update the test_audio_path variable with a valid audio file")
        return False

def test_comprehensive_audio_analysis():
    """Test comprehensive audio analysis endpoint"""
    print("\n=== Testing Comprehensive Audio Analysis ===")
    
    # Test with path-based analysis (if audio exists)
    test_audio_path = "C:\\Users\\sl\\Downloads\\test_audio.mp3"
    
    if os.path.exists(test_audio_path):
        try:
            data = {
                "audio_path": test_audio_path
            }
            
            response = requests.post(f"{BASE_URL}/api/analyze/audio/path", data=data)
            if response.status_code == 200:
                result = response.json()
                print("✓ Comprehensive audio analysis successful")
                print(f"Audio Type: {result['audio_type']}")
                print(f"Duration: {result['duration']:.2f}s")
                print(f"Mood: {result['mood']['mood']}")
                print(f"Tempo: {result['features']['tempo']:.1f} BPM")
                if result['transcription']:
                    print(f"Transcription: {result['transcription']['text'][:100]}...")
                print(f"Summary: {result['summary'][:200]}...")
                return True
            else:
                print(f"✗ Comprehensive audio analysis failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"✗ Comprehensive audio analysis error: {e}")
            return False
    else:
        print(f"✗ Test audio not found: {test_audio_path}")
        print("Please update the test_audio_path variable with a valid audio file")
        return False

def test_video_analysis():
    """Test video analysis endpoint"""
    print("\n=== Testing Video Analysis ===")
    
    # Test with path-based analysis (if video exists)
    test_video_paths = [
        "C:\\Users\\sl\\Downloads\\test_video.mp4",
        "C:\\Users\\sl\\Downloads\\sample_video.mp4",
        "C:\\Users\\sl\\Downloads\\video.mp4"
    ]
    
    test_video_path = None
    for path in test_video_paths:
        if os.path.exists(path):
            test_video_path = path
            break
    
    if test_video_path:
        try:
            data = {
                "video_path": test_video_path,
                "num_frames": 3  # Analyze 3 frames for faster testing
            }
            
            print(f"Analyzing video: {os.path.basename(test_video_path)}")
            print("This may take a few moments...")
            
            response = requests.post(f"{BASE_URL}/api/analyze/video/path", data=data)
            if response.status_code == 200:
                result = response.json()
                print("✓ Video analysis successful")
                print(f"Duration: {result['video_info']['duration']:.2f}s")
                print(f"Resolution: {result['video_info']['resolution']}")
                print(f"FPS: {result['video_info']['fps']:.1f}")
                print(f"Total Frames: {result['video_info']['total_frames']}")
                print(f"Analyzed Frames: {result['video_info']['analyzed_frames']}")
                
                print(f"\nOverall Description: {result['description'][:200]}...")
                
                print(f"\nFrame Analysis:")
                for i, frame in enumerate(result['frame_analyses'][:2]):  # Show first 2 frames
                    print(f"  Frame {frame['frame_number']} ({frame['timestamp']:.1f}s): {frame['description'][:100]}...")
                
                if len(result['frame_analyses']) > 2:
                    print(f"  ... and {len(result['frame_analyses']) - 2} more frames")
                
                return True
            else:
                print(f"✗ Video analysis failed: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"✗ Video analysis error: {e}")
            return False
    else:
        print(f"✗ No test video found in common locations:")
        for path in test_video_paths:
            print(f"  - {path}")
        print("Please place a video file (MP4, AVI, MOV, MKV) in Downloads folder")
        print("Or update the test_video_paths list with your video file location")
        return False

def test_http_url_support():
    """Test HTTP URL support across different media types"""
    print("\n=== Testing HTTP URL Support ===")
    
    success_count = 0
    total_tests = 0
    
    # Test 1: Image from HTTP URL
    print("Testing image from HTTP URL...")
    try:
        test_image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png"
        data = {"image_path": test_image_url, "prompt": "What do you see in this image?"}
        
        response = requests.post(f"{BASE_URL}/api/analyze/image/path", data=data)
        if response.status_code == 200:
            result = response.json()
            print("✓ HTTP URL image analysis working")
            print(f"  Description: {result['description'][:100]}...")
            success_count += 1
        else:
            print(f"✗ HTTP URL image analysis failed: {response.status_code}")
        total_tests += 1
    except Exception as e:
        print(f"✗ HTTP URL image test error: {e}")
        total_tests += 1
    
    # Test 2: Audio from HTTP URL (if available)
    print("\nTesting audio from HTTP URL...")
    try:
        # Using a sample audio URL (you can replace with a working URL)
        test_audio_url = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
        data = {"audio_path": test_audio_url}
        
        response = requests.post(f"{BASE_URL}/api/analyze/transcribe/path", data=data)
        if response.status_code == 200:
            result = response.json()
            print("✓ HTTP URL audio transcription working")
            print(f"  Transcription: {result['transcription'][:100]}...")
            success_count += 1
        else:
            print(f"✗ HTTP URL audio transcription failed: {response.status_code}")
            print("  (This might be expected if the test URL is not accessible)")
        total_tests += 1
    except Exception as e:
        print(f"✗ HTTP URL audio test error: {e}")
        print("  (This might be expected if the test URL is not accessible)")
        total_tests += 1
    
    print(f"\nHTTP URL Support: {success_count}/{total_tests} tests passed")
    return success_count > 0

def test_api_info():
    """Test API info endpoint"""
    print("\n=== Testing API Info ===")
    try:
        response = requests.get(f"{BASE_URL}/api/info")
        if response.status_code == 200:
            info = response.json()
            print("✓ API info retrieved successfully")
            print(f"Service: {info['service_name']}")
            print(f"Version: {info['version']}")
            print("Available Endpoints:")
            for name, endpoint in info['endpoints'].items():
                print(f"  - {name}: {endpoint}")
            return True
        else:
            print(f"✗ API info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ API info error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing TrulyAI Multimodal Analysis FastAPI")
    print("=" * 60)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print("❌ FastAPI server is not running!")
            print("Please start the server with: python -m app.main")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to FastAPI server!")
        print("Please start the server with: python -m app.main")
        return
    
    print("✅ FastAPI server is running")
    
    # Run tests
    tests = [
        test_service_status,
        test_api_info,
        test_text_analysis,
        test_image_analysis,
        test_video_analysis,
        test_audio_transcription,
        test_comprehensive_audio_analysis,
        test_http_url_support
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Your FastAPI multimodal analysis API is working perfectly!")
    elif passed > 0:
        print("⚠️  Some tests passed. Check the failed tests above for issues.")
    else:
        print("❌ All tests failed. Please check your setup and try again.")
    
    print("\n📚 Next Steps:")
    print("1. Open http://localhost:8000/docs for interactive API documentation")
    print("2. Test with your own files using the /path endpoints")
    print("3. Test with HTTP URLs for remote file analysis")
    print("4. For video testing: Place MP4/AVI/MOV files in Downloads folder")
    print("5. Integrate with your frontend application")
    print("6. Monitor performance and costs")
    
    print("\n📁 Test File Locations:")
    print("- Images: C:\\Users\\sl\\Downloads\\*.jpg or https://example.com/image.jpg")
    print("- Videos: C:\\Users\\sl\\Downloads\\*.mp4 or https://example.com/video.mp4")
    print("- Audio: C:\\Users\\sl\\Downloads\\*.mp3 or https://example.com/audio.mp3")
    
    print("\n🌐 HTTP URL Support:")
    print("- All /path endpoints now support HTTP/HTTPS URLs")
    print("- Files are automatically downloaded and analyzed")
    print("- Supports images, videos, and audio from remote sources")

if __name__ == "__main__":
    main()
