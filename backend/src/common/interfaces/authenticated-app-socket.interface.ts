import { Socket } from 'socket.io';
import { Application } from '../../security/developer/assets/entities/application.entity';

/**
 * Extended Socket.IO Socket with authenticated application data
 * Used in Developer WebSocket gateway for type-safe access to application data
 */
export interface AuthenticatedAppSocket extends Socket {
  /**
   * Application's websocketId (UUID)
   */
  websocketId?: string;

  /**
   * Application ID
   */
  applicationId?: string;

  /**
   * Authenticated application object
   */
  application?: Application;

  /**
   * Subscribed events (set of event names)
   */
  subscribedEvents?: Set<string>;
}

