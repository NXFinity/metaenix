import { ROLE } from '../enum/role.enum';
import { Permission } from '../enum/permission.enum';

/**
 * Role-Permission mapping configuration
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<ROLE, Permission[]> = {
  // Administrator - Full system access
  [ROLE.Administrator]: [
    Permission.USER_MANAGE,
    Permission.PROFILE_UPDATE,
    Permission.PROFILE_DELETE,
    Permission.ROLE_MANAGE,
    Permission.AUTH_MANAGE,
    Permission.SECURITY_MANAGE,
    Permission.MODERATE_USERS,
    Permission.MODERATE_CONTENT,
    Permission.BAN_USERS,
    Permission.TIMEOUT_USERS,
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_LOGS,
    Permission.CONTENT_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_GENERATE,
  ],

  // Founder - Full access (same as Administrator)
  [ROLE.Founder]: [
    Permission.USER_MANAGE,
    Permission.PROFILE_UPDATE,
    Permission.PROFILE_DELETE,
    Permission.ROLE_MANAGE,
    Permission.AUTH_MANAGE,
    Permission.SECURITY_MANAGE,
    Permission.MODERATE_USERS,
    Permission.MODERATE_CONTENT,
    Permission.BAN_USERS,
    Permission.TIMEOUT_USERS,
    Permission.SYSTEM_ADMIN,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_LOGS,
    Permission.CONTENT_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_GENERATE,
  ],

  // Chief Executive - High-level management
  [ROLE.Chief_Executive]: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.ROLE_READ,
    Permission.ROLE_ASSIGN,
    Permission.SECURITY_VIEW,
    Permission.MODERATE_USERS,
    Permission.MODERATE_CONTENT,
    Permission.BAN_USERS,
    Permission.TIMEOUT_USERS,
    Permission.CONTENT_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_GENERATE,
  ],

  // Operations Manager - Operations and moderation
  [ROLE.Operations_Manager]: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.MODERATE_USERS,
    Permission.MODERATE_CONTENT,
    Permission.BAN_USERS,
    Permission.TIMEOUT_USERS,
    Permission.CONTENT_READ,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_VIEW,
  ],

  // Staff - Basic moderation and content management
  [ROLE.Staff]: [
    Permission.USER_READ,
    Permission.PROFILE_READ,
    Permission.MODERATE_CONTENT,
    Permission.CONTENT_READ,
    Permission.CONTENT_UPDATE,
    Permission.REPORTS_VIEW,
  ],

  // Member - Basic user permissions
  [ROLE.Member]: [
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
  ],

  // Developer - Technical access
  [ROLE.Developer]: [
    Permission.USER_READ,
    Permission.PROFILE_READ,
    Permission.SYSTEM_LOGS,
    Permission.CONTENT_READ,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.ANALYTICS_VIEW,
  ],
};

/**
 * Get permissions for a role
 */
export const getRolePermissions = (role: ROLE): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a role has a specific permission
 */
export const roleHasPermission = (
  role: ROLE,
  permission: Permission,
): boolean => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};

/**
 * Check if a role has any of the specified permissions
 */
export const roleHasAnyPermission = (
  role: ROLE,
  permissions: Permission[],
): boolean => {
  const rolePermissions = getRolePermissions(role);
  return permissions.some((permission) => rolePermissions.includes(permission));
};

/**
 * Check if a role has all of the specified permissions
 */
export const roleHasAllPermissions = (
  role: ROLE,
  permissions: Permission[],
): boolean => {
  const rolePermissions = getRolePermissions(role);
  return permissions.every((permission) => rolePermissions.includes(permission));
};

