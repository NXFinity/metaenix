/**
 * OAuth API Endpoints
 * 
 * Defines all OAuth-related API endpoint URLs
 * These endpoints are primarily for third-party applications, but are available
 * in the frontend service for testing and completeness.
 */

export const OAUTH_ENDPOINTS = {
  /**
   * OAuth 2.0 Authorization Endpoint
   * GET /oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=...
   */
  AUTHORIZE: '/oauth/authorize',

  /**
   * OAuth 2.0 Token Endpoint
   * POST /oauth/token
   */
  TOKEN: '/oauth/token',

  /**
   * OAuth 2.0 Token Revocation Endpoint
   * POST /oauth/revoke
   */
  REVOKE: '/oauth/revoke',

  /**
   * OAuth 2.0 Token Introspection Endpoint
   * POST /oauth/introspect
   */
  INTROSPECT: '/oauth/introspect',

  /**
   * List Available OAuth Scopes
   * GET /oauth/scopes
   */
  SCOPES: '/oauth/scopes',
} as const;

