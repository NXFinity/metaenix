import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logRequests: boolean;

  constructor(
    private readonly loggingService: LoggingService,
    private readonly configService: ConfigService,
  ) {
    // Only log requests in development or if explicitly enabled
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.logRequests = 
      nodeEnv === 'development' || 
      this.configService.get<string>('LOG_REQUESTS', 'false') === 'true';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.logRequests) {
      // Skip logging if disabled
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    const userId = (request as any).user?.id || (request as any).session?.user?.id;
    const username = (request as any).user?.username || (request as any).session?.user?.username;
    const requestId = (request as any).requestId || (request as any).correlationId;

    // Log request (using debug level to avoid console noise, but still saved to logging system)
    this.loggingService.debug(
      `${method} ${endpoint}`,
      'LoggingInterceptor',
      {
        category: LogCategory.API,
        userId,
        username,
        ipAddress: request.ip || request.socket.remoteAddress,
        userAgent: request.get('user-agent'),
        endpoint: request.url,
        method: request.method,
        metadata: {
          requestId,
          path: request.path,
          query: request.query,
          // Only log body for non-GET requests and exclude sensitive fields
          body: this.sanitizeRequestBody(request),
        },
      },
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          
          // Log successful response (using debug level to avoid console noise, but still saved to logging system)
          const requestId = (request as any).requestId || (request as any).correlationId;
          this.loggingService.debug(
            `${method} ${endpoint} - ${response.statusCode} (${duration}ms)`,
            'LoggingInterceptor',
            {
              category: LogCategory.API,
              userId,
              username,
              ipAddress: request.ip || request.socket.remoteAddress,
              userAgent: request.get('user-agent'),
              endpoint: request.url,
              method: request.method,
              statusCode: response.statusCode,
              metadata: {
                requestId,
                duration,
                responseSize: this.getResponseSize(data),
              },
            },
          );
        },
        // Errors are already logged by HttpExceptionFilter and AllExceptionsFilter
        // No need to log them here to avoid duplicate logging
      }),
    );
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeRequestBody(request: Request): any {
    if (request.method === 'GET' || !request.body) {
      return undefined;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const body = { ...request.body };

    for (const field of sensitiveFields) {
      if (body[field]) {
        body[field] = '[REDACTED]';
      }
    }

    return body;
  }

  /**
   * Estimate response size
   */
  private getResponseSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }
}

