"""
Working AWS Multimodal Analyzer using Nova models
"""
import boto3
import base64
import json
import time
import whisper
import tempfile
import os
from pathlib import Path

class WorkingAWSAnalyzer:
    """AWS Bedrock analyzer using working Nova models"""
    
    def __init__(self, region_name='us-east-1'):
        """Initialize with direct AWS credentials"""
        self.session = boto3.Session()
        self.bedrock_client = self.session.client('bedrock-runtime', region_name=region_name)
        self.s3_client = self.session.client('s3', region_name=region_name)
        
        # Working models from our test
        self.text_model = "amazon.nova-lite-v1:0"
        self.multimodal_model = "amazon.nova-pro-v1:0"  # Better for images
        
        # Initialize Whisper model for audio transcription
        self.whisper_model = None
        self.whisper_model_size = "base"  # Good balance of speed/accuracy
    
    def analyze_image(self, image_path, prompt=None):
        """Analyze an image using Nova Pro"""
        if not prompt:
            prompt = "Describe this image in detail."
        
        try:
            # Read and validate image
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            
            # Validate it's actually an image by checking magic bytes
            if not self._is_valid_image(image_bytes):
                return {
                    'description': f"File {image_path} is not a valid image file",
                    'model_used': self.multimodal_model,
                    'success': False,
                    'error': 'Invalid image format'
                }
            
            # Determine image format from file content, not just extension
            image_format = self._detect_image_format(image_bytes)
            
            print(f"Detected image format: {image_format}")
            print(f"Image size: {len(image_bytes)} bytes")
            
            # Method 1: Try with invoke_model (Nova-specific API) - CORRECT FORMAT
            try:
                request_body = {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "image": {
                                        "format": image_format,
                                        "source": {
                                            "bytes": base64.b64encode(image_bytes).decode('utf-8')
                                        }
                                    }
                                },
                                {
                                    "text": prompt
                                }
                            ]
                        }
                    ],
                    "inferenceConfig": {
                        "maxTokens": 1000,
                        "temperature": 0.7
                    }
                }
                
                response = self.bedrock_client.invoke_model(
                    modelId=self.multimodal_model,
                    body=json.dumps(request_body)
                )
                
                response_body = json.loads(response['body'].read())
                
                return {
                    'description': response_body['output']['message']['content'][0]['text'],
                    'model_used': self.multimodal_model,
                    'success': True,
                    'method': 'invoke_model'
                }
                
            except Exception as e1:
                print(f"invoke_model failed: {e1}")
                
                # Method 2: Try with converse API
                try:
                    messages = [{
                        "role": "user",
                        "content": [
                            {
                                "image": {
                                    "format": image_format,
                                    "source": {"bytes": base64.b64encode(image_bytes).decode('utf-8')}
                                }
                            },
                            {"text": prompt}
                        ]
                    }]
                    
                    response = self.bedrock_client.converse(
                        modelId=self.multimodal_model,
                        messages=messages
                    )
                    
                    return {
                        'description': response['output']['message']['content'][0]['text'],
                        'model_used': self.multimodal_model,
                        'success': True,
                        'method': 'converse'
                    }
                    
                except Exception as e2:
                    print(f"converse failed: {e2}")
                    
                    # Method 3: Try converting image to standard format
                    try:
                        from PIL import Image
                        import io
                        
                        # Convert to standard JPEG
                        img = Image.open(io.BytesIO(image_bytes))
                        if img.mode in ('RGBA', 'LA', 'P'):
                            img = img.convert('RGB')
                        
                        # Save as JPEG
                        img_buffer = io.BytesIO()
                        img.save(img_buffer, format='JPEG', quality=95)
                        converted_bytes = img_buffer.getvalue()
                        
                        print("Converted image to JPEG format")
                        
                        messages = [{
                            "role": "user",
                            "content": [
                                {
                                    "image": {
                                        "format": "jpeg",
                                        "source": {"bytes": base64.b64encode(converted_bytes).decode('utf-8')}
                                    }
                                },
                                {"text": prompt}
                            ]
                        }]
                        
                        response = self.bedrock_client.converse(
                            modelId=self.multimodal_model,
                            messages=messages
                        )
                        
                        return {
                            'description': response['output']['message']['content'][0]['text'],
                            'model_used': self.multimodal_model,
                            'success': True,
                            'method': 'converted_jpeg'
                        }
                        
                    except Exception as e3:
                        return {
                            'description': f"All image analysis methods failed. Last error: {str(e3)}",
                            'model_used': self.multimodal_model,
                            'success': False,
                            'error': str(e3),
                            'errors': [str(e1), str(e2), str(e3)]
                        }
                        
        except Exception as e:
            return {
                'description': f"Failed to read image file: {str(e)}",
                'model_used': self.multimodal_model,
                'success': False,
                'error': str(e)
            }
    
    def _is_valid_image(self, image_bytes):
        """Check if bytes represent a valid image"""
        # Check common image magic bytes
        if image_bytes.startswith(b'\xff\xd8\xff'):  # JPEG
            return True
        elif image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):  # PNG
            return True
        elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):  # GIF
            return True
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:  # WebP
            return True
        return False
    
    def _detect_image_format(self, image_bytes):
        """Detect image format from file content"""
        if image_bytes.startswith(b'\xff\xd8\xff'):
            return 'jpeg'
        elif image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            return 'png'
        elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):
            return 'gif'
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
            return 'webp'
        else:
            return 'jpeg'  # Default fallback
    
    def analyze_text(self, text_prompt):
        """Analyze text using Nova Lite"""
        try:
            response = self.bedrock_client.converse(
                modelId=self.text_model,
                messages=[{
                    "role": "user",
                    "content": [{"text": text_prompt}]
                }]
            )
            
            return {
                'response': response['output']['message']['content'][0]['text'],
                'model_used': self.text_model,
                'success': True
            }
            
        except Exception as e:
            return {
                'response': f"Text analysis failed: {str(e)}",
                'model_used': self.text_model,
                'success': False,
                'error': str(e)
            }
    
    def compare_images(self, image_paths, question):
        """Compare multiple images"""
        if not question:
            question = "Compare these images and describe the differences."
        
        try:
            content = []
            
            # Add all images
            for image_path in image_paths:
                with open(image_path, 'rb') as f:
                    image_bytes = f.read()
                
                # Determine format
                path = Path(image_path)
                ext = path.suffix.lower()
                image_format = 'jpeg' if ext in ['.jpg', '.jpeg'] else 'png'
                
                content.append({
                    "image": {
                        "format": image_format,
                        "source": {"bytes": base64.b64encode(image_bytes).decode('utf-8')}
                    }
                })
            
            # Add question
            content.append({"text": question})
            
            response = self.bedrock_client.converse(
                modelId=self.multimodal_model,
                messages=[{"role": "user", "content": content}]
            )
            
            return {
                'analysis': response['output']['message']['content'][0]['text'],
                'model_used': self.multimodal_model,
                'success': True
            }
            
        except Exception as e:
            return {
                'analysis': f"Image comparison failed: {str(e)}",
                'model_used': self.multimodal_model,
                'success': False,
                'error': str(e)
            }
    
    def upload_to_s3(self, file_path, bucket_name, s3_key=None):
        """Upload file to S3"""
        if not s3_key:
            s3_key = Path(file_path).name
        
        try:
            self.s3_client.upload_file(file_path, bucket_name, s3_key)
            return {
                'success': True,
                's3_uri': f"s3://{bucket_name}/{s3_key}",
                'bucket': bucket_name,
                'key': s3_key
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _load_whisper_model(self):
        """Load Whisper model if not already loaded"""
        if self.whisper_model is None:
            try:
                print(f"Loading Whisper {self.whisper_model_size} model...")
                self.whisper_model = whisper.load_model(self.whisper_model_size)
                print("Whisper model loaded successfully")
            except Exception as e:
                print(f"Failed to load Whisper model: {e}")
                raise
        return self.whisper_model
    
    def transcribe_audio(self, audio_path, language=None, include_timestamps=True):
        """
        Transcribe audio using Whisper
        
        Args:
            audio_path: Path to audio file
            language: Language code (None for auto-detection)
            include_timestamps: Whether to include segment timestamps
            
        Returns:
            Dictionary with transcription results
        """
        try:
            # Load Whisper model
            model = self._load_whisper_model()
            
            # Transcribe audio
            result = model.transcribe(audio_path, language=language, fp16=False)
            
            transcription = result["text"].strip()
            detected_language = result["language"]
            segments = result.get("segments", [])
            
            response = {
                'transcription': transcription,
                'language': detected_language,
                'segments': segments if include_timestamps else [],
                'model_used': f'whisper-{self.whisper_model_size}',
                'success': True
            }
            
            return response
            
        except Exception as e:
            return {
                'transcription': f"Audio transcription failed: {str(e)}",
                'language': 'unknown',
                'segments': [],
                'model_used': f'whisper-{self.whisper_model_size}',
                'success': False,
                'error': str(e)
            }
    
    def analyze_audio(self, audio_path, analysis_prompt=None):
        """
        Transcribe audio and analyze the transcription with AWS Bedrock
        
        Args:
            audio_path: Path to audio file
            analysis_prompt: Custom prompt for analyzing the transcription
            
        Returns:
            Dictionary with transcription and analysis results
        """
        # First transcribe the audio
        transcription_result = self.transcribe_audio(audio_path)
        
        if not transcription_result['success']:
            return transcription_result
        
        transcription = transcription_result['transcription']
        
        # Analyze transcription with AWS Bedrock
        if not analysis_prompt:
            analysis_prompt = """
            Please analyze this audio transcription and provide:
            1. A summary of the main topics discussed
            2. The overall tone and sentiment
            3. Key points or important information
            4. Any notable insights or patterns
            """
        
        full_prompt = f"{analysis_prompt}\n\nTranscription: {transcription}"
        
        analysis_result = self.analyze_text(full_prompt)
        
        # Combine results
        return {
            'transcription': transcription,
            'language': transcription_result['language'],
            'segments': transcription_result['segments'],
            'analysis': analysis_result['response'] if analysis_result['success'] else None,
            'transcription_model': transcription_result['model_used'],
            'analysis_model': self.text_model,
            'success': True,
            'analysis_success': analysis_result['success']
        }
    
    def analyze_audio_sentiment(self, audio_path):
        """Analyze sentiment of audio transcription"""
        return self.analyze_audio(
            audio_path,
            "Analyze the sentiment and emotional tone of this audio transcription. Is it positive, negative, or neutral? What emotions are expressed?"
        )
    
    def summarize_audio(self, audio_path):
        """Generate a summary of audio content"""
        return self.analyze_audio(
            audio_path,
            "Provide a concise summary of the main points discussed in this audio transcription."
        )
    
    def extract_audio_topics(self, audio_path):
        """Extract main topics from audio"""
        return self.analyze_audio(
            audio_path,
            "Extract and list the main topics, themes, and subjects discussed in this audio transcription."
        )

# Example usage
if __name__ == "__main__":
    print("=== Working AWS Analyzer Test ===\n")
    
    analyzer = WorkingAWSAnalyzer()
    
    # Test text analysis
    print("1. Testing text analysis...")
    text_result = analyzer.analyze_text("What are the benefits of AI in healthcare?")
    if text_result['success']:
        print("SUCCESS: Text analysis working!")
        print(f"Response: {text_result['response'][:100]}...")
    else:
        print(f"FAILED: Text analysis failed: {text_result['error']}")
    
    print("\n2. Testing image analysis...")
    print("Note: You need to provide an actual image file to test this.")
    print("Example usage:")
    print("result = analyzer.analyze_image('your_image.jpg', 'What is in this image?')")
    
    print("\n3. Testing image comparison...")
    print("Example usage:")
    print("result = analyzer.compare_images(['image1.jpg', 'image2.jpg'], 'What changed?')")
    
    print("\n4. Testing audio analysis...")
    print("Example usage:")
    print("result = analyzer.analyze_audio('your_audio.mp3')")
    print("result = analyzer.transcribe_audio('your_audio.wav')")
    print("result = analyzer.analyze_audio_sentiment('your_audio.m4a')")
    
    print(f"\nSUCCESS: Analyzer ready to use!")
    print(f"Text model: {analyzer.text_model}")
    print(f"Multimodal model: {analyzer.multimodal_model}")
    print(f"Audio model: whisper-{analyzer.whisper_model_size}")