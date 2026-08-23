import { api } from '@/lib/api';

export interface MyHostProfile {
  id: string;
  userId: string;
  hostType: string;
  description: string | null;
  companyName: string | null;
  isVerified: boolean;
}

export async function createHostProfile(data: {
  hostType: 'INDIVIDUAL' | 'COMPANY';
  companyName?: string;
  companyRegNumber?: string;
  vatNumber?: string;
  description?: string;
}): Promise<MyHostProfile> {
  return api.post<MyHostProfile>('/host-profiles', data);
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
