import { apiClient } from '@/lib/api/client';
import { TRACKING_ENDPOINTS } from './tracking.endpoints';
import type { TrackViewResponse } from './type/tracking.type';

/**
 * Client-side deduplication helper
 * Uses localStorage to prevent duplicate tracking calls within a time window
 */
const DEDUPLICATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds
const STORAGE_PREFIX = 'view_track_';

/**
 * Check if a view was recently tracked (client-side deduplication)
 * @param resourceType - Resource type (profile, post, video, photo)
 * @param resourceId - Resource ID
 * @returns true if recently tracked, false otherwise
 */
const hasRecentClientTrack = (resourceType: string, resourceId: string): boolean => {
  if (typeof window === 'undefined') return false; // SSR check

  try {
    const storageKey = `${STORAGE_PREFIX}${resourceType}_${resourceId}`;
    const lastTrackTime = localStorage.getItem(storageKey);

    if (!lastTrackTime) {
      return false; // Never tracked before
    }

    const lastTrack = parseInt(lastTrackTime, 10);
    const now = Date.now();
    const timeSinceLastTrack = now - lastTrack;

    // If tracked within the deduplication window, skip
    if (timeSinceLastTrack < DEDUPLICATION_WINDOW_MS) {
      return true; // Recently tracked
    }

    // Window expired, allow tracking
    return false;
  } catch (error) {
    // localStorage might be disabled or full, allow tracking
    return false;
  }
};

/**
 * Mark a view as tracked (client-side)
 * @param resourceType - Resource type
 * @param resourceId - Resource ID
 */
const markAsTracked = (resourceType: string, resourceId: string): void => {
  if (typeof window === 'undefined') return; // SSR check

  try {
    const storageKey = `${STORAGE_PREFIX}${resourceType}_${resourceId}`;
    localStorage.setItem(storageKey, Date.now().toString());

    // Clean up old entries (older than 24 hours) to prevent localStorage bloat
    const cleanupThreshold = Date.now() - (24 * 60 * 60 * 1000);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          const timestamp = parseInt(value, 10);
          if (timestamp < cleanupThreshold) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    // localStorage might be disabled or full, silently fail
  }
};

/**
 * Tracking Service
 *
 * Handles all view tracking API calls including:
 * - Profile view tracking
 * - Post view tracking
 * - Video view tracking
 * - Photo view tracking
 * - Generic resource view tracking
 * 
 * Includes client-side deduplication to prevent duplicate API calls
 */
export const trackingService = {
  /**
   * Track a profile view
   * @param userId - User UUID of the profile being viewed
   * @returns Tracking response
   */
  async trackProfileView(userId: string): Promise<TrackViewResponse> {
    // Client-side deduplication check
    if (hasRecentClientTrack('profile', userId)) {
      return { success: false, reason: 'Recently tracked (client-side deduplication)' };
    }

    try {
      const response = await apiClient.post<TrackViewResponse>(
        TRACKING_ENDPOINTS.TRACK_PROFILE_VIEW(userId),
      );
      
      // Mark as tracked on successful API call
      if (response.data.success) {
        markAsTracked('profile', userId);
      }
      
      return response.data;
    } catch (error) {
      // Don't mark as tracked if API call failed
      throw error;
    }
  },

  /**
   * Track a post view
   * @param postId - Post UUID being viewed
   * @returns Tracking response
   */
  async trackPostView(postId: string): Promise<TrackViewResponse> {
    // Client-side deduplication check
    if (hasRecentClientTrack('post', postId)) {
      return { success: false, reason: 'Recently tracked (client-side deduplication)' };
    }

    try {
      const response = await apiClient.post<TrackViewResponse>(
        TRACKING_ENDPOINTS.TRACK_POST_VIEW(postId),
      );
      
      // Mark as tracked on successful API call
      if (response.data.success) {
        markAsTracked('post', postId);
      }
      
      return response.data;
    } catch (error) {
      // Don't mark as tracked if API call failed
      throw error;
    }
  },

  /**
   * Track a video view
   * @param videoId - Video UUID being viewed
   * @returns Tracking response
   */
  async trackVideoView(videoId: string): Promise<TrackViewResponse> {
    // Client-side deduplication check
    if (hasRecentClientTrack('video', videoId)) {
      return { success: false, reason: 'Recently tracked (client-side deduplication)' };
    }

    try {
      const response = await apiClient.post<TrackViewResponse>(
        TRACKING_ENDPOINTS.TRACK_VIDEO_VIEW(videoId),
      );
      
      // Mark as tracked on successful API call
      if (response.data.success) {
        markAsTracked('video', videoId);
      }
      
      return response.data;
    } catch (error) {
      // Don't mark as tracked if API call failed
      throw error;
    }
  },

  /**
   * Track a photo view
   * @param photoId - Photo UUID being viewed
   * @returns Tracking response
   */
  async trackPhotoView(photoId: string): Promise<TrackViewResponse> {
    // Client-side deduplication check
    if (hasRecentClientTrack('photo', photoId)) {
      return { success: false, reason: 'Recently tracked (client-side deduplication)' };
    }

    try {
      const response = await apiClient.post<TrackViewResponse>(
        TRACKING_ENDPOINTS.TRACK_PHOTO_VIEW(photoId),
      );
      
      // Mark as tracked on successful API call
      if (response.data.success) {
        markAsTracked('photo', photoId);
      }
      
      return response.data;
    } catch (error) {
      // Don't mark as tracked if API call failed
      throw error;
    }
  },

  /**
   * Track a resource view (generic)
   * @param resourceType - Resource type (profile, post, video, photo, etc.)
   * @param resourceId - Resource UUID being viewed
   * @returns Tracking response
   */
  async trackResourceView(
    resourceType: string,
    resourceId: string,
  ): Promise<TrackViewResponse> {
    // Client-side deduplication check
    if (hasRecentClientTrack(resourceType, resourceId)) {
      return { success: false, reason: 'Recently tracked (client-side deduplication)' };
    }

    try {
      const response = await apiClient.post<TrackViewResponse>(
        TRACKING_ENDPOINTS.TRACK_RESOURCE_VIEW(resourceType, resourceId),
      );
      
      // Mark as tracked on successful API call
      if (response.data.success) {
        markAsTracked(resourceType, resourceId);
      }
      
      return response.data;
    } catch (error) {
      // Don't mark as tracked if API call failed
      throw error;
    }
  },
};

