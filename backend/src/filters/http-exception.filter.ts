import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ErrorResponse } from './interfaces/error-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    // Extract error message
    let message: string | string[];
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

    // In production, hide stack traces and internal error details
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    };

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

