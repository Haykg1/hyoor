import type { User, UserProfile } from '@repo/database/client';

const MIN_PHONE_LENGTH = 8;

export function isVerifiedProfileForAiQuota(
  user: Pick<User, 'email' | 'isEmailVerified'> & { profile: UserProfile | null },
): boolean {
  if (!user.isEmailVerified) return false;
  if (!user.email.trim()) return false;
  const profile = user.profile;
  if (!profile) return false;
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
  const phone = profile.phone?.trim() ?? '';
  if (!firstName || !lastName) return false;
  if (phone.length < MIN_PHONE_LENGTH) return false;
  return /\d/.test(phone);
}
