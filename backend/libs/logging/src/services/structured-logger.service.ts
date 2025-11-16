import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';
import { LogLevel } from '../enums/log-level.enum';
import { LogCategory } from '../enums/log-category.enum';
import { StructuredLog, LogOptions } from '../interfaces/log-options.interface';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly nodeEnv: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    // Create Winston logger
    this.logger = winston.createLogger({
      level: this.nodeEnv === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'metaenix-backend',
        environment: this.nodeEnv,
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format:
            this.nodeEnv === 'production'
              ? winston.format.json()
              : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.printf(
                    ({ timestamp, level, message, ...meta }) => {
                      return `${timestamp} [${level}]: ${message} ${
                        Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                      }`;
                    },
                  ),
                ),
        }),
        // File transport for errors
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // File transport for all logs
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  /**
   * Log a message
   */
  log(message: string, context?: string, options?: LogOptions): void {
    this.logMessage(LogLevel.INFO, message, context, options);
  }

  /**
   * Log an error
   */
  error(message: string, trace?: string, context?: string, options?: LogOptions): void {
    this.logMessage(
      LogLevel.ERROR,
      message,
      context,
      {
        ...options,
        error: trace ? new Error(trace) : options?.error,
      },
    );
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: string, options?: LogOptions): void {
    this.logMessage(LogLevel.WARN, message, context, options);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, options?: LogOptions): void {
    this.logMessage(LogLevel.DEBUG, message, context, options);
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: string, options?: LogOptions): void {
    this.logMessage(LogLevel.DEBUG, message, context, options);
  }

  /**
   * Log an audit event (saves to database)
   */
  audit(
    message: string,
    category: LogCategory,
    options?: LogOptions,
  ): void {
    this.logMessage(LogLevel.AUDIT, message, undefined, {
      ...options,
      category,
      saveToDatabase: true,
    });
  }

  /**
   * Log a critical error (saves to database)
   */
  critical(message: string, error?: Error, options?: LogOptions): void {
    this.logMessage(LogLevel.CRITICAL, message, undefined, {
      ...options,
      category: LogCategory.SYSTEM,
      error,
      saveToDatabase: true,
    });
  }

  /**
   * Internal method to log messages
   */
  private logMessage(
    level: LogLevel,
    message: string,
    context?: string,
    options?: LogOptions,
  ): void {
    const structuredLog: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      category: options?.category || LogCategory.OTHER,
      message,
      details: options?.metadata ? JSON.stringify(options.metadata) : undefined,
      userId: options?.userId,
      username: options?.username,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      requestId: options?.requestId,
      endpoint: options?.endpoint,
      method: options?.method,
      statusCode: options?.statusCode,
      metadata: options?.metadata,
      error: options?.error
        ? {
            name: options.error.name,
            message: options.error.message,
            stack: options.error.stack,
            code: (options.error as any).code,
          }
        : undefined,
    };

    // Log to Winston (file/console)
    const winstonLevel = level === LogLevel.AUDIT ? 'info' : level;
    this.logger.log(winstonLevel, message, {
      context,
      ...structuredLog,
    });

    // Save to database if it's an audit log, critical error, or explicitly requested
    if (
      options?.saveToDatabase ||
      level === LogLevel.AUDIT ||
      level === LogLevel.CRITICAL ||
      (level === LogLevel.ERROR && options?.error)
    ) {
      // Don't await - fire and forget to avoid blocking
      this.auditLogService
        .saveAuditLog({
          level,
          message,
          ...options,
        })
        .catch((err) => {
          // Only log to Winston directly if database save fails (avoid circular dependency)
          // This is a fallback when LoggingService itself fails
          this.logger.error('Failed to save audit log:', err);
        });
    }
  }
}

