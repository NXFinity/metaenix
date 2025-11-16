import { Injectable } from '@nestjs/common';
import { StructuredLoggerService } from './services/structured-logger.service';
import { AuditLogService } from './services/audit-log.service';
import { LogCategory } from './enums/log-category.enum';
import { LogOptions } from './interfaces/log-options.interface';

@Injectable()
export class LoggingService {
  constructor(
    private readonly structuredLogger: StructuredLoggerService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Log a message
   */
  log(message: string, context?: string, options?: LogOptions): void {
    this.structuredLogger.log(message, context, options);
  }

  /**
   * Log an error
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    options?: LogOptions,
  ): void {
    this.structuredLogger.error(message, trace, context, options);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: string, options?: LogOptions): void {
    this.structuredLogger.warn(message, context, options);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, options?: LogOptions): void {
    this.structuredLogger.debug(message, context, options);
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: string, options?: LogOptions): void {
    this.structuredLogger.verbose(message, context, options);
  }

  /**
   * Log an audit event (saves to database)
   */
  audit(message: string, category: LogCategory, options?: LogOptions): void {
    this.structuredLogger.audit(message, category, options);
  }

  /**
   * Log a critical error (saves to database)
   */
  critical(message: string, error?: Error, options?: LogOptions): void {
    this.structuredLogger.critical(message, error, options);
  }

  /**
   * Get audit log service for querying logs
   */
  getAuditLogService(): AuditLogService {
    return this.auditLogService;
  }
}
