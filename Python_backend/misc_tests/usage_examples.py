"""
Usage examples for AWS Multimodal Analyzer
"""
from aws_multimodal_analyzer import AWSMultiModalAnalyzer
import boto3

def basic_setup_example():
    """Basic setup with IAM role"""
    # Initialize with IAM role
    analyzer = AWSMultiModalAnalyzer(
        role_arn='arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
        region_name='us-east-1',
        external_id='truly-ai-external-id-12345'  # Optional
    )

    # Analyze image
    result = analyzer.analyze_image("photo.jpg")
    print(result['description'])
    
    return analyzer

def video_analysis_example(analyzer):
    """Video analysis using Bedrock Data Automation"""
    video_result = analyzer.analyze_video_with_bda(
        "presentation.mp4",
        s3_bucket="truly-ai-multimodal"
    )

    print(f"Processing: {video_result['invocation_arn']}")
    return video_result

def image_comparison_example(analyzer):
    """Compare multiple images"""
    comparison = analyzer.compare_images(
        ["before.jpg", "after.jpg"],
        question="What changed between these images?"
    )
    print(comparison['analysis'])
    return comparison

def sso_alternative_example():
    """Alternative: Use SSO credentials directly"""
    # Use your SSO profile (already configured)
    session = boto3.Session(profile_name='default')

    bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')
    s3_client = session.client('s3', region_name='us-east-1')

    # Use these clients directly in your analyzer
    print("SSO session created successfully")
    return bedrock_client, s3_client

def test_role_assumption():
    """Test role assumption"""
    from aws_config import AWSRoleManager

    role_manager = AWSRoleManager(
        role_arn='arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
        external_id='truly-ai-external-id-12345'
    )

    try:
        bedrock_client = role_manager.get_bedrock_client()

        response = bedrock_client.converse(
            modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
            messages=[{
                "role": "user",
                "content": [{"text": "Say hello!"}]
            }]
        )

        print("✓ Role assumption successful!")
        print(f"Response: {response['output']['message']['content'][0]['text']}")
        return True
    except Exception as e:
        print(f"✗ Role assumption failed: {e}")
        return False

if __name__ == "__main__":
    print("=== AWS Multimodal Analyzer Examples ===\n")
    
    # Test role assumption first
    print("1. Testing role assumption...")
    if test_role_assumption():
        print("✓ AWS setup is working correctly!\n")
        
        # Run other examples
        print("2. Basic setup example...")
        analyzer = basic_setup_example()
        
        print("\n3. Image comparison example...")
        # image_comparison_example(analyzer)
        
        print("\n4. Video analysis example...")
        # video_analysis_example(analyzer)
        
    else:
        print("✗ Please check your AWS configuration\n")
        
        print("Alternative: Using SSO credentials...")
        try:
            sso_alternative_example()
        except Exception as e:
            print(f"SSO setup failed: {e}")
