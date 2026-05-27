import type { ApiResponse, AuthTokens } from '@repo/shared';

import {
  clearAuthCookies,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  setAuthCookies,
} from './auth-cookies';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type UnauthorizedHandler = () => void;

class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private unauthorizedHandler: UnauthorizedHandler | null = null;

  setAuthToken(token: string | null): void {
    this.accessToken = token;
  }

  clearAuthToken(): void {
    this.accessToken = null;
    clearAuthCookies();
  }

  setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
    this.unauthorizedHandler = handler;
  }

  hydrateAccessTokenFromCookie(): void {
    if (this.accessToken) {
      return;
    }
    const token = getAccessTokenFromCookie();
    if (token) {
      this.accessToken = token;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      return {};
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!text) {
      return undefined as T;
    }
    const json = JSON.parse(text) as ApiResponse<T> | T;
    if (
      json &&
      typeof json === 'object' &&
      'success' in json &&
      json.success === true &&
      'data' in json
    ) {
      return json.data as T;
    }
    return json as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshTokenFromCookie();
    if (!refreshToken) {
      return false;
    }
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        return false;
      }
      const tokens = await this.parseResponse<AuthTokens>(res);
      this.accessToken = tokens.accessToken;
      setAuthCookies(tokens);
      return true;
    } catch {
      return false;
    }
  }

  private async handleUnauthorized(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshAccessToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    const refreshed = await this.refreshPromise;
    if (!refreshed) {
      this.clearAuthToken();
      this.unauthorizedHandler?.();
      return false;
    }
    return true;
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
    retryOnUnauthorized = true,
  ): Promise<T> {
    this.hydrateAccessTokenFromCookie();
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...init?.headers,
      },
      credentials: 'include',
    });
    if (res.status === 401 && retryOnUnauthorized && !path.startsWith('/auth/')) {
      const refreshed = await this.handleUnauthorized();
      if (refreshed) {
        return this.request<T>(path, init, false);
      }
      throw new ApiError('Unauthorized', 401);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new ApiError(`API error ${res.status}: ${body}`, res.status, body);
    }
    return this.parseResponse<T>(res);
  }

  get<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...init, method: 'DELETE' });
  }
}

export const api = new ApiClient();
