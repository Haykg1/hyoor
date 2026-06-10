'use client';

import { CirclePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useHostListings } from '@/hooks/use-host-listings';
import { Link } from '@/i18n/navigation';

import { HostDashboardStatsPanel } from './host-dashboard-stats';
import { HostListingsPanel } from './host-listings-panel';
import { HostListingsToolbar } from './host-listings-toolbar';
import { HostPromotionsPanel } from './host-promotions-panel';
import { HostReservationsPanel } from './host-reservations-panel';

interface HostDashboardClientProps {
  welcomeName: string;
}

type TabKey = 'active' | 'disabled' | 'reservations' | 'promotions';

const TABS: TabKey[] = ['active', 'disabled', 'reservations', 'promotions'];

export function HostDashboardClient({ welcomeName }: HostDashboardClientProps): React.JSX.Element {
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
    softDeleteListing,
    reactivateListing,
  } = useHostListings();

  const [dashboardTab, setDashboardTab] = useState<TabKey>('active');
  const activeTabKey: TabKey =
    dashboardTab === 'promotions'
      ? 'promotions'
      : dashboardTab === 'reservations'
        ? 'reservations'
        : tab === 'disabled'
          ? 'disabled'
          : 'active';

  function handleTabClick(key: TabKey) {
    if (key === 'reservations') {
      setDashboardTab('reservations');
      return;
    }
    if (key === 'promotions') {
      setDashboardTab('promotions');
      return;
    }
    const listingsTab = key === 'disabled' ? 'disabled' : 'active';
    setDashboardTab(listingsTab);
    setTab(listingsTab);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('welcome', { name: welcomeName })}
          </p>
        </div>
        <Button className="gap-2 self-start sm:self-auto" asChild>
          <Link href="/dashboard/listings/new">
            <CirclePlus className="h-4 w-4" />
            {t('add_listing')}
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <HostDashboardStatsPanel stats={stats} />
      </div>

      <div className="mb-6 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {TABS.map((key) => {
          const label =
            key === 'promotions'
              ? t('tabs.promotions')
              : key === 'reservations'
                ? `${t('tabs.reservations')} (${stats.upcomingReservations + stats.pastReservations})`
                : key === 'active'
                  ? `${t('tabs.listings')} (${stats.totalListings})`
                  : t('tabs.disabled');
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTabClick(key)}
              data-state={key === activeTabKey ? 'active' : 'inactive'}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            >
              {label}
            </button>
          );
        })}
      </div>

      {activeTabKey === 'promotions' ? (
        <HostPromotionsPanel />
      ) : activeTabKey === 'reservations' ? (
        <HostReservationsPanel />
      ) : (
        <>
          <HostListingsToolbar
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
            <HostListingsPanel
              listings={listings}
              isLoading={isLoading}
              page={page}
              limit={limit}
              totalPages={totalPages}
              total={total}
              showDelete
              emptyKey="empty_listings"
              onPageChange={setPage}
              onLimitChange={setLimit}
              onDelete={softDeleteListing}
            />
          )}
          {activeTabKey === 'disabled' && (
            <HostListingsPanel
              listings={listings}
              isLoading={isLoading}
              page={page}
              limit={limit}
              totalPages={totalPages}
              total={total}
              showDelete={false}
              emptyKey="empty_disabled"
              onPageChange={setPage}
              onLimitChange={setLimit}
              onDelete={async () => {}}
              onReactivate={reactivateListing}
            />
          )}
        </>
      )}
    </div>
  );
}
