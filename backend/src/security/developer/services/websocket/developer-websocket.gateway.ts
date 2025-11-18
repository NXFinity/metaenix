import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DeveloperService } from '../../developer.service';
import { ScopeService } from '../scopes/scope.service';
import { AuthenticatedAppSocket } from '../../../../common/interfaces/authenticated-app-socket.interface';
import { LoggingService } from '@logging/logging';
import { LogCategory } from '@logging/logging';
import { ApplicationStatus } from '../../assets/enum/application-status.enum';

@WebSocketGateway({
  namespace: 'developer',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class DeveloperWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeveloperWebsocketGateway.name);
  private readonly connectedApps = new Map<string, AuthenticatedAppSocket>(); // websocketId -> socket

  constructor(
    private readonly developerService: DeveloperService,
    private readonly scopeService: ScopeService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Handle WebSocket connection
   * Authenticates using application websocketId
   */
  async handleConnection(@ConnectedSocket() client: AuthenticatedAppSocket) {
    try {
      // Extract websocketId from handshake
      const websocketId = this.extractWebsocketId(client);

      if (!websocketId) {
        this.logger.warn(
          `Connection rejected: No websocketId provided - Socket: ${client.id}`,
        );
        client.emit('error', {
          message: 'Authentication failed: websocketId required',
        });
        client.disconnect();
        return;
      }

      // Validate websocketId format (UUID)
      if (!this.isValidUUID(websocketId)) {
        this.logger.warn(
          `Connection rejected: Invalid websocketId format - Socket: ${client.id}, websocketId: ${websocketId}`,
        );
        client.emit('error', {
          message: 'Authentication failed: Invalid websocketId format',
        });
        client.disconnect();
        return;
      }

      // Find application by websocketId
      const application = await this.developerService.findByWebsocketId(websocketId);

      if (!application) {
        this.logger.warn(
          `Connection rejected: Application not found - Socket: ${client.id}, websocketId: ${websocketId}`,
        );
        client.emit('error', {
          message: 'Authentication failed: Invalid websocketId',
        });
        client.disconnect();
        return;
      }

      // Check application status
      if (application.status !== ApplicationStatus.ACTIVE) {
        this.logger.warn(
          `Connection rejected: Application not active - Socket: ${client.id}, appId: ${application.id}, status: ${application.status}`,
        );
        client.emit('error', {
          message: `Application is not active. Status: ${application.status}`,
        });
        client.disconnect();
        return;
      }

      // Check if there's an existing connection for this websocketId
      const existingSocket = this.connectedApps.get(websocketId);
      if (existingSocket && existingSocket.id !== client.id) {
        // Disconnect previous connection
        this.logger.debug(
          `Disconnecting previous connection for websocketId: ${websocketId}`,
        );
        existingSocket.emit('error', {
          message: 'New connection established from another location',
        });
        existingSocket.disconnect();
      }

      // Store connection
      this.connectedApps.set(websocketId, client);

      // Attach application data to socket
      client.websocketId = websocketId;
      client.applicationId = application.id;
      client.application = application;
      client.subscribedEvents = new Set<string>();

      this.logger.log(
        `Developer WebSocket connected: websocketId=${websocketId}, appId=${application.id}, socketId=${client.id}`,
      );

      // Send success message to client
      client.emit('connected', {
        message: 'Connected to developer gateway',
        websocketId,
        applicationId: application.id,
        applicationName: application.name,
        scopes: application.scopes || [],
      });
    } catch (error) {
      this.loggingService.error(
        'Error during Developer WebSocket connection',
        error instanceof Error ? error.stack : undefined,
        'DeveloperWebsocketGateway',
        {
          category: LogCategory.AUTHENTICATION,
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { socketId: client.id },
        },
      );
      client.emit('error', {
        message: 'Connection failed: Internal server error',
      });
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(@ConnectedSocket() client: AuthenticatedAppSocket) {
    if (client.websocketId) {
      this.connectedApps.delete(client.websocketId);
      this.logger.log(
        `Developer WebSocket disconnected: websocketId=${client.websocketId}, socketId=${client.id}`,
      );
    }
  }

  /**
   * Subscribe to events
   * Client sends: { event: 'user.followed' } or { events: ['user.followed', 'post.created'] }
   */
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedAppSocket,
    @MessageBody() data: { event?: string; events?: string[] },
  ) {
    if (!client.application) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const eventsToSubscribe = data.events || (data.event ? [data.event] : []);

    if (eventsToSubscribe.length === 0) {
      client.emit('error', { message: 'No events specified' });
      return;
    }

    const subscribed: string[] = [];
    const rejected: Array<{ event: string; reason: string }> = [];

    for (const eventName of eventsToSubscribe) {
      // Validate event name format
      if (!this.isValidEventName(eventName)) {
        rejected.push({
          event: eventName,
          reason: 'Invalid event name format',
        });
        continue;
      }

      // Check if app has required scope for this event
      const requiredScope = this.getRequiredScopeForEvent(eventName);
      if (requiredScope) {
        const hasScope = this.scopeService.hasScope(
          client.application.scopes || [],
          requiredScope,
        );
        if (!hasScope) {
          rejected.push({
            event: eventName,
            reason: `Missing required scope: ${requiredScope}`,
          });
          continue;
        }
      }

      // Subscribe to event
      client.subscribedEvents?.add(eventName);
      subscribed.push(eventName);
    }

    client.emit('subscribed', {
      subscribed,
      rejected: rejected.length > 0 ? rejected : undefined,
    });

    this.logger.debug(
      `App ${client.application.id} subscribed to events: ${subscribed.join(', ')}`,
    );
  }

  /**
   * Unsubscribe from events
   */
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedAppSocket,
    @MessageBody() data: { event?: string; events?: string[] },
  ) {
    if (!client.application) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    const eventsToUnsubscribe = data.events || (data.event ? [data.event] : []);

    if (eventsToUnsubscribe.length === 0) {
      client.emit('error', { message: 'No events specified' });
      return;
    }

    const unsubscribed: string[] = [];

    for (const eventName of eventsToUnsubscribe) {
      if (client.subscribedEvents?.has(eventName)) {
        client.subscribedEvents.delete(eventName);
        unsubscribed.push(eventName);
      }
    }

    client.emit('unsubscribed', { unsubscribed });

    this.logger.debug(
      `App ${client.application.id} unsubscribed from events: ${unsubscribed.join(', ')}`,
    );
  }

  /**
   * List subscribed events
   */
  @SubscribeMessage('list_subscriptions')
  async handleListSubscriptions(@ConnectedSocket() client: AuthenticatedAppSocket) {
    if (!client.application) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    client.emit('subscriptions', {
      events: Array.from(client.subscribedEvents || []),
      scopes: client.application.scopes || [],
    });
  }

  // #########################################################
  // EVENT HANDLERS - Forward events to subscribed apps
  // #########################################################

  /**
   * Handle user.followed event
   */
  @OnEvent('user.followed')
  async handleUserFollowed(payload: { followerId: string; followingId: string }) {
    this.broadcastToSubscribedApps('user.followed', {
      followerId: payload.followerId,
      followingId: payload.followingId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle user.unfollowed event
   */
  @OnEvent('user.unfollowed')
  async handleUserUnfollowed(payload: { followerId: string; followingId: string }) {
    this.broadcastToSubscribedApps('user.unfollowed', {
      followerId: payload.followerId,
      followingId: payload.followingId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle post.created event
   */
  @OnEvent('post.created')
  async handlePostCreated(payload: {
    postId: string;
    authorId: string;
    content?: string;
    isPublic?: boolean;
  }) {
    this.broadcastToSubscribedApps('post.created', {
      postId: payload.postId,
      authorId: payload.authorId,
      content: payload.content,
      isPublic: payload.isPublic,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle post.updated event
   */
  @OnEvent('post.updated')
  async handlePostUpdated(payload: { postId: string; authorId: string }) {
    this.broadcastToSubscribedApps('post.updated', {
      postId: payload.postId,
      authorId: payload.authorId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle post.deleted event
   */
  @OnEvent('post.deleted')
  async handlePostDeleted(payload: { postId: string; authorId: string }) {
    this.broadcastToSubscribedApps('post.deleted', {
      postId: payload.postId,
      authorId: payload.authorId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle post.liked event
   */
  @OnEvent('post.liked')
  async handlePostLiked(payload: {
    postId: string;
    userId: string;
    likesCount?: number;
  }) {
    this.broadcastToSubscribedApps('post.liked', {
      postId: payload.postId,
      userId: payload.userId,
      likesCount: payload.likesCount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle post.commented event
   */
  @OnEvent('post.commented')
  async handlePostCommented(payload: {
    postId: string;
    commentId: string;
    userId: string;
    content?: string;
    commentsCount?: number;
  }) {
    this.broadcastToSubscribedApps('post.commented', {
      postId: payload.postId,
      commentId: payload.commentId,
      userId: payload.userId,
      content: payload.content,
      commentsCount: payload.commentsCount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle post.shared event
   */
  @OnEvent('post.shared')
  async handlePostShared(payload: { postId: string; userId: string }) {
    this.broadcastToSubscribedApps('post.shared', {
      postId: payload.postId,
      userId: payload.userId,
      timestamp: new Date().toISOString(),
    });
  }

  // #########################################################
  // HELPER METHODS
  // #########################################################

  /**
   * Broadcast event to all subscribed apps
   */
  private broadcastToSubscribedApps(eventName: string, payload: any) {
    let count = 0;
    for (const [_websocketId, socket] of this.connectedApps.entries()) {
      if (socket.subscribedEvents?.has(eventName)) {
        socket.emit('event', {
          type: eventName,
          data: payload,
        });
        count++;
      }
    }
    if (count > 0) {
      this.logger.debug(
        `Broadcasted ${eventName} to ${count} subscribed app(s)`,
      );
    }
  }

  /**
   * Extract websocketId from handshake
   */
  private extractWebsocketId(client: AuthenticatedAppSocket): string | null {
    return (
      (client.handshake.query.websocketId as string) ||
      (client.handshake.headers['x-websocket-id'] as string) ||
      (client.handshake.auth?.websocketId as string) ||
      null
    );
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
   * Validate event name format
   */
  private isValidEventName(eventName: string): boolean {
    // Event names should be in format: category.action (e.g., user.followed, post.created)
    const eventRegex = /^[a-z]+\.[a-z_]+$/;
    return eventRegex.test(eventName);
  }

  /**
   * Get required scope for an event
   */
  private getRequiredScopeForEvent(eventName: string): string | null {
    // Map events to required scopes
    const eventScopeMap: Record<string, string> = {
      'user.followed': 'read:follows',
      'user.unfollowed': 'read:follows',
      'post.created': 'read:posts',
      'post.updated': 'read:posts',
      'post.deleted': 'read:posts',
      'post.liked': 'read:posts',
      'post.commented': 'read:comments',
      'post.shared': 'read:posts',
    };

    return eventScopeMap[eventName] || null;
  }
}

