/**
 * Videos API Endpoints
 * 
 * Defines all video-related API endpoint URLs
 */

export const VIDEOS_ENDPOINTS = {
  /**
   * Upload a video
   * POST /videos/upload
   */
  UPLOAD: '/videos/upload',

  /**
   * Get all videos for a user (paginated)
   * GET /videos/user/:userId?page=1&limit=20
   */
  GET_BY_USER: (userId: string) => `/videos/user/${userId}`,

  /**
   * Get a single video by ID
   * GET /videos/:id
   */
  GET_BY_ID: (id: string) => `/videos/${id}`,

  /**
   * Update a video
   * PATCH /videos/:id
   */
  UPDATE: (id: string) => `/videos/${id}`,

  /**
   * Delete a video
   * DELETE /videos/:id
   */
  DELETE: (id: string) => `/videos/${id}`,

  /**
   * Upload video thumbnail
   * POST /videos/:id/thumbnail
   */
  UPLOAD_THUMBNAIL: (id: string) => `/videos/${id}/thumbnail`,
} as const;

