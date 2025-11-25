/**
 * Developer API Endpoints
 * 
 * Defines all developer-related API endpoint URLs
 */

export const DEVELOPER_ENDPOINTS = {
  /**
   * Check developer status and requirements
   * GET /developer/status
   */
  STATUS: '/developer/status',

  /**
   * Register as developer
   * POST /developer/register
   */
  REGISTER: '/developer/register',

  /**
   * List developer applications
   * GET /developer/apps
   */
  GET_APPLICATIONS: '/developer/apps',

  /**
   * Get production application
   * GET /developer/apps/production
   */
  GET_PRODUCTION_APP: '/developer/apps/production',

  /**
   * Get development application
   * GET /developer/apps/development
   */
  GET_DEVELOPMENT_APP: '/developer/apps/development',

  /**
   * Create new application
   * POST /developer/apps
   */
  CREATE_APPLICATION: '/developer/apps',

  /**
   * Get application details
   * GET /developer/apps/:id
   */
  GET_APPLICATION: (id: string) => `/developer/apps/${id}`,

  /**
   * Update application
   * PATCH /developer/apps/:id
   */
  UPDATE_APPLICATION: (id: string) => `/developer/apps/${id}`,

  /**
   * Delete application
   * DELETE /developer/apps/:id
   */
  DELETE_APPLICATION: (id: string) => `/developer/apps/${id}`,

  /**
   * Regenerate client secret
   * POST /developer/apps/:id/regenerate-secret
   */
  REGENERATE_SECRET: (id: string) => `/developer/apps/${id}/regenerate-secret`,
} as const;

