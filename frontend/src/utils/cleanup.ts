import { readdir, unlink, stat } from 'fs/promises';
import path from 'path';
import { logger } from './logger';

/**
 * Cleanup utility for managing temporary files in the uploads directory
 */

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_AGE_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Clean up a specific file
 */
export async function cleanupFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    const filename = path.basename(filePath);
    logger.log('CLEANUP', `🗑️  Cleaned up file: ${filename}`);
    return true;
  } catch (error) {
    const filename = path.basename(filePath);
    logger.warn('CLEANUP', `⚠️  Failed to cleanup file ${filename}: ${error}`);
    return false;
  }
}

/**
 * Clean up files older than MAX_FILE_AGE_MS in the uploads directory
 */
export async function cleanupOldFiles(): Promise<{ cleaned: number; failed: number; total: number }> {
  let cleaned = 0;
  let failed = 0;
  let total = 0;

  try {
    const files = await readdir(UPLOADS_DIR);
    total = files.length;

    if (total === 0) {
      logger.log('CLEANUP', '📁 Uploads directory is empty');
      return { cleaned, failed, total };
    }

    logger.log('CLEANUP', `🔍 Checking ${total} files for cleanup...`);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      
      try {
        const stats = await stat(filePath);
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > MAX_FILE_AGE_MS) {
          const success = await cleanupFile(filePath);
          if (success) {
            cleaned++;
          } else {
            failed++;
          }
        }
      } catch (error) {
        logger.warn('CLEANUP', `⚠️  Failed to check file ${file}: ${error}`);
        failed++;
      }
    }

    if (cleaned > 0 || failed > 0) {
      logger.log('CLEANUP', `📊 Cleanup complete: ${cleaned} cleaned, ${failed} failed, ${total - cleaned - failed} kept`);
    } else {
      logger.log('CLEANUP', '✨ No old files found for cleanup');
    }

  } catch (error) {
    logger.error('CLEANUP', `❌ Failed to read uploads directory: ${error}`);
  }

  return { cleaned, failed, total };
}

/**
 * Clean up all files in the uploads directory (force cleanup)
 */
export async function cleanupAllFiles(): Promise<{ cleaned: number; failed: number; total: number }> {
  let cleaned = 0;
  let failed = 0;
  let total = 0;

  try {
    const files = await readdir(UPLOADS_DIR);
    total = files.length;

    if (total === 0) {
      logger.log('CLEANUP', '📁 Uploads directory is empty');
      return { cleaned, failed, total };
    }

    logger.log('CLEANUP', `🧹 Force cleaning ${total} files...`);

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const success = await cleanupFile(filePath);
      if (success) {
        cleaned++;
      } else {
        failed++;
      }
    }

    logger.log('CLEANUP', `📊 Force cleanup complete: ${cleaned} cleaned, ${failed} failed`);

  } catch (error) {
    logger.error('CLEANUP', `❌ Failed to read uploads directory: ${error}`);
  }

  return { cleaned, failed, total };
}

/**
 * Start periodic cleanup task
 */
export function startPeriodicCleanup(): NodeJS.Timeout {
  logger.log('CLEANUP', `🔄 Starting periodic cleanup (every ${CLEANUP_INTERVAL_MS / 60000} minutes)`);
  
  // Run initial cleanup
  cleanupOldFiles();
  
  // Set up periodic cleanup
  return setInterval(() => {
    cleanupOldFiles();
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Stop periodic cleanup task
 */
export function stopPeriodicCleanup(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  logger.log('CLEANUP', '⏹️  Stopped periodic cleanup');
}

/**
 * Get cleanup statistics
 */
export async function getCleanupStats(): Promise<{
  totalFiles: number;
  oldFiles: number;
  totalSize: number;
  oldSize: number;
}> {
  let totalFiles = 0;
  let oldFiles = 0;
  let totalSize = 0;
  let oldSize = 0;

  try {
    const files = await readdir(UPLOADS_DIR);
    totalFiles = files.length;
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      
      try {
        const stats = await stat(filePath);
        const fileAge = now - stats.mtime.getTime();
        
        totalSize += stats.size;
        
        if (fileAge > MAX_FILE_AGE_MS) {
          oldFiles++;
          oldSize += stats.size;
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

  } catch (error) {
    logger.error('CLEANUP', `❌ Failed to get cleanup stats: ${error}`);
  }

  return { totalFiles, oldFiles, totalSize, oldSize };
}
