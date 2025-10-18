"""
Check which Bedrock models are available in your region
"""
import boto3
from botocore.exceptions import ClientError
from aws_config import AWSRoleManager

def check_available_models():
    """Check which models are available"""
    print("=== Checking Available Bedrock Models ===\n")
    
    try:
        # Try with role assumption first
        print("1. Checking with IAM role...")
        role_manager = AWSRoleManager(
            'arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
            external_id='truly-ai-external-id-12345'
        )
        
        bedrock_client = role_manager.get_bedrock_client()
        
        # List of models to test
        models_to_test = [
            "anthropic.claude-3-haiku-20240307-v1:0",
            "anthropic.claude-3-sonnet-20240229-v1:0", 
            "anthropic.claude-3-5-sonnet-20240620-v1:0",
            "anthropic.claude-3-5-sonnet-20241022-v2:0",
            "us.amazon.nova-pro-v1:0",
            "us.amazon.nova-lite-v1:0",
            "us.amazon.nova-micro-v1:0"
        ]
        
        working_models = []
        
        for model_id in models_to_test:
            try:
                print(f"Testing: {model_id}")
                
                # Simple text test
                response = bedrock_client.converse(
                    modelId=model_id,
                    messages=[{
                        "role": "user",
                        "content": [{"text": "Hello"}]
                    }]
                )
                
                print(f"  ✓ WORKS: {model_id}")
                working_models.append(model_id)
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if "ValidationException" in error_code:
                    print(f"  ✗ NOT AVAILABLE: {model_id}")
                elif "AccessDeniedException" in error_code:
                    print(f"  ✗ ACCESS DENIED: {model_id}")
                else:
                    print(f"  ✗ ERROR: {model_id} - {error_code}")
            except Exception as e:
                print(f"  ✗ UNEXPECTED ERROR: {model_id} - {str(e)}")
        
        print(f"\n=== Summary ===")
        print(f"Working models: {len(working_models)}")
        for model in working_models:
            print(f"  ✓ {model}")
        
        if working_models:
            print(f"\n🎉 Found {len(working_models)} working model(s)!")
            return working_models
        else:
            print("\n⚠️  No working models found with role assumption")
            
    except Exception as e:
        print(f"Role assumption failed: {e}")
    
    # Try with direct SSO access
    print("\n2. Checking with direct SSO access...")
    try:
        session = boto3.Session()
        bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')
        
        working_sso_models = []
        
        for model_id in models_to_test:
            try:
                print(f"Testing SSO: {model_id}")
                
                response = bedrock_client.converse(
                    modelId=model_id,
                    messages=[{
                        "role": "user",
                        "content": [{"text": "Hello"}]
                    }]
                )
                
                print(f"  ✓ WORKS (SSO): {model_id}")
                working_sso_models.append(model_id)
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if "ValidationException" in error_code:
                    print(f"  ✗ NOT AVAILABLE (SSO): {model_id}")
                else:
                    print(f"  ✗ ERROR (SSO): {model_id} - {error_code}")
            except Exception as e:
                print(f"  ✗ UNEXPECTED ERROR (SSO): {model_id} - {str(e)}")
        
        print(f"\n=== SSO Summary ===")
        print(f"Working SSO models: {len(working_sso_models)}")
        for model in working_sso_models:
            print(f"  ✓ {model}")
            
        return working_sso_models
        
    except Exception as e:
        print(f"SSO access failed: {e}")
        return []

def check_model_access_in_console():
    """Check model access via Bedrock console API"""
    print("\n3. Checking model access permissions...")
    
    try:
        session = boto3.Session()
        bedrock_client = session.client('bedrock', region_name='us-east-1')
        
        # List foundation models
        response = bedrock_client.list_foundation_models()
        
        claude_models = []
        nova_models = []
        
        for model in response['modelSummaries']:
            model_id = model['modelId']
            if 'claude' in model_id.lower():
                claude_models.append(model_id)
            elif 'nova' in model_id.lower():
                nova_models.append(model_id)
        
        print(f"Available Claude models in region:")
        for model in claude_models:
            print(f"  - {model}")
            
        print(f"Available Nova models in region:")
        for model in nova_models:
            print(f"  - {model}")
            
    except Exception as e:
        print(f"Failed to list foundation models: {e}")

if __name__ == "__main__":
    working_models = check_available_models()
    check_model_access_in_console()
    
    if working_models:
        print(f"\n✅ Recommended model to use: {working_models[0]}")
        print("\nUpdate your code to use this model ID for best results.")
    else:
        print("\n❌ No working models found. Please:")
        print("1. Check Bedrock model access in AWS console")
        print("2. Ensure you're in the correct region (us-east-1)")
        print("3. Verify your AWS permissions")
