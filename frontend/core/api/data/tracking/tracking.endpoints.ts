/**
 * Tracking API Endpoints
 * 
 * Defines all tracking-related API endpoint URLs
 */

export const TRACKING_ENDPOINTS = {
  /**
   * Track profile view
   * POST /tracking/profiles/:userId/view
   */
  TRACK_PROFILE_VIEW: (userId: string) => `/tracking/profiles/${userId}/view`,

  /**
   * Track post view
   * POST /tracking/posts/:postId/view
   */
  TRACK_POST_VIEW: (postId: string) => `/tracking/posts/${postId}/view`,

  /**
   * Track video view
   * POST /tracking/videos/:videoId/view
   */
  TRACK_VIDEO_VIEW: (videoId: string) => `/tracking/videos/${videoId}/view`,

  /**
   * Track photo view
   * POST /tracking/photos/:photoId/view
   */
  TRACK_PHOTO_VIEW: (photoId: string) => `/tracking/photos/${photoId}/view`,

  /**
   * Track resource view (generic)
   * POST /tracking/resources/:resourceType/:resourceId/view
   */
  TRACK_RESOURCE_VIEW: (resourceType: string, resourceId: string) => 
    `/tracking/resources/${resourceType}/${resourceId}/view`,
} as const;

