import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  Report,
  ReviewReportRequest,
} from '../types/admin.type';
import type { PaginationParams, PaginationResponse } from '@/core/api/users/posts/types/post.type';
import type { Post } from '@/core/api/users/posts/types/post.type';
import type { Video } from '@/core/api/users/videos/types/video.type';
import type { Photo } from '@/core/api/users/photos/types/photo.type';

/**
 * Admin Content Service
 * 
 * Handles all admin content moderation operations including:
 * - Managing reports
 * - Viewing and deleting posts, videos, and photos
 */
export const adminContentService = {
  /**
   * Get all reports
   */
  async getReports(
    params?: PaginationParams & { status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed' },
  ): Promise<PaginationResponse<Report>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get<PaginationResponse<Report>>(
      `${ADMIN_ENDPOINTS.GET_REPORTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get report details
   */
  async getReport(id: string): Promise<Report> {
    const response = await apiClient.get<Report>(ADMIN_ENDPOINTS.GET_REPORT(id));
    return response.data;
  },

  /**
   * Review report
   */
  async reviewReport(id: string, data: ReviewReportRequest): Promise<Report> {
    const response = await apiClient.post<Report>(
      ADMIN_ENDPOINTS.REVIEW_REPORT(id),
      data,
    );
    return response.data;
  },

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_REPORT(id));
  },

  /**
   * Get all posts (admin view)
   */
  async getPosts(params?: PaginationParams): Promise<PaginationResponse<Post>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<Post>>(
      `${ADMIN_ENDPOINTS.GET_POSTS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get post details (admin view)
   */
  async getPost(id: string): Promise<Post> {
    const response = await apiClient.get<Post>(ADMIN_ENDPOINTS.GET_POST(id));
    return response.data;
  },

  /**
   * Delete post (admin override)
   */
  async deletePost(id: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_POST(id));
  },

  /**
   * Get all videos (admin view)
   */
  async getVideos(params?: PaginationParams): Promise<PaginationResponse<Video>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<Video>>(
      `${ADMIN_ENDPOINTS.GET_VIDEOS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get video details (admin view)
   */
  async getVideo(id: string): Promise<Video> {
    const response = await apiClient.get<Video>(ADMIN_ENDPOINTS.GET_VIDEO(id));
    return response.data;
  },

  /**
   * Delete video (admin override)
   */
  async deleteVideo(id: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_VIDEO(id));
  },

  /**
   * Get all photos (admin view)
   */
  async getPhotos(params?: PaginationParams): Promise<PaginationResponse<Photo>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<Photo>>(
      `${ADMIN_ENDPOINTS.GET_PHOTOS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Get photo details (admin view)
   */
  async getPhoto(id: string): Promise<Photo> {
    const response = await apiClient.get<Photo>(ADMIN_ENDPOINTS.GET_PHOTO(id));
    return response.data;
  },

  /**
   * Delete photo (admin override)
   */
  async deletePhoto(id: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_PHOTO(id));
  },
};

