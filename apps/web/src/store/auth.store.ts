import type { AuthUser } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { api } from '@/lib/api';
import {
  clearAuthCookies,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  setAuthCookies,
} from '@/lib/auth-cookies';
import type { AuthResponse, LoginInput, RegisterInput } from '@/types/auth';

interface MeResponse {
  id: string;
  email: string;
  role: AuthUser['role'];
  avatarUrl?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  avatarUrl: string | null;
  displayName: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser) => void;
  setAvatarUrl: (url: string | null) => void;
  clearAuth: () => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setSessionFromTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
}

function toAuthUser(user: MeResponse): AuthUser {
  return { id: user.id, email: user.email, role: user.role };
}

function welcomeDisplayName(me: MeResponse): string {
  const first = me.profile?.firstName?.trim() ?? '';
  const last = me.profile?.lastName?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || me.email.split('@')[0] || '';
}

function applyMeResponse(me: MeResponse, set: (partial: Partial<AuthState>) => void): void {
  set({
    user: toAuthUser(me),
    avatarUrl: me.avatarUrl ?? null,
    displayName: welcomeDisplayName(me),
    isAuthenticated: true,
    isLoading: false,
  });
}

function applyAuthResponse(
  response: AuthResponse,
  set: (partial: Partial<AuthState>) => void,
): void {
  api.setAuthToken(response.accessToken);
  setAuthCookies(response);
  set({
    user: response.user,
    isAuthenticated: true,
    isLoading: false,
  });
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      avatarUrl: null,
      displayName: '',
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
      clearAuth: () => {
        api.clearAuthToken();
        clearAuthCookies();
        set({
          user: null,
          avatarUrl: null,
          displayName: '',
          isAuthenticated: false,
          isLoading: false,
        });
      },
      login: async (input) => {
        set({ isLoading: true });
        try {
          const response = await api.post<AuthResponse>('/auth/login', input);
          applyAuthResponse(response, set);
        } finally {
          set({ isLoading: false });
        }
      },
      register: async (input) => {
        set({ isLoading: true });
        try {
          const response = await api.post<AuthResponse>('/auth/register', input);
          applyAuthResponse(response, set);
        } finally {
          set({ isLoading: false });
        }
      },
      logout: async () => {
        const refreshToken = getRefreshTokenFromCookie();
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
          }
        } catch {
          // Ignore logout API errors — clear local state regardless
        }
        get().clearAuth();
      },
      fetchMe: async () => {
        set({ isLoading: true });
        api.hydrateAccessTokenFromCookie();
        const hasSession = Boolean(getAccessTokenFromCookie() || getRefreshTokenFromCookie());
        if (!hasSession) {
          set({
            user: null,
            avatarUrl: null,
            displayName: '',
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }
        try {
          const me = await api.get<MeResponse>('/users/me');
          applyMeResponse(me, set);
        } catch {
          set({
            user: null,
            avatarUrl: null,
            displayName: '',
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      setSessionFromTokens: async (tokens) => {
        set({ isLoading: true });
        api.setAuthToken(tokens.accessToken);
        setAuthCookies(tokens);
        try {
          const me = await api.get<MeResponse>('/users/me');
          applyMeResponse(me, set);
        } catch {
          api.clearAuthToken();
          clearAuthCookies();
          set({
            user: null,
            avatarUrl: null,
            displayName: '',
            isAuthenticated: false,
            isLoading: false,
          });
          throw new Error('Failed to load user profile');
        }
      },
    }),
    { name: 'auth-store' },
  ),
);
