from aws_config import AWSRoleManager
import base64
import json
import time

class AWSMultiModalAnalyzer:
    def __init__(self, role_arn, region_name='us-east-1', external_id=None):
        """
        Initialize analyzer with IAM role
        
        Args:
            role_arn: ARN of the IAM role to assume
            region_name: AWS region
            external_id: Optional external ID
        """
        self.role_manager = AWSRoleManager(role_arn, region_name, external_id)
        self.bedrock_client = self.role_manager.get_bedrock_client()
        self.bedrock_da_client = self.role_manager.get_bedrock_data_automation_client()
        self.s3_client = self.role_manager.get_s3_client()
        self.region_name = region_name
    
    def analyze_image(self, image_path, prompt=None, use_nova=False):
        """Analyze an image using Claude or Nova"""
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Use working model IDs - try multiple options
        if use_nova:
            model_ids_to_try = ["us.amazon.nova-pro-v1:0", "us.amazon.nova-lite-v1:0"]
        else:
            model_ids_to_try = [
                "anthropic.claude-3-haiku-20240307-v1:0",  # Most likely to work
                "anthropic.claude-3-sonnet-20240229-v1:0",
                "anthropic.claude-3-5-sonnet-20240620-v1:0"
            ]
        
        if not prompt:
            prompt = "Describe this image in detail."
        
        messages = [{
            "role": "user",
            "content": [
                {
                    "image": {
                        "format": "png" if image_path.endswith('.png') else "jpeg",
                        "source": {"bytes": image_base64}
                    }
                },
                {"text": prompt}
            ]
        }]
        
        # Try each model until one works
        last_error = None
        for model_id in model_ids_to_try:
            try:
                response = self.bedrock_client.converse(
                    modelId=model_id,
                    messages=messages
                )
                
                return {
                    'description': response['output']['message']['content'][0]['text'],
                    'model_used': model_id
                }
                
            except Exception as e:
                last_error = e
                continue
        
        # If all models failed, raise the last error
        raise last_error if last_error else Exception("No working models found")
    
    def analyze_video_with_bda(self, video_path, s3_bucket):
        """Analyze video using Bedrock Data Automation"""
        # Upload to S3
        video_name = video_path.split('/')[-1]
        s3_key = f"videos/{video_name}"
        
        self.s3_client.upload_file(video_path, s3_bucket, s3_key)
        s3_uri = f"s3://{s3_bucket}/{s3_key}"
        
        # Invoke Data Automation
        response = self.bedrock_da_client.invoke_data_automation_async(
            inputConfiguration={
                'video': {
                    's3Uri': s3_uri
                }
            },
            outputConfiguration={
                's3Uri': f"s3://{s3_bucket}/output/"
            },
            dataAutomationConfiguration={
                'dataAutomationArn': 'arn:aws:bedrock:us-east-1::data-automation/amazon.nova-lite-v1:0'
            }
        )
        
        return {
            'invocation_arn': response['invocationArn'],
            'status': 'PROCESSING',
            'output_location': f"s3://{s3_bucket}/output/"
        }
    
    def compare_images(self, image_paths, question):
        """Compare multiple images"""
        content = []
        
        for image_path in image_paths:
            with open(image_path, 'rb') as f:
                image_bytes = f.read()
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            content.append({
                "image": {
                    "format": "png" if image_path.endswith('.png') else "jpeg",
                    "source": {"bytes": image_base64}
                }
            })
        
        content.append({"text": question})
        
        # Try multiple model IDs
        model_ids_to_try = [
            "anthropic.claude-3-haiku-20240307-v1:0",
            "anthropic.claude-3-sonnet-20240229-v1:0",
            "anthropic.claude-3-5-sonnet-20240620-v1:0"
        ]
        
        last_error = None
        for model_id in model_ids_to_try:
            try:
                response = self.bedrock_client.converse(
                    modelId=model_id,
                    messages=[{"role": "user", "content": content}]
                )
                
                return {
                    'analysis': response['output']['message']['content'][0]['text'],
                    'model_used': model_id
                }
                
            except Exception as e:
                last_error = e
                continue
        
        # If all models failed, raise the last error
        raise last_error if last_error else Exception("No working models found for image comparison")
