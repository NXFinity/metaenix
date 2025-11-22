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

  /**
   * Request ID (set by RequestIdMiddleware)
   * Unique identifier for tracing requests across services and logs
   */
  requestId?: string;

  /**
   * Correlation ID (set by RequestIdMiddleware)
   * Same as requestId, supports X-Correlation-Id header from clients
   */
  correlationId?: string;
}

