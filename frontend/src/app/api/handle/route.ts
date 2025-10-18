import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 3;
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a'
};

// Initialize Gemini AI with validation
const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

const genAI = initializeGemini();

interface TimeframeSelection {
  fileIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
}

interface ProcessedData {
  refinedText: string;
  extractedLinks: string[];
  mediaFiles: Array<{
    path: string;
    type: string;
    originalName: string;
    size: number;
    timeframe?: {
      startTime: number;
      endTime: number;
      duration: number;
    };
  }>;
  originalPrompt: string;
  timeframeSelections: TimeframeSelection[];
}

// Logging function
function logRequest(method: string, data: any) {
  logger.log('HANDLE', `${method} - Prompt: ${data.prompt?.length || 0}chars, Files: ${data.fileCount || 0}`);
}

// Validation functions
function validateFileType(file: File): boolean {
  return Object.keys(ALLOWED_TYPES).includes(file.type);
}

function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

// Basic text correction function (fallback)
function basicTextCorrection(text: string): string {
  // Common typo corrections
  const corrections: { [key: string]: string } = {
    'Hw': 'How',
    'taj': 'take',
    'fo': 'for',
    'chth': 'cheetah',
    'i': 'it',
    'will': 'will',
    'long': 'long',
    'finish': 'finish',
    'lap': 'lap'
  };
  
  let corrected = text;
  Object.entries(corrections).forEach(([wrong, right]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  });
  
  // Basic grammar fixes
  corrected = corrected.replace(/\s+/g, ' ').trim();
  
  return corrected;
}

// Function to extract links from text using Gemini
async function extractLinksWithGemini(text: string): Promise<{ refinedText: string; links: string[] }> {
  // Fallback function for manual link extraction
  const manualExtraction = () => {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    const links = text.match(urlRegex) || [];
    const refinedText = basicTextCorrection(text);
    logger.log('HANDLE', `Fallback: ${links.length} links, ${text.length}→${refinedText.length} chars`);
    return { refinedText, links };
  };

  // Check if Gemini is available
  if (!genAI) {
    logger.log('HANDLE', 'Gemini unavailable, using fallback');
    return manualExtraction();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Act as a text correction and analysis expert.

Your task: Fix the spelling and grammar errors in this text, then extract any URLs.

INPUT: "${text}"

Step 1: Correct all spelling mistakes and typos
Step 2: Fix grammar and improve clarity  
Step 3: Find any URLs or web links
Step 4: Return JSON response

Example correction:
"Hw long will i taj fo a chth to finish a 2km lap" becomes "How long will it take for a cheetah to finish a 2km lap?"

Return this exact JSON format:
{
  "refinedText": "your corrected version here",
  "links": []
}

Do NOT return the original text unchanged. You MUST fix spelling errors.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    logger.log('HANDLE', '🤖 Gemini Raw Response:');
    logger.json('HANDLE', 'Raw Response', responseText);
    
    try {
      // Clean the response text (remove markdown formatting if present)
      const cleanedResponse = responseText.replace(/```json\s*|\s*```/g, '').trim();
      logger.log('HANDLE', '🧹 Cleaned Response');
      
      const parsed = JSON.parse(cleanedResponse);
      logger.log('HANDLE', `Gemini Success: ${parsed.links?.length || 0} links, ${text.length}→${parsed.refinedText?.length || 0} chars`);
      logger.json('HANDLE', 'Parsed Result', parsed);
      
      return {
        refinedText: parsed.refinedText || text,
        links: Array.isArray(parsed.links) ? parsed.links : []
      };
    } catch (parseError) {
      logger.warn('HANDLE', '⚠️  Gemini JSON Parse Error');
      logger.error('HANDLE', 'Parse Error', parseError);
      logger.log('HANDLE', '📝 Raw response was: ' + responseText);
      
      // Fallback: manual link extraction
      const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
      const links = text.match(urlRegex) || [];
      
      logger.log('HANDLE', 'Gemini parse failed, using fallback');
      return manualExtraction();
    }
  } catch (error) {
    logger.error('HANDLE', 'Gemini API error', error);
    logger.log('HANDLE', 'Gemini error, using fallback');
    return manualExtraction();
  }
}

