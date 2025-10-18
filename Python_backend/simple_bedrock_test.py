"""
Simple Bedrock test with correct model IDs
"""
import boto3
import json
from botocore.exceptions import ClientError

def test_bedrock_models():
    """Test Bedrock with available models"""
    print("=== Testing Bedrock Models ===\n")
    
    # Use your existing SSO credentials
    session = boto3.Session()
    bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')
    
    # Models that should be available based on the list
    models_to_test = [
        "anthropic.claude-3-haiku-20240307-v1:0",
        "anthropic.claude-3-sonnet-20240229-v1:0",
        "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "amazon.nova-lite-v1:0",
        "amazon.nova-pro-v1:0"
    ]
    
    working_models = []
    
    for model_id in models_to_test:
        print(f"Testing: {model_id}")
        
        try:
            # Test with converse API
            response = bedrock_client.converse(
                modelId=model_id,
                messages=[{
                    "role": "user",
                    "content": [{"text": "Hello! Please respond with 'Working' if you can see this."}]
                }]
            )
            
            result = response['output']['message']['content'][0]['text']
            print(f"  SUCCESS: {model_id}")
            print(f"  Response: {result}")
            working_models.append(model_id)
            print()
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            print(f"  FAILED: {model_id}")
            print(f"  Error: {error_code} - {error_msg}")
            print()
            
        except Exception as e:
            print(f"  ERROR: {model_id} - {str(e)}")
            print()
    
    print("=== Results ===")
    print(f"Working models: {len(working_models)}")
    for model in working_models:
        print(f"  - {model}")
    
    if working_models:
        print(f"\nRecommended model: {working_models[0]}")
        return working_models[0]
    else:
        print("\nNo working models found!")
        return None

def test_image_analysis(model_id):
    """Test image analysis with a working model"""
    if not model_id:
        print("No working model available for image test")
        return
    
    print(f"\n=== Testing Image Analysis with {model_id} ===")
    
    # Create a simple test - we'll use a base64 encoded small image
    # This is a 1x1 pixel red PNG image
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    try:
        session = boto3.Session()
        bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')
        
        messages = [{
            "role": "user",
            "content": [
                {
                    "image": {
                        "format": "png",
                        "source": {"bytes": test_image_base64}
                    }
                },
                {"text": "What do you see in this image?"}
            ]
        }]
        
        response = bedrock_client.converse(
            modelId=model_id,
            messages=messages
        )
        
        result = response['output']['message']['content'][0]['text']
        print(f"SUCCESS: Image analysis working!")
        print(f"Response: {result}")
        return True
        
    except Exception as e:
        print(f"FAILED: Image analysis failed - {str(e)}")
        return False

if __name__ == "__main__":
    # Test text models first
    working_model = test_bedrock_models()
    
    # Test image analysis if we have a working model
    if working_model:
        test_image_analysis(working_model)
    
    print("\n=== Next Steps ===")
    if working_model:
        print(f"1. Update your code to use: {working_model}")
        print("2. Test with your own images")
        print("3. Integrate with your FastAPI backend")
    else:
        print("1. Check Bedrock model access in AWS console")
        print("2. Ensure you have the right permissions")
        print("3. Try a different region if needed")
