'use client';

import { PropertyTypes, type PropertyType } from '@repo/shared';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminListingStatusFilter } from '@/lib/api/admin';

const ACTIVE_TAB_STATUSES: AdminListingStatusFilter[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'SUSPENDED',
];

interface AdminListingsToolbarProps {
  searchQuery: string;
  statusFilter: AdminListingStatusFilter | null;
  propertyTypeFilter: PropertyType | null;
  showStatusFilter: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: AdminListingStatusFilter | null) => void;
  onPropertyTypeChange: (type: PropertyType | null) => void;
  onReset: () => void;
}

const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

export function AdminListingsToolbar({
  searchQuery,
  statusFilter,
  propertyTypeFilter,
  showStatusFilter,
  onSearchChange,
  onStatusChange,
  onPropertyTypeChange,
  onReset,
}: AdminListingsToolbarProps): React.JSX.Element {
  const t = useTranslations('dashboard.filters');
  const hasActiveFilters = Boolean(searchQuery.trim() || statusFilter || propertyTypeFilter);
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        value={propertyTypeFilter ?? ''}
        onChange={(e) => onPropertyTypeChange((e.target.value || null) as PropertyType | null)}
        className={SELECT_CLASS}
        aria-label={t('property_type')}
      >
        <option value="">{t('all_types')}</option>
        {PropertyTypes.map((type) => (
          <option key={type} value={type}>
            {t(`types.${type}`)}
          </option>
        ))}
      </select>
      {showStatusFilter && (
        <select
          value={statusFilter ?? ''}
          onChange={(e) =>
            onStatusChange((e.target.value || null) as AdminListingStatusFilter | null)
          }
          className={SELECT_CLASS}
          aria-label={t('status')}
        >
          <option value="">{t('all_statuses')}</option>
          {ACTIVE_TAB_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`statuses.${status}`)}
            </option>
          ))}
        </select>
      )}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
          <X className="h-3 w-3" />
          {t('reset')}
        </Button>
      )}
    </div>
  );
}
