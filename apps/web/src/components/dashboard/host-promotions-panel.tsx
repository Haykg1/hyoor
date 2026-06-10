'use client';

import type { HostListingSummary, PromotionSummary } from '@repo/shared';
import { CirclePlus, Tag, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PromotionFormDialog } from '@/components/dashboard/promotion-form-dialog';
import { PropertySelectField } from '@/components/dashboard/property-select-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deletePromotion, listPromotions } from '@/lib/api/promotions';
import { listMyProperties } from '@/lib/api/properties';

const ACTIVE_LISTINGS_PAGE_LIMIT = 30;

export function HostPromotionsPanel(): React.JSX.Element {
  const t = useTranslations('dashboard.promotions');
  const [listings, setListings] = useState<HostListingSummary[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [promotions, setPromotions] = useState<PromotionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [promotionToRemove, setPromotionToRemove] = useState<PromotionSummary | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const loadPromotions = useCallback(async (propertyId?: string) => {
    setIsLoading(true);
    try {
      const res = await listPromotions({
        propertyId: propertyId || undefined,
        limit: 50,
      });
      setPromotions(res.data);
    } catch {
      setPromotions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    async function loadListings(): Promise<void> {
      try {
        const first = await listMyProperties({
          tab: 'active',
          limit: ACTIVE_LISTINGS_PAGE_LIMIT,
          page: 1,
        });
        const all = [...first.data];
        for (let page = 2; page <= first.totalPages; page += 1) {
          const next = await listMyProperties({
            tab: 'active',
            limit: ACTIVE_LISTINGS_PAGE_LIMIT,
            page,
          });
          all.push(...next.data);
        }
        setListings(all);
        const firstId = all[0]?.id;
        if (firstId) {
          setSelectedPropertyId((prev) => prev || firstId);
        }
      } catch {
        setListings([]);
      }
    }
    void loadListings();
  }, []);
  useEffect(() => {
    void loadPromotions(selectedPropertyId || undefined);
  }, [selectedPropertyId, loadPromotions]);
  async function handleConfirmRemove(): Promise<void> {
    if (!promotionToRemove) return;
    setIsRemoving(true);
    try {
      await deletePromotion(promotionToRemove.id);
      setPromotionToRemove(null);
      await loadPromotions(selectedPropertyId || undefined);
    } catch {
      toast.error(t('remove_error'));
    } finally {
      setIsRemoving(false);
    }
  }
  const selectedProperty = listings.find((listing) => listing.id === selectedPropertyId) ?? null;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PropertySelectField
          id="promotion-property"
          label={t('pick_property')}
          listings={listings}
          value={selectedPropertyId}
          onChange={setSelectedPropertyId}
          placeholder={t('no_listings')}
          className="sm:max-w-sm"
        />
        <Button
          className="gap-2 self-start"
          disabled={!selectedProperty}
          onClick={() => setFormOpen(true)}
        >
          <CirclePlus className="h-4 w-4" />
          {t('add_promotion')}
        </Button>
      </div>
      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty_listings')}</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : promotions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty_promotions')}</p>
      ) : (
        <ul className="space-y-3">
          {promotions.map((promotion) => (
            <li key={promotion.id} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{promotion.propertyTitle}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{promotion.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('meta', {
                      start: promotion.bookingStartDate,
                      end: promotion.bookingEndDate,
                      remaining: promotion.remainingApplications,
                      type:
                        promotion.type === 'PROMO_CODE' && promotion.promoCode
                          ? promotion.promoCode
                          : t('types.date_range'),
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  aria-label={t('remove')}
                  onClick={() => setPromotionToRemove(promotion)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PromotionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        property={selectedProperty}
        onCreated={() => void loadPromotions(selectedPropertyId || undefined)}
      />
      <Dialog
        open={promotionToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPromotionToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('remove_title')}</DialogTitle>
            <DialogDescription>{t('remove_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromotionToRemove(null)}
              disabled={isRemoving}
            >
              {t('form.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRemove} disabled={isRemoving}>
              {isRemoving ? t('removing') : t('remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
