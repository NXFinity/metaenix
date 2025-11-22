import { Module } from '@nestjs/common';
import { PerformanceMonitorService } from './performance-monitor.service';
import { SecurityMonitorService } from './security-monitor.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { RedisModule } from '@redis/redis';
import { LoggingModule } from '@logging/logging';

@Module({
  imports: [RedisModule, LoggingModule],
  providers: [
    PerformanceMonitorService,
    SecurityMonitorService,
    LoggingInterceptor,
    PerformanceInterceptor,
  ],
  exports: [
    PerformanceMonitorService,
    SecurityMonitorService,
    LoggingInterceptor,
    PerformanceInterceptor,
  ],
})
export class MonitoringModule {}

