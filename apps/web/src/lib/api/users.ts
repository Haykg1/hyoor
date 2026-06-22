import { api } from '@/lib/api';
import { getAccessTokenFromCookie } from '@/lib/auth-cookies';
import { compressImage } from '@/lib/compress-image';

export interface MyProfile {
  id: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  profile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarKey: string | null;
    bio: string | null;
    spokenLanguages: string[];
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
  spokenLanguages?: string[];
}): Promise<MyProfile> {
  return api.patch<MyProfile>('/users/me', data);
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: true }> {
  return api.patch<{ success: true }>('/users/me/password', data);
}

export async function deleteAvatar(): Promise<{ success: true }> {
  return api.delete<{ success: true }>('/users/me/avatar');
}

export async function uploadAvatar(file: File): Promise<{ avatarKey: string; avatarUrl: string }> {
  const token = getAccessTokenFromCookie();
  const compressed = await compressImage(file, 1, 512);
  const formData = new FormData();
  formData.append('file', compressed, file.name);
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
