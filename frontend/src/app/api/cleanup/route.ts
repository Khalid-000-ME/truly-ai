import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const uploadsDir = path.join(process.cwd(), 'frontend', 'uploads');
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({
        success: true,
        message: 'Uploads directory does not exist, nothing to clean',
        filesDeleted: 0
      });
    }

    // Read all files in the uploads directory
    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each file
    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        // Only delete files, not directories
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Deleted uploaded file: ${file}`);
        }
      } catch (error) {
        const errorMsg = `Failed to delete ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${deletedCount} files deleted`,
      filesDeleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Cleanup API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown cleanup error'
    }, { status: 500 });
  }
}
