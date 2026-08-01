'use client';

import type { AdminCancellationFeeClaim } from '@repo/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { CancellationClaimsTable } from '@/components/admin/cancellation-claims-table';
import { Link, useRouter } from '@/i18n/navigation';
import { listPendingCancellationClaims } from '@/lib/api/cancellation-claims';
import { useAuthStore } from '@/store';

export default function AdminCancellationClaimsPage(): React.JSX.Element {
  const t = useTranslations('admin.cancellation_claims');
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const [claims, setClaims] = useState<AdminCancellationFeeClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      setClaims(await listPendingCancellationClaims());
    } catch {
      setClaims([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/admin/cancellation-claims');
      return;
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/dashboard');
      return;
    }
    void fetchClaims();
  }, [user, authLoading, router, fetchClaims]);
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
      <CancellationClaimsTable
        claims={claims}
        isLoading={isLoading}
        onReviewed={() => {
          void fetchClaims();
        }}
      />
    </div>
  );
}
