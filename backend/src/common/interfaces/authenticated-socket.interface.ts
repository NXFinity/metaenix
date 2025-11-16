import { Socket } from 'socket.io';
import { User } from '../../rest/api/users/assets/entities/user.entity';

/**
 * Extended Socket.IO Socket with authenticated user data
 * Used in WebSocket gateways for type-safe access to user data
 */
export interface AuthenticatedSocket extends Socket {
  /**
   * User's websocketId (UUID)
   */
  websocketId?: string;

  /**
   * User ID
   */
  userId?: string;

  /**
   * Authenticated user object
   */
  user?: User;
}

