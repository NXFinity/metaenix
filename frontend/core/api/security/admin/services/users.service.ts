import { apiClient } from '@/lib/api/client';
import { ADMIN_ENDPOINTS } from '../admin.endpoints';
import type {
  SearchUsersParams,
  UserDetails,
  BanUserRequest,
  TimeoutUserRequest,
  ChangeRoleRequest,
  UserActivity,
  UserStats,
} from '../types/admin.type';
import type { PaginationParams, PaginationResponse } from '@/core/api/users/posts/types/post.type';
import type { User } from '@/core/api/users/user/types/user.type';
import type { UpdateUserRequest, UpdateUserResponse } from '@/core/api/users/user/types/user.type';

/**
 * Admin Users Service
 * 
 * Handles all admin user management operations including:
 * - Searching users
 * - Viewing user details
 * - Updating users
 * - Banning/unbanning users
 * - Timing out users
 * - Changing user roles
 * - Viewing user activity
 * - User statistics
 */
export const adminUsersService = {
  /**
   * Search users
   */
  async searchUsers(
    params: SearchUsersParams,
  ): Promise<PaginationResponse<User>> {
    const queryParams = new URLSearchParams();
    if (params.q && params.q.trim()) {
      queryParams.append('q', params.q.trim());
    }
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<User>>(
      `${ADMIN_ENDPOINTS.SEARCH_USERS}?${queryParams.toString()}`,
    );
    return response.data;
  },

  /**
   * Get user details (admin view)
   */
  async getUserDetails(id: string): Promise<UserDetails> {
    const response = await apiClient.get<UserDetails>(
      ADMIN_ENDPOINTS.GET_USER_DETAILS(id),
    );
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<UpdateUserResponse> {
    const response = await apiClient.patch<UpdateUserResponse>(
      ADMIN_ENDPOINTS.UPDATE_USER(id),
      data,
    );
    return response.data;
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.DELETE_USER(id));
  },

  /**
   * Ban user
   */
  async banUser(id: string, data: BanUserRequest): Promise<void> {
    await apiClient.post(ADMIN_ENDPOINTS.BAN_USER(id), data);
  },

  /**
   * Unban user
   */
  async unbanUser(id: string): Promise<void> {
    await apiClient.post(ADMIN_ENDPOINTS.UNBAN_USER(id));
  },

  /**
   * Timeout user
   */
  async timeoutUser(id: string, data: TimeoutUserRequest): Promise<void> {
    await apiClient.post(ADMIN_ENDPOINTS.TIMEOUT_USER(id), data);
  },

  /**
   * Get user activity logs
   */
  async getUserActivity(
    id: string,
    params?: PaginationParams,
  ): Promise<PaginationResponse<UserActivity>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginationResponse<UserActivity>>(
      `${ADMIN_ENDPOINTS.GET_USER_ACTIVITY(id)}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    );
    return response.data;
  },

  /**
   * Change user role
   */
  async changeUserRole(id: string, data: ChangeRoleRequest): Promise<User> {
    const response = await apiClient.patch<User>(
      ADMIN_ENDPOINTS.CHANGE_USER_ROLE(id),
      data,
    );
    return response.data;
  },

  /**
   * Clear follow cooldown
   */
  async clearCooldown(id: string, followingId: string): Promise<void> {
    await apiClient.delete(ADMIN_ENDPOINTS.CLEAR_COOLDOWN(id, followingId));
  },

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStats>(ADMIN_ENDPOINTS.GET_USER_STATS);
    return response.data;
  },
};

