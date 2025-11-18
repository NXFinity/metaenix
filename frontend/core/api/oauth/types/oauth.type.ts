// ============================================
// OAuth Types
// ============================================

export enum GrantType {
  AUTHORIZATION_CODE = 'authorization_code',
  REFRESH_TOKEN = 'refresh_token',
  CLIENT_CREDENTIALS = 'client_credentials',
}

export interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  responseType: 'code';
  scope: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface AuthorizeResponse {
  code: string;
  state?: string;
}

export interface TokenRequest {
  grantType: GrantType;
  clientId?: string;
  clientSecret?: string;
  code?: string;
  redirectUri?: string;
  codeVerifier?: string;
  refreshToken?: string;
  scope?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string;
}

export interface RevokeRequest {
  token: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
}

export interface RevokeResponse {
  message: string;
}

export interface IntrospectRequest {
  token: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
}

export interface IntrospectResponse {
  active: boolean;
  scope?: string;
  clientId?: string;
  username?: string;
  exp?: number;
  iat?: number;
  sub?: string;
}

export interface ScopeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'admin';
  group: string;
  requiresApproval: boolean;
  isDefault: boolean;
}

export interface ScopesResponse {
  scopes: ScopeDefinition[];
}

