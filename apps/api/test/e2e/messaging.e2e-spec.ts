import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';
import { createGuestBooking, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';

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

  it('lists conversations for guest and host with last message preview', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { conversationId } = await createGuestBooking(app, host, guest);
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Is early check-in possible?' })
      .expect(201);
    const guestConversations = await request(app.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(authHeader(guest.accessToken))
      .expect(200);
    expect(guestConversations.body.data).toHaveLength(1);
    expect(guestConversations.body.data[0].id).toBe(conversationId);
    expect(guestConversations.body.data[0].lastMessage.body).toBe('Is early check-in possible?');
    expect(guestConversations.body.data[0].unreadCount).toBe(0);
    const hostConversations = await request(app.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(hostConversations.body.data).toHaveLength(1);
    expect(hostConversations.body.data[0].unreadCount).toBe(1);
  });

  it('returns paginated messages for conversation participants', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { conversationId } = await createGuestBooking(app, host, guest);
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
      .get(`/api/v1/messaging/conversations/${conversationId}`)
      .set(authHeader(guest.accessToken))
      .query({ page: 1, limit: 10 })
      .expect(200);
    expect(response.body.data.messages.total).toBe(2);
    expect(response.body.data.messages.data).toHaveLength(2);
    expect(response.body.data.booking.guest.id).toBe(guest.userId);
  });

  it('marks messages as read for the recipient', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { conversationId } = await createGuestBooking(app, host, guest);
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Unread message' })
      .expect(201);
    const markRead = await request(app.getHttpServer())
      .patch(`/api/v1/messaging/conversations/${conversationId}/read`)
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(markRead.body.data.updatedCount).toBe(1);
    const hostConversations = await request(app.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(hostConversations.body.data[0].unreadCount).toBe(0);
  });

  it('creates NEW_MESSAGE notification for recipient', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const { conversationId } = await createGuestBooking(app, host, guest);
    await request(app.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(authHeader(guest.accessToken))
      .send({ body: 'Ping' })
      .expect(201);
    const prisma = app.get(PrismaService);
    const notifications = await prisma.notification.findMany({
      where: { userId: host.userId, type: 'NEW_MESSAGE' },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.refId).toBe(conversationId);
  });

  it('rejects non-participants from accessing conversation', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const outsider = await registerUser(app, { email: uniqueEmail('outsider') });
    const { conversationId } = await createGuestBooking(app, host, guest);
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
