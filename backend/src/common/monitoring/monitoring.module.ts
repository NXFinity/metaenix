import { Module } from '@nestjs/common';
import { PerformanceMonitorService } from './performance-monitor.service';
import { SecurityMonitorService } from './security-monitor.service';
import { RedisModule } from '@redis/redis';

@Module({
  imports: [RedisModule],
  providers: [PerformanceMonitorService, SecurityMonitorService],
  exports: [PerformanceMonitorService, SecurityMonitorService],
})
export class MonitoringModule {}

