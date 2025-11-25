import {
  WebSocketGateway,
  WebSocketServer as WsServerDecorator,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  // MessageBody, // Reserved for future use
  SubscribeMessage,
} from '@nestjs/websockets';
import { Namespace } from 'socket.io';
import {
  Injectable,
  Logger,
  // UnauthorizedException, // Reserved for future use
  OnModuleInit,
} from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { UsersService } from '../api/users/users.service';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import * as session from 'express-session';
import { SessionStoreConfig } from '../../config/session-store.config';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedSocket } from '../../common/interfaces/authenticated-socket.interface';
import {
  WEBSOCKET_RETRY_DELAY_MS,
  WEBSOCKET_MAX_RETRIES,
  SESSION_COOKIE_NAME,
} from '../../common/constants/app.constants';
import { getCorsOriginFunction } from '../../config/cors.config';
import { OnEvent } from '@nestjs/event-emitter';

const corsOriginFunction = getCorsOriginFunction(process.env.NODE_ENV || 'development');

@WebSocketGateway({
  namespace: 'account',
  cors: {
    origin: corsOriginFunction,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})
@Injectable()
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WsServerDecorator()
  server!: Namespace;
  
  private connectedClients = new Map<string, AuthenticatedSocket>();

  private readonly logger = new Logger(WebsocketGateway.name);
  private sessionStore: session.Store | null = null;
  // private readonly sessionSecret!: string; // Reserved for future session management
  private readonly sessionCookieName: string = SESSION_COOKIE_NAME;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly usersService: UsersService,
    private readonly loggingService: LoggingService,
    private readonly sessionStoreConfig: SessionStoreConfig,
    private readonly configService: ConfigService,
  ) {
    // Validate SESSION_SECRET is set (reserved for future use)
    const sessionSecret = this.configService.get<string>('SESSION_SECRET');
    if (!sessionSecret) {
      throw new Error('SESSION_SECRET environment variable is required');
    }
    // this.sessionSecret = sessionSecret; // Reserved for future use
  }

  async onModuleInit() {
    // Wait for session store to be initialized (with retries)
    // SessionStoreConfig initializes asynchronously, so we need to wait
    let retries = WEBSOCKET_MAX_RETRIES;
    while (retries > 0) {
      try {
        this.sessionStore = this.sessionStoreConfig.getStore();
        this.logger.log('WebSocket Gateway: Session store initialized');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          this.logger.warn(
            'WebSocket Gateway: Session store not available yet, will use lazy initialization',
          );
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, WEBSOCKET_RETRY_DELAY_MS),
          );
        }
      }
    }
  }

  /**
   * Handle WebSocket connection (handshake authentication)
   * Validates websocketId from session or query parameter
   */
  async handleConnection(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      // Socket.IO automatically assigns an ID, no need to generate one
      
      // Extract websocketId from URL query or headers
      const websocketId = await this.extractWebsocketId(client);

      if (!websocketId) {
        this.logger.warn(
          `Connection rejected: No websocketId provided - Socket: ${client.id}`,
        );
        client.emit('error', {
          type: 'error',
          message: 'Authentication failed: websocketId required',
        });
        client.disconnect(true);
        return;
      }

      // Validate websocketId format (UUID)
      if (!this.isValidUUID(websocketId)) {
        this.logger.warn(
          `Connection rejected: Invalid websocketId format - Socket: ${client.id}, websocketId: ${websocketId}`,
        );
        client.emit('error', {
          type: 'error',
          message: 'Authentication failed: Invalid websocketId format',
        });
        client.disconnect(true);
        return;
      }

      // Find user by websocketId
      const user = await this.usersService.findByWebsocketId(websocketId);

      if (!user) {
        this.logger.warn(
          `Connection rejected: User not found - Socket: ${client.id}, websocketId: ${websocketId}`,
        );
        client.emit('error', {
          type: 'error',
          message: 'Authentication failed: Invalid websocketId',
        });
        client.disconnect(true);
        return;
      }

      // Check if there's an existing connection for this websocketId
      const existingSocketId =
        await this.websocketService.getActiveConnection(websocketId);
      if (existingSocketId && existingSocketId !== client.id) {
        // Disconnect previous connection
        this.logger.debug(
          `Disconnecting previous connection for websocketId: ${websocketId}`,
        );
        const existingSocket = this.connectedClients.get(existingSocketId);
        if (existingSocket) {
          existingSocket.emit('error', {
            type: 'error',
            message: 'New connection established from another location',
          });
          existingSocket.disconnect(true);
        }
      }

      // Store connection
      await this.websocketService.storeConnection(
        websocketId,
        client.id,
        user.id,
      );

      // Store client in map
      this.connectedClients.set(client.id, client);

      // Attach user data to socket
      client.websocketId = websocketId;
      client.userId = user.id;
      client.user = user;
      
      // Join user-specific room for targeted messaging
      client.join(`user:${user.id}`);

      this.logger.log(
        `WebSocket connected: websocketId=${websocketId}, userId=${user.id}, socketId=${client.id}`,
      );

      // Send success message to client
      client.emit('connected', {
        type: 'connected',
        message: 'Connected to account gateway',
        websocketId,
        userId: user.id,
        username: user.username,
      });
    } catch (error) {
      this.loggingService.error(
        'Error during WebSocket connection',
        error instanceof Error ? error.stack : undefined,
        'WebsocketGateway',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { socketId: client.id },
        },
      );
      client.emit('error', {
        type: 'error',
        message: 'Connection failed: Internal server error',
      });
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      // Remove from connected clients map
      this.connectedClients.delete(client.id);
      
      const websocketId = client.websocketId;
      const userId = client.userId;

      if (websocketId && userId) {
        await this.websocketService.removeConnection(websocketId, userId, client.id);
        this.logger.log(
          `WebSocket disconnected: websocketId=${websocketId}, socketId=${client.id}`,
        );
      } else {
        this.logger.debug(
          `WebSocket disconnected without authentication: socketId=${client.id}`,
        );
      }
    } catch (error) {
      this.loggingService.error(
        'Error during WebSocket disconnection',
        error instanceof Error ? error.stack : undefined,
        'WebsocketGateway',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { socketId: client.id },
        },
      );
    }
  }

  /**
   * Ping handler for connection health checks
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    const websocketId = client.websocketId;
    if (!websocketId) {
      client.emit('error', {
        type: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    client.emit('pong', {
      type: 'pong',
      timestamp: new Date().toISOString(),
      websocketId,
    });
  }

  /**
   * Extract websocketId from URL query or headers
   * Priority: 1. Query parameter, 2. Session cookie
   */
  private async extractWebsocketId(client: AuthenticatedSocket): Promise<string | null> {
    // With Socket.IO, query parameters are available in client.handshake.query
    try {
    const queryWebsocketId = client.handshake.query.websocketId as string;
    if (queryWebsocketId) {
      return queryWebsocketId;
      }
    } catch (error) {
      // Query extraction failed, continue to cookie check
      this.logger.debug(`Error extracting websocketId from query: ${error}`);
    }

    // Try to get from session cookie
    try {
      // Get cookies from Socket.IO handshake headers
      const cookies = client.handshake.headers.cookie;
      if (!cookies) {
        return null;
      }

      // Parse cookies manually
      const cookieString = Array.isArray(cookies) ? cookies[0] : cookies;
      const cookiePairs = cookieString.split(';').map((c: string) => c.trim());
      let sessionId: string | null = null;

      for (const pair of cookiePairs) {
        const [name, value] = pair.split('=');
        if (name === this.sessionCookieName && value) {
          sessionId = value;
          break;
        }
      }

      if (!sessionId) {
        return null;
      }

      // Get session from store (lazy initialization check)
      if (!this.sessionStore) {
        try {
          this.sessionStore = this.sessionStoreConfig.getStore();
        } catch (error) {
          this.logger.debug(
            `Session store not available: ${error instanceof Error ? error.message : String(error)}`,
          );
          return null;
        }
      }

      return new Promise((resolve) => {
        this.sessionStore!.get(sessionId!, (err, session) => {
          if (err || !session) {
            resolve(null);
            return;
          }

          const sessionData = session as any;
          if (sessionData.user?.websocketId) {
            resolve(sessionData.user.websocketId);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      this.logger.debug(`Error extracting websocketId from session: ${error}`);
      return null;
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Listen for notification.created events and emit them via WebSocket
   */
  @OnEvent('notification.created')
  async handleNotificationCreated(payload: { userId: string; notification: any }) {
    try {
      const { userId, notification } = payload;
      
      // Emit notification to user's room
      this.server.to(`user:${userId}`).emit('new_notification', {
        type: 'new_notification',
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: notification.isRead,
          dateCreated: notification.dateCreated,
          actionUrl: notification.actionUrl,
        },
      });

      this.logger.debug(
        `Notification event emitted to user:${userId}, notificationId=${notification.id}`,
      );
    } catch (error) {
      this.loggingService.error(
        'Error emitting notification via WebSocket',
        error instanceof Error ? error.stack : undefined,
        'WebsocketGateway',
        {
          category: LogCategory.USER_MANAGEMENT,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { payload },
        },
      );
    }
  }
}
