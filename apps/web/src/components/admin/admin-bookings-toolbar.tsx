'use client';

import type { BookingStatus, PaymentStatus } from '@repo/shared';
import { BookingStatuses, PaymentStatuses } from '@repo/shared';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

interface AdminBookingsToolbarProps {
  searchQuery: string;
  status: BookingStatus | null;
  paymentStatus: PaymentStatus | null;
  propertyId: string;
  guestId: string;
  hostId: string;
  from: string;
  to: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: BookingStatus | null) => void;
  onPaymentStatusChange: (value: PaymentStatus | null) => void;
  onPropertyIdChange: (value: string) => void;
  onGuestIdChange: (value: string) => void;
  onHostIdChange: (value: string) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onReset: () => void;
}

export function AdminBookingsToolbar({
  searchQuery,
  status,
  paymentStatus,
  propertyId,
  guestId,
  hostId,
  from,
  to,
  onSearchChange,
  onStatusChange,
  onPaymentStatusChange,
  onPropertyIdChange,
  onGuestIdChange,
  onHostIdChange,
  onFromChange,
  onToChange,
  onReset,
}: AdminBookingsToolbarProps): React.JSX.Element {
  const t = useTranslations('admin.bookings.filters');
  const tBooking = useTranslations('booking.status');
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    status ||
    paymentStatus ||
    propertyId.trim() ||
    guestId.trim() ||
    hostId.trim() ||
    from ||
    to,
  );
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label={t('search_placeholder')}
          />
        </div>
        <select
          value={status ?? ''}
          onChange={(e) => onStatusChange((e.target.value || null) as BookingStatus | null)}
          className={SELECT_CLASS}
          aria-label={t('status')}
        >
          <option value="">{t('all_statuses')}</option>
          {BookingStatuses.map((s) => (
            <option key={s} value={s}>
              {tBooking(s)}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus ?? ''}
          onChange={(e) => onPaymentStatusChange((e.target.value || null) as PaymentStatus | null)}
          className={SELECT_CLASS}
          aria-label={t('payment_status')}
        >
          <option value="">{t('all_payment_statuses')}</option>
          {PaymentStatuses.map((s) => (
            <option key={s} value={s}>
              {t(`payment_status_values.${s}`)}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
            <X className="h-3 w-3" />
            {t('reset')}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          aria-label={t('from')}
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          aria-label={t('to')}
        />
        <Input
          placeholder={t('property_id')}
          value={propertyId}
          onChange={(e) => onPropertyIdChange(e.target.value)}
          aria-label={t('property_id')}
        />
        <Input
          placeholder={t('guest_id')}
          value={guestId}
          onChange={(e) => onGuestIdChange(e.target.value)}
          aria-label={t('guest_id')}
        />
        <Input
          placeholder={t('host_id')}
          value={hostId}
          onChange={(e) => onHostIdChange(e.target.value)}
          aria-label={t('host_id')}
        />
      </div>
    </div>
  );
}
