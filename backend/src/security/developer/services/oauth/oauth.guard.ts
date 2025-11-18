import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../auth/decorators/public.decorator';

/**
 * OAuth Guard
 * Validates OAuth tokens for API access
 * Blocks access to restricted endpoints (user-only endpoints)
 */
@Injectable()
export class OAuthGuard extends AuthGuard('oauth') {
  // List of restricted endpoints that cannot be accessed via OAuth tokens
  private readonly RESTRICTED_ENDPOINTS = [
    '/auth/register',
    '/auth/login',
    '/auth/logout',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/change-password',
    '/twofa',
    '/users/register',
    '/users/create',
    '/developer/register', // Developer registration should be via session
  ];

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const path = request.route?.path || request.path;

    // Check if this is a restricted endpoint
    const isRestricted = this.RESTRICTED_ENDPOINTS.some((endpoint) =>
      path.startsWith(endpoint),
    );

    if (isRestricted) {
      // Check if request has OAuth token (Authorization: Bearer header)
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        throw new ForbiddenException(
          'This endpoint cannot be accessed using OAuth tokens. Please use session-based authentication.',
        );
      }
      // If no OAuth token, allow session-based auth to proceed
      return true;
    }

    // For non-restricted endpoints, try OAuth authentication
    // If no Bearer token, fall back to session-based auth
    const authHeader = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No OAuth token, allow session-based auth
      return true;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Decode token to check if it's an OAuth token
    // OAuth tokens have 'type: oauth' in the payload
    // We decode without verification (just to check the type field)
    try {
      // Simple base64 decode of JWT payload (second part)
      const parts = token.split('.');
      if (parts.length !== 3) {
        // Invalid JWT format, let AuthGuard handle it
        return true;
      }

      // Decode payload (second part)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );

      // If token doesn't have 'type: oauth', it's a regular JWT token
      // OAuthGuard should NOT handle regular user JWT tokens - let AuthGuard handle them
      if (!payload || payload.type !== 'oauth') {
        // Regular JWT token (user authentication), skip OAuth validation
        // AuthGuard will handle it
        return true;
      }

      // Has OAuth token (type: 'oauth'), validate it with OAuth strategy
      return super.canActivate(context);
    } catch (error) {
      // Token decode failed, let AuthGuard handle it
      return true;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid OAuth token');
    }
    return user;
  }
}
