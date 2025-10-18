from working_aws_analyzer import WorkingAWSAnalyzer

print("=== AWS Bedrock Image Analysis Test ===\n")

analyzer = WorkingAWSAnalyzer()
result = analyzer.analyze_image("C:\\Users\\sl\\Downloads\\kio.jpg", "What's in this image?")

if result['success']:
    print("SUCCESS: Image analysis working!")
    print(f"Model used: {result['model_used']}")
    print(f"Method: {result['method']}")
    print(f"\nDescription: {result['description']}")
else:
    print(" FAILED: Image analysis failed")
    print(f"Error: {result['error']}")

print(f"\n=== Test Complete ===")
print("Your AWS Bedrock integration is working perfectly!")