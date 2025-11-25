import { apiClient } from '@/lib/api/client';
import { COMMENTS_ENDPOINTS } from './comments.endpoints';
import type {
  Comment,
  CommentResourceType,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentResponse,
  PaginationParams,
  PaginationResponse,
} from './types/comment.type';

/**
 * Comments Service
 * 
 * Universal comments service that works with any resource type
 * (posts, videos, photos, articles, etc.)
 */
export const commentsService = {
  /**
   * Create a comment on any resource
   * @param resourceType - Type of resource (post, video, photo, article)
   * @param resourceId - ID of the resource
   * @param data - Comment data
   * @returns Created comment
   */
  async create(
    resourceType: CommentResourceType | string,
    resourceId: string,
    data: CreateCommentRequest,
  ): Promise<CommentResponse> {
    const response = await apiClient.post<CommentResponse>(
      COMMENTS_ENDPOINTS.CREATE(resourceType, resourceId),
      data,
    );
    return response.data;
  },

  /**
   * Get comments for a resource
   * @param resourceType - Type of resource (post, video, photo, article)
   * @param resourceId - ID of the resource
   * @param params - Pagination parameters
   * @returns Paginated comments
   */
  async getForResource(
    resourceType: CommentResourceType | string,
    resourceId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Comment>> {
    const response = await apiClient.get<PaginationResponse<Comment>>(
      COMMENTS_ENDPOINTS.GET_FOR_RESOURCE(resourceType, resourceId),
      { params },
    );
    return response.data;
  },

  /**
   * Get a single comment by ID
   * @param commentId - Comment UUID
   * @returns Comment with replies
   */
  async getById(commentId: string): Promise<CommentResponse> {
    const response = await apiClient.get<CommentResponse>(
      COMMENTS_ENDPOINTS.GET_BY_ID(commentId),
    );
    return response.data;
  },

  /**
   * Update a comment
   * @param commentId - Comment UUID
   * @param data - Updated comment data
   * @returns Updated comment
   */
  async update(
    commentId: string,
    data: UpdateCommentRequest,
  ): Promise<CommentResponse> {
    const response = await apiClient.patch<CommentResponse>(
      COMMENTS_ENDPOINTS.UPDATE(commentId),
      data,
    );
    return response.data;
  },

  /**
   * Delete a comment
   * @param commentId - Comment UUID
   * @returns Success response
   */
  async delete(commentId: string): Promise<void> {
    await apiClient.delete(COMMENTS_ENDPOINTS.DELETE(commentId));
  },
};

export default commentsService;

