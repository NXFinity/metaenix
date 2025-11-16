import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enum/permission.enum';

export const CHECK_PERMISSION_KEY = 'check_permission';
export const CheckPermission = (...permissions: Permission[]) =>
  SetMetadata(CHECK_PERMISSION_KEY, permissions);

