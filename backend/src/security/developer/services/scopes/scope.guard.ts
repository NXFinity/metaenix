import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeService } from './scope.service';
import { REQUIRE_SCOPE_KEY } from './decorators/require-scope.decorator';
import { IS_PUBLIC_KEY } from '../../../auth/decorators/public.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private scopeService: ScopeService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Public endpoints don't need scope checks
    if (isPublic) {
      return true;
    }

    // Get required scopes from decorator
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Get OAuth token info from request (set by OAuthStrategy)
    const oauthToken = request.user;

    // If not OAuth token, check if it's a session-based request
    // OAuth tokens have tokenType === 'oauth'
    if (!oauthToken || oauthToken.tokenType !== 'oauth') {
      // Session-based requests don't need scope checks (they have full user access)
      return true;
    }

    // For OAuth tokens, check scopes
    // Get scopes from OAuth token
    const userScopes = oauthToken.scopes || [];

    // Check if user has required scope(s)
    const hasRequiredScope = this.scopeService.hasScope(
      userScopes,
      requiredScopes,
    );

    if (!hasRequiredScope) {
      throw new ForbiddenException(
        `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}. Your token has: ${userScopes.join(', ') || 'none'}`,
      );
    }

    return true;
  }
}

