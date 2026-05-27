import type { AuthTokens, AuthUser } from '@repo/shared';

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  wantsToHost?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}
