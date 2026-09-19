/**
 * Structured Logger
 * Provides structured, JSON-formatted logging for observability.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  incidentId?: string;
  requestId?: string;
  workflowStep?: string;
  toolName?: string;
  status?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  withContext(extra: LogContext): Logger {
    return new Logger({ ...this.context, ...extra });
  }

  debug(message: string, data?: LogContext): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: LogContext): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: LogContext): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: LogContext): void {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: LogContext): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    switch (level) {
      case 'debug':
        console.debug(JSON.stringify(entry));
        break;
      case 'info':
        console.info(JSON.stringify(entry));
        break;
      case 'warn':
        console.warn(JSON.stringify(entry));
        break;
      case 'error':
        console.error(JSON.stringify(entry));
        break;
    }
  }
}

export const logger = new Logger();
