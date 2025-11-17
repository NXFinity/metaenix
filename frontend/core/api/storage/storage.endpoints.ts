/**
 * Storage API Endpoints
 * 
 * Defines all storage-related API endpoint URLs
 */

export const STORAGE_ENDPOINTS = {
  /**
   * Upload a file to Digital Ocean Spaces
   * POST /storage/upload
   */
  UPLOAD: '/storage/upload',

  /**
   * Delete a file from Digital Ocean Spaces
   * DELETE /storage/:fileKey
   */
  DELETE: (fileKey: string) => `/storage/${encodeURIComponent(fileKey)}`,

  /**
   * Get a presigned URL for temporary file access
   * POST /storage/presigned-url
   */
  PRESIGNED_URL: '/storage/presigned-url',
} as const;

