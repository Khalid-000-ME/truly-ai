"""
Setup script for AWS IAM roles and policies
Run this after creating the JSON policy files
"""
import subprocess
import json
import os

def run_aws_command(command):
    """Run an AWS CLI command and return the result"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Success: {command}")
            if result.stdout:
                print(f"  Output: {result.stdout.strip()}")
            return True
        else:
            print(f"✗ Failed: {command}")
            print(f"  Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"✗ Exception running command: {e}")
        return False

def check_file_exists(filename):
    """Check if a required file exists"""
    if os.path.exists(filename):
        print(f"✓ Found: {filename}")
        return True
    else:
        print(f"✗ Missing: {filename}")
        return False

def main():
    """Setup AWS roles and policies"""
    print("=== AWS IAM Setup for TrulyAI ===\n")
    
    # Check required files
    required_files = [
        "bedrock-da-permissions.json",
        "truly-ai-app-trust-policy.json",
        "truly-ai-app-permissions.json",
        "bedrock-da-trust-policy.json"
    ]
    
    print("Checking required files...")
    all_files_exist = True
    for file in required_files:
        if not check_file_exists(file):
            all_files_exist = False
    
    if not all_files_exist:
        print("\n✗ Missing required files. Please ensure all JSON files are created.")
        return
    
    print("\n✓ All required files found. Proceeding with AWS setup...\n")
    
    # Setup commands
    commands = [
        {
            "name": "Attach policy to Bedrock Data Automation role",
            "command": "aws iam put-role-policy --role-name TrulyAI-BedrockDataAutomationRole --policy-name BedrockDataAutomationS3Access --policy-document file://bedrock-da-permissions.json"
        }
    ]
    
    # Execute commands
    success_count = 0
    for cmd_info in commands:
        print(f"--- {cmd_info['name']} ---")
        if run_aws_command(cmd_info['command']):
            success_count += 1
        print()
    
    # Summary
    print("=== Setup Summary ===")
    print(f"Commands executed: {success_count}/{len(commands)} successful")
    
    if success_count == len(commands):
        print("\n🎉 AWS IAM setup completed successfully!")
        print("\nNext steps:")
        print("1. Install dependencies: python install_aws_deps.py")
        print("2. Test setup: python test_aws_setup.py")
        print("3. Run examples: python usage_examples.py")
    else:
        print("\n⚠️  Some commands failed. Please run them manually:")
        for cmd_info in commands:
            print(f"  {cmd_info['command']}")
    
    print("\nManual verification commands:")
    print("aws sts assume-role --role-arn arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole --role-session-name test-session --external-id truly-ai-external-id-12345")
    print("aws s3 ls s3://truly-ai-multimodal")

if __name__ == "__main__":
    main()
