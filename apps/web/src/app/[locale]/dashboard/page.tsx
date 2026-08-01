'use client';

import { useEffect } from 'react';

import { AdminDashboardClient } from '@/components/dashboard/admin-dashboard-client';
import { HostDashboardClient } from '@/components/dashboard/host-dashboard-client';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

export default function DashboardPage(): React.JSX.Element {
  const { user, displayName, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role !== 'HOST' && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/trips');
    }
  }, [user, authLoading, router]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const welcomeName = displayName || user?.email.split('@')[0] || '';

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboardClient welcomeName={welcomeName} />;
  }

  return <HostDashboardClient welcomeName={welcomeName} />;
}
