import { ScopeCategory } from '../enum/scope-category.enum';
import { ScopeGroup } from '../enum/scope-group.enum';

export interface ScopeDefinition {
  id: string;
  name: string;
  description: string;
  category: ScopeCategory;
  group: ScopeGroup;
  requiresApproval: boolean;
  isDefault: boolean;
}

