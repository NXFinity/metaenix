import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Check if user is in session
    if (!request.session || !request.session.user) {
      throw new UnauthorizedException('Please login to access this resource');
    }

    // Attach user to request for use in controllers
    // Note: session.user is a partial user object, but we need to create a User-like object
    // The controllers will handle the partial user appropriately
    if (request.session.user) {
      request.user = request.session.user as any; // Type assertion needed as session.user is partial
    }

    return true;
  }
}
