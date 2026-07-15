'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { PaymentFailuresTable } from '@/components/admin/payment-failures-table';
import { PaymentFailuresToolbar } from '@/components/admin/payment-failures-toolbar';
import { useAdminPaymentFailures } from '@/hooks/use-admin-payment-failures';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

export default function AdminPaymentFailuresPage(): React.JSX.Element {
  const t = useTranslations('admin.payment_failures');
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/admin/payment-failures');
      return;
    }
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const {
    failures,
    page,
    totalPages,
    total,
    bookingId,
    propertyId,
    hostId,
    guestId,
    category,
    resolved,
    searchQuery,
    isLoading,
    setPage,
    setCategory,
    setResolved,
    setSearchQuery,
    setBookingId,
    setPropertyId,
    setHostId,
    setGuestId,
    resetFilters,
    resolveFailure,
    resolveFailures,
  } = useAdminPaymentFailures();

  if (authLoading || !user) {
    return <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" />;
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
      <PaymentFailuresToolbar
        searchQuery={searchQuery}
        bookingId={bookingId}
        propertyId={propertyId}
        hostId={hostId}
        guestId={guestId}
        category={category}
        resolved={resolved}
        onSearchChange={setSearchQuery}
        onBookingIdChange={setBookingId}
        onPropertyIdChange={setPropertyId}
        onHostIdChange={setHostId}
        onGuestIdChange={setGuestId}
        onCategoryChange={setCategory}
        onResolvedChange={setResolved}
        onReset={resetFilters}
      />
      <PaymentFailuresTable
        failures={failures}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        onResolve={resolveFailure}
        onResolveMany={resolveFailures}
      />
    </div>
  );
}
