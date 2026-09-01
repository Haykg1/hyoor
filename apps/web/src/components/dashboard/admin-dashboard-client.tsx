'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAdminListings } from '@/hooks/use-admin-listings';
import { Link } from '@/i18n/navigation';

import { AdminEarningsRangeToolbar } from './admin-earnings-range-toolbar';
import { AdminListingsPanel } from './admin-listings-panel';
import { AdminListingsToolbar } from './admin-listings-toolbar';
import { HostDashboardStatsPanel } from './host-dashboard-stats';

interface AdminDashboardClientProps {
  welcomeName: string;
}

type TabKey = 'active' | 'disabled';

const TABS: TabKey[] = ['active', 'disabled'];

export function AdminDashboardClient({
  welcomeName,
}: AdminDashboardClientProps): React.JSX.Element {
  const t = useTranslations('dashboard');
  const {
    listings,
    stats,
    page,
    limit,
    totalPages,
    total,
    tab,
    statusFilter,
    propertyTypeFilter,
    searchQuery,
    earningsPreset,
    earningsFrom,
    earningsTo,
    isLoading,
    setTab,
    setPage,
    setLimit,
    setStatusFilter,
    setPropertyTypeFilter,
    setSearchQuery,
    setEarningsPreset,
    setEarningsFrom,
    setEarningsTo,
    resetFilters,
    disableListing,
    enableListing,
  } = useAdminListings();
  const activeTabKey: TabKey = tab === 'disabled' ? 'disabled' : 'active';
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('welcome', { name: welcomeName })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/hosts"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent"
          >
            {t('admin.hosts_link')}
          </Link>
          <Link
            href="/admin/pois"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent"
          >
            {t('admin.pois_link')}
          </Link>
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent"
          >
            {t('admin.bookings_link')}
          </Link>
          <Link
            href="/admin/payment-failures"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent"
          >
            <AlertTriangle className="h-4 w-4" />
            {t('admin.payment_failures_link')}
          </Link>
        </div>
      </div>
      <div className="mb-8">
        <AdminEarningsRangeToolbar
          preset={earningsPreset}
          from={earningsFrom}
          to={earningsTo}
          onPresetChange={setEarningsPreset}
          onFromChange={setEarningsFrom}
          onToChange={setEarningsTo}
        />
        <HostDashboardStatsPanel stats={stats} variant="admin" />
      </div>
      <div className="mb-6 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {TABS.map((key) => {
          const label =
            key === 'active'
              ? `${t('admin.tabs.all_properties')} (${stats.totalListings})`
              : t('tabs.disabled');
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key === 'disabled' ? 'disabled' : 'active')}
              data-state={key === activeTabKey ? 'active' : 'inactive'}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            >
              {label}
            </button>
          );
        })}
      </div>
      <AdminListingsToolbar
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        propertyTypeFilter={propertyTypeFilter}
        showStatusFilter={activeTabKey === 'active'}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onPropertyTypeChange={setPropertyTypeFilter}
        onReset={resetFilters}
      />
      {activeTabKey === 'active' && (
        <AdminListingsPanel
          listings={listings}
          isLoading={isLoading}
          page={page}
          limit={limit}
          totalPages={totalPages}
          total={total}
          emptyKey="admin.empty_listings"
          onPageChange={setPage}
          onLimitChange={setLimit}
          onDisable={disableListing}
          onEnable={enableListing}
        />
      )}
      {activeTabKey === 'disabled' && (
        <AdminListingsPanel
          listings={listings}
          isLoading={isLoading}
          page={page}
          limit={limit}
          totalPages={totalPages}
          total={total}
          emptyKey="empty_disabled"
          onPageChange={setPage}
          onLimitChange={setLimit}
          onDisable={disableListing}
          onEnable={enableListing}
        />
      )}
    </div>
  );
}
