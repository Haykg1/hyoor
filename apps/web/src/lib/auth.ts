import type { AuthUser } from '@repo/shared';
import { cookies } from 'next/headers';

import { redirect } from '@/i18n/navigation';

import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from './auth-cookies';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface MeResponse {
  id: string;
  email: string;
  role: AuthUser['role'];
}

async function fetchMeWithToken(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as { data?: MeResponse };
    const user = json.data;
    if (!user) {
      return null;
    }
    return { id: user.id, email: user.email, role: user.role };
  } catch {
    return null;
  }
}

export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  if (accessToken) {
    const user = await fetchMeWithToken(accessToken);
    if (user) {
      return user;
    }
  }
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return null;
  }
  try {
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!refreshRes.ok) {
      return null;
    }
    const refreshJson = (await refreshRes.json()) as { data?: { accessToken: string } };
    const newAccessToken = refreshJson.data?.accessToken;
    if (!newAccessToken) {
      return null;
    }
    return fetchMeWithToken(newAccessToken);
  } catch {
    return null;
  }
}

export async function redirectIfAuthenticated(locale: string): Promise<void> {
  const user = await getServerUser();
  if (!user) {
    return;
  }
  const destination =
    user.role === 'HOST' || user.role === 'ADMIN' || user.role === 'STAFF'
      ? '/dashboard'
      : '/trips';
  redirect({ href: destination, locale });
}
