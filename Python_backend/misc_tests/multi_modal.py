"""
Multimodal Local Analyzer - Images, Videos, and Audio
Runs completely offline on your laptop
"""

import os
import sys
from pathlib import Path

def check_and_install_dependencies():
    """Check and guide user to install required packages"""
    required = {
        'transformers': 'transformers',
        'PIL': 'pillow',
        'torch': 'torch',
        'einops': 'einops',
        'whisper': 'openai-whisper',
        'cv2': 'opencv-python'
    }
    
    missing = []
    for module, package in required.items():
        try:
            __import__(module)
        except ImportError:
            missing.append(package)
    
    if missing:
        print("Missing packages detected. Please install:")
        print(f"python -m pip install {' '.join(missing)}")
        sys.exit(1)

check_and_install_dependencies()

from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image
import torch
import whisper
import cv2
import tempfile

class MultimodalAnalyzer:
    def __init__(self):
        print("Loading models... This may take a few minutes on first run.")
        
        # Load Moondream for images/video frames
        print("Loading Moondream2 for image analysis...")
        self.vision_model = AutoModelForCausalLM.from_pretrained(
            "vikhyatk/moondream2",
            trust_remote_code=True,
            torch_dtype=torch.float32  # Use float32 for CPU
        )
        self.vision_tokenizer = AutoTokenizer.from_pretrained(
            "vikhyatk/moondream2",
            trust_remote_code=True
        )
        
        # Load Whisper for audio (using 'base' model - good balance)
        print("Loading Whisper for audio transcription...")
        self.audio_model = whisper.load_model("base")  # 142MB, change to "small" for better accuracy (466MB)
        
        print("Models loaded successfully!\n")
    
    def describe_image(self, image_path, custom_prompt=None):
        """Describe a single image"""
        try:
            image = Image.open(image_path)
            prompt = custom_prompt or "Describe this image in detail, including the setting, objects, colors, and atmosphere."
            
            # Encode image
            enc_image = self.vision_model.encode_image(image)
            description = self.vision_model.answer_question(
                enc_image, 
                prompt, 
                self.vision_tokenizer
            )
            
            return description
        except Exception as e:
            return f"Error processing image: {str(e)}"
    
    def describe_video(self, video_path, num_frames=5, custom_prompt=None):
        """Describe a video by analyzing key frames"""
        try:
            cap = cv2.VideoCapture(video_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            duration = total_frames / fps if fps > 0 else 0
            
            # Calculate frame intervals
            frame_indices = [int(i * total_frames / num_frames) for i in range(num_frames)]
            
            descriptions = []
            descriptions.append(f"Video Analysis (Duration: {duration:.1f}s, {total_frames} frames)")
            descriptions.append("-" * 60)
            
            for idx, frame_num in enumerate(frame_indices):
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
                ret, frame = cap.read()
                
                if ret:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)
                    
                    # Get timestamp
                    timestamp = frame_num / fps if fps > 0 else 0
                    
                    # Describe frame
                    prompt = custom_prompt or "Describe what's happening in this scene."
                    enc_image = self.vision_model.encode_image(pil_image)
                    description = self.vision_model.answer_question(
                        enc_image,
                        prompt,
                        self.vision_tokenizer
                    )
                    
                    descriptions.append(f"\n[{timestamp:.1f}s] Frame {idx + 1}/{num_frames}:")
                    descriptions.append(description)
            
            cap.release()
            return "\n".join(descriptions)
            
        except Exception as e:
            return f"Error processing video: {str(e)}"
    
    def transcribe_audio(self, audio_path, language=None):
        """Transcribe audio to text"""
        try:
            print("Transcribing audio... This may take a moment.")
            
            # Transcribe
            result = self.audio_model.transcribe(
                audio_path,
                language=language,  # None for auto-detect, or specify like 'en', 'es', etc.
                fp16=False  # Use float32 for CPU
            )
            
            output = []
            output.append(f"Audio Transcription")
            output.append(f"Detected Language: {result.get('language', 'unknown')}")
            output.append("-" * 60)
            output.append(f"\nFull Text:\n{result['text']}")
            
            # Add timestamps if available
            if 'segments' in result and result['segments']:
                output.append(f"\n\nTimestamped Segments:")
                output.append("-" * 60)
                for segment in result['segments']:
                    start = segment['start']
                    end = segment['end']
                    text = segment['text']
                    output.append(f"[{start:.1f}s - {end:.1f}s]: {text}")
            
            return "\n".join(output)
            
        except Exception as e:
            return f"Error processing audio: {str(e)}"
    
    def analyze_file(self, file_path, **kwargs):
        """Auto-detect file type and analyze accordingly"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            return f"Error: File not found: {file_path}"
        
        ext = file_path.suffix.lower()
        
        # Image formats
        if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp']:
            print(f"Analyzing image: {file_path.name}")
            return self.describe_image(str(file_path), kwargs.get('prompt'))
        
        # Video formats
        elif ext in ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv']:
            print(f"Analyzing video: {file_path.name}")
            return self.describe_video(
                str(file_path), 
                num_frames=kwargs.get('frames', 5),
                custom_prompt=kwargs.get('prompt')
            )
        
        # Audio formats
        elif ext in ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac']:
            print(f"Transcribing audio: {file_path.name}")
            return self.transcribe_audio(str(file_path), kwargs.get('language'))
        
        else:
            return f"Error: Unsupported file format: {ext}"


def main():
    """Main function with example usage"""
    print("=" * 60)
    print("MULTIMODAL LOCAL ANALYZER")
    print("Images • Videos • Audio")
    print("=" * 60)
    print()
    
    # Initialize analyzer
    analyzer = MultimodalAnalyzer()
    
    # Interactive mode
    print("\n" + "=" * 60)
    print("Ready! Enter file path to analyze (or 'quit' to exit)")
    print("=" * 60)
    
    while True:
        print("\nOptions:")
        print("1. Analyze a file (auto-detect type)")
        print("2. Analyze image with custom prompt")
        print("3. Analyze video (specify number of frames)")
        print("4. Quit")
        
        choice = input("\nChoice (1-4): ").strip()
        
        if choice == '4' or choice.lower() == 'quit':
            print("Goodbye!")
            break
        
        if choice == '1':
            file_path = input("Enter file path: ").strip().strip('"')
            result = analyzer.analyze_file(file_path)
            print("\n" + "=" * 60)
            print(result)
            print("=" * 60)
        
        elif choice == '2':
            file_path = input("Enter image path: ").strip().strip('"')
            prompt = input("Enter custom prompt (or press Enter for default): ").strip()
            result = analyzer.analyze_file(file_path, prompt=prompt if prompt else None)
            print("\n" + "=" * 60)
            print(result)
            print("=" * 60)
        
        elif choice == '3':
            file_path = input("Enter video path: ").strip().strip('"')
            frames = input("Number of frames to analyze (default 5): ").strip()
            frames = int(frames) if frames.isdigit() else 5
            result = analyzer.analyze_file(file_path, frames=frames)
            print("\n" + "=" * 60)
            print(result)
            print("=" * 60)


if __name__ == "__main__":
    # Example usage (uncomment to use directly):
    # analyzer = MultimodalAnalyzer()
    
    # Analyze an image
    # print(analyzer.describe_image("path/to/your/image.jpg"))
    
    # Analyze a video
    # print(analyzer.describe_video("path/to/your/video.mp4", num_frames=5))
    
    # Transcribe audio
    # print(analyzer.transcribe_audio("path/to/your/audio.mp3"))
    
    # Auto-detect and analyze
    # print(analyzer.analyze_file("path/to/your/file"))
    
    # Run interactive mode
    main()