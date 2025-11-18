import { apiClient } from '@/lib/api/client';
import { USER_ENDPOINTS } from './user.endpoints';
import type {
  User,
  UpdateUserRequest,
  UpdateUserResponse,
  DeleteUserResponse,
} from './types/user.type';
import type { PaginationParams, PaginationResponse } from '@/core/api/posts/types/post.type';

/**
 * User Service
 * 
 * Handles all user-related API calls including:
 * - Getting user profiles (by ID, username, or current user)
 * - Getting all users with pagination
 * - Updating user profile
 * - Deleting user account
 */
export const userService = {
  /**
   * Get current authenticated user
   * @returns Current user data with full profile
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<User>(USER_ENDPOINTS.GET_ME);
    return response.data;
  },

  /**
   * Get all users with pagination
   * @param params - Pagination parameters
   * @returns Paginated list of users
   */
  async getAll(params?: PaginationParams): Promise<PaginationResponse<User>> {
    const response = await apiClient.get<PaginationResponse<User>>(
      USER_ENDPOINTS.GET_ALL,
      { params },
    );
    return response.data;
  },

  /**
   * Get user by ID
   * @param id - User UUID
   * @returns User profile data
   */
  async getById(id: string): Promise<User> {
    const response = await apiClient.get<User>(USER_ENDPOINTS.GET_BY_ID(id));
    return response.data;
  },

  /**
   * Get user by username
   * @param username - User username
   * @returns User profile data
   */
  async getByUsername(username: string): Promise<User> {
    const response = await apiClient.get<User>(
      USER_ENDPOINTS.GET_BY_USERNAME(username),
    );
    return response.data;
  },

  /**
   * Update current user profile
   * @param data - User update data
   * @returns Updated user data
   */
  async updateMe(data: UpdateUserRequest): Promise<UpdateUserResponse> {
    const response = await apiClient.patch<UpdateUserResponse>(
      USER_ENDPOINTS.UPDATE_ME,
      data,
    );
    return response.data;
  },

  /**
   * Delete current user account
   * @returns Deletion confirmation message
   */
  async deleteMe(): Promise<DeleteUserResponse> {
    const response = await apiClient.delete<DeleteUserResponse>(
      USER_ENDPOINTS.DELETE_ME,
    );
    return response.data;
  },
};

