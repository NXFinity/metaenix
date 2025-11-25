import { apiClient } from '@/lib/api/client';
import { VIDEOS_ENDPOINTS } from './videos.endpoints';
import { commentsService } from '@/core/api/social/comments';
import { likesService } from '@/core/api/social/likes';
import { sharesService } from '@/core/api/social/shares';
import type {
  Video,
  CreateVideoRequest,
  UpdateVideoRequest,
  PaginationParams,
  PaginationResponse,
  VideoResponse,
  DeleteVideoResponse,
} from './types/video.type';
import type {
  CreateCommentRequest,
  CommentResponse,
  PaginationResponse as CommentPaginationResponse,
  Comment,
} from '@/core/api/social/comments';
import type {
  LikeResponse,
  LikeStatusResponse,
  LikeCountResponse,
} from '@/core/api/social/likes';
import type {
  CreateShareRequest,
  ShareResponse,
  ShareStatusResponse,
  ShareCountResponse,
} from '@/core/api/social/shares';

/**
 * Videos Service
 * 
 * Handles all video-related API calls including:
 * - Uploading videos
 * - Creating, reading, updating, deleting videos
 * - Getting user's video library
 */
const videosService = {
  /**
   * Upload a video
   * @param formData - FormData with video file and metadata
   * @param onUploadProgress - Optional callback to track upload progress
   * @returns Created video
   */
  async upload(
    formData: FormData,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
  ): Promise<VideoResponse> {
    const response = await apiClient.post<VideoResponse>(
      VIDEOS_ENDPOINTS.UPLOAD,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onUploadProgress
          ? (progressEvent) => {
              if (progressEvent.total) {
                onUploadProgress({
                  loaded: progressEvent.loaded,
                  total: progressEvent.total,
                });
              }
            }
          : undefined,
      },
    );
    return response.data;
  },

  /**
   * Get all videos for a user (paginated)
   * @param userId - User ID
   * @param params - Pagination parameters
   * @returns Paginated videos
   */
  async getByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Video>> {
    const response = await apiClient.get<PaginationResponse<Video>>(
      VIDEOS_ENDPOINTS.GET_BY_USER(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Get a single video by ID
   * @param id - Video ID
   * @returns Video
   */
  async getById(id: string): Promise<VideoResponse> {
    const response = await apiClient.get<VideoResponse>(
      VIDEOS_ENDPOINTS.GET_BY_ID(id),
    );
    return response.data;
  },

  /**
   * Update a video
   * @param id - Video ID
   * @param data - Update data
   * @returns Updated video
   */
  async update(
    id: string,
    data: UpdateVideoRequest,
  ): Promise<VideoResponse> {
    const response = await apiClient.patch<VideoResponse>(
      VIDEOS_ENDPOINTS.UPDATE(id),
      data,
    );
    return response.data;
  },

  /**
   * Delete a video
   * @param id - Video ID
   * @returns Deletion confirmation
   */
  async delete(id: string): Promise<DeleteVideoResponse> {
    const response = await apiClient.delete<DeleteVideoResponse>(
      VIDEOS_ENDPOINTS.DELETE(id),
    );
    return response.data;
  },


  /**
   * Upload video thumbnail
   * @param id - Video ID
   * @param thumbnailFile - Thumbnail image file
   * @returns Updated video with thumbnail URL
   */
  async uploadThumbnail(id: string, thumbnailFile: File): Promise<VideoResponse> {
    const formData = new FormData();
    formData.append('thumbnail', thumbnailFile);

    const response = await apiClient.post<VideoResponse>(
      VIDEOS_ENDPOINTS.UPLOAD_THUMBNAIL(id),
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  // #########################################################
  // COMMENTS
  // #########################################################

  /**
   * Get comments for a video
   * @param videoId - Video ID
   * @param params - Pagination parameters
   * @returns Paginated comments
   */
  async getComments(
    videoId: string,
    params?: PaginationParams,
  ): Promise<CommentPaginationResponse<Comment>> {
    return commentsService.getForResource('video', videoId, params);
  },

  /**
   * Create a comment on a video
   * @param videoId - Video ID
   * @param data - Comment data
   * @returns Created comment
   */
  async createComment(
    videoId: string,
    data: CreateCommentRequest,
  ): Promise<CommentResponse> {
    return commentsService.create('video', videoId, data);
  },

  /**
   * Update a comment on a video
   * @param commentId - Comment ID
   * @param data - Comment update data
   * @returns Updated comment
   */
  async updateComment(
    commentId: string,
    data: { content?: string },
  ): Promise<CommentResponse> {
    return commentsService.update(commentId, data);
  },

  /**
   * Delete a comment on a video
   * @param commentId - Comment ID
   * @returns Success response
   */
  async deleteComment(commentId: string): Promise<void> {
    return commentsService.delete(commentId);
  },

  // #########################################################
  // LIKES
  // #########################################################

  /**
   * Like a video
   * @param videoId - Video ID
   * @returns Like response
   */
  async like(videoId: string): Promise<LikeResponse> {
    return likesService.like('video', videoId);
  },

  /**
   * Unlike a video
   * @param videoId - Video ID
   * @returns Unlike response
   */
  async unlike(videoId: string): Promise<LikeResponse> {
    return likesService.unlike('video', videoId);
  },

  /**
   * Check if user has liked a video
   * @param videoId - Video ID
   * @returns Like status
   */
  async checkLikeStatus(videoId: string): Promise<LikeStatusResponse> {
    return likesService.checkStatus('video', videoId);
  },

  /**
   * Get likes count for a video
   * @param videoId - Video ID
   * @returns Likes count
   */
  async getLikesCount(videoId: string): Promise<LikeCountResponse> {
    return likesService.getCount('video', videoId);
  },

  // #########################################################
  // SHARES
  // #########################################################

  /**
   * Share a video
   * @param videoId - Video ID
   * @param data - Share data (optional comment)
   * @returns Share response
   */
  async share(
    videoId: string,
    data?: CreateShareRequest,
  ): Promise<ShareResponse> {
    return sharesService.share('video', videoId, data);
  },

  /**
   * Unshare a video
   * @param videoId - Video ID
   * @returns void
   */
  async unshare(videoId: string): Promise<void> {
    return sharesService.unshare('video', videoId);
  },

  /**
   * Check if user has shared a video
   * @param videoId - Video ID
   * @returns Share status
   */
  async checkShareStatus(videoId: string): Promise<ShareStatusResponse> {
    return sharesService.checkStatus('video', videoId);
  },

  /**
   * Get shares count for a video
   * @param videoId - Video ID
   * @returns Shares count
   */
  async getSharesCount(videoId: string): Promise<ShareCountResponse> {
    return sharesService.getCount('video', videoId);
  },

  /**
   * Get user's shared videos
   * @param params - Pagination parameters
   * @returns Paginated shared videos
   */
  async getSharedVideos(params?: PaginationParams): Promise<PaginationResponse<Video>> {
    return sharesService.getSharedVideos(params);
  },
};

export { videosService };

