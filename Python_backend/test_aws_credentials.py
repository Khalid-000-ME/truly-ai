#!/usr/bin/env python3
"""
Test AWS credentials and Nova model availability
"""
import os
import boto3
import json
from pathlib import Path

# Load .env file from the same directory
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path)
    print(f"✅ Loaded .env file from: {env_path}")
    print(f"📁 .env file exists: {env_path.exists()}")
except ImportError:
    print("⚠️  python-dotenv not installed, using system environment variables")
except Exception as e:
    print(f"❌ Error loading .env file: {e}")

def test_aws_credentials():
    """Test AWS credentials and Nova model availability"""
    
    print("🔍 Testing AWS Credentials...")
    print("=" * 50)
    
    # Check environment variables
    required_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    missing_vars = []
    
    for var in required_vars:
        value = os.environ.get(var)
        if not value:
            missing_vars.append(var)
        else:
            print(f"✅ {var}: {'*' * (len(value) - 4)}{value[-4:]}")
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("\n📝 Make sure your .env file contains:")
        print("AWS_ACCESS_KEY_ID=your_access_key_here")
        print("AWS_SECRET_ACCESS_KEY=your_secret_access_key_here")
        print("AWS_DEFAULT_REGION=us-west-2")
        return False
    
    # Test different regions
    regions_to_test = ['us-west-2', 'us-east-1']
    
    for region in regions_to_test:
        print(f"\n🌍 Testing region: {region}")
        print("-" * 30)
        
        try:
            # Create session with explicit credentials
            session = boto3.Session(
                aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
                region_name=region
            )
            
            # Test STS (basic AWS access)
            sts_client = session.client('sts')
            identity = sts_client.get_caller_identity()
            print(f"✅ AWS Identity: {identity.get('Arn', 'Unknown')}")
            
            # Test Bedrock access
            bedrock_client = session.client('bedrock-runtime', region_name=region)
            
            # Test Nova Lite model (text)
            test_request = {
                "messages": [{"role": "user", "content": [{"text": "Hello"}]}],
                "inferenceConfig": {"maxTokens": 10, "temperature": 0.1}
            }
            
            response = bedrock_client.invoke_model(
                modelId="amazon.nova-lite-v1:0",
                body=json.dumps(test_request)
            )
            print(f"✅ Nova Lite available in {region}")
            
            # Test Nova Pro model (multimodal)
            response = bedrock_client.invoke_model(
                modelId="amazon.nova-pro-v1:0", 
                body=json.dumps(test_request)
            )
            print(f"✅ Nova Pro available in {region}")
            
            print(f"🎉 Region {region} is working perfectly!")
            return True
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error in {region}: {error_msg}")
            
            if "UnrecognizedClientException" in error_msg:
                print("   💡 This usually means invalid credentials")
            elif "ValidationException" in error_msg:
                print("   💡 Model might not be available in this region")
            elif "AccessDeniedException" in error_msg:
                print("   💡 Your AWS user needs Bedrock permissions")
    
    return False

if __name__ == "__main__":
    import json
    success = test_aws_credentials()
    
    if not success:
        print("\n🔧 Troubleshooting Steps:")
        print("1. Double-check your AWS Access Key ID and Secret Access Key")
        print("2. Make sure you're using permanent credentials (not temporary)")
        print("3. Verify your AWS user has Bedrock permissions")
        print("4. Try us-west-2 region (Nova models are more available there)")
        print("5. Check AWS Console: https://console.aws.amazon.com/bedrock/")
