import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/database/client';
import type { Message, UserRole } from '@repo/database/client';
import type {
  ConversationDetail,
  ConversationParticipantView,
  ConversationPreview,
  CursorPage,
  MessagePropertyCard,
  MessageView,
  PropertyAddressLabels,
  PropertyTitleLabels,
  PropertyType,
} from '@repo/shared';
import { DEFAULT_PAGE_SIZE, S3_PRESIGNED_URL_EXPIRES } from '@repo/shared/constants';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

import { CursorPaginationDto } from './dto/cursor-pagination.dto';

type ProfileSelect = {
  firstName: string;
  lastName: string;
  avatarKey: string | null;
  nationality: string | null;
};

type ConversationRow = {
  id: string;
  guestId: string;
  hostUserId: string;
  createdAt: Date;
  updatedAt: Date;
  guest: { id: string; profile: ProfileSelect | null };
  host: { id: string; profile: ProfileSelect | null };
};

type ConversationCursor = { updatedAt: string; id: string };
type MessageCursor = { createdAt: string; id: string };

type PropertyCardSource = {
  id: string;
  title: string;
  titleLabels: unknown;
  slug: string;
  propertyType: PropertyType;
  city: string;
  region: string | null;
  country: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  featured: boolean;
  addressLabels: unknown;
  photos: { key: string }[];
  reviews: { rating: number }[];
  _count: { reviews: number };
};

