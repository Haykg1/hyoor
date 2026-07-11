'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SELECT_CLASS =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

interface AdminHostsToolbarProps {
  searchQuery: string;
  hostType: 'INDIVIDUAL' | 'COMPANY' | null;
  isVerified: boolean | null;
  hasFeeOverride: boolean | null;
  onSearchChange: (value: string) => void;
  onHostTypeChange: (value: 'INDIVIDUAL' | 'COMPANY' | null) => void;
  onIsVerifiedChange: (value: boolean | null) => void;
  onHasFeeOverrideChange: (value: boolean | null) => void;
  onReset: () => void;
}

export function AdminHostsToolbar({
  searchQuery,
  hostType,
  isVerified,
  hasFeeOverride,
  onSearchChange,
  onHostTypeChange,
  onIsVerifiedChange,
  onHasFeeOverrideChange,
  onReset,
}: AdminHostsToolbarProps): React.JSX.Element {
  const t = useTranslations('admin.hosts.filters');
  const hasActiveFilters = Boolean(
    searchQuery.trim() || hostType || isVerified !== null || hasFeeOverride !== null,
  );
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
        value={hostType ?? ''}
        onChange={(e) =>
          onHostTypeChange((e.target.value || null) as 'INDIVIDUAL' | 'COMPANY' | null)
        }
        className={SELECT_CLASS}
        aria-label={t('host_type')}
      >
        <option value="">{t('all_types')}</option>
        <option value="INDIVIDUAL">{t('type_individual')}</option>
        <option value="COMPANY">{t('type_company')}</option>
      </select>
      <select
        value={isVerified === null ? '' : String(isVerified)}
        onChange={(e) =>
          onIsVerifiedChange(e.target.value === '' ? null : e.target.value === 'true')
        }
        className={SELECT_CLASS}
        aria-label={t('verified')}
      >
        <option value="">{t('all_verified')}</option>
        <option value="true">{t('verified_yes')}</option>
        <option value="false">{t('verified_no')}</option>
      </select>
      <select
        value={hasFeeOverride === null ? '' : String(hasFeeOverride)}
        onChange={(e) =>
          onHasFeeOverrideChange(e.target.value === '' ? null : e.target.value === 'true')
        }
        className={SELECT_CLASS}
        aria-label={t('fee_override')}
      >
        <option value="">{t('all_fees')}</option>
        <option value="true">{t('custom_fee')}</option>
        <option value="false">{t('default_fee')}</option>
      </select>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
          <X className="h-3 w-3" />
          {t('reset')}
        </Button>
      )}
    </div>
  );
}
