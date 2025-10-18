import boto3
from botocore.exceptions import ClientError

class AWSRoleManager:
    """Manages AWS credentials using IAM roles instead of users"""
    
    def __init__(self, role_arn, region_name='us-east-1', external_id=None):
        """
        Initialize with IAM role
        
        Args:
            role_arn: ARN of the role to assume
            region_name: AWS region
            external_id: Optional external ID for additional security
        """
        self.role_arn = role_arn
        self.region_name = region_name
        self.external_id = external_id
        self.credentials = None
        
    def assume_role(self, session_name='TrulyAI-Session'):
        """Assume the IAM role and get temporary credentials"""
        sts_client = boto3.client('sts', region_name=self.region_name)
        
        assume_role_params = {
            'RoleArn': self.role_arn,
            'RoleSessionName': session_name,
            'DurationSeconds': 3600  # 1 hour
        }
        
        if self.external_id:
            assume_role_params['ExternalId'] = self.external_id
        
        try:
            response = sts_client.assume_role(**assume_role_params)
            self.credentials = response['Credentials']
            return self.credentials
        except ClientError as e:
            print(f"Error assuming role: {e}")
            raise
    
    def get_bedrock_client(self):
        """Get Bedrock Runtime client with assumed role credentials"""
        if not self.credentials:
            self.assume_role()
        
        return boto3.client(
            'bedrock-runtime',
            region_name=self.region_name,
            aws_access_key_id=self.credentials['AccessKeyId'],
            aws_secret_access_key=self.credentials['SecretAccessKey'],
            aws_session_token=self.credentials['SessionToken']
        )
    
    def get_bedrock_data_automation_client(self):
        """Get Bedrock Data Automation client"""
        if not self.credentials:
            self.assume_role()
        
        return boto3.client(
            'bedrock-data-automation-runtime',
            region_name=self.region_name,
            aws_access_key_id=self.credentials['AccessKeyId'],
            aws_secret_access_key=self.credentials['SecretAccessKey'],
            aws_session_token=self.credentials['SessionToken']
        )
    
    def get_s3_client(self):
        """Get S3 client with assumed role credentials"""
        if not self.credentials:
            self.assume_role()
        
        return boto3.client(
            's3',
            region_name=self.region_name,
            aws_access_key_id=self.credentials['AccessKeyId'],
            aws_secret_access_key=self.credentials['SecretAccessKey'],
            aws_session_token=self.credentials['SessionToken']
        )
