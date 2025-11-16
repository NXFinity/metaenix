import { Request } from 'express';
import { User } from '../../rest/api/users/assets/entities/user.entity';
import * as session from 'express-session';

/**
 * Extended Express Request with authenticated user
 * Used throughout the application for type-safe access to user data
 */
export interface AuthenticatedRequest extends Omit<Request, 'session' | 'user'> {
  /**
   * Authenticated user (set by AuthGuard)
   * Available when user is authenticated via session
   */
  user?: User;

  /**
   * Express session with user data
   */
  session?: session.Session & {
    /**
     * User data stored in session (partial user object)
     */
    user?: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      role: string;
      websocketId: string;
      isVerified: boolean;
    };
    /**
     * Pending login data (for 2FA flow)
     */
    pendingLogin?: {
      userId: string;
      email: string;
      passwordVerified: boolean;
      createdAt: Date; // Timestamp for timeout checking
    };
  };
}

