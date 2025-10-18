"""
Text Analysis Router
Handles text analysis using AWS Bedrock
"""
from fastapi import APIRouter, HTTPException, Form
from pydantic import BaseModel
from typing import Optional, Literal
import logging

from app.services.multimodal_service import multimodal_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/analyze",
    tags=["text"],
    responses={404: {"description": "Not found"}},
)

class TextAnalysisRequest(BaseModel):
    text: str
    analysis_type: Optional[Literal["summary", "sentiment", "topics", "insights"]] = "summary"

class TextAnalysisResponse(BaseModel):
    success: bool
    result: Optional[str] = None
    error: Optional[str] = None
    model_used: Optional[str] = None
    analysis_type: str
    original_text_length: int

@router.post("/text", response_model=TextAnalysisResponse)
async def analyze_text(request: TextAnalysisRequest):
    """
    Analyze text using AWS Bedrock Nova Lite
    
    - **text**: The text to analyze
    - **analysis_type**: Type of analysis (summary, sentiment, topics, insights)
    
    Returns detailed text analysis including summary, sentiment, or topics based on request.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if len(request.text) > 50000:  # Reasonable limit
        raise HTTPException(status_code=400, detail="Text too long (max 50,000 characters)")
    
    try:
        logger.info(f"Analyzing text with type: {request.analysis_type}")
        
        result = await multimodal_service.analyze_text(
            text=request.text,
            analysis_type=request.analysis_type
        )
        
        if not result["success"]:
            logger.error(f"Text analysis failed: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500, 
                detail=f"Text analysis failed: {result.get('error', 'Unknown error')}"
            )
        
        return TextAnalysisResponse(
            success=True,
            result=result["result"],
            model_used=result.get("model_used", ""),
            analysis_type=result["analysis_type"],
            original_text_length=result["original_text_length"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in text analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/text/form")
async def analyze_text_form(
    text: str = Form(...),
    analysis_type: str = Form("summary")
):
    """
    Analyze text using form data (alternative endpoint for form submissions)
    
    - **text**: The text to analyze
    - **analysis_type**: Type of analysis (summary, sentiment, topics, insights)
    """
    # Validate analysis_type
    valid_types = ["summary", "sentiment", "topics", "insights"]
    if analysis_type not in valid_types:
        analysis_type = "summary"
    
    request = TextAnalysisRequest(text=text, analysis_type=analysis_type)
    return await analyze_text(request)

@router.get("/text/types")
async def get_analysis_types():
    """
    Get available text analysis types
    """
    return {
        "analysis_types": [
            {
                "type": "summary",
                "description": "Generate a concise summary of the text"
            },
            {
                "type": "sentiment", 
                "description": "Analyze sentiment and emotional tone"
            },
            {
                "type": "topics",
                "description": "Extract main topics and themes"
            },
            {
                "type": "insights",
                "description": "Provide key insights and important points"
            }
        ]
    }
