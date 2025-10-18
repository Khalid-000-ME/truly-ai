import boto3
import json
import os
from dotenv import load_dotenv  
from datetime import datetime

load_dotenv()

# Test connection
try:
    bedrock = boto3.client('bedrock-runtime',
     region_name='us-east-1'
     )

    print("✓ AWS credentials configured correctly")
    print("✓ Bedrock client created successfully")
    
    # List available models (requires bedrock client, not bedrock-runtime)
    bedrock_list = boto3.client('bedrock-runtime',
     region_name='us-east-1'
     )
     
    response = bedrock_list.list_async_invokes(
    submitTimeAfter=datetime(2015, 1, 1),
    submitTimeBefore=datetime(2027, 10, 17),
    statusEquals='Completed',
    maxResults=3,
    )
    claude_models = [m for m in response['modelSummaries'] 
                     if 'claude' in m['modelId'].lower()]
    
    if claude_models:
        print(f"✓ Found {len(claude_models)} Claude models available")
    else:
        print("⚠ No Claude models found - you may need to enable model access")
        
except Exception as e:
    print(f"✗ Error: {e}")
    print("\nTroubleshooting:")
    print("1. Check your credentials are configured correctly")
    print("2. Verify you have Bedrock access in your AWS account")
    print("3. Ensure you've enabled Claude model access in Bedrock console")