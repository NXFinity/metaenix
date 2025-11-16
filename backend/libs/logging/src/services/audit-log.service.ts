import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { LogLevel } from '../enums/log-level.enum';
import { LogCategory } from '../enums/log-category.enum';
import { LogOptions } from '../interfaces/log-options.interface';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Save audit log to database
   */
  async saveAuditLog(options: LogOptions & { message: string }): Promise<AuditLog | null> {
    try {
      const auditLog = this.auditLogRepository.create({
        level: options.level || LogLevel.INFO,
        category: options.category || LogCategory.OTHER,
        message: options.message,
        details: options.metadata ? JSON.stringify(options.metadata) : null,
        userId: options.userId || null,
        username: options.username || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
        requestId: options.requestId || null,
        endpoint: options.endpoint || null,
        method: options.method || null,
        statusCode: options.statusCode || null,
        metadata: options.metadata || null,
        error: options.error
          ? {
              name: options.error.name,
              message: options.error.message,
              stack: options.error.stack,
              code: (options.error as any).code,
            }
          : null,
      });

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Don't throw - logging failures shouldn't break the app
      // Use Winston logger directly to avoid circular dependency with LoggingService
      // This is a fallback when LoggingService itself fails
      const winston = require('winston');
      const fallbackLogger = winston.createLogger({
        level: 'error',
        transports: [new winston.transports.Console()],
      });
      fallbackLogger.error('Failed to save audit log to database:', error);
      return null;
    }
  }

  /**
   * Find audit logs by user ID
   */
  async findByUserId(
    userId: string,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { dateCreated: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by category
   */
  async findByCategory(
    category: LogCategory,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { category },
      order: { dateCreated: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs by level
   */
  async findByLevel(
    level: LogLevel,
    limit: number = 100,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { level },
      order: { dateCreated: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find audit logs with filters
   */
  async findWithFilters(filters: {
    userId?: string;
    category?: LogCategory;
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('auditLog');

    if (filters.userId) {
      query.andWhere('auditLog.userId = :userId', { userId: filters.userId });
    }

    if (filters.category) {
      query.andWhere('auditLog.category = :category', {
        category: filters.category,
      });
    }

    if (filters.level) {
      query.andWhere('auditLog.level = :level', { level: filters.level });
    }

    if (filters.startDate) {
      query.andWhere('auditLog.dateCreated >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('auditLog.dateCreated <= :endDate', {
        endDate: filters.endDate,
      });
    }

    query.orderBy('auditLog.dateCreated', 'DESC');
    query.take(filters.limit || 100);

    return query.getMany();
  }
}

