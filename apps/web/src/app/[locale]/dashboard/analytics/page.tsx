'use client';

import { useEffect } from 'react';

import { HostAnalyticsClient } from '@/components/dashboard/analytics/host-analytics-client';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

export default function DashboardAnalyticsPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/dashboard/analytics');
      return;
    }
    if (user.role !== 'HOST') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.role !== 'HOST') {
    return <div className="mx-auto max-w-6xl px-4 py-16" />;
  }

  return <HostAnalyticsClient />;
}
