import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { LoggingService, LogCategory, AuditLogService, LogLevel } from '@logging/logging';

export interface SecurityEvent {
  type: 'failed_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | '2fa_failed' | 'password_reset' | 'account_locked';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface SecurityAlert {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  metadata: Record<string, any>;
}

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);
  private readonly ALERT_TTL = 3600; // 1 hour
  private readonly EVENT_TTL = 86400; // 24 hours

  // Thresholds for alerts
  private readonly FAILED_LOGIN_THRESHOLD = 5; // 5 failed logins in 15 minutes
  private readonly RATE_LIMIT_THRESHOLD = 10; // 10 rate limit hits in 15 minutes
  private readonly UNAUTHORIZED_THRESHOLD = 5; // 5 unauthorized attempts in 15 minutes
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 3; // 3 suspicious activities in 1 hour

  constructor(
    private readonly redisService: RedisService,
    private readonly loggingService: LoggingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Record a security event
   */
  async recordEvent(event: SecurityEvent): Promise<void> {
    try {
      const eventKey = `security:event:${event.type}:${event.timestamp.getTime()}`;
      
      // Store event
      // Note: redisService.set() automatically stringifies objects
      await this.redisService.set(
        eventKey,
        event,
        this.EVENT_TTL,
      );

      // Log to audit log
      await this.auditLogService.saveAuditLog({
        message: `Security event: ${event.type}`,
        userId: event.userId,
        category: LogCategory.SECURITY,
        level: this.getLogLevel(event.severity),
        metadata: {
          type: event.type,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          endpoint: event.endpoint,
          details: event.details,
          severity: event.severity,
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        endpoint: event.endpoint,
      });

      // Check for alerts
      await this.checkAlerts(event);

      // Log critical events immediately
      if (event.severity === 'critical') {
        this.logger.error(
          `CRITICAL SECURITY EVENT: ${event.type}`,
          JSON.stringify(event),
        );
      }
    } catch (error) {
      this.logger.error('Failed to record security event', error);
    }
  }

  /**
   * Check if event should trigger an alert
   */
  private async checkAlerts(event: SecurityEvent): Promise<void> {
    const window = this.getAlertWindow(event.type);
    const alertKey = `security:alert:${event.type}:${event.userId || event.ipAddress || 'unknown'}`;
    
    const count = await this.redisService.get<number>(alertKey) || 0;
    await this.redisService.set(alertKey, count + 1, window);

    const threshold = this.getThreshold(event.type);
    
    if (count + 1 >= threshold) {
      await this.createAlert(event, count + 1);
    }
  }

  /**
   * Create a security alert
   */
  private async createAlert(event: SecurityEvent, count: number): Promise<void> {
    const alertKey = `security:alert:active:${event.type}:${event.userId || event.ipAddress || 'unknown'}`;
    const existingAlert = await this.redisService.get<SecurityAlert>(alertKey);

    if (existingAlert) {
      // Update existing alert
      existingAlert.count = count;
      existingAlert.lastOccurrence = event.timestamp;
      // Note: redisService.set() automatically stringifies objects
      await this.redisService.set(alertKey, existingAlert, this.ALERT_TTL);
    } else {
      // Create new alert
      const alert: SecurityAlert = {
        type: event.type,
        message: this.getAlertMessage(event.type, count),
        severity: event.severity,
        count,
        firstOccurrence: event.timestamp,
        lastOccurrence: event.timestamp,
        metadata: {
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          endpoint: event.endpoint,
          details: event.details,
        },
      };

      // Note: redisService.set() automatically stringifies objects
      await this.redisService.set(alertKey, alert, this.ALERT_TTL);

      // Log alert
      this.logger.warn(
        `SECURITY ALERT: ${alert.message}`,
        JSON.stringify(alert),
      );

      // Log to audit log
      await this.auditLogService.saveAuditLog({
        message: `Security alert: ${alert.message}`,
        userId: event.userId,
        category: LogCategory.SECURITY,
        level: this.getLogLevel(event.severity),
        metadata: alert.metadata,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        endpoint: event.endpoint,
      });
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.recordEvent({
      type: 'failed_login',
      ipAddress,
      userAgent,
      endpoint: '/auth/login',
      details: { email },
      severity: 'medium',
      timestamp: new Date(),
    });
  }

  /**
   * Record rate limit exceeded
   */
  async recordRateLimitExceeded(
    endpoint: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.recordEvent({
      type: 'rate_limit_exceeded',
      userId,
      ipAddress,
      endpoint,
      severity: 'low',
      timestamp: new Date(),
    });
  }

  /**
   * Record unauthorized access attempt
   */
  async recordUnauthorizedAccess(
    endpoint: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.recordEvent({
      type: 'unauthorized_access',
      userId,
      ipAddress,
      userAgent,
      endpoint,
      severity: 'high',
      timestamp: new Date(),
    });
  }

  /**
   * Record 2FA failure
   */
  async record2faFailure(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.recordEvent({
      type: '2fa_failed',
      userId,
      ipAddress,
      userAgent,
      endpoint: '/auth/login/verify-2fa',
      severity: 'high',
      timestamp: new Date(),
    });
  }

  /**
   * Record suspicious activity
   */
  async recordSuspiciousActivity(
    activity: string,
    userId?: string,
    ipAddress?: string,
    details?: Record<string, any>,
  ): Promise<void> {
    await this.recordEvent({
      type: 'suspicious_activity',
      userId,
      ipAddress,
      details: { activity, ...details },
      severity: 'high',
      timestamp: new Date(),
    });
  }

  /**
   * Get active security alerts
   */
  async getActiveAlerts(): Promise<SecurityAlert[]> {
    // In production, use Redis SCAN to get all active alerts
    // For now, return empty array (implement based on your Redis pattern)
    return [];
  }

  /**
   * Get alert threshold for event type
   */
  private getThreshold(type: SecurityEvent['type']): number {
    switch (type) {
      case 'failed_login':
        return this.FAILED_LOGIN_THRESHOLD;
      case 'rate_limit_exceeded':
        return this.RATE_LIMIT_THRESHOLD;
      case 'unauthorized_access':
        return this.UNAUTHORIZED_THRESHOLD;
      case 'suspicious_activity':
        return this.SUSPICIOUS_ACTIVITY_THRESHOLD;
      default:
        return 5;
    }
  }

  /**
   * Get alert window (in seconds) for event type
   */
  private getAlertWindow(type: SecurityEvent['type']): number {
    switch (type) {
      case 'failed_login':
      case 'rate_limit_exceeded':
      case 'unauthorized_access':
        return 900; // 15 minutes
      case 'suspicious_activity':
        return 3600; // 1 hour
      default:
        return 900;
    }
  }

  /**
   * Get alert message
   */
  private getAlertMessage(type: SecurityEvent['type'], count: number): string {
    switch (type) {
      case 'failed_login':
        return `${count} failed login attempts detected`;
      case 'rate_limit_exceeded':
        return `${count} rate limit violations detected`;
      case 'unauthorized_access':
        return `${count} unauthorized access attempts detected`;
      case '2fa_failed':
        return `${count} 2FA verification failures detected`;
      case 'suspicious_activity':
        return `${count} suspicious activities detected`;
      default:
        return `${count} security events of type ${type} detected`;
    }
  }

  /**
   * Get log level from severity
   */
  private getLogLevel(severity: SecurityEvent['severity']): LogLevel {
    switch (severity) {
      case 'low':
        return LogLevel.INFO;
      case 'medium':
        return LogLevel.WARN;
      case 'high':
        return LogLevel.ERROR;
      case 'critical':
        return LogLevel.CRITICAL;
      default:
        return LogLevel.INFO;
    }
  }
}

