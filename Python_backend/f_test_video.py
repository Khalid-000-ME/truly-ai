"""
Test video analysis using AWS Bedrock and local processing
"""
import os
import cv2
import tempfile
from pathlib import Path
from working_aws_analyzer import WorkingAWSAnalyzer

def analyze_video_frames(video_path, num_frames=5):
    """
    Extract frames from video and analyze them with AWS Bedrock
    """
    print(f"=== Video Analysis Test ===")
    print(f"Video: {video_path}")
    
    if not os.path.exists(video_path):
        print(f"ERROR: Video file not found: {video_path}")
        return
    
    # Initialize analyzer
    analyzer = WorkingAWSAnalyzer()
    
    # Extract frames from video
    print(f"\nExtracting {num_frames} frames from video...")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("ERROR: Could not open video file")
        return
    
    # Get video properties
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Video info:")
    print(f"  Duration: {duration:.2f} seconds")
    print(f"  FPS: {fps:.2f}")
    print(f"  Resolution: {width}x{height}")
    print(f"  Total frames: {total_frames}")
    
    # Calculate frame indices to extract
    if total_frames < num_frames:
        frame_indices = list(range(total_frames))
    else:
        frame_indices = [int(i * total_frames / num_frames) for i in range(num_frames)]
    
    print(f"\nAnalyzing frames...")
    
    frame_analyses = []
    temp_files = []
    
    try:
        for i, frame_idx in enumerate(frame_indices):
            # Seek to frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            
            if not ret:
                print(f"  Failed to read frame {frame_idx}")
                continue
            
            # Save frame as temporary image
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            temp_path = temp_file.name
            temp_file.close()
            temp_files.append(temp_path)
            
            # Write frame to file
            cv2.imwrite(temp_path, frame)
            
            # Calculate timestamp
            timestamp = frame_idx / fps if fps > 0 else 0
            
            print(f"  Frame {i+1}/{len(frame_indices)} (t={timestamp:.2f}s)...")
            
            # Analyze frame with AWS Bedrock
            result = analyzer.analyze_image(
                temp_path, 
                f"Describe what's happening in this video frame at {timestamp:.1f} seconds."
            )
            
            if result['success']:
                frame_analyses.append({
                    'frame_number': frame_idx,
                    'timestamp': timestamp,
                    'description': result['description'],
                    'model': result['model_used']
                })
                print(f"    SUCCESS: {result['description'][:100]}...")
            else:
                print(f"    FAILED: {result['error']}")
                frame_analyses.append({
                    'frame_number': frame_idx,
                    'timestamp': timestamp,
                    'description': f"Analysis failed: {result['error']}",
                    'model': 'failed'
                })
    
    finally:
        # Clean up
        cap.release()
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass
    
    # Generate summary
    print(f"\n=== Video Analysis Results ===")
    print(f"Successfully analyzed {len([f for f in frame_analyses if f['model'] != 'failed'])}/{len(frame_analyses)} frames")
    
    for frame in frame_analyses:
        print(f"\nFrame {frame['frame_number']} (t={frame['timestamp']:.2f}s):")
        print(f"  {frame['description']}")
    
    # Generate overall summary
    successful_descriptions = [f['description'] for f in frame_analyses if f['model'] != 'failed']
    if successful_descriptions:
        print(f"\n=== Video Summary ===")
        summary_prompt = f"Based on these video frame descriptions, provide a summary of what happens in this video: {' | '.join(successful_descriptions)}"
        
        summary_result = analyzer.analyze_text(summary_prompt)
        if summary_result['success']:
            print(f"Overall video summary: {summary_result['response']}")
        else:
            print("Could not generate video summary")
    
    print(f"\n=== Test Complete ===")
    return frame_analyses

if __name__ == "__main__":
    # Test with a video file - update this path to your video
    video_path = "C:\\Users\\sl\\Downloads\\video.mp4"  # Update this path
    
    # Check if file exists, if not provide instructions
    if not os.path.exists(video_path):
        print("Video file not found!")
        print("Please update the video_path variable with a valid video file path.")
        print("Supported formats: MP4, AVI, MOV, MKV")
        print(f"Current path: {video_path}")
    else:
        analyze_video_frames(video_path, num_frames=3)
