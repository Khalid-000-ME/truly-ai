"""
Test Nova image analysis with correct API format
"""
import boto3
import base64
import json
from pathlib import Path

def test_nova_image_analysis(image_path):
    """Test Nova image analysis with different API approaches"""
    print(f"Testing image: {image_path}")
    
    # Initialize client
    session = boto3.Session()
    bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')
    
    # Read image
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    
    print(f"Image size: {len(image_bytes)} bytes")
    
    # Check if it's a valid image
    if image_bytes.startswith(b'\xff\xd8\xff'):
        image_format = 'jpeg'
        print("Detected: JPEG")
    elif image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        image_format = 'png'
        print("Detected: PNG")
    else:
        print("Unknown format, treating as JPEG")
        image_format = 'jpeg'
    
    # Method 1: Try Nova-specific invoke_model format
    print("\n=== Method 1: Nova invoke_model ===")
    try:
        # Nova Pro expects this format
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
                            "text": "What's in this image? Describe it in detail."
                        }
                    ]
                }
            ],
            "inferenceConfig": {
                "maxTokens": 1000,
                "temperature": 0.7
            }
        }
        
        response = bedrock_client.invoke_model(
            modelId="amazon.nova-pro-v1:0",
            body=json.dumps(request_body)
        )
        
        response_body = json.loads(response['body'].read())
        print("SUCCESS with invoke_model!")
        print(f"Response: {response_body}")
        return response_body
        
    except Exception as e:
        print(f"invoke_model failed: {e}")
    
    # Method 2: Try converse API with different format
    print("\n=== Method 2: Converse API ===")
    try:
        messages = [
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
                        "text": "What's in this image? Describe it in detail."
                    }
                ]
            }
        ]
        
        response = bedrock_client.converse(
            modelId="amazon.nova-pro-v1:0",
            messages=messages
        )
        
        print("SUCCESS with converse!")
        result = response['output']['message']['content'][0]['text']
        print(f"Response: {result}")
        return result
        
    except Exception as e:
        print(f"converse failed: {e}")
    
    # Method 3: Try with Nova Lite (text-only model for comparison)
    print("\n=== Method 3: Nova Lite (text only) ===")
    try:
        response = bedrock_client.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=[{
                "role": "user",
                "content": [{"text": "Hello, can you see this message?"}]
            }]
        )
        
        result = response['output']['message']['content'][0]['text']
        print(f"Nova Lite working: {result}")
        
    except Exception as e:
        print(f"Nova Lite failed: {e}")
    
    # Method 4: Try converting to base64 without format specification
    print("\n=== Method 4: Simple base64 ===")
    try:
        # Simplest possible format
        messages = [
            {
                "role": "user", 
                "content": [
                    {
                        "image": {
                            "source": {
                                "bytes": base64.b64encode(image_bytes).decode('utf-8')
                            }
                        }
                    },
                    {
                        "text": "Describe this image"
                    }
                ]
            }
        ]
        
        response = bedrock_client.converse(
            modelId="amazon.nova-pro-v1:0",
            messages=messages
        )
        
        print("SUCCESS with simple format!")
        result = response['output']['message']['content'][0]['text']
        print(f"Response: {result}")
        return result
        
    except Exception as e:
        print(f"Simple format failed: {e}")
    
    print("\nAll methods failed!")
    return None

if __name__ == "__main__":
    image_path = "C:\\Users\\sl\\Downloads\\kio.jpg"
    
    if Path(image_path).exists():
        result = test_nova_image_analysis(image_path)
        if result:
            print(f"\nSUCCESS! Image analysis working!")
        else:
            print(f"\nAll methods failed. The image might be corrupted or Nova Pro might not support images yet.")
    else:
        print(f"Image file not found: {image_path}")
        print("Please check the path and try again.")
