import { Controller, Get, Param } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { RedisService } from '@redis/redis';
import { SecurityMonitorService } from '../../common/monitoring/security-monitor.service';
import { ConfigService } from '@nestjs/config';
import { ApiUsageAnalyticsService } from './api-usage-analytics.service';
import * as os from 'os';
import * as process from 'process';

@ApiTags('Health Management | Monitoring')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redisService: RedisService,
    private readonly securityMonitor: SecurityMonitorService,
    private readonly configService: ConfigService,
    private readonly apiUsageAnalytics: ApiUsageAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            memory_heap: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            memory_rss: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            disk: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
            redis: {
              type: 'object',
              properties: { status: { type: 'string' } },
            },
          },
        },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
  })
  @HealthCheck()
  async check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),

      // Memory health checks
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024), // 300MB threshold
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024), // 500MB threshold

      // Disk health check
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9, // Alert if disk usage exceeds 90%
        }),

      // Redis health check (custom)
      async () => {
        const isConnected = this.redisService.isRedisConnected();
        if (!isConnected) {
          throw new Error('Redis is not connected');
        }

        try {
          const pingResult = await this.redisService.ping();
          if (pingResult !== 'PONG') {
            throw new Error('Redis ping failed');
          }
          return {
            redis: {
              status: 'up',
              message: 'Redis is healthy',
            },
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Redis health check failed: ${message}`);
        }
      },
    ]);
  }

  @Get('liveness')
  @ApiOperation({
    summary: 'Liveness probe - indicates if the service is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  @ApiOperation({
    summary:
      'Readiness probe - indicates if the service is ready to accept traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  @HealthCheck()
  async readiness() {
    return this.health.check([
      // Database readiness
      () => this.db.pingCheck('database'),

      // Redis readiness
      async () => {
        const isConnected = this.redisService.isRedisConnected();
        if (!isConnected) {
          throw new Error('Redis is not connected');
        }
        await this.redisService.ping();
        return {
          redis: {
            status: 'up',
          },
        };
      },
    ]);
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check with monitoring information',
    description:
      'Returns comprehensive health and monitoring information including database, Redis, memory, disk, performance metrics, and security alerts. No sensitive data is exposed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600000 },
        environment: { type: 'string', example: 'production' },
        application: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Meta EN|IX API' },
            version: { type: 'string', example: '1.0.0' },
            nodeVersion: { type: 'string', example: 'v18.0.0' },
            platform: { type: 'string', example: 'linux' },
          },
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'up' },
            responseTime: { type: 'number', example: 5 },
            type: { type: 'string', example: 'postgresql' },
          },
        },
        redis: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'up' },
            responseTime: { type: 'number', example: 2 },
            connected: { type: 'boolean', example: true },
          },
        },
        memory: {
          type: 'object',
          properties: {
            heap: {
              type: 'object',
              properties: {
                used: { type: 'number', example: 52428800 },
                total: { type: 'number', example: 104857600 },
                limit: { type: 'number', example: 314572800 },
                usagePercent: { type: 'number', example: 50.0 },
              },
            },
            rss: {
              type: 'object',
              properties: {
                used: { type: 'number', example: 104857600 },
                limit: { type: 'number', example: 524288000 },
                usagePercent: { type: 'number', example: 20.0 },
              },
            },
            system: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 8589934592 },
                free: { type: 'number', example: 4294967296 },
                usagePercent: { type: 'number', example: 50.0 },
              },
            },
          },
        },
        disk: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'up' },
            path: { type: 'string', example: '/' },
            total: { type: 'number', example: 85899345920 },
            free: { type: 'number', example: 42949672960 },
            used: { type: 'number', example: 42949672960 },
            usagePercent: { type: 'number', example: 50.0 },
            threshold: { type: 'number', example: 90.0 },
          },
        },
        performance: {
          type: 'object',
          properties: {
            slowRequestsCount: { type: 'number', example: 0 },
            errorRate: { type: 'number', example: 0.01 },
            averageResponseTime: { type: 'number', example: 150 },
          },
        },
        security: {
          type: 'object',
          properties: {
            activeAlertsCount: { type: 'number', example: 0 },
            recentEventsCount: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async detailed() {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    const nodeVersion = process.version;
    const platform = os.platform();

    // Get memory usage
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const heapLimit = 300 * 1024 * 1024; // 300MB threshold
    const rssUsed = memUsage.rss;
    const rssLimit = 500 * 1024 * 1024; // 500MB threshold

    // Get system memory
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Get disk usage
    const diskUsage = await this.getDiskUsage();

    // Database health check with timing
    const dbStartTime = Date.now();
    let dbStatus = 'unknown';
    let dbResponseTime = 0;
    try {
      await this.db.pingCheck('database');
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'up';
    } catch (error) {
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'down';
    }

    // Redis health check with timing
    const redisStartTime = Date.now();
    let redisStatus = 'unknown';
    let redisResponseTime = 0;
    let redisConnected = false;
    try {
      const isConnected = this.redisService.isRedisConnected();
      redisConnected = isConnected;
      if (isConnected) {
        await this.redisService.ping();
        redisResponseTime = Date.now() - redisStartTime;
        redisStatus = 'up';
      } else {
        redisStatus = 'down';
      }
    } catch (error) {
      redisResponseTime = Date.now() - redisStartTime;
      redisStatus = 'down';
    }

    // Get performance summary (without sensitive data)
    const performanceSummary = await this.getPerformanceSummary();

    // Get security summary (without sensitive data)
    const securitySummary = await this.getSecuritySummary();

    return {
      status: dbStatus === 'up' && redisStatus === 'up' ? 'ok' : 'degraded',
      timestamp,
      uptime,
      environment,
      application: {
        name: 'Meta EN|IX API',
        version: '1.0.0',
        nodeVersion,
        platform,
      },
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        type: 'postgresql',
      },
      redis: {
        status: redisStatus,
        responseTime: redisResponseTime,
        connected: redisConnected,
      },
      memory: {
        heap: {
          used: heapUsed,
          total: heapTotal,
          limit: heapLimit,
          usagePercent: Math.round((heapUsed / heapLimit) * 100 * 100) / 100,
        },
        rss: {
          used: rssUsed,
          limit: rssLimit,
          usagePercent: Math.round((rssUsed / rssLimit) * 100 * 100) / 100,
        },
        system: {
          total: totalMemory,
          free: freeMemory,
          usagePercent: Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
        },
      },
      disk: diskUsage,
      performance: performanceSummary,
      security: securitySummary,
    };
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage(): Promise<{
    status: string;
    path: string;
    total: number;
    free: number;
    used: number;
    usagePercent: number;
    threshold: number;
  }> {
    try {
      // Check disk storage health (throws if threshold exceeded)
      await this.disk.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.9,
      });

      // Note: Terminus doesn't expose detailed disk info
      // For actual disk space, we'd need fs.statfs or similar library
      // For now, return safe defaults indicating disk is healthy
      return {
        status: 'up',
        path: '/',
        total: 0, // Would need fs.statfs to get actual disk space
        free: 0,
        used: 0,
        usagePercent: 0,
        threshold: 90.0,
      };
    } catch (error) {
      return {
        status: 'down',
        path: '/',
        total: 0,
        free: 0,
        used: 0,
        usagePercent: 0,
        threshold: 90.0,
      };
    }
  }

  /**
   * Get performance summary (without sensitive data)
   */
  private async getPerformanceSummary(): Promise<{
    slowRequestsCount: number;
    errorRate: number;
    averageResponseTime: number;
  }> {
    try {
      // Get performance stats from Redis (if available)
      // This is a simplified version - in production, you'd aggregate stats
      return {
        slowRequestsCount: 0, // Would need to query Redis for actual count
        errorRate: 0.0, // Would need to calculate from metrics
        averageResponseTime: 0, // Would need to calculate from metrics
      };
    } catch (error) {
      return {
        slowRequestsCount: 0,
        errorRate: 0.0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Get security summary (without sensitive data)
   */
  private async getSecuritySummary(): Promise<{
    activeAlertsCount: number;
    recentEventsCount: number;
  }> {
    try {
      const activeAlerts = await this.securityMonitor.getActiveAlerts();
      return {
        activeAlertsCount: activeAlerts.length,
        recentEventsCount: 0, // Would need to query Redis for actual count
      };
    } catch (error) {
      return {
        activeAlertsCount: 0,
        recentEventsCount: 0,
      };
    }
  }

  @Get('api-usage')
  @ApiOperation({
    summary: 'Get API usage analytics',
    description:
      'Returns API usage analytics including endpoint popularity, response times, error rates, and usage patterns. This data helps with optimization and capacity planning.',
  })
  @ApiResponse({
    status: 200,
    description: 'API usage analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalEndpoints: { type: 'number', example: 45 },
        totalRequests: { type: 'number', example: 125000 },
        averageResponseTime: { type: 'number', example: 150 },
        totalErrors: { type: 'number', example: 1250 },
        errorRate: { type: 'number', example: 1.0 },
        slowEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', example: '/v1/posts/upload' },
              method: { type: 'string', example: 'POST' },
              avgDuration: { type: 'number', example: 2500 },
              requestCount: { type: 'number', example: 150 },
            },
          },
        },
        topEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', example: '/v1/posts' },
              method: { type: 'string', example: 'GET' },
              requestCount: { type: 'number', example: 50000 },
              avgDuration: { type: 'number', example: 120 },
              errorRate: { type: 'number', example: 0.5 },
            },
          },
        },
        errorEndpoints: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              endpoint: { type: 'string', example: '/v1/auth/login' },
              method: { type: 'string', example: 'POST' },
              errorRate: { type: 'number', example: 10.5 },
              errorCount: { type: 'number', example: 500 },
            },
          },
        },
      },
    },
  })
  async getApiUsage() {
    return await this.apiUsageAnalytics.getUsageSummary();
  }

  @Get('api-usage/endpoint/:method/:endpoint')
  @ApiOperation({
    summary: 'Get performance statistics for a specific endpoint',
    description:
      'Returns detailed performance statistics for a specific API endpoint including response times, error rates, and percentiles.',
  })
  @ApiParam({
    name: 'method',
    description: 'HTTP method (GET, POST, PUT, DELETE, etc.)',
    type: 'string',
    example: 'GET',
  })
  @ApiParam({
    name: 'endpoint',
    description: 'API endpoint path',
    type: 'string',
    example: '/v1/posts',
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoint statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        endpoint: { type: 'string', example: '/v1/posts' },
        method: { type: 'string', example: 'GET' },
        avgDuration: { type: 'number', example: 120 },
        minDuration: { type: 'number', example: 50 },
        maxDuration: { type: 'number', example: 500 },
        requestCount: { type: 'number', example: 50000 },
        errorCount: { type: 'number', example: 250 },
        errorRate: { type: 'number', example: 0.005 },
        p50: { type: 'number', example: 100 },
        p95: { type: 'number', example: 300 },
        p99: { type: 'number', example: 450 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Endpoint statistics not found',
  })
  async getEndpointStats(
    @Param('method') method: string,
    @Param('endpoint') endpoint: string,
  ) {
    const stats = await this.apiUsageAnalytics.getEndpointStats(method, endpoint);
    if (!stats) {
      return {
        message: 'No statistics available for this endpoint',
        endpoint,
        method,
      };
    }
    return stats;
  }
}
