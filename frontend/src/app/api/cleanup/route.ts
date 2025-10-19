import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldFiles, cleanupAllFiles, getCleanupStats } from '@/utils/cleanup';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;
    
    logger.log('CLEANUP', `🧹 Starting ${force ? 'force' : 'old files'} cleanup via API`);
    
    let result;
    if (force) {
      result = await cleanupAllFiles();
    } else {
      result = await cleanupOldFiles();
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${result.cleaned} files deleted, ${result.failed} failed, ${result.total} total`,
      filesDeleted: result.cleaned,
      filesFailed: result.failed,
      totalFiles: result.total,
      cleanupType: force ? 'force' : 'old_files'
    });

  } catch (error) {
    logger.error('CLEANUP', '❌ Cleanup API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown cleanup error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getCleanupStats();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalFiles: stats.totalFiles,
        oldFiles: stats.oldFiles,
        totalSizeBytes: stats.totalSize,
        oldSizeBytes: stats.oldSize,
        totalSizeMB: Math.round(stats.totalSize / (1024 * 1024) * 100) / 100,
        oldSizeMB: Math.round(stats.oldSize / (1024 * 1024) * 100) / 100
      },
      message: `${stats.totalFiles} total files, ${stats.oldFiles} old files ready for cleanup`
    });

  } catch (error) {
    logger.error('CLEANUP', '❌ Cleanup stats error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
