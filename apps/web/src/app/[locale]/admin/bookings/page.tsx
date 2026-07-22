'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { AdminBookingsTable } from '@/components/admin/admin-bookings-table';
import { AdminBookingsToolbar } from '@/components/admin/admin-bookings-toolbar';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store';

export default function AdminBookingsPage(): React.JSX.Element {
  const t = useTranslations('admin.bookings');
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const {
    bookings,
    page,
    totalPages,
    total,
    status,
    paymentStatus,
    payoutStatus,
    propertyId,
    guestId,
    hostId,
    from,
    to,
    searchQuery,
    isLoading,
    actionId,
    setPage,
    setStatus,
    setPaymentStatus,
    setPayoutStatus,
    setSearchQuery,
    setPropertyId,
    setGuestId,
    setHostId,
    setFrom,
    setTo,
    resetFilters,
    retryRentCapture,
    retryPayout,
    fetchBookings,
  } = useAdminBookings();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=/admin/bookings');
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
      <AdminBookingsToolbar
        searchQuery={searchQuery}
        status={status}
        paymentStatus={paymentStatus}
        payoutStatus={payoutStatus}
        propertyId={propertyId}
        guestId={guestId}
        hostId={hostId}
        from={from}
        to={to}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatus}
        onPaymentStatusChange={setPaymentStatus}
        onPayoutStatusChange={setPayoutStatus}
        onPropertyIdChange={setPropertyId}
        onGuestIdChange={setGuestId}
        onHostIdChange={setHostId}
        onFromChange={setFrom}
        onToChange={setTo}
        onReset={resetFilters}
      />
      <AdminBookingsTable
        bookings={bookings}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        total={total}
        actionId={actionId}
        canRetryMoney={user.role === 'ADMIN'}
        onPageChange={setPage}
        onRetryRentCapture={retryRentCapture}
        onRetryPayout={retryPayout}
        onCancelled={() => {
          void fetchBookings();
        }}
      />
    </div>
  );
}
