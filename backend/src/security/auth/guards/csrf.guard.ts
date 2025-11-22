import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { doubleCsrf, DoubleCsrfUtilities } from 'csrf-csrf';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip CSRF protection for specific endpoints
 * Use this for endpoints that use Bearer token authentication (not vulnerable to CSRF)
 */
export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfProtection: DoubleCsrfUtilities;
  private readonly enabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<string>('CSRF_ENABLED', 'true') === 'true';
    
    if (this.enabled) {
      const secret = this.configService.get<string>('CSRF_SECRET') || 
                     this.configService.get<string>('SESSION_SECRET');
      
      if (!secret) {
        throw new Error('CSRF_SECRET or SESSION_SECRET environment variable is required for CSRF protection');
      }

      const isProduction = process.env.NODE_ENV === 'production';
      
      this.csrfProtection = doubleCsrf({
        getSecret: () => secret,
        getSessionIdentifier: (req: Request) => {
          // Use a combination of IP and user agent as session identifier
          // In a real app, you might use session ID from express-session
          return `${req.ip || 'unknown'}-${req.get('user-agent') || 'unknown'}`;
        },
        cookieName: 'csrf-token',
        cookieOptions: {
          httpOnly: true,
          sameSite: 'strict',
          secure: isProduction,
          path: '/',
        },
        getCsrfTokenFromRequest: (req: Request) => {
          // Check header first (X-CSRF-Token or X-XSRF-Token)
          return (
            (req.headers['x-csrf-token'] as string) ||
            (req.headers['x-xsrf-token'] as string) ||
            (req.body?._csrf as string) ||
            (req.query?._csrf as string) ||
            null
          );
        },
        size: 32,
        ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
      });
    } else {
      // Create a dummy implementation when CSRF is disabled
      this.csrfProtection = {
        invalidCsrfTokenError: new Error('CSRF disabled') as any,
        generateCsrfToken: () => '',
        validateRequest: () => true,
        doubleCsrfProtection: () => {},
      };
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if CSRF is disabled
    if (!this.enabled) {
      return true;
    }

    // Check if route is marked as public (skip CSRF for public endpoints)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route is marked to skip CSRF
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Skip CSRF for Bearer token authentication (not vulnerable to CSRF)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }

    // Skip CSRF for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Validate CSRF token for state-changing operations
    try {
      // Validate CSRF token
      const validationResult = this.csrfProtection.validateRequest(request);
      
      if (!validationResult) {
        throw new ForbiddenException(
          'Invalid or missing CSRF token. Please refresh the page and try again.',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // If validation fails, throw ForbiddenException
      throw new ForbiddenException(
        'CSRF token validation failed. Please refresh the page and try again.',
      );
    }
  }
}

