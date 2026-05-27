import type { UserRole } from '@repo/shared';

interface JwtClaims {
  sub: string;
  role?: UserRole;
  jti?: string;
}

export function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as JwtClaims;
    return decoded;
  } catch {
    return null;
  }
}
