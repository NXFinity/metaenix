import { apiClient } from '@/lib/api/client';
import { PHOTOS_ENDPOINTS } from './photos.endpoints';
import { commentsService } from '@/core/api/social/comments';
import { likesService } from '@/core/api/social/likes';
import { sharesService } from '@/core/api/social/shares';
import type {
  Photo,
  CreatePhotoRequest,
  UpdatePhotoRequest,
  PaginationParams,
  PaginationResponse,
  PhotoResponse,
  DeletePhotoResponse,
} from './types/photo.type';
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
 * Photos Service
 * 
 * Handles all photo-related API calls including:
 * - Uploading photos
 * - Creating, reading, updating, deleting photos
 * - Getting user's photo library
 */
const photosService = {
  /**
   * Upload a photo
   * @param formData - FormData with photo file and metadata
   * @param onUploadProgress - Optional callback to track upload progress
   * @returns Created photo
   */
  async upload(
    formData: FormData,
    onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void,
  ): Promise<PhotoResponse> {
    const response = await apiClient.post<PhotoResponse>(
      PHOTOS_ENDPOINTS.UPLOAD,
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
   * Get all photos for a user (paginated)
   * @param userId - User ID
   * @param params - Pagination parameters
   * @returns Paginated photos
   */
  async getByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Photo>> {
    const response = await apiClient.get<PaginationResponse<Photo>>(
      PHOTOS_ENDPOINTS.GET_BY_USER(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Get a single photo by ID
   * @param id - Photo ID
   * @returns Photo
   */
  async getById(id: string): Promise<PhotoResponse> {
    const response = await apiClient.get<PhotoResponse>(
      PHOTOS_ENDPOINTS.GET_BY_ID(id),
    );
    return response.data;
  },

  /**
   * Update a photo
   * @param id - Photo ID
   * @param data - Update data
   * @returns Updated photo
   */
  async update(
    id: string,
    data: UpdatePhotoRequest,
  ): Promise<PhotoResponse> {
    const response = await apiClient.patch<PhotoResponse>(
      PHOTOS_ENDPOINTS.UPDATE(id),
      data,
    );
    return response.data;
  },

  /**
   * Delete a photo
   * @param id - Photo ID
   * @returns Deletion confirmation
   */
  async delete(id: string): Promise<DeletePhotoResponse> {
    const response = await apiClient.delete<DeletePhotoResponse>(
      PHOTOS_ENDPOINTS.DELETE(id),
    );
    return response.data;
  },

  /**
   * Track photo view
   * @param id - Photo ID
   * @returns Success response
   */
  async trackView(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      PHOTOS_ENDPOINTS.TRACK_VIEW(id),
    );
    return response.data;
  },

  // #########################################################
  // COMMENTS
  // #########################################################

  /**
   * Get comments for a photo
   * @param photoId - Photo ID
   * @param params - Pagination parameters
   * @returns Paginated comments
   */
  async getComments(
    photoId: string,
    params?: PaginationParams,
  ): Promise<CommentPaginationResponse<Comment>> {
    return commentsService.getForResource('photo', photoId, params);
  },

  /**
   * Create a comment on a photo
   * @param photoId - Photo ID
   * @param data - Comment data
   * @returns Created comment
   */
  async createComment(
    photoId: string,
    data: CreateCommentRequest,
  ): Promise<CommentResponse> {
    return commentsService.create('photo', photoId, data);
  },

  /**
   * Update a comment on a photo
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
   * Delete a comment on a photo
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
   * Like a photo
   * @param photoId - Photo ID
   * @returns Like response
   */
  async like(photoId: string): Promise<LikeResponse> {
    return likesService.like('photo', photoId);
  },

  /**
   * Unlike a photo
   * @param photoId - Photo ID
   * @returns Unlike response
   */
  async unlike(photoId: string): Promise<LikeResponse> {
    return likesService.unlike('photo', photoId);
  },

  /**
   * Check if user has liked a photo
   * @param photoId - Photo ID
   * @returns Like status
   */
  async checkLikeStatus(photoId: string): Promise<LikeStatusResponse> {
    return likesService.checkStatus('photo', photoId);
  },

  /**
   * Get likes count for a photo
   * @param photoId - Photo ID
   * @returns Likes count
   */
  async getLikesCount(photoId: string): Promise<LikeCountResponse> {
    return likesService.getCount('photo', photoId);
  },

  // #########################################################
  // SHARES
  // #########################################################

  /**
   * Share a photo
   * @param photoId - Photo ID
   * @param data - Share data (optional comment)
   * @returns Share response
   */
  async share(
    photoId: string,
    data?: CreateShareRequest,
  ): Promise<ShareResponse> {
    return sharesService.share('photo', photoId, data);
  },

  /**
   * Unshare a photo
   * @param photoId - Photo ID
   * @returns void
   */
  async unshare(photoId: string): Promise<void> {
    return sharesService.unshare('photo', photoId);
  },

  /**
   * Check if user has shared a photo
   * @param photoId - Photo ID
   * @returns Share status
   */
  async checkShareStatus(photoId: string): Promise<ShareStatusResponse> {
    return sharesService.checkStatus('photo', photoId);
  },

  /**
   * Get shares count for a photo
   * @param photoId - Photo ID
   * @returns Shares count
   */
  async getSharesCount(photoId: string): Promise<ShareCountResponse> {
    return sharesService.getCount('photo', photoId);
  },

  /**
   * Get user's shared photos
   * @param params - Pagination parameters
   * @returns Paginated shared photos
   */
  async getSharedPhotos(params?: PaginationParams): Promise<PaginationResponse<Photo>> {
    return sharesService.getSharedPhotos(params);
  },
};

export { photosService };

