/**
 * Reports API Endpoints
 * 
 * Defines all report-related API endpoint URLs for the universal reporting system
 */

export const REPORTS_ENDPOINTS = {
  /**
   * Create a report
   * POST /reporting
   */
  CREATE: '/reporting',

  /**
   * Get all reports (admin only)
   * GET /reporting
   */
  GET_ALL: '/reporting',

  /**
   * Get a single report by ID (admin only)
   * GET /reporting/:id
   */
  GET_BY_ID: (id: string) => `/reporting/${id}`,

  /**
   * Get reports for a specific resource (admin only)
   * GET /reporting/resource/:resourceType/:resourceId
   */
  GET_BY_RESOURCE: (resourceType: string, resourceId: string) =>
    `/reporting/resource/${resourceType}/${resourceId}`,

  /**
   * Update report status (admin only)
   * PATCH /reporting/:id/status
   */
  UPDATE_STATUS: (id: string) => `/reporting/${id}/status`,
} as const;

