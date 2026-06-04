'use client';

import { useTranslations } from 'next-intl';

import { useAdminListings } from '@/hooks/use-admin-listings';

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
    isLoading,
    setTab,
    setPage,
    setLimit,
    setStatusFilter,
    setPropertyTypeFilter,
    setSearchQuery,
    resetFilters,
    disableListing,
    enableListing,
  } = useAdminListings();
  const activeTabKey: TabKey = tab === 'disabled' ? 'disabled' : 'active';
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('admin.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('welcome', { name: welcomeName })}</p>
      </div>
      <div className="mb-8">
        <HostDashboardStatsPanel stats={stats} />
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
