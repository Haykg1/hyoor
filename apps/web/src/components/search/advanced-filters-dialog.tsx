'use client';

import type { PlaceResult } from '@repo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { PlaceAutocomplete } from '@/components/search/place-autocomplete';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { SearchFilters } from '@/hooks/use-search-filters';
import {
  searchFiltersToNavigationParams,
  useSearchNavigation,
} from '@/hooks/use-search-navigation';
import { AMENITIES_CATALOG } from '@/lib/listing/amenities-catalog';
import { useSearchStore } from '@/store/search.store';

interface AdvancedFiltersDialogProps {
  initialFilters: SearchFilters;
}

function toOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalFloat(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function AdvancedFiltersDialog({
  initialFilters,
}: AdvancedFiltersDialogProps): React.JSX.Element {
  const t = useTranslations('search.filters');
  const { goToSearch } = useSearchNavigation();
  const {
    filters,
    isAdvancedOpen,
    setAdvancedOpen,
    setFilters,
    resetAdvanced,
    hydrateFromUrlFilters,
  } = useSearchStore();
  const [amenityQuery, setAmenityQuery] = useState('');

  useEffect(() => {
    hydrateFromUrlFilters(initialFilters);
  }, [hydrateFromUrlFilters, initialFilters]);

  const visibleAmenities = useMemo(() => {
    const q = amenityQuery.trim().toLowerCase();
    if (!q) return AMENITIES_CATALOG;
    return AMENITIES_CATALOG.filter((a) => a.name.toLowerCase().includes(q));
  }, [amenityQuery]);

  function apply(): void {
    goToSearch(searchFiltersToNavigationParams(filters));
    setAdvancedOpen(false);
  }

  function handlePlaceSelect(place: PlaceResult): void {
    const display = place.description || place.fullName;
    if (place.placeKind === 'house' && place.street && place.buildingNumber) {
      setFilters({
        location: display,
        region: place.region ?? '',
        searchCity: place.city ?? undefined,
        searchStreet: place.street,
        searchBuildingNumber: place.buildingNumber,
        searchPlaceKind: 'house',
      });
      return;
    }
    setFilters({
      location: display,
      region: place.region ?? '',
      searchCity: place.city ?? undefined,
      searchPlaceKind: place.placeKind,
      searchStreet: undefined,
      searchBuildingNumber: undefined,
    });
  }

  function handleLocationChange(value: string): void {
    setFilters({
      location: value,
      searchCity: undefined,
      searchStreet: undefined,
      searchBuildingNumber: undefined,
      searchPlaceKind: undefined,
    });
  }

  function handleStructuredAddressChange(
    partial: Partial<Pick<SearchFilters, 'searchCity' | 'searchStreet' | 'searchBuildingNumber'>>,
  ): void {
    const searchCity =
      'searchCity' in partial ? partial.searchCity?.trim() || undefined : filters.searchCity;
    const searchStreet =
      'searchStreet' in partial ? partial.searchStreet?.trim() || undefined : filters.searchStreet;
    const searchBuildingNumber =
      'searchBuildingNumber' in partial
        ? partial.searchBuildingNumber?.trim() || undefined
        : filters.searchBuildingNumber;
    const hasHouseAddress = Boolean(searchCity && searchStreet && searchBuildingNumber);
    setFilters({
      searchCity,
      searchStreet,
      searchBuildingNumber,
      searchPlaceKind: hasHouseAddress ? 'house' : undefined,
    });
  }

  return (
    <Dialog open={isAdvancedOpen} onOpenChange={setAdvancedOpen}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="-mx-6 max-h-[70vh] space-y-6 overflow-auto px-6 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">{t('location')}</label>
              <PlaceAutocomplete
                value={filters.location || filters.region}
                onChange={handleLocationChange}
                onSelectPlace={handlePlaceSelect}
                placeholder={t('location_placeholder')}
                level="any"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search_city')}</label>
              <Input
                value={filters.searchCity ?? ''}
                onChange={(e) => handleStructuredAddressChange({ searchCity: e.target.value })}
                placeholder={t('search_city_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search_street')}</label>
              <Input
                value={filters.searchStreet ?? ''}
                onChange={(e) => handleStructuredAddressChange({ searchStreet: e.target.value })}
                placeholder={t('search_street_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search_building_number')}</label>
              <Input
                value={filters.searchBuildingNumber ?? ''}
                onChange={(e) =>
                  handleStructuredAddressChange({ searchBuildingNumber: e.target.value })
                }
                placeholder={t('search_building_number_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_bedrooms')}</label>
              <Input
                type="number"
                min={0}
                value={filters.minBedrooms ?? ''}
                onChange={(e) => setFilters({ minBedrooms: toOptionalInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_beds')}</label>
              <Input
                type="number"
                min={0}
                value={filters.minBeds ?? ''}
                onChange={(e) => setFilters({ minBeds: toOptionalInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_bathrooms')}</label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={filters.minBathrooms ?? ''}
                onChange={(e) => setFilters({ minBathrooms: toOptionalFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_adults')}</label>
              <Input
                type="number"
                min={0}
                value={filters.minAdults ?? ''}
                onChange={(e) => setFilters({ minAdults: toOptionalInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_children')}</label>
              <Input
                type="number"
                min={0}
                value={filters.minChildren ?? ''}
                onChange={(e) => setFilters({ minChildren: toOptionalInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_infants')}</label>
              <Input
                type="number"
                min={0}
                value={filters.minInfants ?? ''}
                onChange={(e) => setFilters({ minInfants: toOptionalInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* <div className="space-y-2">
              <label className="text-sm font-medium">{t('cleaning_fee_range')}</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={t('min')}
                  value={filters.minCleaningFee ?? ''}
                  onChange={(e) => setFilters({ minCleaningFee: toOptionalInt(e.target.value) })}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder={t('max')}
                  value={filters.maxCleaningFee ?? ''}
                  onChange={(e) => setFilters({ maxCleaningFee: toOptionalInt(e.target.value) })}
                />
              </div>
            </div> */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('security_deposit_range')}</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder={t('min')}
                  value={filters.minSecurityDeposit ?? ''}
                  onChange={(e) =>
                    setFilters({ minSecurityDeposit: toOptionalInt(e.target.value) })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  placeholder={t('max')}
                  value={filters.maxSecurityDeposit ?? ''}
                  onChange={(e) =>
                    setFilters({ maxSecurityDeposit: toOptionalInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_nights')}</label>
              <Input
                type="number"
                min={1}
                value={filters.minNights ?? ''}
                onChange={(e) => setFilters({ minNights: toOptionalInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('max_nights')}</label>
              <Input
                type="number"
                min={1}
                value={filters.maxNights ?? ''}
                onChange={(e) => setFilters({ maxNights: toOptionalInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t('house_rules')}</p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.smokingAllowed === true}
                onCheckedChange={(checked) => setFilters({ smokingAllowed: checked === true })}
              />
              {t('smoking_allowed')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.petsAllowed === true}
                onCheckedChange={(checked) => setFilters({ petsAllowed: checked === true })}
              />
              {t('pets_allowed')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={filters.partiesAllowed === true}
                onCheckedChange={(checked) => setFilters({ partiesAllowed: checked === true })}
              />
              {t('parties_allowed')}
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{t('amenities')}</p>
              <Input
                value={amenityQuery}
                onChange={(e) => setAmenityQuery(e.target.value)}
                placeholder={t('amenities_search')}
                className="h-8 w-56 text-xs"
              />
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto rounded-md border border-border p-3 sm:grid-cols-2">
              {visibleAmenities.map((a) => {
                const checked = filters.amenities.includes(a.name);
                return (
                  <label key={a.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const nextChecked = next === true;
                        setFilters({
                          amenities: nextChecked
                            ? Array.from(new Set([...filters.amenities, a.name]))
                            : filters.amenities.filter((n) => n !== a.name),
                        });
                      }}
                    />
                    {a.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_avg_rating')}</label>
              <Input
                type="number"
                min={1}
                max={5}
                step="0.1"
                value={filters.minAvgRating ?? ''}
                onChange={(e) => setFilters({ minAvgRating: toOptionalFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('min_review_count')}</label>
              <Input
                type="number"
                min={1}
                value={filters.minReviewCount ?? ''}
                onChange={(e) => setFilters({ minReviewCount: toOptionalInt(e.target.value) })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAdvancedOpen(false)}>
            {t('cancel')}
          </Button>
          <Button variant="outline" onClick={resetAdvanced}>
            {t('reset')}
          </Button>
          <Button onClick={apply}>{t('apply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
