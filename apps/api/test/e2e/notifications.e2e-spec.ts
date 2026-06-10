import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { createActiveHostProperty, registerHostUser } from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

describe('Notifications (e2e)', () => {
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

  it('lists notifications for the authenticated user', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.data[0].type).toBe('BOOKING_REQUEST');
    expect(response.body.data.data[0].isRead).toBe(false);
  });

  it('filters to only unread notifications', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const prisma = app.get(PrismaService);
    await prisma.notification.updateMany({
      where: { userId: host.userId },
      data: { isRead: true, readAt: new Date() },
    });
    const prisma2 = app.get(PrismaService);
    await prisma2.notification.create({
      data: {
        userId: host.userId,
        type: 'NEW_MESSAGE',
        title: 'New message',
        isRead: false,
      },
    });
    const all = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(all.body.data.total).toBe(2);
    const unread = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .query({ onlyUnread: true })
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(unread.body.data.total).toBe(1);
  });

  it('returns unread count for badge', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(response.body.data.count).toBe(1);
  });

  it('marks a single notification as read', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActiveHostProperty(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2025-07-10',
        checkOut: '2025-07-13',
        guestCount: 2,
      })
      .expect(201);
    const list = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(host.accessToken))
      .expect(200);
    const notificationId = list.body.data.data[0].id as string;
    const markRead = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(markRead.body.data.isRead).toBe(true);
    const count = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(count.body.data.count).toBe(0);
  });

  it('marks all notifications as read', async () => {
    const host = await registerHostUser(app);
    const prisma = app.get(PrismaService);
    await prisma.notification.createMany({
      data: [
        { userId: host.userId, type: 'NEW_MESSAGE', title: 'Msg 1', isRead: false },
        { userId: host.userId, type: 'NEW_REVIEW', title: 'Review 1', isRead: false },
      ],
    });
    const markAll = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(markAll.body.data.updatedCount).toBe(2);
    const count = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(count.body.data.count).toBe(0);
  });

  it("rejects marking another user's notification as read", async () => {
    const userA = await registerUser(app, { email: uniqueEmail('a') });
    const userB = await registerUser(app, { email: uniqueEmail('b') });
    const prisma = app.get(PrismaService);
    const notification = await prisma.notification.create({
      data: { userId: userA.userId, type: 'NEW_MESSAGE', title: 'Msg', isRead: false },
    });
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notification.id}/read`)
      .set(authHeader(userB.accessToken))
      .expect(403);
    expect(response.body.success).toBe(false);
  });

  it('marks a notification as unread', async () => {
    const host = await registerHostUser(app);
    const prisma = app.get(PrismaService);
    const notification = await prisma.notification.create({
      data: {
        userId: host.userId,
        type: 'NEW_MESSAGE',
        title: 'Msg',
        isRead: true,
        readAt: new Date(),
      },
    });
    const markUnread = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${notification.id}/unread`)
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(markUnread.body.data.isRead).toBe(false);
  });

  it('deletes a single notification', async () => {
    const host = await registerHostUser(app);
    const prisma = app.get(PrismaService);
    const notification = await prisma.notification.create({
      data: { userId: host.userId, type: 'NEW_MESSAGE', title: 'Msg', isRead: false },
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/notifications/${notification.id}`)
      .set(authHeader(host.accessToken))
      .expect(204);
    const list = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(list.body.data.total).toBe(0);
  });

  it('deletes all notifications for the user', async () => {
    const host = await registerHostUser(app);
    const prisma = app.get(PrismaService);
    await prisma.notification.createMany({
      data: [
        { userId: host.userId, type: 'NEW_MESSAGE', title: 'Msg 1', isRead: false },
        { userId: host.userId, type: 'NEW_REVIEW', title: 'Review 1', isRead: false },
      ],
    });
    const cleared = await request(app.getHttpServer())
      .delete('/api/v1/notifications')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(cleared.body.data.deletedCount).toBe(2);
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications').expect(401);
  });

  it('requires authentication for the notification SSE stream', async () => {
    await request(app.getHttpServer()).get('/api/v1/notifications/stream').expect(401);
  });
});
