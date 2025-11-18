import { Request } from 'express';

/**
 * Extended Express Request with authenticated user
 * Used throughout the application for type-safe access to user data
 * User is set by JWT strategy via Passport
 */
export interface AuthenticatedRequest extends Request {
  /**
   * Authenticated user (set by JwtStrategy via AuthGuard)
   * Available when user is authenticated via JWT token
   */
  user?: {
    id: string;
    email?: string;
    role?: string;
    roles?: string[];
    websocketId?: string;
  };
}

