import {
  WebSocketGateway,
  WebSocketServer as WsServerDecorator,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  // MessageBody, // Reserved for future use
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config'; // Reserved for future use
// import { FollowsService } from './follows.service'; // Reserved for future use
import { AuthenticatedSocket } from 'src/common/interfaces/authenticated-socket.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../assets/entities/user.entity';

@WebSocketGateway({
  namespace: 'follows',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class FollowsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WsServerDecorator()
  server!: Server;
  
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private userRooms = new Map<string, Set<string>>(); // room -> Set of client IDs
  private clientRooms = new Map<string, Set<string>>(); // client ID -> Set of rooms

  private readonly logger = new Logger(FollowsGateway.name);

  constructor(
    // private readonly followsService: FollowsService, // Reserved for future use
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    // private readonly configService: ConfigService, // Reserved for future use
    private readonly loggingService: LoggingService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Socket.IO automatically assigns an ID
      // Extract websocketId from Socket.IO handshake query
      const websocketId = client.handshake.query.websocketId as string;

      if (!websocketId || typeof websocketId !== 'string') {
        this.logger.warn(
          `Unauthorized connection attempt from ${client.id} - No websocketId`,
        );
        client.disconnect(true);
        return;
      }

      // Validate websocketId format (UUID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(websocketId)) {
        this.logger.warn(
          `Connection rejected: Invalid websocketId format - Socket: ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      // Verify websocketId and get user
      const user = await this.userRepository.findOne({
        where: { websocketId },
        select: ['id', 'username', 'displayName', 'websocketId'],
      });

      if (!user) {
        this.logger.warn(
          `Unauthorized connection attempt from ${client.id} - Invalid websocketId`,
        );
        client.disconnect(true);
        return;
      }

      // Attach user to socket
      client.user = user;
      client.userId = user.id;
      client.websocketId = websocketId;

      // Store client
      this.connectedClients.set(client.id, client);

      // Join user's personal room for direct notifications
      this.joinRoom(client.id, `user:${user.id}`);

      this.logger.log(`User ${user.id} connected to follows namespace`);
    } catch (error) {
      this.logger.error(`Error handling connection: ${error}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    // Remove from connected clients
    this.connectedClients.delete(client.id);
    
    // Remove from all rooms
    const rooms = this.clientRooms.get(client.id);
    if (rooms) {
      for (const room of rooms) {
        this.leaveRoom(client.id, room);
      }
      this.clientRooms.delete(client.id);
    }

    if (client.user?.id) {
      this.logger.log(
        `User ${client.user.id} disconnected from follows namespace`,
      );
    }
  }

  private joinRoom(clientId: string, room: string): void {
    if (!this.userRooms.has(room)) {
      this.userRooms.set(room, new Set());
    }
    this.userRooms.get(room)!.add(clientId);

    if (!this.clientRooms.has(clientId)) {
      this.clientRooms.set(clientId, new Set());
    }
    this.clientRooms.get(clientId)!.add(room);
  }

  private leaveRoom(clientId: string, room: string): void {
    const roomClients = this.userRooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.userRooms.delete(room);
      }
    }

    const clientRooms = this.clientRooms.get(clientId);
    if (clientRooms) {
      clientRooms.delete(room);
    }
  }

  private broadcastToRoom(room: string, event: string, data: any): void {
    const clients = this.userRooms.get(room);
    if (!clients) return;

    const message = JSON.stringify({ type: event, ...data });
    for (const clientId of clients) {
      const client = this.connectedClients.get(clientId);
      if (client && client.connected) {
        client.send(message);
      }
    }
  }

  /**
   * Notify a user that someone followed them via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to user.followed event
   */
  async notifyNewFollower(
    followingId: string,
    followerId: string,
  ): Promise<void> {
    try {
      // Check user's notification preference
      const user = await this.userRepository.findOne({
        where: { id: followingId },
        relations: ['privacy'],
        select: ['id'],
      });

      if (user?.privacy && user.privacy.notifyOnFollow === false) {
        // User has disabled follow notifications
        return;
      }

      // Send real-time WebSocket event to /follows namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to user.followed event
      this.broadcastToRoom(`user:${followingId}`, 'new_follower', {
        followerId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Follow alert sent via WebSocket', 'FollowsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followingId,
        metadata: { followerId },
      });
    } catch (error) {
      this.logger.error(`Error sending follow alert: ${error}`);
    }
  }

  /**
   * Notify a user that someone unfollowed them via WebSocket (real-time only, no persistence)
   * Note: Unfollow events are typically not persisted to avoid notification spam
   */
  async notifyUnfollow(followingId: string, followerId: string): Promise<void> {
    try {
      // Send real-time WebSocket event only (no persistence for unfollows)
      // This prevents notification spam from users who follow/unfollow repeatedly
      this.broadcastToRoom(`user:${followingId}`, 'unfollow', {
        followerId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Unfollow alert sent via WebSocket', 'FollowsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: followingId,
        metadata: { followerId },
      });
    } catch (error) {
      this.logger.error(`Error sending unfollow alert: ${error}`);
    }
  }

  @SubscribeMessage('subscribe_follows')
  async handleSubscribeFollows(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.user?.id || !client.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const userId = client.user.id;
    this.joinRoom(client.id, `user:${userId}`);

    client.emit('subscribed', {
      type: 'subscribed',
      room: `user:${userId}`,
    });

    return {
      event: 'subscribed',
      room: `user:${userId}`,
    };
  }

  @OnEvent('user.followed')
  async handleUserFollowed(payload: {
    followerId: string;
    followingId: string;
  }) {
    await this.notifyNewFollower(payload.followingId, payload.followerId);
  }

  @OnEvent('user.unfollowed')
  async handleUserUnfollowed(payload: {
    followerId: string;
    followingId: string;
  }) {
    await this.notifyUnfollow(payload.followingId, payload.followerId);
  }
}
