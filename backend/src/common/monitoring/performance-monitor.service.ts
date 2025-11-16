import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { LoggingService, LogCategory } from '@logging/logging';

export interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  userId?: string;
}

export interface PerformanceStats {
  endpoint: string;
  method: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  requestCount: number;
  errorCount: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly METRICS_TTL = 3600; // 1 hour
  private readonly STATS_TTL = 86400; // 24 hours
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private readonly ERROR_RATE_THRESHOLD = 0.1; // 10%

  constructor(
    private readonly redisService: RedisService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const key = `perf:metric:${metric.method}:${metric.endpoint}`;
      const timestamp = metric.timestamp.getTime();

      // Store individual metric (with TTL)
      // Note: redisService.set() automatically stringifies objects
      await this.redisService.set(
        `perf:metric:${timestamp}:${key}`,
        metric,
        this.METRICS_TTL,
      );

      // Update statistics
      await this.updateStats(metric);

      // Check for slow requests
      if (metric.duration > this.SLOW_REQUEST_THRESHOLD) {
        await this.handleSlowRequest(metric);
      }

      // Check for errors
      if (metric.statusCode >= 400) {
        await this.handleError(metric);
      }
    } catch (error) {
      this.logger.error('Failed to record performance metric', error);
    }
  }

  /**
   * Update performance statistics
   */
  private async updateStats(metric: PerformanceMetric): Promise<void> {
    const statsKey = `perf:stats:${metric.method}:${metric.endpoint}`;
    const stats = await this.redisService.get<PerformanceStats>(statsKey);

    if (!stats) {
      // Initialize stats
      const newStats: PerformanceStats = {
        endpoint: metric.endpoint,
        method: metric.method,
        avgDuration: metric.duration,
        minDuration: metric.duration,
        maxDuration: metric.duration,
        requestCount: 1,
        errorCount: metric.statusCode >= 400 ? 1 : 0,
        errorRate: metric.statusCode >= 400 ? 1 : 0,
        p50: metric.duration,
        p95: metric.duration,
        p99: metric.duration,
      };
      // Note: redisService.set() automatically stringifies objects
      await this.redisService.set(statsKey, newStats, this.STATS_TTL);
      return;
    }

    // Update stats
    stats.requestCount += 1;
    stats.avgDuration =
      (stats.avgDuration * (stats.requestCount - 1) + metric.duration) /
      stats.requestCount;
    stats.minDuration = Math.min(stats.minDuration, metric.duration);
    stats.maxDuration = Math.max(stats.maxDuration, metric.duration);

    if (metric.statusCode >= 400) {
      stats.errorCount += 1;
    }
    stats.errorRate = stats.errorCount / stats.requestCount;

    // Update percentiles (simplified - in production, use proper percentile calculation)
    if (metric.duration > stats.p99) {
      stats.p99 = metric.duration;
    } else if (metric.duration > stats.p95) {
      stats.p95 = metric.duration;
    } else if (metric.duration > stats.p50) {
      stats.p50 = metric.duration;
    }

    // Note: redisService.set() automatically stringifies objects
    await this.redisService.set(statsKey, stats, this.STATS_TTL);
  }

  /**
   * Handle slow request alert
   */
  private async handleSlowRequest(metric: PerformanceMetric): Promise<void> {
    const alertKey = `perf:alert:slow:${metric.method}:${metric.endpoint}`;
    const alertCount = await this.redisService.get<number>(alertKey) || 0;

    await this.redisService.set(alertKey, alertCount + 1, 300); // 5 minutes

    // Log slow request
    this.loggingService.warn(
      `Slow request detected: ${metric.method} ${metric.endpoint} took ${metric.duration}ms`,
      'PerformanceMonitorService',
      {
        category: LogCategory.SYSTEM,
        metadata: {
          endpoint: metric.endpoint,
          method: metric.method,
          duration: metric.duration,
          statusCode: metric.statusCode,
          userId: metric.userId,
        },
      },
    );

    // Alert if threshold exceeded (e.g., 10 slow requests in 5 minutes)
    if (alertCount + 1 >= 10) {
      this.logger.error(
        `Performance alert: ${metric.method} ${metric.endpoint} has ${alertCount + 1} slow requests in 5 minutes`,
      );
    }
  }

  /**
   * Handle error alert
   */
  private async handleError(metric: PerformanceMetric): Promise<void> {
    const errorKey = `perf:error:${metric.method}:${metric.endpoint}:${metric.statusCode}`;
    const errorCount = await this.redisService.get<number>(errorKey) || 0;

    await this.redisService.set(errorKey, errorCount + 1, 300); // 5 minutes

    // Alert if error rate threshold exceeded
    const statsKey = `perf:stats:${metric.method}:${metric.endpoint}`;
    const stats = await this.redisService.get<PerformanceStats>(statsKey);

    if (stats && stats.errorRate > this.ERROR_RATE_THRESHOLD) {
      this.logger.error(
        `High error rate detected: ${metric.method} ${metric.endpoint} has ${(stats.errorRate * 100).toFixed(2)}% error rate`,
      );
    }
  }

  /**
   * Get performance statistics for an endpoint
   */
  async getStats(
    method: string,
    endpoint: string,
  ): Promise<PerformanceStats | null> {
    const statsKey = `perf:stats:${method}:${endpoint}`;
    return await this.redisService.get<PerformanceStats>(statsKey);
  }

  /**
   * Get all performance statistics
   */
  async getAllStats(): Promise<PerformanceStats[]> {
    // In production, use Redis SCAN to get all stats keys
    // For now, return empty array (implement based on your Redis pattern)
    return [];
  }
}

