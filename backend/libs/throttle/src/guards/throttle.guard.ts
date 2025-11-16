import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottleService } from '../throttle.service';
import { ThrottleOptions } from '../interfaces/throttle-options.interface';
import { THROTTLE_KEY, THROTTLE_SKIP_KEY } from '../decorators/throttle.decorator';

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly defaultLimit: number;
  private readonly defaultTtl: number;

  constructor(
    private readonly throttleService: ThrottleService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const limit = this.configService.get<number>('THROTTLE_DEFAULT_LIMIT');
    const ttl = this.configService.get<number>('THROTTLE_DEFAULT_TTL');
    
    if (limit === undefined) {
      throw new Error('THROTTLE_DEFAULT_LIMIT environment variable is required');
    }
    if (ttl === undefined) {
      throw new Error('THROTTLE_DEFAULT_TTL environment variable is required');
    }
    
    this.defaultLimit = limit;
    this.defaultTtl = ttl;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route should skip throttling
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      THROTTLE_SKIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipThrottle) {
      return true;
    }

    // Get throttle options from decorator
    const throttleOptions = this.reflector.getAllAndOverride<ThrottleOptions>(
      THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Use decorator options if present, otherwise use default limits
    const limit = throttleOptions?.limit || this.defaultLimit;
    const ttl = throttleOptions?.ttl || this.defaultTtl;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check skip condition if provided
    if (throttleOptions?.skipIf && throttleOptions.skipIf(request)) {
      return true;
    }

    // Get identifier (IP address or user ID)
    const identifier = throttleOptions?.getIdentifier
      ? throttleOptions.getIdentifier(request)
      : this.getDefaultIdentifier(request);

    // Get action name (route path or method)
    const action = `${request.method}:${request.route?.path || request.path}`;

    // Check rate limit
    const result = await this.throttleService.checkRateLimit(
      identifier,
      action,
      {
        limit,
        window: ttl,
      },
    );

    // Add rate limit headers to response
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', new Date(result.resetAt * 1000).toISOString());

    // If rate limit exceeded, throw error
    if (!result.allowed) {
      const errorMessage =
        throttleOptions?.errorMessage ||
        `Too many requests. Limit: ${limit} per ${ttl} seconds`;

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: errorMessage,
          limit,
          remaining: result.remaining,
          resetAt: new Date(result.resetAt * 1000).toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get default identifier (IP address or user ID)
   */
  private getDefaultIdentifier(request: any): string {
    // Try to get user ID from session
    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    // Fallback to IP address
    const ip =
      request.ip ||
      request.connection?.remoteAddress ||
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      'unknown';

    return `ip:${ip}`;
  }
}

