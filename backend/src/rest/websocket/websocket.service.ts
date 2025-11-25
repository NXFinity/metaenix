import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { Namespace } from 'socket.io';

@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Store active WebSocket connection for a websocketId
   * @param websocketId - User's websocketId (UUID)
   * @param socketId - WebSocket socket ID
   * @param userId - User ID
   */
  async storeConnection(
    websocketId: string,
    socketId: string,
    userId: string,
  ): Promise<void> {
    try {
      const connectionKey = this.redisService.keyBuilder.build(
        'ws',
        'account',
        websocketId,
      );
      const userConnectionKey = this.redisService.keyBuilder.build(
        'ws',
        'user',
        userId,
      );

      // Store connection mapping: ws:account:{websocketId} -> socketId
      await this.redisService.set(connectionKey, socketId, 86400); // 24 hours TTL

      // Store user-to-websocketId mapping: ws:user:{userId} -> websocketId
      await this.redisService.set(userConnectionKey, websocketId, 86400); // 24 hours TTL

      this.logger.debug(
        `Stored WebSocket connection: ${websocketId} -> ${socketId}`,
      );
    } catch (error) {
      this.loggingService.error(
        `Error storing WebSocket connection: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'WebsocketService',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId, socketId, userId },
        },
      );
      throw error;
    }
  }

  /**
   * Remove WebSocket connection for a websocketId
   * Only removes if the stored socketId matches the one being removed
   * @param websocketId - User's websocketId (UUID)
   * @param userId - User ID
   * @param socketId - Socket ID to remove (optional, for safety check)
   */
  async removeConnection(websocketId: string, userId: string, socketId?: string): Promise<void> {
    try {
      const connectionKey = this.redisService.keyBuilder.build(
        'ws',
        'account',
        websocketId,
      );
      const userConnectionKey = this.redisService.keyBuilder.build(
        'ws',
        'user',
        userId,
      );

      // Only remove if the stored socketId matches (or if socketId not provided for backward compatibility)
      if (socketId) {
        const storedSocketId = await this.redisService.get<string>(connectionKey);
        if (storedSocketId && storedSocketId !== socketId) {
          // Different socketId is stored - don't remove (new connection has taken over)
          this.logger.debug(
            `Not removing connection: stored socketId (${storedSocketId}) differs from disconnecting socketId (${socketId})`,
          );
          return;
        }
      }

      await this.redisService.del(connectionKey);
      await this.redisService.del(userConnectionKey);

      this.logger.debug(`Removed WebSocket connection: ${websocketId}${socketId ? ` (socketId: ${socketId})` : ''}`);
    } catch (error) {
      this.loggingService.error(
        `Error removing WebSocket connection: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'WebsocketService',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId, userId, socketId },
        },
      );
    }
  }

  /**
   * Check if websocketId has an active connection
   * @param websocketId - User's websocketId (UUID)
   * @returns Socket ID if connected, null otherwise
   */
  async getActiveConnection(websocketId: string): Promise<string | null> {
    try {
      const connectionKey = this.redisService.keyBuilder.build(
        'ws',
        'account',
        websocketId,
      );
      return await this.redisService.get<string>(connectionKey);
    } catch (error) {
      this.loggingService.error(
        `Error getting active connection: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'WebsocketService',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId },
        },
      );
      return null;
    }
  }

  /**
   * Get websocketId for a user ID
   * @param userId - User ID
   * @returns websocketId if found, null otherwise
   */
  async getWebsocketIdByUserId(userId: string): Promise<string | null> {
    try {
      const userConnectionKey = this.redisService.keyBuilder.build(
        'ws',
        'user',
        userId,
      );
      return await this.redisService.get<string>(userConnectionKey);
    } catch (error) {
      this.loggingService.error(
        `Error getting websocketId for user: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'WebsocketService',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { userId },
        },
      );
      return null;
    }
  }

  /**
   * Force disconnect a user by websocketId
   * @param websocketId - User's websocketId (UUID)
   * @param namespaceServer - Socket.IO namespace server instance (already the /account namespace)
   * @param reason - Reason for disconnection
   */
  async forceDisconnect(
    websocketId: string,
    namespaceServer: Namespace,
    reason: string = 'Session terminated by admin',
  ): Promise<void> {
    try {
      const socketId = await this.getActiveConnection(websocketId);
      if (!socketId) {
        this.logger.warn(
          `No active connection found for websocketId: ${websocketId}`,
        );
        return;
      }

      // The namespaceServer is already the /account namespace from WebsocketGateway
      // Get the socket from the namespace
      const socket = namespaceServer.sockets.get(socketId);
      if (!socket) {
        this.logger.warn(
          `Socket not found in namespace: websocketId=${websocketId}, socketId=${socketId}`,
        );
        return;
      }

      // Check if socket is connected
      if (!socket.connected) {
        this.logger.warn(
          `Socket is not connected: websocketId=${websocketId}, socketId=${socketId}`,
        );
        // Still try to disconnect to clean up
        socket.disconnect(true);
        return;
      }

      // Get userId from socket data
      const userId = (socket as any).userId || (socket as any).data?.userId;
      
      // Emit logout event before disconnecting
      const logoutData = {
        type: 'logout',
        message: reason,
        reason: 'session_terminated',
      };
      
      this.logger.log(
        `Emitting logout event: websocketId=${websocketId}, socketId=${socketId}, userId=${userId || 'unknown'}, connected=${socket.connected}`,
      );
      
      // Emit directly to the socket (most reliable)
      try {
        socket.emit('logout', logoutData);
        this.logger.log(`Emitted logout event directly to socket: ${socketId}`);
      } catch (error) {
        this.logger.error(`Failed to emit logout to socket: ${error}`);
      }
      
      // Also emit to user's room to ensure delivery (backup method)
      if (userId) {
        try {
          namespaceServer.to(`user:${userId}`).emit('logout', logoutData);
          this.logger.log(`Emitted logout event to user room: user:${userId}`);
        } catch (error) {
          this.logger.error(`Failed to emit logout to room: ${error}`);
        }
      }
      
      // Also try emitting to the socket's rooms as a fallback
      try {
        const rooms = Array.from(socket.rooms);
        this.logger.log(`Socket rooms: ${rooms.join(', ')}`);
        for (const room of rooms) {
          if (room !== socketId) { // Don't emit to the socket's own room
            namespaceServer.to(room).emit('logout', logoutData);
            this.logger.log(`Emitted logout to room: ${room}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to emit logout to rooms: ${error}`);
      }

      // Give the client more time to receive the event before disconnecting
      // Use a longer delay to ensure the event is received
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Force disconnect the socket
      socket.disconnect(true);

      this.logger.log(
        `Force disconnected user: websocketId=${websocketId}, socketId=${socketId}`,
      );
    } catch (error) {
      this.loggingService.error(
        `Error force disconnecting user: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'WebsocketService',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId },
        },
      );
    }
  }
}

