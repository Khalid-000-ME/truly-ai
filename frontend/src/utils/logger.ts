import { writeFileSync, appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const LOG_FILE_PATH = join(process.cwd(), 'logs.txt');
const MAX_LOG_LINES = 1000;

class Logger {
  private static instance: Logger;
  
  private constructor() {
    // Initialize log file
    if (!existsSync(LOG_FILE_PATH)) {
      writeFileSync(LOG_FILE_PATH, '');
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, route: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${route}] ${message}\n`;
  }

  private checkAndClearLogFile(): void {
    try {
      if (existsSync(LOG_FILE_PATH)) {
        const logContent = readFileSync(LOG_FILE_PATH, 'utf-8');
        const lineCount = logContent.split('\n').length - 1; // Subtract 1 for empty last line
        
        if (lineCount >= MAX_LOG_LINES) {
          const clearMessage = this.formatMessage('SYSTEM', 'LOGGER', `Log file cleared - reached ${lineCount} lines (max: ${MAX_LOG_LINES})`);
          writeFileSync(LOG_FILE_PATH, clearMessage);
          console.log(`🧹 Log file cleared - reached ${lineCount} lines (max: ${MAX_LOG_LINES})`);
        }
      }
    } catch (error) {
      console.error('Error checking log file size:', error);
    }
  }

  public log(route: string, message: string): void {
    this.checkAndClearLogFile();
    const formattedMessage = this.formatMessage('INFO', route, message);
    appendFileSync(LOG_FILE_PATH, formattedMessage);
    // Also log to console for immediate feedback during development
    console.log(`[${route}] ${message}`);
  }

  public error(route: string, message: string, error?: any): void {
    this.checkAndClearLogFile();
    const errorDetails = error ? ` | Error: ${error instanceof Error ? error.message : JSON.stringify(error)}` : '';
    const formattedMessage = this.formatMessage('ERROR', route, message + errorDetails);
    appendFileSync(LOG_FILE_PATH, formattedMessage);
    console.error(`[${route}] ${message}`, error);
  }

  public warn(route: string, message: string): void {
    this.checkAndClearLogFile();
    const formattedMessage = this.formatMessage('WARN', route, message);
    appendFileSync(LOG_FILE_PATH, formattedMessage);
    console.warn(`[${route}] ${message}`);
  }

  public json(route: string, label: string, data: any): void {
    this.checkAndClearLogFile();
    const jsonString = JSON.stringify(data, null, 2);
    const message = `${label}:\n${jsonString}`;
    const formattedMessage = this.formatMessage('JSON', route, message);
    appendFileSync(LOG_FILE_PATH, formattedMessage);
    console.log(`[${route}] ${label}:`, data);
  }

  public separator(route: string, title: string): void {
    this.checkAndClearLogFile();
    const separator = '==========================================';
    const message = `\n${separator}\n${title}\n${separator}`;
    const formattedMessage = this.formatMessage('SEP', route, message);
    appendFileSync(LOG_FILE_PATH, formattedMessage);
    console.log(`\n${separator}\n[${route}] ${title}\n${separator}`);
  }

  public clear(): void {
    writeFileSync(LOG_FILE_PATH, '');
    console.log('Log file cleared');
  }
}

export const logger = Logger.getInstance();
