import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from './admin.endpoints';

/**
 * Admin Service
 * 
 * Handles all admin-related API operations
 */
export const adminService = {
  /**
   * Get platform-wide statistics
   */
  async getStats() {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_STATS);
    return response.data;
  },

  /**
   * Get system health status
   */
  async getHealth() {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_HEALTH);
    return response.data;
  },

  /**
   * Get recent platform activity
   */
  async getActivity(params?: { page?: number; limit?: number; days?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.days) queryParams.append('days', params.days.toString());

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_ACTIVITY}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get growth metrics
   */
  async getGrowth(days: number = 30) {
    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_GROWTH}?days=${days}`,
    );
    return response.data;
  },

  /**
   * Search users
   */
  async searchUsers(params: { q: string; page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params.q && params.q.trim()) {
      queryParams.append('q', params.q.trim());
    }
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.SEARCH_USERS}?${queryParams.toString()}`,
    );
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(id: string, data: any) {
    const response = await apiClient.patch(ADMIN_ENDPOINTS.UPDATE_USER(id), data);
    return response.data;
  },

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_USER(id));
  },

  /**
   * Get user details
   */
  async getUserDetails(userId: string) {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_USER_DETAILS(userId));
    return response.data;
  },

  /**
   * Get all reports
   */
  async getReports(params?: { page?: number; limit?: number; status?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_REPORTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get report details
   */
  async getReport(id: string) {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_REPORT(id));
    return response.data;
  },

  /**
   * Review report
   */
  async reviewReport(id: string, data: { status: 'reviewed' | 'resolved' | 'dismissed' }) {
    const response = await apiClient.post(ADMIN_ENDPOINTS.REVIEW_REPORT(id), data);
    return response.data;
  },

  /**
   * Delete report
   */
  async deleteReport(id: string) {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_REPORT(id));
  },

  /**
   * Get all posts (admin view)
   */
  async getPosts(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_POSTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get post details (admin view)
   */
  async getPost(id: string) {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_POST(id));
    return response.data;
  },

  /**
   * Delete post (admin override)
   */
  async deletePost(id: string) {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_POST(id));
  },

  /**
   * Get all videos (admin view)
   */
  async getVideos(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_VIDEOS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get video details (admin view)
   */
  async getVideo(id: string) {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_VIDEO(id));
    return response.data;
  },

  /**
   * Delete video (admin override)
   */
  async deleteVideo(id: string) {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_VIDEO(id));
  },

  /**
   * Get all photos (admin view)
   */
  async getPhotos(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_PHOTOS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get photo details (admin view)
   */
  async getPhoto(id: string) {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_PHOTO(id));
    return response.data;
  },

  /**
   * Delete photo (admin override)
   */
  async deletePhoto(id: string) {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_PHOTO(id));
  },

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview() {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_ANALYTICS_OVERVIEW);
    return response.data;
  },

  /**
   * Get security alerts
   */
  async getSecurityAlerts() {
    const response = await apiClient.get(ADMIN_ENDPOINTS.GET_SECURITY_ALERTS);
    return response.data;
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(
      `${ADMIN_ENDPOINTS.GET_AUDIT_LOGS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },
};

