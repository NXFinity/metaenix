import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OAuthRateLimitService } from './oauth-rate-limit.service';
import { IS_PUBLIC_KEY } from '../../../auth/decorators/public.decorator';

/**
 * OAuth Rate Limit Guard
 * Enforces rate limits for OAuth-authenticated requests
 * Only applies to requests authenticated with OAuth tokens
 */
@Injectable()
export class OAuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: OAuthRateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if route is marked as public (skip rate limiting)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Only apply rate limiting to OAuth-authenticated requests
    // OAuth tokens have tokenType === 'oauth' and include application info
    const oauthToken = request.user;
    const isOAuthRequest = oauthToken && oauthToken.tokenType === 'oauth';

    if (!isOAuthRequest) {
      // Not an OAuth request, skip rate limiting
      // Session-based requests are handled by other throttling mechanisms
      // Headers will be set by ThrottleGuard
      return true;
    }

    // Extract application and user info from OAuth token
    const application = oauthToken.application;
    const userId = oauthToken.userId || null; // null for client credentials

    if (!application) {
      // No application info, allow request (shouldn't happen with valid OAuth token)
      // Set default headers for API consistency
      response.setHeader('X-RateLimit-Limit', '1000'); // Default OAuth limit
      response.setHeader('X-RateLimit-Remaining', '1000');
      response.setHeader('X-RateLimit-Reset', new Date(Date.now() + 3600000).toISOString());
      response.setHeader('X-RateLimit-Used', '0');
      return true;
    }

    // For public endpoints with OAuth, still check rate limits but don't enforce
    if (isPublic) {
      // Check rate limit but don't enforce for public endpoints
      const endpoint = request.route?.path || request.path;
      const method = request.method;
      const fullEndpoint = `${method} ${endpoint}`;

      const result = await this.rateLimitService.checkRateLimit(
        application,
        userId,
        fullEndpoint,
      );

      // Set headers even for public endpoints
      response.setHeader('X-RateLimit-Limit', result.limit);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', result.resetAt);
      response.setHeader('X-RateLimit-Used', result.current);
      return true;
    }

    // Get endpoint path for per-endpoint rate limiting
    const endpoint = request.route?.path || request.path;
    const method = request.method;
    const fullEndpoint = `${method} ${endpoint}`;

    // Check rate limit
    const result = await this.rateLimitService.checkRateLimit(
      application,
      userId,
      fullEndpoint,
    );

    // Add rate limit headers to response
    response.setHeader('X-RateLimit-Limit', result.limit);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt);
    response.setHeader('X-RateLimit-Used', result.current);

    // If rate limit exceeded, throw error
    if (!result.allowed) {
      const resetDate = new Date(result.resetAt * 1000).toISOString();
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Limit: ${result.limit} requests/hour. Reset at: ${resetDate}. Please wait before making more requests.`,
          limit: result.limit,
          remaining: result.remaining,
          resetAt: resetDate,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

