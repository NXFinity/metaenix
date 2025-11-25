/**
 * Photos API Endpoints
 * 
 * Defines all photo-related API endpoint URLs
 */

export const PHOTOS_ENDPOINTS = {
  /**
   * Upload a photo
   * POST /photos/upload
   */
  UPLOAD: '/photos/upload',

  /**
   * Get all photos for a user (paginated)
   * GET /photos/user/:userId?page=1&limit=20
   */
  GET_BY_USER: (userId: string) => `/photos/user/${userId}`,

  /**
   * Get a single photo by ID
   * GET /photos/:id
   */
  GET_BY_ID: (id: string) => `/photos/${id}`,

  /**
   * Update a photo
   * PATCH /photos/:id
   */
  UPDATE: (id: string) => `/photos/${id}`,

  /**
   * Delete a photo
   * DELETE /photos/:id
   */
  DELETE: (id: string) => `/photos/${id}`,

  /**
   * Track photo view
   * POST /photos/:id/view
   */
  TRACK_VIEW: (id: string) => `/photos/${id}/view`,
} as const;

