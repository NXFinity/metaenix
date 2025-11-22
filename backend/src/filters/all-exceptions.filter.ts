import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { LoggingService, LogCategory } from '@logging/logging';

/**
 * Global exception filter that catches ALL exceptions (including non-HTTP exceptions)
 * This ensures all errors are logged, even if they're not HttpExceptions
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // Determine status code and message
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let exceptionName = 'Error';

    if (exception instanceof HttpException) {
      // If it's an HttpException, use its status and message
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const responseObj = exceptionResponse as { message: string | string[] };
        message = responseObj.message;
      } else {
        message = exception.message || 'An error occurred';
      }
      exceptionName = exception.name;
    } else if (exception instanceof Error) {
      // For non-HTTP errors, use the error message
      message = exception.message || 'An unexpected error occurred';
      exceptionName = exception.constructor.name;
    } else {
      // For unknown error types
      message = 'An unexpected error occurred';
      exceptionName = 'UnknownError';
    }

    // Log the exception using LoggingService
    const errorMessage = Array.isArray(message) ? message.join(', ') : message;
    const userId = (request as any).user?.id;
    const username = (request as any).user?.username;
    const requestId = (request as any).requestId || (request as any).correlationId;
    const error = exception instanceof Error ? exception : new Error(String(exception));

    // Log all exceptions as errors (non-HTTP exceptions are always critical)
    this.loggingService.error(
      `Unhandled Exception: ${errorMessage}`,
      error.stack,
      'AllExceptionsFilter',
      {
        category: LogCategory.SYSTEM,
        userId,
        username,
        ipAddress: request.ip || request.socket.remoteAddress,
        userAgent: request.get('user-agent'),
        endpoint: request.url,
        method: request.method,
        statusCode: status,
        metadata: {
          requestId,
          exceptionName,
          exceptionType: exception instanceof HttpException ? 'HttpException' : 'Error',
          path: request.path,
          query: request.query,
          body: request.method !== 'GET' ? request.body : undefined,
        },
        error,
      },
    );

    // For critical errors (500+), also log as critical
    if (status >= 500) {
      this.loggingService.critical(
        `Critical Error: ${errorMessage}`,
        error,
        {
          category: LogCategory.SYSTEM,
          userId,
          username,
          ipAddress: request.ip || request.socket.remoteAddress,
          userAgent: request.get('user-agent'),
          endpoint: request.url,
          method: request.method,
          statusCode: status,
          metadata: {
            requestId,
            exceptionName,
            path: request.path,
          },
        },
      );
    }

    // Build error response
    const errorResponse: {
      statusCode: number;
      message: string[];
      timestamp: string;
      path: string;
      requestId?: string;
    } = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include request ID in error response for tracing
    if (requestId) {
      errorResponse.requestId = requestId;
    }

    // Only include error details in development
    if (!isProduction) {
      (errorResponse as any).error = exceptionName;
      if (error.stack) {
        (errorResponse as any).stack = error.stack;
      }
    }

    response.status(status).json(errorResponse);
  }
}

