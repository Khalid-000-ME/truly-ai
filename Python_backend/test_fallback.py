#!/usr/bin/env python3
"""
Test script for fallback service
"""
import asyncio
import sys
import os

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.fallback_service import fallback_service

async def test_fallback_service():
    print("🧪 Testing Fallback Service")
    print("=" * 40)
    
    # Test text analysis
    print("\n📝 Testing Text Analysis...")
    result = await fallback_service.analyze_text(
        "This is a test text for fact-checking analysis.",
        "insights"
    )
    print(f"✅ Text Analysis Result: {result}")
    
    # Test image analysis (mock file)
    print("\n🖼️  Testing Image Analysis...")
    # Create a dummy file for testing
    test_file = "test_image.txt"
    with open(test_file, "w") as f:
        f.write("dummy image content")
    
    try:
        result = await fallback_service.analyze_image(test_file, "Analyze for authenticity")
        print(f"✅ Image Analysis Result: {result}")
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)
    
    # Test audio analysis
    print("\n🎵 Testing Audio Analysis...")
    test_audio = "test_audio.txt"
    with open(test_audio, "w") as f:
        f.write("dummy audio content")
    
    try:
        result = await fallback_service.analyze_audio_comprehensive(test_audio)
        print(f"✅ Audio Analysis Result: {result}")
    finally:
        if os.path.exists(test_audio):
            os.remove(test_audio)
    
    print("\n🎉 All fallback tests completed!")

if __name__ == "__main__":
    asyncio.run(test_fallback_service())
