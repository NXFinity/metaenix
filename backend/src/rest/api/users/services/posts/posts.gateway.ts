import {
  WebSocketGateway,
  WebSocketServer as WsServerDecorator,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedSocket } from 'src/common/interfaces/authenticated-socket.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../assets/entities/user.entity';

@WebSocketGateway({
  namespace: 'posts',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class PostsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WsServerDecorator()
  server!: Server;
  
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private userRooms = new Map<string, Set<string>>(); // room -> Set of client IDs
  private clientRooms = new Map<string, Set<string>>(); // client ID -> Set of rooms

  private readonly logger = new Logger(PostsGateway.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

      this.logger.log(`User ${user.id} connected to posts namespace`);
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
        `User ${client.user.id} disconnected from posts namespace`,
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
   * Notify a user that someone liked their post via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to post.liked event
   */
  async notifyPostLiked(postOwnerId: string, likerId: string, postId: string): Promise<void> {
    try {
      // Send real-time WebSocket event to /posts namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to post.liked event
      this.broadcastToRoom(`user:${postOwnerId}`, 'post_liked', {
        likerId,
        postId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Post like alert sent via WebSocket', 'PostsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: postOwnerId,
        metadata: { likerId, postId },
      });
    } catch (error) {
      this.logger.error(`Error sending post like alert: ${error}`);
    }
  }

  /**
   * Notify a user that someone commented on their post via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to post.commented event
   */
  async notifyPostCommented(
    postOwnerId: string,
    commenterId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    try {
      // Send real-time WebSocket event to /posts namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to post.commented event
      this.broadcastToRoom(`user:${postOwnerId}`, 'post_commented', {
        commenterId,
        postId,
        commentId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Post comment alert sent via WebSocket', 'PostsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: postOwnerId,
        metadata: { commenterId, postId, commentId },
      });
    } catch (error) {
      this.logger.error(`Error sending post comment alert: ${error}`);
    }
  }

  /**
   * Notify a user that someone shared their post via WebSocket (real-time only, no persistence)
   * Note: Persistence is handled by NotificationsService listening to post.shared event
   */
  async notifyPostShared(
    postOwnerId: string,
    sharerId: string,
    postId: string,
    shareId: string,
  ): Promise<void> {
    try {
      // Send real-time WebSocket event to /posts namespace (no persistence here)
      // Persistence is handled by NotificationsService listening to post.shared event
      this.broadcastToRoom(`user:${postOwnerId}`, 'post_shared', {
        sharerId,
        postId,
        shareId,
        timestamp: new Date().toISOString(),
      });

      this.loggingService.log('Post share alert sent via WebSocket', 'PostsGateway', {
        category: LogCategory.USER_MANAGEMENT,
        userId: postOwnerId,
        metadata: { sharerId, postId, shareId },
      });
    } catch (error) {
      this.logger.error(`Error sending post share alert: ${error}`);
    }
  }

  @SubscribeMessage('subscribe_posts')
  async handleSubscribePosts(@ConnectedSocket() client: AuthenticatedSocket) {
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

  @OnEvent('post.liked')
  async handlePostLiked(payload: {
    likerId: string;
    postId: string;
    postOwnerId: string;
  }) {
    await this.notifyPostLiked(payload.postOwnerId, payload.likerId, payload.postId);
  }

  @OnEvent('post.commented')
  async handlePostCommented(payload: {
    commenterId: string;
    postId: string;
    commentId: string;
    postOwnerId: string;
    parentCommentId: string | null;
  }) {
    await this.notifyPostCommented(
      payload.postOwnerId,
      payload.commenterId,
      payload.postId,
      payload.commentId,
    );
  }

  @OnEvent('post.shared')
  async handlePostShared(payload: {
    sharerId: string;
    postId: string;
    postOwnerId: string;
    shareId: string;
  }) {
    await this.notifyPostShared(
      payload.postOwnerId,
      payload.sharerId,
      payload.postId,
      payload.shareId,
    );
  }
}
