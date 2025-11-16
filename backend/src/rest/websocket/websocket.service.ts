import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@redis/redis';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';

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
   * @param socketId - Socket.IO socket ID
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
   * @param websocketId - User's websocketId (UUID)
   * @param userId - User ID
   */
  async removeConnection(websocketId: string, userId: string): Promise<void> {
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

      await this.redisService.del(connectionKey);
      await this.redisService.del(userConnectionKey);

      this.logger.debug(`Removed WebSocket connection: ${websocketId}`);
    } catch (error) {
      this.loggingService.error(
        `Error removing WebSocket connection: ${websocketId}`,
        error instanceof Error ? error.stack : undefined,
        'WebsocketService',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { websocketId, userId },
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
}
