'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { PlatformStatsOverview } from '@/components/admin/platform-stats-overview';
import { PlatformStatsTimeseries } from '@/components/admin/platform-stats-timeseries';
import { Link, useRouter } from '@/i18n/navigation';
import { getPlatformStats, type PlatformStats } from '@/lib/api/admin';
import { useAuthStore } from '@/store';

export default function AdminStatsPage(): React.JSX.Element {
  const t = useTranslations('admin.stats');
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/admin/stats');
      return;
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);
  useEffect(() => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) return;
    let cancelled = false;
    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPlatformStats();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError(t('error'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, t]);
  if (authLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6" />;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_dashboard')}
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">{t('loading')}</div>
      ) : error ? (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      ) : stats ? (
        <div className="space-y-8">
          <PlatformStatsOverview stats={stats} />
          <PlatformStatsTimeseries />
        </div>
      ) : null}
    </div>
  );
}
