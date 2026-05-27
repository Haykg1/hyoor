import { createHash, randomBytes, randomInt } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma.service';
import { createTestApp, type TestAppContext } from '../helpers/create-test-app';
import { resetE2eDatabase } from '../helpers/reset-database';
import { registerUser, uniqueEmail } from '../helpers/test-data.helper';

async function issueOtpCode(prisma: PrismaService, userId: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.emailVerificationCode.create({
    data: { userId, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  return code;
}

async function issuePasswordResetToken(prisma: PrismaService, userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  });
  return token;
}

describe('Auth (e2e)', () => {
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

  it('registers a new user and returns tokens', async () => {
    const email = uniqueEmail('register');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123!',
        firstName: 'Anna',
        lastName: 'Guest',
      })
      .expect(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      email,
      role: 'GUEST',
    });
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejects duplicate email registration', async () => {
    const email = uniqueEmail('duplicate');
    await registerUser(app, { email });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'Password123!',
        firstName: 'Dup',
        lastName: 'User',
      })
      .expect(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Email already registered');
  });

  it('rejects invalid registration payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        password: 'short',
        firstName: '',
        lastName: '',
      })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('logs in with valid credentials', async () => {
    const email = uniqueEmail('login');
    const password = 'Password123!';
    await registerUser(app, { email, password });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
  });

  it('rejects login with wrong password', async () => {
    const email = uniqueEmail('bad-login');
    await registerUser(app, { email, password: 'Password123!' });
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' })
      .expect(401);
    expect(response.body.success).toBe(false);
  });

  it('refreshes tokens with a valid refresh token', async () => {
    const user = await registerUser(app);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(201);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).not.toBe(user.refreshToken);
  });

  it('revokes refresh token on logout', async () => {
    const user = await registerUser(app);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: user.refreshToken })
      .expect(200);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken })
      .expect(401);
    expect(response.body.success).toBe(false);
  });

  it('creates an OTP on register and verifies the email', async () => {
    const prisma = app.get(PrismaService);
    const user = await registerUser(app, { email: uniqueEmail('verify') });
    const code = await issueOtpCode(prisma, user.userId);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify/confirm')
      .set({ Authorization: `Bearer ${user.accessToken}` })
      .send({ code })
      .expect(200);
    expect(response.body.data.verified).toBe(true);
    const refreshed = await prisma.user.findUnique({ where: { id: user.userId } });
    expect(refreshed?.isEmailVerified).toBe(true);
  });

  it('rejects an invalid OTP', async () => {
    const prisma = app.get(PrismaService);
    const user = await registerUser(app, { email: uniqueEmail('badotp') });
    await issueOtpCode(prisma, user.userId);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify/confirm')
      .set({ Authorization: `Bearer ${user.accessToken}` })
      .send({ code: '000000' })
      .expect(400);
    expect(response.body.success).toBe(false);
  });

  it('always returns success for forgot-password (no enumeration)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(200);
    expect(response.body.data.success).toBe(true);
  });

  it('resets password using a valid reset token', async () => {
    const prisma = app.get(PrismaService);
    const email = uniqueEmail('reset');
    const user = await registerUser(app, { email });
    const token = await issuePasswordResetToken(prisma, user.userId);
    const newPassword = 'NewPassword123!';
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(201);
  });

  it('rejects an invalid reset token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'NewPassword123!' })
      .expect(400);
    expect(response.body.success).toBe(false);
  });
});
