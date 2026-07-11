'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { AdminHostsTable } from '@/components/admin/admin-hosts-table';
import { AdminHostsToolbar } from '@/components/admin/admin-hosts-toolbar';
import { useAdminHosts } from '@/hooks/use-admin-hosts';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

export default function AdminHostsPage(): React.JSX.Element {
  const t = useTranslations('admin.hosts');
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const {
    hosts,
    page,
    totalPages,
    total,
    searchQuery,
    hostType,
    isVerified,
    hasFeeOverride,
    isLoading,
    savingId,
    setPage,
    setSearchQuery,
    setHostType,
    setIsVerified,
    setHasFeeOverride,
    resetFilters,
    savePlatformFee,
  } = useAdminHosts();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/admin/hosts');
      return;
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

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
      <AdminHostsToolbar
        searchQuery={searchQuery}
        hostType={hostType}
        isVerified={isVerified}
        hasFeeOverride={hasFeeOverride}
        onSearchChange={setSearchQuery}
        onHostTypeChange={setHostType}
        onIsVerifiedChange={setIsVerified}
        onHasFeeOverrideChange={setHasFeeOverride}
        onReset={resetFilters}
      />
      <AdminHostsTable
        hosts={hosts}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        savingId={savingId}
        canEditFee={user.role === 'ADMIN'}
        onPageChange={setPage}
        onSaveFee={savePlatformFee}
      />
    </div>
  );
}
