import boto3
import json
import base64
from pathlib import Path
from typing import Optional

class AWSImageAnalyzer:
    """
    Image analysis using AWS Bedrock with Claude models.
    Supports image description and question answering.
    """
    
    def __init__(self, region_name: str = 'us-east-1'):
        """
        Initialize AWS Bedrock client.
        
        Args:
            region_name: AWS region (default: us-east-1)
        """
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name=region_name
        )
        # Claude Sonnet 3.5 - best balance of speed/quality
        self.model_id = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
    
    def _encode_image(self, image_path: str) -> tuple[str, str]:
        """
        Encode image to base64 and detect media type.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Tuple of (base64_data, media_type)
        """
        path = Path(image_path)
        
        # Determine media type
        ext = path.suffix.lower()
        media_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        media_type = media_types.get(ext, 'image/jpeg')
        
        # Read and encode
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        return image_data, media_type
    
    def describe_image(self, image_path: str, detail_level: str = "detailed") -> str:
        """
        Generate a description of the image.
        
        Args:
            image_path: Path to the image file
            detail_level: "brief", "detailed", or "comprehensive"
            
        Returns:
            Image description as string
        """
        prompts = {
            "brief": "Provide a brief, one-sentence description of this image.",
            "detailed": "Describe this image in detail, including the main subjects, setting, colors, mood, and any notable features.",
            "comprehensive": "Provide a comprehensive analysis of this image, including: main subjects, composition, lighting, colors, mood, style, any text visible, and artistic or photographic elements."
        }
        
        prompt = prompts.get(detail_level, prompts["detailed"])
        
        image_data, media_type = self._encode_image(image_path)
        
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        })
        
        response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=body
        )
        
        response_body = json.loads(response['body'].read())
        return response_body['content'][0]['text']
    
    def ask_question(self, image_path: str, question: str) -> str:
        """
        Ask a question about the image.
        
        Args:
            image_path: Path to the image file
            question: Question to ask about the image
            
        Returns:
            Answer as string
        """
        image_data, media_type = self._encode_image(image_path)
        
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data
                            }
                        },
                        {
                            "type": "text",
                            "text": question
                        }
                    ]
                }
            ]
        })
        
        response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=body
        )
        
        response_body = json.loads(response['body'].read())
        return response_body['content'][0]['text']
    
    def analyze_multiple_images(self, image_paths: list[str], question: str) -> str:
        """
        Analyze multiple images together with a single question.
        
        Args:
            image_paths: List of paths to image files
            question: Question to ask about all images
            
        Returns:
            Combined analysis as string
        """
        content = []
        
        # Add all images
        for img_path in image_paths:
            image_data, media_type = self._encode_image(img_path)
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": image_data
                }
            })
        
        # Add question
        content.append({
            "type": "text",
            "text": question
        })
        
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ]
        })
        
        response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=body
        )
        
        response_body = json.loads(response['body'].read())
        return response_body['content'][0]['text']


# Example usage
if __name__ == "__main__":
    # Initialize analyzer
    analyzer = AWSImageAnalyzer(region_name='us-east-1')
    
    # Example 1: Describe an image
    print("=== Image Description ===")
    description = analyzer.describe_image(
        "your_image.jpg",
        detail_level="detailed"
    )
    print(description)
    print()
    
    # Example 2: Ask questions about the image
    print("=== Question & Answer ===")
    answer = analyzer.ask_question(
        "your_image.jpg",
        "What colors are dominant in this image?"
    )
    print(f"Q: What colors are dominant in this image?")
    print(f"A: {answer}")
    print()
    
    # Example 3: Analyze multiple images
    print("=== Multiple Image Analysis ===")
    analysis = analyzer.analyze_multiple_images(
        ["image1.jpg", "image2.jpg"],
        "Compare these two images. What are the similarities and differences?"
    )
    print(analysis)