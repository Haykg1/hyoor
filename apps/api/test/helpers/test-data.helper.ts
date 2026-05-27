import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface RegisteredUser {
  email: string;
  password: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@e2e.rentstar.test`;
}

export async function registerUser(
  app: INestApplication,
  overrides: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }> = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? uniqueEmail('user');
  const password = overrides.password ?? 'Password123!';
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email,
      password,
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
    })
    .expect(201);
  const data = response.body.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string };
  };
  return {
    email,
    password,
    userId: data.user.id,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

export function authHeader(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}
