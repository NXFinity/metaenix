import { Injectable } from '@nestjs/common';
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  MongoAbility,
} from '@casl/ability';
import { ROLE } from '../enum/role.enum';
import { Permission } from '../enum/permission.enum';
import { getRolePermissions } from '../config/role-permissions.config';

// Define subjects (resources that can be acted upon)
export type Subjects = 'User' | 'Profile' | 'Role' | 'Content' | 'System' | 'all';

// CASL actions (standard actions + our custom permissions)
export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | Permission;

export type AppAbility = MongoAbility<[Actions, Subjects]>;

@Injectable()
export class AbilityFactory {
  createForUser(role: ROLE): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(
      Ability as AbilityClass<AppAbility>,
    );

    const permissions = getRolePermissions(role);

    // Map permissions to CASL abilities
    permissions.forEach((permission) => {
      const [resource, action] = permission.split(':');

      switch (resource) {
        case 'user':
          if (action === 'manage') {
            can('manage', 'User');
          } else {
            can(action as Actions, 'User');
          }
          break;
        case 'profile':
          can(action as Actions, 'Profile');
          break;
        case 'role':
          can(action as Actions, 'Role');
          break;
        case 'content':
          if (action === 'manage') {
            can('manage', 'Content');
          } else {
            can(action as Actions, 'Content');
          }
          break;
        case 'system':
          if (action === 'admin') {
            can('manage', 'all');
          } else {
            can(action as Actions, 'System');
          }
          break;
        case 'moderate':
          can(action as Actions, 'User');
          break;
        case 'security':
          can(action as Actions, 'User');
          break;
        case 'auth':
          can('manage', 'User');
          break;
        case 'analytics':
        case 'reports':
          can('read', 'System');
          break;
      }
    });

    return build({
      detectSubjectType: (item: any) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}

