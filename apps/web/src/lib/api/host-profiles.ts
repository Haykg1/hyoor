import { api } from '@/lib/api';

export interface MyHostProfile {
  id: string;
  userId: string;
  hostType: string;
  description: string | null;
  companyName: string | null;
  isVerified: boolean;
}

export async function getMyHostProfile(): Promise<MyHostProfile> {
  return api.get<MyHostProfile>('/host-profiles/me');
}

export async function updateMyHostProfile(data: {
  description?: string;
  companyName?: string;
  payoutEmail?: string;
}): Promise<MyHostProfile> {
  return api.patch<MyHostProfile>('/host-profiles/me', data);
}
