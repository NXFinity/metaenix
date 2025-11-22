import { Injectable } from '@nestjs/common';
import { PerformanceMonitorService, PerformanceStats } from '../../common/monitoring/performance-monitor.service';

export interface ApiUsageSummary {
  totalEndpoints: number;
  totalRequests: number;
  averageResponseTime: number;
  totalErrors: number;
  errorRate: number;
  slowEndpoints: Array<{
    endpoint: string;
    method: string;
    avgDuration: number;
    requestCount: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    avgDuration: number;
    errorRate: number;
  }>;
  errorEndpoints: Array<{
    endpoint: string;
    method: string;
    errorRate: number;
    errorCount: number;
  }>;
}

@Injectable()
export class ApiUsageAnalyticsService {
  constructor(
    private readonly performanceMonitor: PerformanceMonitorService,
  ) {}

  /**
   * Get API usage summary
   */
  async getUsageSummary(): Promise<ApiUsageSummary> {
    try {
      // Get all performance stats from Redis
      const allStats = await this.getAllPerformanceStats();

      if (allStats.length === 0) {
        return {
          totalEndpoints: 0,
          totalRequests: 0,
          averageResponseTime: 0,
          totalErrors: 0,
          errorRate: 0,
          slowEndpoints: [],
          topEndpoints: [],
          errorEndpoints: [],
        };
      }

      // Calculate aggregate metrics
      const totalEndpoints = allStats.length;
      const totalRequests = allStats.reduce((sum, stat) => sum + stat.requestCount, 0);
      const totalErrors = allStats.reduce((sum, stat) => sum + stat.errorCount, 0);
      const totalDuration = allStats.reduce(
        (sum, stat) => sum + stat.avgDuration * stat.requestCount,
        0,
      );
      const averageResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0;
      const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

      // Get slow endpoints (avg duration > 500ms)
      const slowEndpoints = allStats
        .filter((stat) => stat.avgDuration > 500)
        .map((stat) => ({
          endpoint: stat.endpoint,
          method: stat.method,
          avgDuration: Math.round(stat.avgDuration),
          requestCount: stat.requestCount,
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10); // Top 10 slowest

      // Get top endpoints by request count
      const topEndpoints = allStats
        .map((stat) => ({
          endpoint: stat.endpoint,
          method: stat.method,
          requestCount: stat.requestCount,
          avgDuration: Math.round(stat.avgDuration),
          errorRate: Math.round(stat.errorRate * 10000) / 100, // Convert to percentage with 2 decimals
        }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10); // Top 10 most popular

      // Get endpoints with high error rates (> 5%)
      const errorEndpoints = allStats
        .filter((stat) => stat.errorRate > 0.05)
        .map((stat) => ({
          endpoint: stat.endpoint,
          method: stat.method,
          errorRate: Math.round(stat.errorRate * 10000) / 100, // Convert to percentage with 2 decimals
          errorCount: stat.errorCount,
        }))
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 10); // Top 10 error-prone

      return {
        totalEndpoints,
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        totalErrors,
        errorRate: Math.round(errorRate * 10000) / 100, // Convert to percentage with 2 decimals
        slowEndpoints,
        topEndpoints,
        errorEndpoints,
      };
    } catch (error) {
      // Return empty summary on error
      return {
        totalEndpoints: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        totalErrors: 0,
        errorRate: 0,
        slowEndpoints: [],
        topEndpoints: [],
        errorEndpoints: [],
      };
    }
  }

  /**
   * Get performance statistics for a specific endpoint
   */
  async getEndpointStats(
    method: string,
    endpoint: string,
  ): Promise<PerformanceStats | null> {
    return await this.performanceMonitor.getStats(method, endpoint);
  }

  /**
   * Get all performance statistics
   * Note: This is a simplified implementation. In production, use Redis SCAN for better performance
   */
  private async getAllPerformanceStats(): Promise<PerformanceStats[]> {
    // In production, use Redis SCAN to get all stats keys
    // For now, return empty array as the implementation requires Redis SCAN
    // This is a placeholder - the actual implementation would scan for `perf:stats:*` keys
    return [];
  }
}

