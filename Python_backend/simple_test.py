from pathlib import Path
from dotenv import load_dotenv
import os

# Check if .env file exists
env_path = Path('.env')
print(f"📁 .env file exists: {env_path.exists()}")

if env_path.exists():
    # Load .env file
    load_dotenv(env_path)
    
    # Check AWS credentials
    aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_DEFAULT_REGION')
    
    print(f"🔑 AWS_ACCESS_KEY_ID: {'Found' if aws_access_key else 'Not found'}")
    print(f"🔑 AWS_SECRET_ACCESS_KEY: {'Found' if aws_secret_key else 'Not found'}")
    print(f"🌍 AWS_DEFAULT_REGION: {aws_region or 'Not set'}")
    
    if aws_access_key and aws_secret_key:
        print("\n✅ All AWS credentials found in .env file!")
        print("Now testing AWS connection...")
        
        try:
            import boto3
            session = boto3.Session(
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region or 'us-west-2'
            )
            
            sts_client = session.client('sts')
            identity = sts_client.get_caller_identity()
            print(f"🎉 AWS connection successful!")
            print(f"   Account: {identity.get('Account', 'Unknown')}")
            print(f"   User: {identity.get('Arn', 'Unknown')}")
            
        except Exception as e:
            print(f"❌ AWS connection failed: {e}")
    else:
        print("\n❌ Missing AWS credentials in .env file")
else:
    print("❌ .env file not found. Please create it with your AWS credentials.")
