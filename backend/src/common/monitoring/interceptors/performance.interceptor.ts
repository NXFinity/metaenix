import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceMonitorService, PerformanceMetric } from '../performance-monitor.service';
import { Request } from 'express';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly performanceMonitor: PerformanceMonitorService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    const endpoint = request.route?.path || request.url;
    const method = request.method;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const userId = (request as any).user?.id || (request as any).session?.user?.id;

          const metric: PerformanceMetric = {
            endpoint,
            method,
            duration,
            statusCode: response.statusCode,
            timestamp: new Date(),
            userId,
          };

          // Record metric asynchronously (don't block response)
          this.performanceMonitor.recordMetric(metric).catch(() => {
            // Silently fail - don't break the request
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const userId = (request as any).user?.id || (request as any).session?.user?.id;

          const metric: PerformanceMetric = {
            endpoint,
            method,
            duration,
            statusCode: error.status || response.statusCode || 500,
            timestamp: new Date(),
            userId,
          };

          // Record metric asynchronously
          this.performanceMonitor.recordMetric(metric).catch(() => {
            // Silently fail
          });
        },
      }),
    );
  }
}

