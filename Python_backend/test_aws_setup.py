"""
Test script to verify AWS setup and permissions
"""
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from aws_config import AWSRoleManager

def test_basic_credentials():
    """Test basic AWS credentials"""
    try:
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print("✓ AWS credentials are configured")
        print(f"  Account: {identity['Account']}")
        print(f"  User/Role: {identity['Arn']}")
        return True
    except NoCredentialsError:
        print("✗ No AWS credentials found")
        print("  Please configure AWS credentials using 'aws configure' or SSO")
        return False
    except Exception as e:
        print(f"✗ Error checking credentials: {e}")
        return False

def test_role_assumption():
    """Test assuming the TrulyAI role"""
    role_arn = 'arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole'
    external_id = 'truly-ai-external-id-12345'
    
    try:
        role_manager = AWSRoleManager(role_arn, external_id=external_id)
        credentials = role_manager.assume_role()
        print("✓ Successfully assumed TrulyAI role")
        print(f"  Session expires: {credentials['Expiration']}")
        return True
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'AccessDenied':
            print("✗ Access denied when assuming role")
            print("  Check if your user has permission to assume this role")
        elif error_code == 'InvalidUserID.NotFound':
            print("✗ Role not found or external ID mismatch")
            print("  Verify the role ARN and external ID")
        else:
            print(f"✗ Error assuming role: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def test_bedrock_access():
    """Test Bedrock access with assumed role"""
    try:
        role_manager = AWSRoleManager(
            'arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
            external_id='truly-ai-external-id-12345'
        )
        
        bedrock_client = role_manager.get_bedrock_client()
        
        # Try different model IDs - AWS has changed how Claude models are accessed
        model_ids_to_try = [
            "anthropic.claude-3-5-sonnet-20241022-v2:0",
            "anthropic.claude-3-5-sonnet-20240620-v1:0", 
            "anthropic.claude-3-sonnet-20240229-v1:0",
            "anthropic.claude-3-haiku-20240307-v1:0"
        ]
        
        for model_id in model_ids_to_try:
            try:
                print(f"  Trying model: {model_id}")
                response = bedrock_client.converse(
                    modelId=model_id,
                    messages=[{
                        "role": "user",
                        "content": [{"text": "Hello! Can you respond with just 'AWS Bedrock is working'?"}]
                    }]
                )
                
                result = response['output']['message']['content'][0]['text']
                print("✓ Bedrock access successful")
                print(f"  Working model: {model_id}")
                print(f"  Response: {result}")
                return True
                
            except ClientError as model_error:
                if "ValidationException" in str(model_error):
                    print(f"    Model {model_id} not available")
                    continue
                else:
                    raise model_error
        
        # If all models failed, try the old invoke_model method
        print("  Trying legacy invoke_model method...")
        try:
            import json
            
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 100,
                "messages": [{
                    "role": "user",
                    "content": [{"type": "text", "text": "Hello! Say 'AWS Bedrock is working'"}]
                }]
            })
            
            response = bedrock_client.invoke_model(
                modelId="anthropic.claude-3-haiku-20240307-v1:0",
                body=body
            )
            
            response_body = json.loads(response['body'].read())
            result = response_body['content'][0]['text']
            print("✓ Bedrock access successful (legacy method)")
            print(f"  Response: {result}")
            return True
            
        except Exception as legacy_error:
            print(f"    Legacy method also failed: {legacy_error}")
        
        print("✗ All Bedrock access methods failed")
        print("  This might be due to model access restrictions or regional availability")
        return False
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'AccessDeniedException':
            print("✗ Access denied to Bedrock")
            print("  Check if Claude model access is enabled in Bedrock console")
        elif error_code == 'ValidationException':
            print("✗ Invalid model ID or request format")
            print("  AWS may have changed model access requirements")
        else:
            print(f"✗ Bedrock error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected Bedrock error: {e}")
        return False

def test_s3_access():
    """Test S3 access"""
    bucket_name = 'truly-ai-multimodal'
    
    try:
        role_manager = AWSRoleManager(
            'arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
            external_id='truly-ai-external-id-12345'
        )
        
        s3_client = role_manager.get_s3_client()
        
        # Test listing bucket contents
        response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        print("✓ S3 access successful")
        print(f"  Bucket: {bucket_name}")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            print(f"✗ S3 bucket '{bucket_name}' not found")
            print("  Create the bucket or check the name")
        elif error_code == 'AccessDenied':
            print(f"✗ Access denied to S3 bucket '{bucket_name}'")
            print("  Check bucket permissions")
        else:
            print(f"✗ S3 error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected S3 error: {e}")
        return False

def test_alternative_sso():
    """Test alternative SSO approach"""
    try:
        # Try using default profile
        session = boto3.Session()
        bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')
        
        # Try different model IDs for SSO as well
        model_ids_to_try = [
            "anthropic.claude-3-haiku-20240307-v1:0",
            "anthropic.claude-3-sonnet-20240229-v1:0",
            "anthropic.claude-3-5-sonnet-20240620-v1:0"
        ]
        
        for model_id in model_ids_to_try:
            try:
                print(f"  Trying SSO with model: {model_id}")
                response = bedrock_client.converse(
                    modelId=model_id,
                    messages=[{
                        "role": "user",
                        "content": [{"text": "Test SSO access"}]
                    }]
                )
                
                print("✓ SSO/Default profile access works")
                print(f"  Working model: {model_id}")
                print("  You can use this approach instead of role assumption")
                return True
                
            except ClientError as model_error:
                if "ValidationException" in str(model_error):
                    print(f"    Model {model_id} not available via SSO")
                    continue
                else:
                    raise model_error
        
        print("✗ No models available via SSO")
        return False
        
    except Exception as e:
        print(f"✗ SSO access failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=== AWS Setup Verification ===\n")
    
    tests = [
        ("Basic Credentials", test_basic_credentials),
        ("Role Assumption", test_role_assumption),
        ("Bedrock Access", test_bedrock_access),
        ("S3 Access", test_s3_access),
        ("Alternative SSO", test_alternative_sso)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        results[test_name] = test_func()
    
    print("\n=== Summary ===")
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name}: {status}")
    
    if all(results.values()):
        print("\n🎉 All tests passed! Your AWS setup is ready.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        print("\nTroubleshooting tips:")
        print("1. Ensure AWS CLI is configured: aws configure")
        print("2. Check IAM role permissions in AWS console")
        print("3. Verify Bedrock model access is enabled")
        print("4. Confirm S3 bucket exists and has correct permissions")

if __name__ == "__main__":
    main()
