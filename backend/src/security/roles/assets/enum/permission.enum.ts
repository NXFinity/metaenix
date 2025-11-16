/**
 * Permission enum - Defines all available permissions in the system
 */
export enum Permission {
  // User Management
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE = 'user:manage', // Full user management

  // Profile Management
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',
  PROFILE_DELETE = 'profile:delete',

  // Role Management
  ROLE_READ = 'role:read',
  ROLE_ASSIGN = 'role:assign',
  ROLE_MANAGE = 'role:manage', // Full role management

  // Authentication & Security
  AUTH_MANAGE = 'auth:manage', // Manage authentication settings
  SECURITY_VIEW = 'security:view',
  SECURITY_MANAGE = 'security:manage',

  // Moderation
  MODERATE_USERS = 'moderate:users',
  MODERATE_CONTENT = 'moderate:content',
  BAN_USERS = 'moderate:ban',
  TIMEOUT_USERS = 'moderate:timeout',

  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',

  // Content Management
  CONTENT_READ = 'content:read',
  CONTENT_CREATE = 'content:create',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',
  CONTENT_MANAGE = 'content:manage',

  // Analytics & Reports
  ANALYTICS_VIEW = 'analytics:view',
  REPORTS_VIEW = 'reports:view',
  REPORTS_GENERATE = 'reports:generate',
}
