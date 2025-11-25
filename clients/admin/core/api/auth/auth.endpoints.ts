/**
 * Authentication API Endpoints
 * 
 * Base URL: /v1/auth
 */

export const AUTH_ENDPOINTS = {
  // Admin Session
  CREATE_ADMIN_SESSION: '/auth/admin/session/create',
  EXCHANGE_ADMIN_SESSION: '/auth/admin/session/exchange',
} as const;

