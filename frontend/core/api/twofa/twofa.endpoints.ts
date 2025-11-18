/**
 * Two-Factor Authentication API Endpoints
 * 
 * Base URL: /v1/twofa
 * All endpoints are relative to the base API URL configured in lib/api/client.ts
 */

export const TWOFA_ENDPOINTS = {
  /**
   * Get 2FA status
   * GET /twofa/status
   */
  GET_STATUS: '/twofa/status',

  /**
   * Setup 2FA - Generate secret and QR code
   * POST /twofa/setup
   */
  SETUP: '/twofa/setup',

  /**
   * Enable 2FA - Verify code and enable
   * POST /twofa/enable
   */
  ENABLE: '/twofa/enable',

  /**
   * Verify 2FA code (standalone verification)
   * POST /twofa/verify
   */
  VERIFY: '/twofa/verify',

  /**
   * Disable 2FA
   * POST /twofa/disable
   */
  DISABLE: '/twofa/disable',

  /**
   * Get backup codes (requires 2FA verification)
   * GET /twofa/backup-codes
   */
  GET_BACKUP_CODES: '/twofa/backup-codes',

  /**
   * Regenerate backup codes (requires 2FA verification)
   * POST /twofa/regenerate-backup-codes
   */
  REGENERATE_BACKUP_CODES: '/twofa/regenerate-backup-codes',
} as const;

