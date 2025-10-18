# AWS Bedrock Setup for TrulyAI Multimodal Analyzer

This guide sets up AWS Bedrock with IAM roles for secure multimodal analysis using Claude and Nova models.

## 📋 Prerequisites

- AWS CLI installed and configured
- AWS account with Bedrock access
- Python 3.11+ with pip

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
python install_aws_deps.py
```

### Step 2: Complete AWS Role Setup
Since you've already created most roles, just run:
```bash
python setup_aws_roles.py
```

### Step 3: Test Your Setup
```bash
python test_aws_setup.py
```

### Step 4: Try Examples
```bash
python usage_examples.py
```

## 📁 Files Created

### Core AWS Integration
- **`aws_config.py`** - AWS role manager with credential handling
- **`aws_multimodal_analyzer.py`** - Main analyzer class using AWS Bedrock
- **`usage_examples.py`** - Complete usage examples
- **`test_aws_setup.py`** - Comprehensive setup verification

### AWS IAM Configuration
- **`bedrock-da-permissions.json`** - Bedrock Data Automation permissions
- **`truly-ai-app-trust-policy.json`** - App execution role trust policy
- **`truly-ai-app-permissions.json`** - App execution role permissions
- **`bedrock-da-trust-policy.json`** - Bedrock service trust policy

### Utilities
- **`install_aws_deps.py`** - Dependency installer
- **`setup_aws_roles.py`** - AWS CLI command runner
- **`bedrock.py`** - Original Bedrock image analyzer

## 🔧 Manual AWS CLI Commands

If the automated setup fails, run these manually:

```bash
# Attach policy to Bedrock Data Automation role
aws iam put-role-policy \
  --role-name TrulyAI-BedrockDataAutomationRole \
  --policy-name BedrockDataAutomationS3Access \
  --policy-document file://bedrock-da-permissions.json

# Test role assumption
aws sts assume-role \
  --role-arn arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole \
  --role-session-name test-session \
  --external-id truly-ai-external-id-12345

# Test S3 access
aws s3 ls s3://truly-ai-multimodal
```

## 💻 Usage Examples

### Basic Image Analysis
```python
from aws_multimodal_analyzer import AWSMultiModalAnalyzer

# Initialize with IAM role
analyzer = AWSMultiModalAnalyzer(
    role_arn='arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
    region_name='us-east-1',
    external_id='truly-ai-external-id-12345'
)

# Analyze image
result = analyzer.analyze_image("photo.jpg", prompt="What's in this image?")
print(result['description'])
```

### Video Analysis with Bedrock Data Automation
```python
# Analyze video (uploads to S3 automatically)
video_result = analyzer.analyze_video_with_bda(
    "presentation.mp4",
    s3_bucket="truly-ai-multimodal"
)
print(f"Processing: {video_result['invocation_arn']}")
```

### Compare Multiple Images
```python
# Compare images
comparison = analyzer.compare_images(
    ["before.jpg", "after.jpg"],
    question="What changed between these images?"
)
print(comparison['analysis'])
```

### Alternative: Direct SSO Access
```python
import boto3

# Use your existing SSO profile
session = boto3.Session(profile_name='default')
bedrock_client = session.client('bedrock-runtime', region_name='us-east-1')

# Use directly without role assumption
```

## 🔍 Verification Steps

### 1. Test Basic Credentials
```bash
aws sts get-caller-identity
```

### 2. Test Role Assumption
```bash
aws sts assume-role \
  --role-arn arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole \
  --role-session-name test \
  --external-id truly-ai-external-id-12345
```

### 3. Test Bedrock Access
```python
python test_aws_setup.py
```

### 4. Test S3 Bucket
```bash
aws s3 ls s3://truly-ai-multimodal
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Access Denied" when assuming role
- Check if your user has `sts:AssumeRole` permission
- Verify the external ID matches exactly
- Ensure the role trust policy includes your account

#### 2. "No Claude models found"
- Enable Claude model access in AWS Bedrock console
- Go to Bedrock → Model access → Request access

#### 3. "S3 bucket not found"
- Create the bucket: `aws s3 mb s3://truly-ai-multimodal`
- Verify bucket name and region

#### 4. "AWS CLI not found"
- Install AWS CLI: https://aws.amazon.com/cli/
- Configure credentials: `aws configure`

### Debug Commands

```bash
# Check current identity
aws sts get-caller-identity

# List available Bedrock models
aws bedrock list-foundation-models --region us-east-1

# Test S3 access
aws s3 ls s3://truly-ai-multimodal

# Validate JSON files
python -m json.tool bedrock-da-permissions.json
```

## 📊 Expected Performance

### AWS Bedrock (Claude 3.5 Sonnet)
- **Image Analysis**: 1-3 seconds
- **Multi-image Comparison**: 3-8 seconds
- **Video Analysis**: Async processing (minutes)
- **Cost**: ~$0.003 per image analysis

### Benefits over Local Models
- **Faster inference** (cloud GPUs)
- **Higher accuracy** (larger models)
- **No local memory usage**
- **Always up-to-date models**

## 🔐 Security Notes

- **IAM Roles**: More secure than access keys
- **External ID**: Prevents confused deputy attacks
- **Temporary Credentials**: Auto-expire after 1 hour
- **Least Privilege**: Roles have minimal required permissions

## 🔗 Integration with FastAPI Backend

To integrate with your existing FastAPI backend:

```python
# In your FastAPI service files
from aws_multimodal_analyzer import AWSMultiModalAnalyzer

class ImageService:
    def __init__(self):
        self.aws_analyzer = AWSMultiModalAnalyzer(
            role_arn='arn:aws:iam::976261623100:role/TrulyAI-AppExecutionRole',
            external_id='truly-ai-external-id-12345'
        )
    
    async def analyze_image_aws(self, image_path, prompt=None):
        """Use AWS Bedrock instead of local models"""
        result = self.aws_analyzer.analyze_image(image_path, prompt)
        return {
            "description": result['description'],
            "model": result['model_used'],
            "provider": "aws_bedrock"
        }
```

## 📚 Next Steps

1. **Test the setup**: Run `python test_aws_setup.py`
2. **Try examples**: Run `python usage_examples.py`
3. **Integrate with FastAPI**: Add AWS option to your existing endpoints
4. **Monitor costs**: Set up AWS billing alerts
5. **Scale up**: Consider using Nova models for video analysis

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the test script: `python test_aws_setup.py`
3. Verify AWS console permissions
4. Check CloudTrail logs for detailed error messages

The setup provides both local model fallback and cloud-based analysis for maximum flexibility!
