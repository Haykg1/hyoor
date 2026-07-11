import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { ConversationPreview, MessageView } from '@repo/shared';
import type { Server, Socket } from 'socket.io';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import type { AppConfig } from '../config/configuration';

import { WsJwtGuard } from './guards/ws-jwt.guard';
import { MessagingService } from './messaging.service';

type AuthedSocket = Socket & { data: { user?: RequestUser } };

@WebSocketGateway({
  namespace: '/messaging',
  cors: { origin: true, credentials: true },
})
export class MessagingGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly messagingService: MessagingService,
    private readonly wsJwtGuard: WsJwtGuard,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  afterInit(): void {
    const origin = this.config.get('frontend.url', { infer: true });
    this.logger.log(`Messaging gateway ready (cors origin: ${origin})`);
    this.messagingService.setRealtimeEmitter({
      emitNewMessage: (message, conversation) => {
        this.server.to(this.conversationRoom(conversation.id)).emit('message:new', message);
      },
      emitConversationUpdated: (preview, userIds) => {
        for (const userId of userIds) {
          this.server.to(this.userRoom(userId)).emit('conversation:updated', preview);
        }
      },
    });
  }

  handleConnection(client: AuthedSocket): void {
    try {
      const user = this.wsJwtGuard.authenticate(client);
      client.data.user = user;
      void client.join(this.userRoom(user.userId));
    } catch (error) {
      this.logger.warn(`WS auth failed: ${error instanceof Error ? error.message : String(error)}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user;
    if (!user || !body.conversationId) {
      return { ok: false, error: 'Unauthorized or missing conversationId' };
    }
    try {
      const conversation = await this.messagingService.getConversationOrThrow(body.conversationId);
      this.messagingService.assertParticipant(conversation, user.userId);
      await client.join(this.conversationRoom(body.conversationId));
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to join',
      };
    }
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string },
  ): Promise<{ ok: boolean }> {
    if (body.conversationId) {
      await client.leave(this.conversationRoom(body.conversationId));
    }
    return { ok: true };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId?: string; body?: string },
  ): Promise<{ ok: boolean; message?: MessageView; error?: string }> {
    const user = client.data.user;
    if (!user || !body.conversationId || !body.body?.trim()) {
      return { ok: false, error: 'Unauthorized or invalid payload' };
    }
    try {
      const message = await this.messagingService.sendMessage(
        body.conversationId,
        user.userId,
        body.body.trim(),
      );
      return { ok: true, message };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to send',
      };
    }
  }

  emitConversationUpdated(preview: ConversationPreview, userIds: string[]): void {
    for (const userId of userIds) {
      this.server.to(this.userRoom(userId)).emit('conversation:updated', preview);
    }
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