@Injectable()
export class MessagingService {
  private realtimeEmitter: {
    emitNewMessage: (message: MessageView, conversation: ConversationRow) => void;
    emitConversationUpdated: (preview: ConversationPreview, userIds: string[]) => void;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  setRealtimeEmitter(emitter: NonNullable<MessagingService['realtimeEmitter']>): void {
    this.realtimeEmitter = emitter;
  }

  async findOrCreateByProperty(
    guestUserId: string,
    guestRole: UserRole,
    propertyId: string,
  ): Promise<ConversationPreview> {
    if (guestRole !== 'GUEST') {
      throw new ForbiddenException('Only guests can start a conversation with a host');
    }
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { host: { include: { user: { include: { profile: true } } } } },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    const hostUser = property.host.user;
    if (!hostUser.isActive) {
      throw new BadRequestException('Host is not available');
    }
    if (hostUser.id === guestUserId) {
      throw new ForbiddenException('You cannot start a conversation with yourself');
    }
    if (hostUser.role !== 'HOST' || !property.host) {
      throw new ForbiddenException('You can only message hosts');
    }
    const existing = await this.prisma.conversation.findUnique({
      where: {
        guestId_hostUserId: { guestId: guestUserId, hostUserId: hostUser.id },
      },
      include: this.conversationInclude(),
    });
    const conversation =
      existing ??
      (await this.prisma.conversation.create({
        data: { guestId: guestUserId, hostUserId: hostUser.id },
        include: this.conversationInclude(),
      }));
    await this.ensurePropertyCardMessage(conversation, guestUserId, propertyId, property.title);
    const refreshed = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: {
        ...this.conversationInclude(),
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return this.toConversationPreview(refreshed, guestUserId);
  }

  async getConversations(
    userId: string,
    dto: CursorPaginationDto,
  ): Promise<CursorPage<ConversationPreview>> {
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = this.decodeConversationCursor(dto.cursor);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        AND: [
          this.participantWhere(userId),
          cursor
            ? {
                OR: [
                  { updatedAt: { lt: new Date(cursor.updatedAt) } },
                  {
                    updatedAt: new Date(cursor.updatedAt),
                    id: { lt: cursor.id },
                  },
                ],
              }
            : {},
        ],
      },
      include: {
        ...this.conversationInclude(),
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = conversations.length > limit;
    const page = hasMore ? conversations.slice(0, limit) : conversations;
    const data = await Promise.all(
      page.map(async (conversation) => {
        const unreadCount = await this.countUnread(conversation.id, userId);
        return this.toConversationPreview(conversation, userId, unreadCount);
      }),
    );
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? this.encodeConversationCursor({
            updatedAt: last.updatedAt.toISOString(),
            id: last.id,
          })
        : null;
    return { data, nextCursor, hasMore };
  }

  async getConversation(id: string, userId: string): Promise<ConversationDetail> {
    const conversation = await this.getConversationOrThrow(id);
    this.assertParticipant(conversation, userId);
    const unreadCount = await this.countUnread(id, userId);
    return {
      id: conversation.id,
      guestId: conversation.guestId,
      hostUserId: conversation.hostUserId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      otherParticipant: await this.toParticipantView(
        this.getOtherParticipant(conversation, userId),
      ),
      unreadCount,
    };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    dto: CursorPaginationDto,
  ): Promise<CursorPage<MessageView>> {
    const conversation = await this.getConversationOrThrow(conversationId);
    this.assertParticipant(conversation, userId);
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;
    const cursor = this.decodeMessageCursor(dto.cursor);
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;
    const data = await this.toMessageViews(page);
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? this.encodeMessageCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null;
    return { data, nextCursor, hasMore };
  }

  async sendMessage(conversationId: string, senderId: string, body: string): Promise<MessageView> {
    const conversation = await this.getConversationOrThrow(conversationId);
    this.assertParticipant(conversation, senderId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        kind: 'TEXT',
        status: 'SENT',
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    const view = await this.toMessageView(message);
    const recipientId = this.getOtherParticipantId(conversation, senderId);
    this.realtimeEmitter?.emitNewMessage(view, conversation);
    const previewForSender = await this.toConversationPreview(conversation, senderId);
    const previewForRecipient = await this.toConversationPreview(conversation, recipientId);
    previewForSender.lastMessage = view;
    previewForRecipient.lastMessage = view;
    previewForRecipient.unreadCount = await this.countUnread(conversationId, recipientId);
    this.realtimeEmitter?.emitConversationUpdated(previewForSender, [senderId]);
    this.realtimeEmitter?.emitConversationUpdated(previewForRecipient, [recipientId]);
    return view;
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
    if (result.count > 0) {
      const preview = await this.toConversationPreview(conversation, userId, 0);
      this.realtimeEmitter?.emitConversationUpdated(preview, [userId]);
    }
    return { updatedCount: result.count };
  }

  assertParticipant(conversation: ConversationRow, userId: string): void {
    if (userId !== conversation.guestId && userId !== conversation.hostUserId) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
  }

  getOtherParticipantId(conversation: ConversationRow, userId: string): string {
    if (userId === conversation.guestId) return conversation.hostUserId;
    if (userId === conversation.hostUserId) return conversation.guestId;
    throw new ForbiddenException('You are not a participant in this conversation');
  }

  async getConversationOrThrow(id: string): Promise<ConversationRow> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: this.conversationInclude(),
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  private async ensurePropertyCardMessage(
    conversation: ConversationRow,
    guestUserId: string,
    propertyId: string,
    propertyTitle: string,
  ): Promise<void> {
    const existingCard = await this.prisma.message.findFirst({
      where: {
        conversationId: conversation.id,
        propertyId,
        kind: 'PROPERTY_CARD',
      },
    });
    if (existingCard) return;
    try {
      const message = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: guestUserId,
          body: propertyTitle,
          kind: 'PROPERTY_CARD',
          propertyId,
          status: 'SENT',
        },
      });
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
      const view = await this.toMessageView(message);
      const recipientId = this.getOtherParticipantId(conversation, guestUserId);
      this.realtimeEmitter?.emitNewMessage(view, conversation);
      const previewForSender = await this.toConversationPreview(conversation, guestUserId);
      const previewForRecipient = await this.toConversationPreview(conversation, recipientId);
      previewForSender.lastMessage = view;
      previewForRecipient.lastMessage = view;
      previewForRecipient.unreadCount = await this.countUnread(conversation.id, recipientId);
      this.realtimeEmitter?.emitConversationUpdated(previewForSender, [guestUserId]);
      this.realtimeEmitter?.emitConversationUpdated(previewForRecipient, [recipientId]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return;
      }
      throw error;
    }
  }

  private participantWhere(userId: string): Prisma.ConversationWhereInput {
    return { OR: [{ guestId: userId }, { hostUserId: userId }] };
  }

  private conversationInclude(): {
    guest: { include: { profile: true } };
    host: { include: { profile: true } };
  } {
    return {
      guest: { include: { profile: true } },
      host: { include: { profile: true } },
    };
  }

