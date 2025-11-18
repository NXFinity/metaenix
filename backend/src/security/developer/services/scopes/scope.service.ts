import { Injectable, BadRequestException } from '@nestjs/common';
import {
  SCOPE_DEFINITIONS,
  getAllScopes,
  getScopesByGroup,
  getScopesByCategory,
  getDefaultScopes,
  getScopesRequiringApproval,
  // isValidScope, // Reserved for future use
  getScopeDefinition,
  validateScopes,
} from '../../assets/config/scopes.config';
import { ScopeDefinition } from '../../assets/interfaces/scope.interface';
import { ScopeCategory } from '../../assets/enum/scope-category.enum';
import { ScopeGroup } from '../../assets/enum/scope-group.enum';

@Injectable()
export class ScopeService {
  /**
   * Get all available scopes
   */
  getAllScopes(): ScopeDefinition[] {
    return getAllScopes();
  }

  /**
   * Get scopes by group
   */
  getScopesByGroup(group: ScopeGroup): ScopeDefinition[] {
    return getScopesByGroup(group);
  }

  /**
   * Get scopes by category
   */
  getScopesByCategory(category: ScopeCategory): ScopeDefinition[] {
    return getScopesByCategory(category);
  }

  /**
   * Get default scopes (auto-approved)
   */
  getDefaultScopes(): ScopeDefinition[] {
    return getDefaultScopes();
  }

  /**
   * Get scopes that require approval
   */
  getScopesRequiringApproval(): ScopeDefinition[] {
    return getScopesRequiringApproval();
  }

  /**
   * Validate if a scope exists
   */
  isValidScope(scopeId: string): boolean {
    return scopeId in SCOPE_DEFINITIONS;
  }

  /**
   * Get scope definition by ID
   */
  getScopeDefinition(scopeId: string): ScopeDefinition | undefined {
    return SCOPE_DEFINITIONS[scopeId];
  }

  /**
   * Validate multiple scopes
   */
  validateScopesList(scopeIds: string[]): {
    valid: string[];
    invalid: string[];
  } {
    return validateScopes(scopeIds);
  }

  /**
   * Filter scopes that require approval
   */
  filterScopesRequiringApproval(scopeIds: string[]): string[] {
    return scopeIds.filter((scopeId) => {
      const definition = getScopeDefinition(scopeId);
      return definition?.requiresApproval === true;
    });
  }

  /**
   * Filter default scopes (auto-approved)
   */
  filterDefaultScopes(scopeIds: string[]): string[] {
    return scopeIds.filter((scopeId) => {
      const definition = getScopeDefinition(scopeId);
      return definition?.isDefault === true;
    });
  }

  /**
   * Validate requested scopes against application scopes
   * Returns only scopes that are both valid and approved for the application
   */
  validateRequestedScopes(
    requestedScopes: string[],
    applicationScopes: string[],
  ): string[] {
    // Validate scope IDs exist
    const { valid, invalid } = this.validateScopesList(requestedScopes);
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid scopes: ${invalid.join(', ')}. Available scopes: ${Object.keys(SCOPE_DEFINITIONS).join(', ')}`,
      );
    }

    // Filter to only scopes approved for this application
    return valid.filter((scope) => applicationScopes.includes(scope));
  }

  /**
   * Check if user has required scope(s)
   */
  hasScope(userScopes: string[], requiredScope: string | string[]): boolean {
    const requiredScopes = Array.isArray(requiredScope)
      ? requiredScope
      : [requiredScope];

    // Check if user has at least one of the required scopes
    return requiredScopes.some((scope) => userScopes.includes(scope));
  }

  /**
   * Check if user has all required scopes
   */
  hasAllScopes(userScopes: string[], requiredScopes: string[]): boolean {
    return requiredScopes.every((scope) => userScopes.includes(scope));
  }
}

