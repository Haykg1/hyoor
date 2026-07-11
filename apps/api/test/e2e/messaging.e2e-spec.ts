import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import {
  createActivePropertyDirect,
  createGuestHostConversation,
  registerHostUser,
} from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

describe('Messaging (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function startConversation(): Promise<{
    host: Awaited<ReturnType<typeof registerHostUser>>;
    guest: Awaited<ReturnType<typeof registerUser>>;
    property: Awaited<ReturnType<typeof createActivePropertyDirect>>;
    conversationId: string;
  }> {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const { conversationId } = await createGuestHostConversation(app, guest, property.id);
    return { host, guest, property, conversationId };
  }

  it('finds or creates a conversation from a property for guests only', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    const created = await request(app.getHttpServer())
      .post('/api/v1/messaging/conversations')
      .set(authHeader(guest.accessToken))
      .send({ propertyId: property.id })
      .expect(201);
    expect(created.body.data.id).toBeTruthy();
    expect(created.body.data.guestId).toBe(guest.userId);
    expect(created.body.data.hostUserId).toBe(host.userId);
    expect(created.body.data.lastMessage.kind).toBe('PROPERTY_CARD');
    expect(created.body.data.lastMessage.propertyId).toBe(property.id);
    const again = await request(app.getHttpServer())
      .post('/api/v1/messaging/conversations')
      .set(authHeader(guest.accessToken))
      .send({ propertyId: property.id })
      .expect(201);
    expect(again.body.data.id).toBe(created.body.data.id);
    const messages = await request(app.getHttpServer())
      .get(`/api/v1/messaging/conversations/${created.body.data.id}/messages`)
      .set(authHeader(guest.accessToken))
      .query({ limit: 20 })
      .expect(200);
    const propertyCards = messages.body.data.data.filter(
      (message: { kind: string; propertyId: string | null }) =>
        message.kind === 'PROPERTY_CARD' && message.propertyId === property.id,
    );
    expect(propertyCards).toHaveLength(1);
    expect(propertyCards[0].property?.id).toBe(property.id);
    await request(app.getHttpServer())
      .post('/api/v1/messaging/conversations')
      .set(authHeader(host.accessToken))
      .send({ propertyId: property.id })
      .expect(403);
  });

  it('lists conversations for guest and host with last message preview', async () => {
    const { host, guest, conversationId } = await startConversation();
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Is early check-in possible?' })
      .expect(201);
    const guestConversations = await request(app.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(guestConversations.body.data.data).toHaveLength(1);
    expect(guestConversations.body.data.data[0].id).toBe(conversationId);
    expect(guestConversations.body.data.data[0].lastMessage.body).toBe(
      'Is early check-in possible?',
    );
    expect(guestConversations.body.data.data[0].unreadCount).toBe(0);
    expect(guestConversations.body.data.data[0].otherParticipant.id).toBe(host.userId);
    const hostConversations = await request(app.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(hostConversations.body.data.data).toHaveLength(1);
    // Property card + text message from guest
    expect(hostConversations.body.data.data[0].unreadCount).toBe(2);
  });

  it('returns cursor-paginated messages for conversation participants', async () => {
    const { host, guest, conversationId } = await startConversation();
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Hello host' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(host.accessToken))
      .send({ body: 'Hello guest' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .query({ limit: 10 })
      .expect(200);
    // Auto property card + 2 text messages
    expect(response.body.data.data).toHaveLength(3);
    expect(response.body.data.hasMore).toBe(false);
  });

  it('marks messages as read for the recipient', async () => {
    const { host, guest, conversationId } = await startConversation();
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Unread message' })
      .expect(201);
    const markRead = await request(app.getHttpServer())
      .patch(`/api/v1/messaging/conversations/${conversationId}/read`)
      .set(authHeader(host.accessToken))
      .expect(200);
    // Property card + text message
    expect(markRead.body.data.updatedCount).toBe(2);
    const hostConversations = await request(app.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(hostConversations.body.data.data[0].unreadCount).toBe(0);
  });

  it('does not create NEW_MESSAGE notifications for chat messages', async () => {
    const { host, guest, conversationId } = await startConversation();
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Ping' })
      .expect(201);
    const prisma = app.get(PrismaService);
    const notifications = await prisma.notification.findMany({
      where: { userId: host.userId, type: 'NEW_MESSAGE' },
    });
    expect(notifications).toHaveLength(0);
  });

  it('rejects non-participants from accessing conversation', async () => {
    const { conversationId } = await startConversation();
    const outsider = await registerUser(app, { email: uniqueEmail('outsider') });
    const response = await request(app.getHttpServer())
      .get(`/api/v1/messaging/conversations/${conversationId}`)
      .set(authHeader(outsider.accessToken))
      .expect(403);
    expect(response.body.success).toBe(false);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/messaging/conversations').expect(401);
  });
});
