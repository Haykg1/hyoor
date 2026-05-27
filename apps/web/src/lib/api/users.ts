import { api } from '@/lib/api';
import { getAccessTokenFromCookie } from '@/lib/auth-cookies';

export interface MyProfile {
  id: string;
  email: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarKey: string | null;
    bio: string | null;
  } | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function getMyProfile(): Promise<MyProfile> {
  return api.get<MyProfile>('/users/me');
}

export async function updateMyProfile(data: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  preferredLang?: string;
}): Promise<MyProfile> {
  return api.patch<MyProfile>('/users/me', data);
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true }> {
  return api.patch<{ success: true }>('/users/me/password', data);
}

export async function uploadAvatar(file: File): Promise<{ avatarKey: string; avatarUrl: string }> {
  const token = getAccessTokenFromCookie();
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/users/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Avatar upload failed: ${res.status}`);
  }
  const json = (await res.json()) as
    | { success: true; data: { avatarKey: string; avatarUrl: string } }
    | { avatarKey: string; avatarUrl: string };
  return 'data' in json ? json.data : json;
}
