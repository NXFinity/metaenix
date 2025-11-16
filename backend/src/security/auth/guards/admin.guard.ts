import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ROLE } from '../../roles/assets/enum/role.enum';
import { AuthenticatedRequest } from '../../../common/interfaces/authenticated-request.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user || request.session?.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as ROLE;

    // Define admin roles
    const adminRoles = [
      ROLE.Administrator,
      ROLE.Founder,
      ROLE.Chief_Executive,
    ];

    if (!adminRoles.includes(userRole)) {
      throw new ForbiddenException(
        'Access denied. Administrator privileges required.',
      );
    }

    return true;
  }
}
