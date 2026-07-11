'use client';

import { PaymentFailureCategories, type PaymentFailureCategory } from '@repo/shared';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PaymentFailuresToolbarProps {
  searchQuery: string;
  bookingId: string;
  propertyId: string;
  hostId: string;
  guestId: string;
  category: PaymentFailureCategory | null;
  resolved: boolean | null;
  onSearchChange: (value: string) => void;
  onBookingIdChange: (value: string) => void;
  onPropertyIdChange: (value: string) => void;
  onHostIdChange: (value: string) => void;
  onGuestIdChange: (value: string) => void;
  onCategoryChange: (category: PaymentFailureCategory | null) => void;
  onResolvedChange: (resolved: boolean | null) => void;
  onReset: () => void;
}

const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

export function PaymentFailuresToolbar({
  searchQuery,
  bookingId,
  propertyId,
  hostId,
  guestId,
  category,
  resolved,
  onSearchChange,
  onBookingIdChange,
  onPropertyIdChange,
  onHostIdChange,
  onGuestIdChange,
  onCategoryChange,
  onResolvedChange,
  onReset,
}: PaymentFailuresToolbarProps): React.JSX.Element {
  const t = useTranslations('admin.payment_failures.filters');
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    bookingId.trim() ||
    propertyId.trim() ||
    hostId.trim() ||
    guestId.trim() ||
    category ||
    resolved !== null,
  );
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          value={category ?? ''}
          onChange={(e) =>
            onCategoryChange((e.target.value || null) as PaymentFailureCategory | null)
          }
          className={SELECT_CLASS}
          aria-label={t('category')}
        >
          <option value="">{t('all_categories')}</option>
          {PaymentFailureCategories.map((c) => (
            <option key={c} value={c}>
              {t(`category_values.${c}`)}
            </option>
          ))}
        </select>
        <select
          value={resolved === null ? '' : String(resolved)}
          onChange={(e) =>
            onResolvedChange(e.target.value === '' ? null : e.target.value === 'true')
          }
          className={SELECT_CLASS}
          aria-label={t('resolved')}
        >
          <option value="">{t('all_statuses')}</option>
          <option value="false">{t('unresolved')}</option>
          <option value="true">{t('resolved')}</option>
        </select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
            <X className="h-3 w-3" />
            {t('reset')}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input
          placeholder={t('booking_id')}
          value={bookingId}
          onChange={(e) => onBookingIdChange(e.target.value)}
          aria-label={t('booking_id')}
        />
        <Input
          placeholder={t('property_id')}
          value={propertyId}
          onChange={(e) => onPropertyIdChange(e.target.value)}
          aria-label={t('property_id')}
        />
        <Input
          placeholder={t('host_id')}
          value={hostId}
          onChange={(e) => onHostIdChange(e.target.value)}
          aria-label={t('host_id')}
        />
        <Input
          placeholder={t('guest_id')}
          value={guestId}
          onChange={(e) => onGuestIdChange(e.target.value)}
          aria-label={t('guest_id')}
        />
      </div>
    </div>
  );
}