  private async countUnread(conversationId: string, userId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
    });
  }

  private getOtherParticipant(
    conversation: ConversationRow,
    userId: string,
  ): { id: string; profile: ProfileSelect | null } {
    if (userId === conversation.guestId) return conversation.host;
    return conversation.guest;
  }

  private async toParticipantView(user: {
    id: string;
    profile: ProfileSelect | null;
  }): Promise<ConversationParticipantView> {
    let avatarUrl: string | null = null;
    if (user.profile?.avatarKey && this.storage.isConfigured) {
      try {
        avatarUrl = await this.storage.getPresignedUrl(
          user.profile.avatarKey,
          S3_PRESIGNED_URL_EXPIRES,
        );
      } catch {
        avatarUrl = null;
      }
    }
    return {
      id: user.id,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      avatarUrl,
      nationality: user.profile?.nationality ?? null,
    };
  }

  private async toConversationPreview(
    conversation: ConversationRow & { messages?: Message[] },
    viewerId: string,
    unreadCount?: number,
  ): Promise<ConversationPreview> {
    const lastMessage = conversation.messages?.[0] ?? null;
    const resolvedUnread = unreadCount ?? (await this.countUnread(conversation.id, viewerId));
    return {
      id: conversation.id,
      guestId: conversation.guestId,
      hostUserId: conversation.hostUserId,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      otherParticipant: await this.toParticipantView(
        this.getOtherParticipant(conversation, viewerId),
      ),
      lastMessage: lastMessage ? await this.toMessageView(lastMessage) : null,
      unreadCount: resolvedUnread,
    };
  }

  async toMessageView(
    message: Message,
    property?: MessagePropertyCard | null,
  ): Promise<MessageView> {
    const resolvedProperty =
      property !== undefined
        ? property
        : message.propertyId
          ? ((await this.loadPropertyCards([message.propertyId])).get(message.propertyId) ?? null)
          : null;
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      kind: message.kind,
      propertyId: message.propertyId,
      property: message.kind === 'PROPERTY_CARD' ? resolvedProperty : null,
      status: message.status,
      readAt: message.readAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private async toMessageViews(messages: Message[]): Promise<MessageView[]> {
    const propertyIds = [
      ...new Set(
        messages
          .filter((message) => message.kind === 'PROPERTY_CARD' && message.propertyId)
          .map((message) => message.propertyId as string),
      ),
    ];
    const cards = await this.loadPropertyCards(propertyIds);
    return Promise.all(
      messages.map((message) =>
        this.toMessageView(
          message,
          message.propertyId ? (cards.get(message.propertyId) ?? null) : null,
        ),
      ),
    );
  }

  private async loadPropertyCards(
    propertyIds: string[],
  ): Promise<Map<string, MessagePropertyCard>> {
    const result = new Map<string, MessagePropertyCard>();
    if (propertyIds.length === 0) return result;
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      include: {
        photos: { orderBy: { sortOrder: 'asc' }, take: 1 },
        reviews: { select: { rating: true }, take: 100 },
        _count: { select: { reviews: true } },
      },
    });
    await Promise.all(
      properties.map(async (property) => {
        result.set(property.id, await this.toPropertyCard(property));
      }),
    );
    return result;
  }

  private async toPropertyCard(property: PropertyCardSource): Promise<MessagePropertyCard> {
    const coverPhoto = property.photos[0];
    let coverPhotoUrl: string | undefined;
    if (coverPhoto && this.storage.isConfigured) {
      try {
        coverPhotoUrl = await this.storage.getPresignedUrl(
          coverPhoto.key,
          S3_PRESIGNED_URL_EXPIRES,
        );
      } catch {
        coverPhotoUrl = undefined;
      }
    }
    const reviewCount = property._count.reviews;
    const avgRating =
      property.reviews.length > 0
        ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
        : undefined;
    return {
      id: property.id,
      title: property.title,
      titleLabels: this.parseTitleLabels(property.titleLabels),
      slug: property.slug,
      propertyType: property.propertyType,
      city: property.city,
      region: property.region,
      country: property.country,
      pricePerNight: property.pricePerNight,
      currency: property.currency,
      coverPhotoUrl,
      maxGuests: property.maxGuests,
      bedrooms: property.bedrooms,
      avgRating,
      reviewCount,
      featured: property.featured,
      addressLabels: this.parseAddressLabels(property.addressLabels),
    };
  }

  private parseAddressLabels(value: unknown): PropertyAddressLabels | null {
    if (!value || typeof value !== 'object') return null;
    return value as PropertyAddressLabels;
  }

  private parseTitleLabels(value: unknown): PropertyTitleLabels | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as PropertyTitleLabels;
  }

  private encodeConversationCursor(cursor: ConversationCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeConversationCursor(raw?: string): ConversationCursor | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf8'),
      ) as ConversationCursor;
      if (!parsed.updatedAt || !parsed.id) return null;
      return parsed;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  private encodeMessageCursor(cursor: MessageCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeMessageCursor(raw?: string): MessageCursor | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as MessageCursor;
      if (!parsed.createdAt || !parsed.id) return null;
      return parsed;
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
