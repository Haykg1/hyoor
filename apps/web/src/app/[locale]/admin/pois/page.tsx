'use client';

import { useEffect } from 'react';

import { AdminPoisClient } from '@/components/admin/admin-pois-client';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

export default function AdminPoisPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/admin/pois');
      return;
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" />;
  }

  return <AdminPoisClient canForceSeed={user.role === 'ADMIN'} />;
}
