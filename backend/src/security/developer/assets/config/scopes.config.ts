import { ScopeDefinition } from '../interfaces/scope.interface';
import { ScopeCategory } from '../enum/scope-category.enum';
import { ScopeGroup } from '../enum/scope-group.enum';

/**
 * Scope Definitions
 * All available OAuth scopes with metadata
 */
export const SCOPE_DEFINITIONS: Record<string, ScopeDefinition> = {
  // Profile Scopes
  'read:profile': {
    id: 'read:profile',
    name: 'Read Profile',
    description: 'Read user profile information',
    category: ScopeCategory.READ,
    group: ScopeGroup.PROFILE,
    requiresApproval: false,
    isDefault: true,
  },
  'write:profile': {
    id: 'write:profile',
    name: 'Update Profile',
    description: 'Update user profile information',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.PROFILE,
    requiresApproval: true,
    isDefault: false,
  },

  // Post Scopes
  'read:posts': {
    id: 'read:posts',
    name: 'Read Posts',
    description: 'Read posts and content',
    category: ScopeCategory.READ,
    group: ScopeGroup.POSTS,
    requiresApproval: false,
    isDefault: true,
  },
  'write:posts': {
    id: 'write:posts',
    name: 'Create Posts',
    description: 'Create, update, and delete posts',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.POSTS,
    requiresApproval: true,
    isDefault: false,
  },

  // Comment Scopes
  'read:comments': {
    id: 'read:comments',
    name: 'Read Comments',
    description: 'Read comments on posts',
    category: ScopeCategory.READ,
    group: ScopeGroup.COMMENTS,
    requiresApproval: false,
    isDefault: true,
  },
  'write:comments': {
    id: 'write:comments',
    name: 'Create Comments',
    description: 'Create, update, and delete comments',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.COMMENTS,
    requiresApproval: true,
    isDefault: false,
  },

  // Follow Scopes
  'read:follows': {
    id: 'read:follows',
    name: 'Read Follows',
    description: 'Read follow relationships',
    category: ScopeCategory.READ,
    group: ScopeGroup.FOLLOWS,
    requiresApproval: false,
    isDefault: true,
  },
  'write:follows': {
    id: 'write:follows',
    name: 'Manage Follows',
    description: 'Follow and unfollow users',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.FOLLOWS,
    requiresApproval: true,
    isDefault: false,
  },

  // Notification Scopes
  'read:notifications': {
    id: 'read:notifications',
    name: 'Read Notifications',
    description: 'Read user notifications',
    category: ScopeCategory.READ,
    group: ScopeGroup.NOTIFICATIONS,
    requiresApproval: false,
    isDefault: true,
  },
  'write:notifications': {
    id: 'write:notifications',
    name: 'Manage Notifications',
    description: 'Mark notifications as read',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.NOTIFICATIONS,
    requiresApproval: true,
    isDefault: false,
  },

  // Storage Scopes
  'read:storage': {
    id: 'read:storage',
    name: 'Read Storage',
    description: 'Read file metadata',
    category: ScopeCategory.READ,
    group: ScopeGroup.STORAGE,
    requiresApproval: false,
    isDefault: true,
  },
  'write:storage': {
    id: 'write:storage',
    name: 'Manage Storage',
    description: 'Upload and delete files',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.STORAGE,
    requiresApproval: true,
    isDefault: false,
  },

  // Analytics Scopes
  'read:analytics': {
    id: 'read:analytics',
    name: 'Read Analytics',
    description: 'Read analytics data',
    category: ScopeCategory.READ,
    group: ScopeGroup.ANALYTICS,
    requiresApproval: true,
    isDefault: false,
  },

  // Account Scopes
  'read:account': {
    id: 'read:account',
    name: 'Read Account',
    description: 'Read account information',
    category: ScopeCategory.READ,
    group: ScopeGroup.ACCOUNT,
    requiresApproval: false,
    isDefault: true,
  },
  'write:account': {
    id: 'write:account',
    name: 'Manage Account',
    description: 'Modify account settings',
    category: ScopeCategory.WRITE,
    group: ScopeGroup.ACCOUNT,
    requiresApproval: true,
    isDefault: false,
  },
};

/**
 * Get all available scopes
 */
export function getAllScopes(): ScopeDefinition[] {
  return Object.values(SCOPE_DEFINITIONS);
}

/**
 * Get scopes by group
 */
export function getScopesByGroup(group: ScopeGroup): ScopeDefinition[] {
  return Object.values(SCOPE_DEFINITIONS).filter((scope) => scope.group === group);
}

/**
 * Get scopes by category
 */
export function getScopesByCategory(category: ScopeCategory): ScopeDefinition[] {
  return Object.values(SCOPE_DEFINITIONS).filter((scope) => scope.category === category);
}

/**
 * Get default scopes (auto-approved)
 */
export function getDefaultScopes(): ScopeDefinition[] {
  return Object.values(SCOPE_DEFINITIONS).filter((scope) => scope.isDefault);
}

/**
 * Get scopes that require approval
 */
export function getScopesRequiringApproval(): ScopeDefinition[] {
  return Object.values(SCOPE_DEFINITIONS).filter((scope) => scope.requiresApproval);
}

/**
 * Validate if a scope exists
 */
export function isValidScope(scopeId: string): boolean {
  return scopeId in SCOPE_DEFINITIONS;
}

/**
 * Get scope definition by ID
 */
export function getScopeDefinition(scopeId: string): ScopeDefinition | undefined {
  return SCOPE_DEFINITIONS[scopeId];
}

/**
 * Validate multiple scopes
 */
export function validateScopes(scopeIds: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const scopeId of scopeIds) {
    if (isValidScope(scopeId)) {
      valid.push(scopeId);
    } else {
      invalid.push(scopeId);
    }
  }

  return { valid, invalid };
}

