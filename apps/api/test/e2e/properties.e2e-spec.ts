import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import {
  createActivePropertyDirect,
  createCompletedGuestBooking,
  registerHostUser,
  sampleProperty,
} from '../helpers/property-test.helper';
import { resetE2eDatabase } from '../helpers/reset-database';
import { authHeader, registerUser, uniqueEmail } from '../helpers/test-data.helper';

describe('Properties (e2e)', () => {
  let app: INestApplication;
  let storage: TestAppContext['storage'];

  beforeAll(async () => {
    const ctx: TestAppContext = await createTestApp();
    app = ctx.app;
    storage = ctx.storage;
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await resetE2eDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a property as HOST in PENDING_REVIEW status', async () => {
    const host = await registerHostUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    expect(response.body.data.status).toBe('PENDING_REVIEW');
    expect(response.body.data.slug).toBe('cozy-yerevan-apartment');
    expect(response.body.data.hostId).toBe(host.hostProfileId);
  });

  it('rejects property creation for non-host users', async () => {
    const guest = await registerUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(guest.accessToken))
      .send(sampleProperty)
      .expect(403);
    expect(response.body.success).toBe(false);
  });

  it('searches ACTIVE properties with filters', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: create.body.data.id },
      data: { status: 'ACTIVE' },
    });
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({ city: 'Yerevan', maxGuests: 2 })
      .expect(200);
    expect(response.body.data.data).toHaveLength(1);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.data[0].title).toBe(sampleProperty.title);
  });

  it('supports extended search filters (region/rooms/guest breakdown/fees/stay rules/house rules)', async () => {
    const host = await registerHostUser(app);
    const prisma = app.get(PrismaService);
    const a = await prisma.property.create({
      data: {
        hostId: host.hostProfileId,
        status: 'ACTIVE',
        title: 'Apt A',
        slug: 'apt-a',
        description: 'desc',
        propertyType: 'APARTMENT',
        city: 'Yerevan',
        region: 'Tavush',
        country: 'AM',
        maxGuests: 4,
        maxAdults: 2,
        maxChildren: 1,
        maxInfants: 1,
        bedrooms: 2,
        beds: 2,
        bathrooms: 2,
        pricePerNight: 30000,
        currency: 'AMD',
        cancellationPolicy: 'MODERATE',
        cleaningFee: 5000,
        securityDeposit: 20000,
        minNights: 2,
        maxNights: 10,
        petsAllowed: true,
        smokingAllowed: false,
        partiesAllowed: false,
      },
    });
    await prisma.property.create({
      data: {
        hostId: host.hostProfileId,
        status: 'ACTIVE',
        title: 'Apt B',
        slug: 'apt-b',
        description: 'desc',
        propertyType: 'APARTMENT',
        city: 'Yerevan',
        region: 'Lori',
        country: 'AM',
        maxGuests: 2,
        maxAdults: 2,
        maxChildren: 0,
        maxInfants: 0,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        pricePerNight: 15000,
        currency: 'AMD',
        cancellationPolicy: 'MODERATE',
        cleaningFee: 0,
        securityDeposit: 0,
        minNights: 5,
        maxNights: null,
        petsAllowed: false,
        smokingAllowed: false,
        partiesAllowed: false,
      },
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({
        city: 'Yerevan',
        region: 'Tavush',
        minBedrooms: 2,
        minBeds: 2,
        minBathrooms: 2,
        minAdults: 2,
        minChildren: 1,
        minInfants: 1,
        minCleaningFee: 1,
        minSecurityDeposit: 1,
        minNights: 3,
        maxNights: 7,
        petsAllowed: true,
      })
      .expect(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].id).toBe(a.id);
  });

  it('filters search results by amenities (must include ALL selected amenities)', async () => {
    const host = await registerHostUser(app);
    const createA = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send({ ...sampleProperty, title: 'Amenity A' })
      .expect(201);
    const createB = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send({ ...sampleProperty, title: 'Amenity B' })
      .expect(201);
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: createA.body.data.id },
      data: { status: 'ACTIVE' },
    });
    await prisma.property.update({
      where: { id: createB.body.data.id },
      data: { status: 'ACTIVE' },
    });
    await request(app.getHttpServer())
      .put(`/api/v1/properties/${createA.body.data.id}/amenities`)
      .set(authHeader(host.accessToken))
      .send({ amenities: [{ name: 'WiFi' }, { name: 'Kitchen' }] })
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/properties/${createB.body.data.id}/amenities`)
      .set(authHeader(host.accessToken))
      .send({ amenities: [{ name: 'WiFi' }] })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({ amenities: ['WiFi', 'Kitchen'] })
      .expect(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].id).toBe(createA.body.data.id);
  });

  it('filters search results by minAvgRating and minReviewCount', async () => {
    const host = await registerHostUser(app);
    const guestA = await registerUser(app, { email: uniqueEmail('guest-a') });
    const guestB = await registerUser(app, { email: uniqueEmail('guest-b') });
    const bookingA = await createCompletedGuestBooking(app, host, guestA);
    const bookingB = await createCompletedGuestBooking(app, host, guestB);
    const prisma = app.get(PrismaService);
    await prisma.review.create({
      data: {
        bookingId: bookingA.bookingId,
        authorId: guestA.userId,
        subjectId: host.userId,
        target: 'PROPERTY',
        rating: 5,
        isPublished: true,
        propertyId: bookingA.propertyId,
      },
    });
    await prisma.review.create({
      data: {
        bookingId: bookingB.bookingId,
        authorId: guestB.userId,
        subjectId: host.userId,
        target: 'PROPERTY',
        rating: 4,
        isPublished: true,
        propertyId: bookingB.propertyId,
      },
    });
    const res = await request(app.getHttpServer())
      .get('/api/v1/properties')
      .query({ minAvgRating: 4.5, minReviewCount: 1 })
      .expect(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.data[0].id).toBe(bookingA.propertyId);
  });

  it('returns property detail with photos and amenities for ACTIVE listing', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const prisma = app.get(PrismaService);
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'ACTIVE' },
    });
    await request(app.getHttpServer())
      .put(`/api/v1/properties/${propertyId}/amenities`)
      .set(authHeader(host.accessToken))
      .send({ amenities: [{ name: 'WiFi', category: 'Internet' }] })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos`)
      .set(authHeader(host.accessToken))
      .attach('file', Buffer.from('photo-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/properties/${propertyId}`)
      .expect(200);
    expect(response.body.data.amenities).toHaveLength(1);
    expect(response.body.data.photos).toHaveLength(1);
    expect(response.body.data.host).toBeDefined();
  });

  it('hides non-ACTIVE property from public detail', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    await request(app.getHttpServer()).get(`/api/v1/properties/${create.body.data.id}`).expect(404);
  });

  it('returns host own listings at GET /properties/my with pagination and stats', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties/my')
      .set(authHeader(host.accessToken))
      .expect(200);
    const body = response.body.data as {
      data: unknown[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      stats: {
        totalListings: number;
        activeListings: number;
        pendingRequests: number;
        upcomingReservations: number;
        pastReservations: number;
      };
    };
    expect(body.data).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(1);
    expect(body.stats).toBeDefined();
    expect(body.stats.totalListings).toBe(1);
    expect(body.stats.pendingRequests).toBe(0);
    expect(body.stats.upcomingReservations).toBe(0);
    expect(body.stats.pastReservations).toBe(0);
  });

  it('returns upcomingReservations count after guest creates a confirmed booking', async () => {
    const host = await registerHostUser(app);
    const guest = await registerUser(app, { email: uniqueEmail('guest') });
    const property = await createActivePropertyDirect(app, host);
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set(authHeader(guest.accessToken))
      .send({
        propertyId: property.id,
        checkIn: '2027-06-10',
        checkOut: '2027-06-13',
        guestCount: 2,
      })
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties/my')
      .set(authHeader(host.accessToken))
      .expect(200);
    const body = response.body.data as {
      stats: { upcomingReservations: number };
    };
    expect(body.stats.upcomingReservations).toBe(1);
  });

  it('host A cannot see host B listings at GET /properties/my', async () => {
    const hostA = await registerHostUser(app);
    const hostB = await registerHostUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(hostA.accessToken))
      .send(sampleProperty)
      .expect(201);
    const response = await request(app.getHttpServer())
      .get('/api/v1/properties/my')
      .set(authHeader(hostB.accessToken))
      .expect(200);
    const body = response.body.data as { data: unknown[]; total: number };
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('returns INACTIVE listings on ?tab=disabled and active on ?tab=active', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}`)
      .set(authHeader(host.accessToken))
      .expect(200);
    const activeResponse = await request(app.getHttpServer())
      .get('/api/v1/properties/my?tab=active')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((activeResponse.body.data as { data: unknown[] }).data).toHaveLength(0);
    const disabledResponse = await request(app.getHttpServer())
      .get('/api/v1/properties/my?tab=disabled')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((disabledResponse.body.data as { data: unknown[] }).data).toHaveLength(1);
  });

  it('rejects invalid limit at GET /properties/my', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .get('/api/v1/properties/my?limit=50')
      .set(authHeader(host.accessToken))
      .expect(400);
  });

  it('filters /properties/my by status within active tab', async () => {
    const host = await registerHostUser(app);
    const draft = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const prisma = app.get(PrismaService);
    const activeProperty = await prisma.property.create({
      data: {
        hostId: host.hostProfileId,
        title: 'Active Apartment Title',
        slug: 'active-apartment-title',
        description: 'desc',
        propertyType: 'APARTMENT',
        city: 'Yerevan',
        country: 'AM',
        maxGuests: 2,
        bedrooms: 1,
        beds: 1,
        bathrooms: 1,
        pricePerNight: 30000,
        currency: 'AMD',
        cancellationPolicy: 'MODERATE',
        status: 'ACTIVE',
      },
    });
    const pendingResp = await request(app.getHttpServer())
      .get('/api/v1/properties/my?status=PENDING_REVIEW')
      .set(authHeader(host.accessToken))
      .expect(200);
    const pendingBody = pendingResp.body.data as { data: Array<{ id: string; status: string }> };
    expect(pendingBody.data).toHaveLength(1);
    expect(pendingBody.data[0]?.id).toBe(draft.body.data.id);
    expect(pendingBody.data[0]?.status).toBe('PENDING_REVIEW');
    const activeResp = await request(app.getHttpServer())
      .get('/api/v1/properties/my?status=ACTIVE')
      .set(authHeader(host.accessToken))
      .expect(200);
    const activeBody = activeResp.body.data as { data: Array<{ id: string }> };
    expect(activeBody.data).toHaveLength(1);
    expect(activeBody.data[0]?.id).toBe(activeProperty.id);
  });

  it('rejects status=INACTIVE on /properties/my (use tab=disabled)', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .get('/api/v1/properties/my?status=INACTIVE')
      .set(authHeader(host.accessToken))
      .expect(400);
  });

  it('filters /properties/my by propertyType', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const villaMatches = await request(app.getHttpServer())
      .get('/api/v1/properties/my?propertyType=VILLA')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((villaMatches.body.data as { data: unknown[] }).data).toHaveLength(0);
    const apartmentMatches = await request(app.getHttpServer())
      .get('/api/v1/properties/my?propertyType=APARTMENT')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((apartmentMatches.body.data as { data: unknown[] }).data).toHaveLength(1);
  });

  it('searches /properties/my by title, slug, and city', async () => {
    const host = await registerHostUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const titleHit = await request(app.getHttpServer())
      .get('/api/v1/properties/my?search=cozy')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((titleHit.body.data as { data: unknown[] }).data).toHaveLength(1);
    const slugHit = await request(app.getHttpServer())
      .get('/api/v1/properties/my?search=yerevan-apartment')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((slugHit.body.data as { data: unknown[] }).data).toHaveLength(1);
    const miss = await request(app.getHttpServer())
      .get('/api/v1/properties/my?search=nonexistent-xyz')
      .set(authHeader(host.accessToken))
      .expect(200);
    expect((miss.body.data as { data: unknown[] }).data).toHaveLength(0);
  });

  it('updates and soft-deletes owned property', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const update = await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}`)
      .set(authHeader(host.accessToken))
      .send({ title: 'Updated Apartment Title' })
      .expect(200);
    expect(update.body.data.title).toBe('Updated Apartment Title');
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}`)
      .set(authHeader(host.accessToken))
      .expect(200);
    const prisma = app.get(PrismaService);
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    expect(property?.status).toBe('INACTIVE');
  });

  it('allows host to reactivate own INACTIVE property', async () => {
    const hostA = await registerHostUser(app);
    const hostB = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(hostA.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}`)
      .set(authHeader(hostA.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}/reactivate`)
      .set(authHeader(hostB.accessToken))
      .expect(403);
    const reactivate = await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}/reactivate`)
      .set(authHeader(hostA.accessToken))
      .expect(200);
    expect(reactivate.body.data.status).toBe('ACTIVE');
  });

  it('rejects reactivate when property is not INACTIVE', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}/reactivate`)
      .set(authHeader(host.accessToken))
      .expect(400);
  });

  it('allows admin to change property status', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const admin = await registerUser(app, { email: uniqueEmail('admin') });
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: admin.password })
      .expect(201);
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/properties/${propertyId}/status`)
      .set(authHeader(adminLogin.body.data.accessToken))
      .send({ status: 'ACTIVE' })
      .expect(200);
    expect(response.body.data.status).toBe('ACTIVE');
  });

  it('returns presigned upload URL and confirms photo for property owner', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const presigned = await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos/presigned-url`)
      .set(authHeader(host.accessToken))
      .send({ mimeType: 'image/jpeg' })
      .expect(201);
    const { uploadUrl, key } = presigned.body.data as { uploadUrl: string; key: string };
    expect(uploadUrl).toContain('https://');
    expect(key).toMatch(new RegExp(`^properties/${propertyId}/`));
    const confirm = await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos/confirm`)
      .set(authHeader(host.accessToken))
      .send({ key, isCover: true })
      .expect(201);
    expect(confirm.body.data.key).toBe(key);
    expect(confirm.body.data.isCover).toBe(true);
  });

  it('rejects presigned photo URL for non-owner host', async () => {
    const hostA = await registerHostUser(app);
    const hostB = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(hostA.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos/presigned-url`)
      .set(authHeader(hostB.accessToken))
      .send({ mimeType: 'image/jpeg' })
      .expect(403);
  });

  it('rejects invalid mime type for presigned photo URL', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos/presigned-url`)
      .set(authHeader(host.accessToken))
      .send({ mimeType: 'image/gif' })
      .expect(400);
  });

  it('rejects photo confirm when key prefix does not match property', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos/confirm`)
      .set(authHeader(host.accessToken))
      .send({ key: 'properties/other-property/bad-key.jpg' })
      .expect(400);
  });

  it('deletes property photo from storage and database', async () => {
    const host = await registerHostUser(app);
    const create = await request(app.getHttpServer())
      .post('/api/v1/properties')
      .set(authHeader(host.accessToken))
      .send(sampleProperty)
      .expect(201);
    const propertyId = create.body.data.id as string;
    const upload = await request(app.getHttpServer())
      .post(`/api/v1/properties/${propertyId}/photos`)
      .set(authHeader(host.accessToken))
      .attach('file', Buffer.from('photo-bytes'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const photoId = upload.body.data.id as string;
    const photoKey = upload.body.data.key as string;
    expect(storage.hasFile(photoKey)).toBe(true);
    await request(app.getHttpServer())
      .delete(`/api/v1/properties/${propertyId}/photos/${photoId}`)
      .set(authHeader(host.accessToken))
      .expect(200);
    expect(storage.hasFile(photoKey)).toBe(false);
  });
});
