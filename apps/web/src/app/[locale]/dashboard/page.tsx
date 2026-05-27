'use client';

import { useEffect, useState } from 'react';

import { HostDashboardClient } from '@/components/dashboard/host-dashboard-client';
import { useRouter } from '@/i18n/navigation';
import { getMyProfile } from '@/lib/api/users';
import { useAuthStore } from '@/store';

export default function DashboardPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [welcomeName, setWelcomeName] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (user.role !== 'HOST' && user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/trips');
      return;
    }
    getMyProfile()
      .then((profile) => {
        const first = profile.profile?.firstName ?? '';
        const last = profile.profile?.lastName ?? '';
        setWelcomeName(
          ([first, last].filter(Boolean).join(' ') || profile.email.split('@')[0]) ?? '',
        );
      })
      .catch(() => {
        setWelcomeName(user.email.split('@')[0] ?? '');
      });
  }, [user, authLoading, router]);

  if (authLoading || !welcomeName) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return <HostDashboardClient welcomeName={welcomeName} />;
}
