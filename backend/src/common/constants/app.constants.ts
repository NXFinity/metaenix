/**
 * Application-wide constants
 * Centralized location for magic numbers and strings
 */

// ============================================
// PASSWORD & ENCRYPTION
// ============================================

/**
 * Bcrypt salt rounds for password hashing
 * Higher values = more secure but slower
 * 10 is a good balance between security and performance
 */
export const BCRYPT_SALT_ROUNDS = 10;

// ============================================
// TOKEN EXPIRATION TIMES
// ============================================

/**
 * Password reset token expiration time in hours
 */
export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Email verification token expiration time in minutes
 */
export const VERIFICATION_TOKEN_EXPIRY_MINUTES = 15;

// ============================================
// RATE LIMITING CONSTANTS
// ============================================

/**
 * Rate limiting configuration for authentication endpoints
 */
export const RATE_LIMITS = {
  // Registration: 5 attempts per hour
  REGISTRATION: {
    LIMIT: 5,
    TTL: 3600, // 1 hour in seconds
  },

  // Email verification: 10 attempts per 5 minutes
  EMAIL_VERIFICATION: {
    LIMIT: 10,
    TTL: 300, // 5 minutes in seconds
  },

  // Resend verification email: 3 attempts per 15 minutes
  RESEND_VERIFICATION: {
    LIMIT: 3,
    TTL: 900, // 15 minutes in seconds
  },

  // Login: 5 attempts per 15 minutes
  LOGIN: {
    LIMIT: 5,
    TTL: 900, // 15 minutes in seconds
  },

  // Password change: 5 attempts per hour
  PASSWORD_CHANGE: {
    LIMIT: 5,
    TTL: 3600, // 1 hour in seconds
  },

  // Forgot password: 3 attempts per hour
  FORGOT_PASSWORD: {
    LIMIT: 3,
    TTL: 3600, // 1 hour in seconds
  },

  // Reset password: 5 attempts per 5 minutes
  RESET_PASSWORD: {
    LIMIT: 5,
    TTL: 300, // 5 minutes in seconds
  },
} as const;

// ============================================
// FOLLOW COOLDOWN CONSTANTS
// ============================================

/**
 * Cooldown period in seconds before a user can follow someone again after unfollowing
 * Prevents follow/unfollow spam
 */
export const FOLLOW_COOLDOWN_SECONDS = 300; // 5 minutes

// ============================================
// PAGINATION CONSTANTS
// ============================================

/**
 * Default page size for paginated results
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Maximum page size allowed for paginated results
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default page number (first page)
 */
export const DEFAULT_PAGE = 1;

// ============================================
// SESSION CONSTANTS
// ============================================

/**
 * Session cookie name
 */
export const SESSION_COOKIE_NAME = 'metaenix.sid';

/**
 * Session max age in milliseconds (24 hours)
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Session max age in seconds (24 hours)
 */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

// ============================================
// WEBSOCKET CONSTANTS
// ============================================

/**
 * WebSocket retry delay in milliseconds
 * Used when waiting for session store initialization
 */
export const WEBSOCKET_RETRY_DELAY_MS = 100;

/**
 * Maximum number of retries for WebSocket session store initialization
 */
export const WEBSOCKET_MAX_RETRIES = 50;

// ============================================
// TIME CONSTANTS (in milliseconds)
// ============================================

export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// ============================================
// TIME CONSTANTS (in seconds)
// ============================================

export const TIME_SECONDS = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
} as const;

// ============================================
// DEFAULT IMAGE URLs
// ============================================

/**
 * Default image URLs for user profiles
 * These can be overridden via environment variables
 */
export const DEFAULT_PROFILE_IMAGES = {
  AVATAR: process.env.DEFAULT_AVATAR_URL || 'https://i.postimg.cc/SxrVKbFk/hacker.png',
  COVER: process.env.DEFAULT_COVER_URL || 'https://i.postimg.cc/k52jYYzB/cover-1.png',
  BANNER: process.env.DEFAULT_BANNER_URL || 'https://i.postimg.cc/Y26dPWn8/cover.png',
  OFFLINE: process.env.DEFAULT_OFFLINE_URL || 'https://i.postimg.cc/v8VzVVwF/offline.png',
} as const;

