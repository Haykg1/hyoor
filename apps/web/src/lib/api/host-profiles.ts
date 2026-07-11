import { api } from '@/lib/api';

export interface MyHostProfile {
  id: string;
  userId: string;
  hostType: string;
  description: string | null;
  companyName: string | null;
  isVerified: boolean;
  stripeAccountId: string | null;
  stripeDetailsSubmitted: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
}

export interface CreateHostProfileResult extends MyHostProfile {
  stripeOnboardingUrl: string | null;
}

export async function createHostProfile(data: {
  hostType: 'INDIVIDUAL' | 'COMPANY';
  companyName?: string;
  companyRegNumber?: string;
  vatNumber?: string;
  description?: string;
}): Promise<CreateHostProfileResult> {
  return api.post<CreateHostProfileResult>('/host-profiles', data);
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

export async function getStripeOnboardingLink(): Promise<{ onboardingUrl: string }> {
  return api.get<{ onboardingUrl: string }>('/host-profiles/me/stripe-onboarding-link');
}

export async function getStripeLoginLink(): Promise<{ loginUrl: string }> {
  return api.get<{ loginUrl: string }>('/host-profiles/me/stripe-login-link');
}

export async function refreshStripeStatus(): Promise<MyHostProfile> {
  return api.post<MyHostProfile>('/host-profiles/me/stripe-refresh');
}
