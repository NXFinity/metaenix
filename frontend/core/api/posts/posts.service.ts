import { apiClient } from '@/lib/api/client';
import { POSTS_ENDPOINTS } from './posts.endpoints';
import type {
  Post,
  Comment,
  CreatePostRequest,
  UpdatePostRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateShareRequest,
  BookmarkPostRequest,
  ReportPostRequest,
  ReactToPostRequest,
  CreateCollectionRequest,
  SchedulePostRequest,
  PinPostRequest,
  PaginationParams,
  PaginationResponse,
  PostResponse,
  CommentResponse,
  DeleteResponse,
  LikeResponse,
  ShareResponse,
  BookmarkResponse,
  ReportResponse,
  ReactionResponse,
  CollectionResponse,
  PostAnalytics,
} from './types/post.type';

/**
 * Posts Service
 * 
 * Handles all post-related API calls including:
 * - Creating, reading, updating, deleting posts
 * - Post interactions (like, share, bookmark, react)
 * - Comments and replies
 * - Collections
 * - Search and filtering
 * - Analytics
 */
export const postsService = {
  /**
   * Create a new post
   * @param data - Post creation data
   * @returns Created post
   */
  async create(data: CreatePostRequest): Promise<PostResponse> {
    const response = await apiClient.post<PostResponse>(
      POSTS_ENDPOINTS.CREATE,
      data,
    );
    return response.data;
  },

  /**
   * Create a post with file uploads
   * @param formData - FormData with files and post data
   * @returns Created post
   */
  async upload(formData: FormData): Promise<PostResponse> {
    const response = await apiClient.post<PostResponse>(
      POSTS_ENDPOINTS.UPLOAD,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  /**
   * Get all posts with pagination
   * @param params - Pagination parameters
   * @returns Paginated posts
   */
  async getAll(params?: PaginationParams): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      POSTS_ENDPOINTS.GET_ALL,
      { params },
    );
    return response.data;
  },

  /**
   * Get posts by user ID
   * @param userId - User UUID
   * @param params - Pagination parameters
   * @returns Paginated posts
   */
  async getByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      POSTS_ENDPOINTS.GET_BY_USER(userId),
      { params },
    );
    return response.data;
  },

  /**
   * Get a single post by ID
   * @param postId - Post UUID
   * @returns Post data
   */
  async getById(postId: string): Promise<Post> {
    const response = await apiClient.get<Post>(
      POSTS_ENDPOINTS.GET_BY_ID(postId),
    );
    return response.data;
  },

  /**
   * Update a post
   * @param postId - Post UUID
   * @param data - Post update data
   * @returns Updated post
   */
  async update(
    postId: string,
    data: UpdatePostRequest,
  ): Promise<PostResponse> {
    const response = await apiClient.patch<PostResponse>(
      POSTS_ENDPOINTS.UPDATE(postId),
      data,
    );
    return response.data;
  },

  /**
   * Delete a post
   * @param postId - Post UUID
   * @returns Deletion confirmation
   */
  async delete(postId: string): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>(
      POSTS_ENDPOINTS.DELETE(postId),
    );
    return response.data;
  },

  /**
   * Pin or unpin a post
   * @param postId - Post UUID
   * @param data - Pin status
   * @returns Updated post
   */
  async pin(postId: string, data: PinPostRequest): Promise<PostResponse> {
    const response = await apiClient.patch<PostResponse>(
      POSTS_ENDPOINTS.PIN(postId),
      data,
    );
    return response.data;
  },

  /**
   * Archive a post
   * @param postId - Post UUID
   * @returns Updated post
   */
  async archive(postId: string): Promise<PostResponse> {
    const response = await apiClient.patch<PostResponse>(
      POSTS_ENDPOINTS.ARCHIVE(postId),
    );
    return response.data;
  },

  /**
   * Unarchive a post
   * @param postId - Post UUID
   * @returns Updated post
   */
  async unarchive(postId: string): Promise<PostResponse> {
    const response = await apiClient.patch<PostResponse>(
      POSTS_ENDPOINTS.UNARCHIVE(postId),
    );
    return response.data;
  },

  /**
   * Schedule a post
   * @param postId - Post UUID
   * @param data - Schedule data
   * @returns Updated post
   */
  async schedule(
    postId: string,
    data: SchedulePostRequest,
  ): Promise<PostResponse> {
    const response = await apiClient.patch<PostResponse>(
      POSTS_ENDPOINTS.SCHEDULE(postId),
      data,
    );
    return response.data;
  },

  /**
   * Like a post
   * @param postId - Post UUID
   * @returns Like response
   */
  async like(postId: string): Promise<LikeResponse> {
    const response = await apiClient.post<LikeResponse>(
      POSTS_ENDPOINTS.LIKE(postId),
    );
    return response.data;
  },

  /**
   * Unlike a post
   * @param postId - Post UUID
   * @returns Unlike response
   */
  async unlike(postId: string): Promise<LikeResponse> {
    const response = await apiClient.delete<LikeResponse>(
      POSTS_ENDPOINTS.UNLIKE(postId),
    );
    return response.data;
  },

  /**
   * Share a post
   * @param postId - Post UUID
   * @param data - Share data (optional comment)
   * @returns Share response
   */
  async share(
    postId: string,
    data?: CreateShareRequest,
  ): Promise<ShareResponse> {
    const response = await apiClient.post<ShareResponse>(
      POSTS_ENDPOINTS.SHARE(postId),
      data || {},
    );
    return response.data;
  },

  /**
   * Bookmark a post
   * @param postId - Post UUID
   * @param data - Bookmark data (optional note)
   * @returns Bookmark response
   */
  async bookmark(
    postId: string,
    data?: BookmarkPostRequest,
  ): Promise<BookmarkResponse> {
    const response = await apiClient.post<BookmarkResponse>(
      POSTS_ENDPOINTS.BOOKMARK(postId),
      data || {},
    );
    return response.data;
  },

  /**
   * Remove bookmark from a post
   * @param postId - Post UUID
   * @returns Unbookmark response
   */
  async unbookmark(postId: string): Promise<BookmarkResponse> {
    const response = await apiClient.delete<BookmarkResponse>(
      POSTS_ENDPOINTS.UNBOOKMARK(postId),
    );
    return response.data;
  },

  /**
   * Get user's bookmarked posts
   * @param params - Pagination parameters
   * @returns Paginated bookmarked posts
   */
  async getBookmarks(
    params?: PaginationParams,
  ): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      POSTS_ENDPOINTS.GET_BOOKMARKS,
      { params },
    );
    return response.data;
  },

  /**
   * Report a post
   * @param postId - Post UUID
   * @param data - Report data
   * @returns Report response
   */
  async report(
    postId: string,
    data: ReportPostRequest,
  ): Promise<ReportResponse> {
    const response = await apiClient.post<ReportResponse>(
      POSTS_ENDPOINTS.REPORT(postId),
      data,
    );
    return response.data;
  },

  /**
   * React to a post
   * @param postId - Post UUID
   * @param data - Reaction data
   * @returns Reaction response
   */
  async react(
    postId: string,
    data: ReactToPostRequest,
  ): Promise<ReactionResponse> {
    const response = await apiClient.post<ReactionResponse>(
      POSTS_ENDPOINTS.REACT(postId),
      data,
    );
    return response.data;
  },

  /**
   * Remove reaction from a post
   * @param postId - Post UUID
   * @returns Unreact response
   */
  async unreact(postId: string): Promise<ReactionResponse> {
    const response = await apiClient.delete<ReactionResponse>(
      POSTS_ENDPOINTS.UNREACT(postId),
    );
    return response.data;
  },

  /**
   * Get comments for a post
   * @param postId - Post UUID
   * @param params - Pagination parameters
   * @returns Paginated comments
   */
  async getComments(
    postId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Comment>> {
    const response = await apiClient.get<PaginationResponse<Comment>>(
      POSTS_ENDPOINTS.GET_COMMENTS(postId),
      { params },
    );
    return response.data;
  },

  /**
   * Create a comment on a post
   * @param postId - Post UUID
   * @param data - Comment data
   * @returns Created comment
   */
  async createComment(
    postId: string,
    data: CreateCommentRequest,
  ): Promise<CommentResponse> {
    const response = await apiClient.post<CommentResponse>(
      POSTS_ENDPOINTS.CREATE_COMMENT(postId),
      data,
    );
    return response.data;
  },

  /**
   * Get replies to a comment
   * @param commentId - Comment UUID
   * @param params - Pagination parameters
   * @returns Paginated comment replies
   */
  async getCommentReplies(
    commentId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Comment>> {
    const response = await apiClient.get<PaginationResponse<Comment>>(
      POSTS_ENDPOINTS.GET_COMMENT_REPLIES(commentId),
      { params },
    );
    return response.data;
  },

  /**
   * Update a comment
   * @param commentId - Comment UUID
   * @param data - Comment update data
   * @returns Updated comment
   */
  async updateComment(
    commentId: string,
    data: UpdateCommentRequest,
  ): Promise<CommentResponse> {
    const response = await apiClient.patch<CommentResponse>(
      POSTS_ENDPOINTS.UPDATE_COMMENT(commentId),
      data,
    );
    return response.data;
  },

  /**
   * Delete a comment
   * @param commentId - Comment UUID
   * @returns Deletion confirmation
   */
  async deleteComment(commentId: string): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>(
      POSTS_ENDPOINTS.DELETE_COMMENT(commentId),
    );
    return response.data;
  },

  /**
   * Like a comment
   * @param commentId - Comment UUID
   * @returns Like response
   */
  async likeComment(commentId: string): Promise<LikeResponse> {
    const response = await apiClient.post<LikeResponse>(
      POSTS_ENDPOINTS.LIKE_COMMENT(commentId),
    );
    return response.data;
  },

  /**
   * Unlike a comment
   * @param commentId - Comment UUID
   * @returns Unlike response
   */
  async unlikeComment(commentId: string): Promise<LikeResponse> {
    const response = await apiClient.delete<LikeResponse>(
      POSTS_ENDPOINTS.UNLIKE_COMMENT(commentId),
    );
    return response.data;
  },

  /**
   * React to a comment
   * @param commentId - Comment UUID
   * @param data - Reaction data
   * @returns Reaction response
   */
  async reactComment(
    commentId: string,
    data: ReactToPostRequest,
  ): Promise<ReactionResponse> {
    const response = await apiClient.post<ReactionResponse>(
      POSTS_ENDPOINTS.REACT_COMMENT(commentId),
      data,
    );
    return response.data;
  },

  /**
   * Remove reaction from a comment
   * @param commentId - Comment UUID
   * @returns Unreact response
   */
  async unreactComment(commentId: string): Promise<ReactionResponse> {
    const response = await apiClient.delete<ReactionResponse>(
      POSTS_ENDPOINTS.UNREACT_COMMENT(commentId),
    );
    return response.data;
  },

  /**
   * Search posts
   * @param query - Search query
   * @param params - Pagination parameters
   * @returns Paginated search results
   */
  async search(
    query: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      POSTS_ENDPOINTS.SEARCH,
      {
        params: {
          q: query,
          ...params,
        },
      },
    );
    return response.data;
  },

  /**
   * Filter posts by type
   * @param type - Post type filter
   * @param params - Pagination parameters
   * @returns Paginated filtered posts
   */
  async filter(
    type: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      POSTS_ENDPOINTS.FILTER(type),
      { params },
    );
    return response.data;
  },

  /**
   * Create a collection
   * @param data - Collection data
   * @returns Created collection
   */
  async createCollection(
    data: CreateCollectionRequest,
  ): Promise<CollectionResponse> {
    const response = await apiClient.post<CollectionResponse>(
      POSTS_ENDPOINTS.CREATE_COLLECTION,
      data,
    );
    return response.data;
  },

  /**
   * Add post to collection
   * @param collectionId - Collection UUID
   * @param postId - Post UUID
   * @returns Success response
   */
  async addToCollection(
    collectionId: string,
    postId: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      POSTS_ENDPOINTS.ADD_TO_COLLECTION(collectionId, postId),
    );
    return response.data;
  },

  /**
   * Remove post from collection
   * @param collectionId - Collection UUID
   * @param postId - Post UUID
   * @returns Success response
   */
  async removeFromCollection(
    collectionId: string,
    postId: string,
  ): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      POSTS_ENDPOINTS.REMOVE_FROM_COLLECTION(collectionId, postId),
    );
    return response.data;
  },

  /**
   * Get posts from a collection
   * @param collectionId - Collection UUID
   * @param params - Pagination parameters
   * @returns Paginated collection posts
   */
  async getCollectionPosts(
    collectionId: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<Post>> {
    const response = await apiClient.get<PaginationResponse<Post>>(
      POSTS_ENDPOINTS.GET_COLLECTION_POSTS(collectionId),
      { params },
    );
    return response.data;
  },

  /**
   * Get post analytics
   * @param postId - Post UUID
   * @returns Post analytics data
   */
  async getAnalytics(postId: string): Promise<PostAnalytics> {
    const response = await apiClient.get<PostAnalytics>(
      POSTS_ENDPOINTS.GET_ANALYTICS(postId),
    );
    return response.data;
  },
};

