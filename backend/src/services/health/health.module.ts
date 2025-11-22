import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseModule } from '@database/database';
import { RedisModule } from '@redis/redis';
import { MonitoringModule } from '../../common/monitoring/monitoring.module';
import { ApiUsageAnalyticsService } from './api-usage-analytics.service';

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
    RedisModule,
    MonitoringModule,
  ],
  controllers: [HealthController],
  providers: [ApiUsageAnalyticsService],
  exports: [ApiUsageAnalyticsService],
})
export class HealthModule {}
