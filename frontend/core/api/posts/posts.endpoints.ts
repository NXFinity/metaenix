/**
 * Posts API Endpoints
 * 
 * Defines all post-related API endpoint URLs
 */

export const POSTS_ENDPOINTS = {
  /**
   * Create a new post
   * POST /posts
   */
  CREATE: '/posts',

  /**
   * Create a post with file uploads
   * POST /posts/upload
   */
  UPLOAD: '/posts/upload',

  /**
   * Get all posts with pagination
   * GET /posts?page=1&limit=20
   */
  GET_ALL: '/posts',

  /**
   * Get posts by user ID
   * GET /posts/user/:userId?page=1&limit=20
   */
  GET_BY_USER: (userId: string) => `/posts/user/${userId}`,

  /**
   * Get a single post by ID
   * GET /posts/:postId
   */
  GET_BY_ID: (postId: string) => `/posts/${postId}`,

  /**
   * Update a post
   * PATCH /posts/:postId
   */
  UPDATE: (postId: string) => `/posts/${postId}`,

  /**
   * Delete a post
   * DELETE /posts/:postId
   */
  DELETE: (postId: string) => `/posts/${postId}`,

  /**
   * Pin or unpin a post
   * PATCH /posts/:postId/pin
   */
  PIN: (postId: string) => `/posts/${postId}/pin`,

  /**
   * Archive a post
   * PATCH /posts/:postId/archive
   */
  ARCHIVE: (postId: string) => `/posts/${postId}/archive`,

  /**
   * Unarchive a post
   * PATCH /posts/:postId/unarchive
   */
  UNARCHIVE: (postId: string) => `/posts/${postId}/unarchive`,

  /**
   * Schedule a post
   * PATCH /posts/:postId/schedule
   */
  SCHEDULE: (postId: string) => `/posts/${postId}/schedule`,

  /**
   * Like a post
   * POST /posts/:postId/like
   */
  LIKE: (postId: string) => `/posts/${postId}/like`,

  /**
   * Unlike a post
   * DELETE /posts/:postId/like
   */
  UNLIKE: (postId: string) => `/posts/${postId}/like`,

  /**
   * Share a post
   * POST /posts/:postId/share
   */
  SHARE: (postId: string) => `/posts/${postId}/share`,

  /**
   * Bookmark a post
   * POST /posts/:postId/bookmark
   */
  BOOKMARK: (postId: string) => `/posts/${postId}/bookmark`,

  /**
   * Remove bookmark from a post
   * DELETE /posts/:postId/bookmark
   */
  UNBOOKMARK: (postId: string) => `/posts/${postId}/bookmark`,

  /**
   * Get user's bookmarked posts
   * GET /posts/bookmarks?page=1&limit=20
   */
  GET_BOOKMARKS: '/posts/bookmarks',

  /**
   * Report a post
   * POST /posts/:postId/report
   */
  REPORT: (postId: string) => `/posts/${postId}/report`,

  /**
   * React to a post
   * POST /posts/:postId/react
   */
  REACT: (postId: string) => `/posts/${postId}/react`,

  /**
   * Remove reaction from a post
   * DELETE /posts/:postId/react
   */
  UNREACT: (postId: string) => `/posts/${postId}/react`,

  /**
   * Get comments for a post
   * GET /posts/:postId/comments?page=1&limit=20
   */
  GET_COMMENTS: (postId: string) => `/posts/${postId}/comments`,

  /**
   * Create a comment on a post
   * POST /posts/:postId/comments
   */
  CREATE_COMMENT: (postId: string) => `/posts/${postId}/comments`,

  /**
   * Get replies to a comment
   * GET /posts/comments/:commentId/replies?page=1&limit=20
   */
  GET_COMMENT_REPLIES: (commentId: string) => `/posts/comments/${commentId}/replies`,

  /**
   * Update a comment
   * PATCH /posts/comments/:commentId
   */
  UPDATE_COMMENT: (commentId: string) => `/posts/comments/${commentId}`,

  /**
   * Delete a comment
   * DELETE /posts/comments/:commentId
   */
  DELETE_COMMENT: (commentId: string) => `/posts/comments/${commentId}`,

  /**
   * Like a comment
   * POST /posts/comments/:commentId/like
   */
  LIKE_COMMENT: (commentId: string) => `/posts/comments/${commentId}/like`,

  /**
   * Unlike a comment
   * DELETE /posts/comments/:commentId/like
   */
  UNLIKE_COMMENT: (commentId: string) => `/posts/comments/${commentId}/like`,

  /**
   * React to a comment
   * POST /posts/comments/:commentId/react
   */
  REACT_COMMENT: (commentId: string) => `/posts/comments/${commentId}/react`,

  /**
   * Remove reaction from a comment
   * DELETE /posts/comments/:commentId/react
   */
  UNREACT_COMMENT: (commentId: string) => `/posts/comments/${commentId}/react`,

  /**
   * Search posts
   * GET /posts/search?q=query&page=1&limit=20
   */
  SEARCH: '/posts/search',

  /**
   * Filter posts by type
   * GET /posts/filter/:type?page=1&limit=20
   */
  FILTER: (type: string) => `/posts/filter/${type}`,

  /**
   * Create a collection
   * POST /posts/collections
   */
  CREATE_COLLECTION: '/posts/collections',

  /**
   * Add post to collection
   * POST /posts/collections/:collectionId/posts/:postId
   */
  ADD_TO_COLLECTION: (collectionId: string, postId: string) =>
    `/posts/collections/${collectionId}/posts/${postId}`,

  /**
   * Remove post from collection
   * DELETE /posts/collections/:collectionId/posts/:postId
   */
  REMOVE_FROM_COLLECTION: (collectionId: string, postId: string) =>
    `/posts/collections/${collectionId}/posts/${postId}`,

  /**
   * Get posts from a collection
   * GET /posts/collections/:collectionId/posts?page=1&limit=20
   */
  GET_COLLECTION_POSTS: (collectionId: string) =>
    `/posts/collections/${collectionId}/posts`,

  /**
   * Get post analytics
   * GET /posts/:postId/analytics
   */
  GET_ANALYTICS: (postId: string) => `/posts/${postId}/analytics`,
} as const;

