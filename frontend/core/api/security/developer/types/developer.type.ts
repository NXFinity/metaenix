// ============================================
// Developer Types
// ============================================

/**
 * Application environment enumeration
 */
export enum ApplicationEnvironment {
  PRODUCTION = 'PRODUCTION',
  DEVELOPMENT = 'DEVELOPMENT',
}

/**
 * Application status enumeration
 */
export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  REJECTED = 'REJECTED',
}

export interface Application {
  id: string;
  name: string;
  description?: string | null;
  environment: ApplicationEnvironment;
  clientId: string;
  websocketId: string;
  redirectUris?: string[];
  iconUrl?: string | null;
  websiteUrl?: string | null;
  privacyPolicyUrl?: string | null;
  termsOfServiceUrl?: string | null;
  scopes: string[];
  status: ApplicationStatus;
  approvedAt?: string | null;
  approvedById?: string | null;
  rateLimit: number;
  developerId: string;
  lastUsed?: string | null;
  dateCreated: string;
  dateUpdated: string;
  dateDeleted?: string | null;
}

export interface DeveloperStatus {
  eligible: boolean;
  requirements: {
    profileComplete: boolean;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    accountAge: boolean;
    accountStanding: boolean;
    accountActivity: boolean;
  };
  errors: string[];
}

export interface RegisterDeveloperRequest {
  acceptTerms: boolean;
}

export interface RegisterDeveloperResponse {
  message: string;
  user: {
    id: string;
    username: string;
    email: string;
    isDeveloper: boolean;
    developerTermsAcceptedAt: string;
  };
}

export interface CreateApplicationRequest {
  name: string;
  description?: string;
  environment: ApplicationEnvironment;
  redirectUris?: string[];
  iconUrl?: string;
  websiteUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  scopes?: string[];
}

export interface CreateApplicationResponse {
  application: Application;
  clientSecret: string; // Shown only once
}

export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  redirectUris?: string[];
  iconUrl?: string;
  websiteUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  scopes?: string[];
}

export interface UpdateApplicationResponse {
  message: string;
  application: Application;
}

export interface RegenerateSecretResponse {
  clientSecret: string; // Shown only once
}

export interface DeleteApplicationResponse {
  message: string;
}