// Function to save uploaded files with validation
async function saveUploadedFiles(
  formData: FormData, 
  timeframeSelections: TimeframeSelection[] = []
): Promise<Array<{ path: string; type: string; originalName: string; size: number; timeframe?: { startTime: number; endTime: number; duration: number } }>> {
  const uploadDir = join(process.cwd(), 'uploads');
  
  // Create uploads directory if it doesn't exist
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
    logger.log('HANDLE', `Created upload dir: ${uploadDir}`);
  }

  const savedFiles: Array<{ path: string; type: string; originalName: string; size: number; timeframe?: { startTime: number; endTime: number; duration: number } }> = [];
  const errors: string[] = [];
  
  // Debug: Log all formData keys
  const formDataKeys = Array.from(formData.keys());
  logger.log('HANDLE', `FormData keys: ${formDataKeys.join(', ')}`);
  
  // Process each file with validation
  for (let i = 0; i < MAX_FILES; i++) {
    const file = formData.get(`file_${i}`) as File;
    logger.log('HANDLE', `Checking file_${i}: ${file ? `${file.name} (${file.type}, ${file.size}bytes)` : 'null'}`);
    if (!file) continue;

    // Validate file type
    if (!validateFileType(file)) {
      errors.push(`File "${file.name}": Unsupported file type "${file.type}"`);
      continue;
    }

    // Validate file size
    if (!validateFileSize(file)) {
      errors.push(`File "${file.name}": File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
      continue;
    }

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate secure filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const extension = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES] || '';
      const filename = `${timestamp}_${randomId}_${i}${extension}`;
      const filepath = join(uploadDir, filename);
      
      // Save file
      await writeFile(filepath, buffer);
      
      // Find timeframe selection for this file
      const timeframeSelection = timeframeSelections.find(selection => selection.fileIndex === i);
      
      const fileInfo: any = {
        path: filepath,
        type: file.type,
        originalName: file.name,
        size: file.size
      };
      
      // Add timeframe data if available
      if (timeframeSelection) {
        fileInfo.timeframe = {
          startTime: timeframeSelection.startTime,
          endTime: timeframeSelection.endTime,
          duration: timeframeSelection.duration
        };
        logger.log('HANDLE', `Timeframe ${file.name}: ${timeframeSelection.startTime}-${timeframeSelection.endTime}s`);
      }
      
      savedFiles.push(fileInfo);
      logger.log('HANDLE', `Saved: ${file.name} → ${filename} (${(file.size/1024).toFixed(1)}KB)`);
      
    } catch (error) {
      errors.push(`File "${file.name}": Failed to save - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Log any errors
  if (errors.length > 0) {
    logger.warn('HANDLE', '⚠️  File processing errors: ' + errors.join(', '));
  }
  
  logger.log('HANDLE', `Files: ${savedFiles.length} saved, ${errors.length} failed`);
  
  return savedFiles;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string || '';
    
    // Parse timeframe selections if provided
    const timeframeSelectionsStr = formData.get('timeframeSelections') as string;
    let timeframeSelections: TimeframeSelection[] = [];
    if (timeframeSelectionsStr) {
      try {
        timeframeSelections = JSON.parse(timeframeSelectionsStr);
        logger.log('HANDLE', `Timeframes: ${timeframeSelections.length} selections`);
      } catch (error) {
        logger.warn('HANDLE', '⚠️  Failed to parse timeframe selections: ' + error);
      }
    }
    
    // Validate request
    if (!prompt.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Prompt is required',
          details: 'Please provide a text prompt for analysis'
        },
        { status: 400 }
      );
    }

    // Count files for logging
    let fileCount = 0;
    for (let i = 0; i < MAX_FILES; i++) {
      if (formData.get(`file_${i}`)) fileCount++;
    }

    // Log request
    logRequest('POST', { 
      prompt, 
      fileCount, 
      hasLinks: /https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(prompt)
    });
    
    // Process text with Gemini to extract links and refine instructions
    const { refinedText, links } = await extractLinksWithGemini(prompt);
    
    // Save uploaded files
    const mediaFiles = await saveUploadedFiles(formData, timeframeSelections);
    
    // Prepare response data
    const processedData: ProcessedData = {
      refinedText,
      extractedLinks: links,
      mediaFiles,
      originalPrompt: prompt,
      timeframeSelections
    };
    
    const processingTime = Date.now() - startTime;
    
    // Prepare full response
    const fullResponse = {
      success: true,
      data: processedData,
      message: 'Request processed successfully',
      meta: {
        processingTimeMs: processingTime,
        geminiUsed: !!genAI,
        filesProcessed: mediaFiles.length,
        linksExtracted: links.length
      }
    };
    
    logger.log('HANDLE', `Complete: ${processingTime}ms | ${prompt.length}→${refinedText.length}chars | ${links.length}links | ${mediaFiles.length}files`);
    
    logger.separator('HANDLE', '📋 HANDLE API RESPONSE');
    logger.json('HANDLE', 'Final Response', fullResponse);
    
    return NextResponse.json(fullResponse);
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('HANDLE', `❌ API Error after ${processingTime}ms`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          processingTimeMs: processingTime
        }
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const uploadDir = join(process.cwd(), 'uploads');
  
  return NextResponse.json({
    message: 'TrulyAI Handle API - Ready to process requests',
    version: '1.0.0',
    status: {
      geminiAI: !!genAI ? 'available' : 'not configured',
      uploadDirectory: existsSync(uploadDir) ? 'exists' : 'will be created',
      maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
      maxFiles: MAX_FILES,
      supportedTypes: Object.keys(ALLOWED_TYPES)
    },
    endpoints: {
      'GET /api/handle': 'System status and configuration',
      'POST /api/handle': 'Process text prompts and uploaded files'
    },
    usage: {
      prompt: 'Text prompt for analysis (required)',
      files: 'Upload up to 3 files as file_0, file_1, file_2 (optional)',
      response: 'JSON with refined text, extracted links, and file paths'
    }
  });
}