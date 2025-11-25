import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminGuard } from 'src/security/auth/guards/admin.guard';
import { TrackingService } from './services/tracking/tracking.service';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { RedisService } from '@redis/redis';

@ApiTags('Administration | Dashboard')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redisService: RedisService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get platform-wide statistics',
    description: 'Returns platform statistics for admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  getStats() {
    return this.trackingService.getStats();
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Get recent platform activity',
    description: 'Returns recent user registrations and content creation activity',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity retrieved successfully',
  })
  getActivity() {
    return this.trackingService.getActivity({ page: 1, limit: 20 }, 7);
  }

  @Get('stats/growth')
  @ApiOperation({
    summary: 'Get growth metrics',
    description: 'Returns growth metrics for users, content, and engagement. Also available at /v1/admin/analytics/growth',
  })
  @ApiResponse({
    status: 200,
    description: 'Growth metrics retrieved successfully',
  })
  getGrowthMetrics() {
    // Redirect to analytics service endpoint
    // This endpoint is also available at /v1/admin/analytics/growth
    return { message: 'Use /v1/admin/analytics/growth for growth metrics' };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get system health status',
    description: 'Returns detailed system health information (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  @HealthCheck()
  getHealth() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      async () => {
        // Check if Redis is connected first
        if (!this.redisService.isRedisConnected()) {
          throw new Error('Redis is not connected');
        }
        
        // Ping Redis to verify it's responding
        const pingResult = await this.redisService.ping();
        if (pingResult !== 'PONG') {
          throw new Error('Redis ping failed');
        }
        
        return { redis: { status: 'up' } };
      },
    ]);
  }
}
