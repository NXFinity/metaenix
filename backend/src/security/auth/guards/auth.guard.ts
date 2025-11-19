import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public endpoints, still try to authenticate (but don't throw if it fails)
      // This allows endpoints to access request.user if a user is logged in
      // This is important for features like viewing your own private profile
      const request = context.switchToHttp().getRequest();
      
      // Check if there's a token present (cookie or header)
      const hasToken = 
        request?.cookies?.accessToken || 
        request?.headers?.authorization?.startsWith('Bearer ');
      
      if (hasToken) {
        // Try to authenticate - if it succeeds, request.user will be set
        // If it fails, that's fine - we'll still allow access (it's a public endpoint)
        try {
          const result = await super.canActivate(context);
          return result as boolean;
        } catch (error) {
          // Authentication failed, but that's OK for public endpoints
          // request.user will remain undefined, and the endpoint can handle that
          return true;
        }
      }
      
      // No token present, allow access (public endpoint)
      return true;
    }

    // Use Passport's JWT strategy to validate token (required for protected endpoints)
    return super.canActivate(context) as Promise<boolean>;
  }
}
