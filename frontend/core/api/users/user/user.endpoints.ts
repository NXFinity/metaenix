/**
 * User API Endpoints
 * 
 * Defines all user-related API endpoint URLs
 */

export const USER_ENDPOINTS = {
  /**
   * Get all users with pagination
   * GET /users
   */
  GET_ALL: '/users',

  /**
   * Get current authenticated user
   * GET /users/me
   */
  GET_ME: '/users/me',

  /**
   * Get user by ID
   * GET /users/:id
   */
  GET_BY_ID: (id: string) => `/users/${id}`,

  /**
   * Get user by username
   * GET /users/username/:username
   */
  GET_BY_USERNAME: (username: string) => `/users/username/${username}`,

  /**
   * Update current user
   * PATCH /users/me
   */
  UPDATE_ME: '/users/me',

  /**
   * Delete current user
   * DELETE /users/me
   */
  DELETE_ME: '/users/me',
} as const;

