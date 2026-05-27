'use client';

import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      clearAuth();
      const loginPath = '/auth/login';
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    });
    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, [clearAuth]);

  return <>{children}</>;
}
