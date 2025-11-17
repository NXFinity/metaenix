/**
 * Authentication API Endpoints
 * 
 * Base URL: /v1/auth
 * All endpoints are relative to the base API URL configured in lib/api/client.ts
 */

export const AUTH_ENDPOINTS = {
  // Registration
  REGISTER: '/auth/register',
  
  // Email Verification
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFY_EMAIL: '/auth/resend-verify-email',
  
  // Login & Logout
  LOGIN: '/auth/login',
  LOGIN_VERIFY_2FA: '/auth/login/verify-2fa',
  LOGOUT: '/auth/logout',
  
  // Password Management
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  
  // Current User (uses /users/me endpoint)
  GET_ME: '/users/me',
} as const;

