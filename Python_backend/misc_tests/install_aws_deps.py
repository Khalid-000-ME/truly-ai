"""
Install AWS dependencies for the multimodal analyzer
"""
import subprocess
import sys

def install_package(package):
    """Install a package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✓ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install {package}: {e}")
        return False

def main():
    """Install required AWS packages"""
    print("Installing AWS dependencies for TrulyAI multimodal analyzer...\n")
    
    packages = [
        "boto3",
        "botocore",
        "python-dotenv"
    ]
    
    success_count = 0
    for package in packages:
        if install_package(package):
            success_count += 1
        print()
    
    print(f"Installation complete: {success_count}/{len(packages)} packages installed successfully")
    
    if success_count == len(packages):
        print("\n🎉 All AWS dependencies installed successfully!")
        print("\nNext steps:")
        print("1. Configure AWS credentials: aws configure")
        print("2. Test setup: python test_aws_setup.py")
        print("3. Run examples: python usage_examples.py")
    else:
        print("\n⚠️  Some packages failed to install. Please install them manually:")
        print("pip install boto3 botocore python-dotenv")

if __name__ == "__main__":
    main()
