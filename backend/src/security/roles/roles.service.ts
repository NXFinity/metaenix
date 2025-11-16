import { Injectable } from '@nestjs/common';
import { ROLE } from './assets/enum/role.enum';
import { Permission } from './assets/enum/permission.enum';
import {
  getRolePermissions,
  roleHasPermission,
  roleHasAnyPermission,
  roleHasAllPermissions,
} from './assets/config/role-permissions.config';
import { AbilityFactory, AppAbility } from './assets/factories/ability.factory';

@Injectable()
export class RolesService {
  constructor(private readonly abilityFactory: AbilityFactory) {}

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: ROLE): Permission[] {
    return getRolePermissions(role);
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: ROLE, permission: Permission): boolean {
    return roleHasPermission(role, permission);
  }

  /**
   * Check if a role has any of the specified permissions
   */
  hasAnyPermission(role: ROLE, permissions: Permission[]): boolean {
    return roleHasAnyPermission(role, permissions);
  }

  /**
   * Check if a role has all of the specified permissions
   */
  hasAllPermissions(role: ROLE, permissions: Permission[]): boolean {
    return roleHasAllPermissions(role, permissions);
  }

  /**
   * Create CASL ability for a role
   */
  createAbilityForRole(role: ROLE): AppAbility {
    return this.abilityFactory.createForUser(role);
  }

  /**
   * Get all available roles
   */
  getAllRoles(): ROLE[] {
    return Object.values(ROLE);
  }

  /**
   * Get all available permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Check if a role can perform an action on a subject
   */
  can(role: ROLE, action: Permission, subject: string): boolean {
    const ability = this.createAbilityForRole(role);
    return ability.can(action, subject as any);
  }

  /**
   * Check if a role cannot perform an action on a subject
   */
  cannot(role: ROLE, action: Permission, subject: string): boolean {
    const ability = this.createAbilityForRole(role);
    return ability.cannot(action, subject as any);
  }
}
