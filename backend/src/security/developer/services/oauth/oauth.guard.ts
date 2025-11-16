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

    // Has OAuth token, validate it
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid OAuth token');
    }
    return user;
  }
}

