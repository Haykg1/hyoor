import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { BookingStatus, Message, MessageStatus, Prisma } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';
import { DEFAULT_PAGE_SIZE } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

import { GetMessagesDto } from './dto/get-messages.dto';

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  status: MessageStatus;
  readAt: Date | null;
  createdAt: Date;
}

export interface ConversationParticipant {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ConversationBookingSummary {
  id: string;
  status: BookingStatus;
  checkIn: Date;
  checkOut: Date;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
  };
  guest: ConversationParticipant;
  hostUserId: string;
}

export interface ConversationPreview {
  id: string;
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
  booking: ConversationBookingSummary;
  lastMessage: MessageView | null;
  unreadCount: number;
}

export interface ConversationDetail {
  id: string;
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
  booking: ConversationBookingSummary;
  messages: PaginatedResponse<MessageView>;
}

type ConversationWithBooking = {
  id: string;
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
  booking: {
    id: string;
    status: BookingStatus;
    checkIn: Date;
    checkOut: Date;
    guestId: string;
    guest: {
      id: string;
      profile: { firstName: string | null; lastName: string | null } | null;
    };
    property: {
      id: string;
      title: string;
      slug: string;
      city: string;
      host: { userId: string };
    };
  };
};

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getConversations(userId: string): Promise<ConversationPreview[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: this.participantWhere(userId),
      include: {
        booking: {
          include: {
            guest: { include: { profile: true } },
            property: { include: { host: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        });
        return this.toConversationPreview(conversation, unreadCount);
      }),
    );
  }

  async getConversation(
    id: string,
    userId: string,
    dto: GetMessagesDto,
  ): Promise<ConversationDetail> {
    const conversation = await this.getConversationOrThrow(id);
    this.assertParticipant(conversation, userId);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId: id } }),
    ]);
    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      booking: this.toBookingSummary(conversation),
      messages: {
        data: messages.map((message) => this.toMessageView(message)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async sendMessage(conversationId: string, senderId: string, body: string): Promise<MessageView> {
    const conversation = await this.getConversationOrThrow(conversationId);
    this.assertParticipant(conversation, senderId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        status: 'SENT',
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    const recipientId = this.getOtherParticipantId(conversation, senderId);
    await this.notificationsService.notify(
      recipientId,
      'NEW_MESSAGE',
      conversationId,
      'conversation',
    );
    return this.toMessageView(message);
  }

  async markAsRead(conversationId: string, userId: string): Promise<{ updatedCount: number }> {
    const conversation = await this.getConversationOrThrow(conversationId);
    this.assertParticipant(conversation, userId);
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
    return { updatedCount: result.count };
  }

  private participantWhere(userId: string): Prisma.ConversationWhereInput {
    return {
      OR: [{ booking: { guestId: userId } }, { booking: { property: { host: { userId } } } }],
    };
  }

  private async getConversationOrThrow(id: string): Promise<ConversationWithBooking> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            guest: { include: { profile: true } },
            property: { include: { host: true } },
          },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private assertParticipant(conversation: ConversationWithBooking, userId: string): void {
    const guestId = conversation.booking.guestId;
    const hostUserId = conversation.booking.property.host.userId;
    if (userId !== guestId && userId !== hostUserId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
  }

  private getOtherParticipantId(conversation: ConversationWithBooking, senderId: string): string {
    const guestId = conversation.booking.guestId;
    const hostUserId = conversation.booking.property.host.userId;
    if (senderId === guestId) {
      return hostUserId;
    }
    if (senderId === hostUserId) {
      return guestId;
    }
    throw new ForbiddenException('You are not a participant in this conversation');
  }

  private toBookingSummary(conversation: ConversationWithBooking): ConversationBookingSummary {
    return {
      id: conversation.booking.id,
      status: conversation.booking.status,
      checkIn: conversation.booking.checkIn,
      checkOut: conversation.booking.checkOut,
      property: {
        id: conversation.booking.property.id,
        title: conversation.booking.property.title,
        slug: conversation.booking.property.slug,
        city: conversation.booking.property.city,
      },
      guest: {
        id: conversation.booking.guest.id,
        firstName: conversation.booking.guest.profile?.firstName ?? null,
        lastName: conversation.booking.guest.profile?.lastName ?? null,
      },
      hostUserId: conversation.booking.property.host.userId,
    };
  }

  private toConversationPreview(
    conversation: ConversationWithBooking & { messages: Message[] },
    unreadCount: number,
  ): ConversationPreview {
    const lastMessage = conversation.messages[0] ?? null;
    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      booking: this.toBookingSummary(conversation),
      lastMessage: lastMessage ? this.toMessageView(lastMessage) : null,
      unreadCount,
    };
  }

  private toMessageView(message: Message): MessageView {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      status: message.status,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
