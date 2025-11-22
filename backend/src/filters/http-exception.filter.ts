import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ErrorResponse } from './interfaces/error-response.interface';
import { LoggingService, LogCategory } from '@logging/logging';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // Extract error message and any additional data
    let message: string | string[];
    let privacy: any = undefined;
    
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const responseObj = exceptionResponse as { message: string | string[]; privacy?: any };
      message = responseObj.message;
      privacy = responseObj.privacy;
    } else {
      message = exception.message || 'An error occurred';
    }

    // Log the exception using LoggingService
    const errorMessage = Array.isArray(message) ? message.join(', ') : message;
    const userId = (request as any).user?.id;
    const username = (request as any).user?.username;
    const requestId = (request as any).requestId || (request as any).correlationId;

    // Determine log level based on status code
    if (status >= 500) {
      // Server errors - log as error
      this.loggingService.error(
        `HTTP ${status}: ${errorMessage}`,
        exception.stack,
        'HttpExceptionFilter',
        {
          category: LogCategory.API,
          userId,
          username,
          ipAddress: request.ip || request.socket.remoteAddress,
          userAgent: request.get('user-agent'),
          endpoint: request.url,
          method: request.method,
          statusCode: status,
          metadata: {
            requestId,
            exceptionName: exception.name,
            path: request.path,
            query: request.query,
            body: request.method !== 'GET' ? request.body : undefined,
          },
          error: exception,
        },
      );
    } else if (status >= 400) {
      // Client errors - log as warning
      this.loggingService.warn(
        `HTTP ${status}: ${errorMessage}`,
        'HttpExceptionFilter',
        {
          category: LogCategory.API,
          userId,
          username,
          ipAddress: request.ip || request.socket.remoteAddress,
          userAgent: request.get('user-agent'),
          endpoint: request.url,
          method: request.method,
          statusCode: status,
          metadata: {
            requestId,
            exceptionName: exception.name,
            path: request.path,
            query: request.query,
          },
        },
      );
    }

    // In production, hide stack traces and internal error details
    const errorResponse: ErrorResponse & { privacy?: any; requestId?: string } = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include request ID in error response for tracing
    if (requestId) {
      errorResponse.requestId = requestId;
    }
    
    // Include privacy information if present
    if (privacy) {
      errorResponse.privacy = privacy;
    }

    // Only include error details in development
    if (!isProduction) {
      errorResponse.error = exception.name;
      if (exception.stack) {
        errorResponse.stack = exception.stack;
      }
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'error' in exceptionResponse
      ) {
        const responseObj = exceptionResponse as { error?: string };
        errorResponse.error = responseObj.error || exception.name;
      }
    }

    response.status(status).json(errorResponse);
  }
}

