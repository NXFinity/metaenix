import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RedisService } from '@redis/redis';

@ApiTags('Health Management | Monitoring')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly redisService: RedisService,
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
          throw new Error(`Redis health check failed: ${error.message}`);
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
}
