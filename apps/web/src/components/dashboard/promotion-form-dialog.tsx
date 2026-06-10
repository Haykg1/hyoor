'use client';

import type { HostListingSummary } from '@repo/shared';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

import { FormNativeSelect } from '@/components/dashboard/form-native-select';
import { PromotionCreatedDialog } from '@/components/dashboard/promotion-created-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPromotion } from '@/lib/api/promotions';
import { buildSmartPromotionDescription } from '@/lib/promotions';

const DESCRIPTION_MIN_LENGTH = 10;
const MAX_APPLICATIONS_DEFAULT = 3;
const PERCENT_MIN = 1;
const PERCENT_MAX = 100;

interface PromotionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: HostListingSummary | null;
  onCreated: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function PromotionFormDialog({
  open,
  onOpenChange,
  property,
  onCreated,
}: PromotionFormDialogProps): React.JSX.Element {
  const t = useTranslations('dashboard.promotions.form');
  const [promotionType, setPromotionType] = useState<'DATE_RANGE' | 'PROMO_CODE'>('DATE_RANGE');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED_AMOUNT'>('PERCENT');
  const [discountPercent, setDiscountPercent] = useState('20');
  const [discountAmount, setDiscountAmount] = useState('');
  const [range, setRange] = useState<DateRange | undefined>();
  const [promoCode, setPromoCode] = useState('');
  const [maxApplications, setMaxApplications] = useState(String(MAX_APPLICATIONS_DEFAULT));
  const [description, setDescription] = useState('');
  const [notifyGuests, setNotifyGuests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdGuestsNotified, setCreatedGuestsNotified] = useState(0);
  const [createdNotifyGuests, setCreatedNotifyGuests] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    setPromotionType('DATE_RANGE');
    setDiscountType('PERCENT');
    setDiscountPercent('20');
    setDiscountAmount('');
    setRange(undefined);
    setPromoCode('');
    setMaxApplications(String(MAX_APPLICATIONS_DEFAULT));
    setDescription('');
    setNotifyGuests(true);
  }, [open]);
  const bookingStartDate = range?.from ? toIso(range.from) : '';
  const bookingEndDate = range?.to ? toIso(range.to) : range?.from ? toIso(range.from) : '';
  function handleSmartDescription(): void {
    if (!property || !bookingStartDate || !bookingEndDate) {
      toast.error(t('errors.date_range'));
      return;
    }
    const percent = Number(discountPercent);
    const amount = Number(discountAmount);
    setDescription(
      buildSmartPromotionDescription({
        discountType,
        discountPercent: discountType === 'PERCENT' ? percent : undefined,
        discountAmount: discountType === 'FIXED_AMOUNT' ? amount : undefined,
        currency: property.currency,
        type: promotionType,
        bookingStartDate,
        bookingEndDate,
        promoCode: promotionType === 'PROMO_CODE' ? promoCode : undefined,
        maxApplications: Number(maxApplications) || MAX_APPLICATIONS_DEFAULT,
        appliedCount: 0,
      }),
    );
  }
  async function handleSubmit(): Promise<void> {
    if (!property) return;
    if (!bookingStartDate || !bookingEndDate) {
      toast.error(t('errors.date_range'));
      return;
    }
    if (description.trim().length < DESCRIPTION_MIN_LENGTH) {
      toast.error(t('errors.description'));
      return;
    }
    const maxApps = Number(maxApplications);
    if (!Number.isFinite(maxApps) || maxApps < 1) {
      toast.error(t('errors.max_applications'));
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createPromotion({
        propertyId: property.id,
        type: promotionType,
        discountType,
        discountPercent: discountType === 'PERCENT' ? Number(discountPercent) : undefined,
        discountAmount: discountType === 'FIXED_AMOUNT' ? Number(discountAmount) : undefined,
        description: description.trim(),
        bookingStartDate,
        bookingEndDate,
        promoCode: promotionType === 'PROMO_CODE' ? promoCode.trim().toUpperCase() : undefined,
        maxApplications: maxApps,
        notifyGuests,
      });
      setCreatedGuestsNotified(result.guestsNotified);
      setCreatedNotifyGuests(notifyGuests);
      onOpenChange(false);
      setSuccessOpen(true);
      onCreated();
    } catch {
      toast.error(t('errors.submit'));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {property ? t('subtitle', { title: property.title }) : t('no_property')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <FormNativeSelect
                id="promotion-type"
                label={t('promotion_type')}
                value={promotionType}
                onChange={(v) => setPromotionType(v as 'DATE_RANGE' | 'PROMO_CODE')}
                options={[
                  { value: 'DATE_RANGE', label: t('types.date_range') },
                  { value: 'PROMO_CODE', label: t('types.promo_code') },
                ]}
              />
              <FormNativeSelect
                id="discount-type"
                label={t('discount_type')}
                value={discountType}
                onChange={(v) => setDiscountType(v as 'PERCENT' | 'FIXED_AMOUNT')}
                options={[
                  { value: 'PERCENT', label: t('discount.percent') },
                  { value: 'FIXED_AMOUNT', label: t('discount.fixed') },
                ]}
              />
            </div>
            {discountType === 'PERCENT' ? (
              <div className="space-y-2">
                <Label htmlFor="discount-percent">{t('discount.percent_label')}</Label>
                <Input
                  id="discount-percent"
                  type="number"
                  min={PERCENT_MIN}
                  max={PERCENT_MAX}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="discount-amount">
                  {t('discount.fixed_label', { currency: property?.currency ?? '' })}
                </Label>
                <Input
                  id="discount-amount"
                  type="number"
                  min={1}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
            )}
            {promotionType === 'PROMO_CODE' ? (
              <div className="space-y-2">
                <Label htmlFor="promo-code">{t('promo_code')}</Label>
                <Input
                  id="promo-code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER20"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>{t('booking_dates')}</Label>
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-applications">{t('max_applications')}</Label>
              <Input
                id="max-applications"
                type="number"
                min={1}
                value={maxApplications}
                onChange={(e) => setMaxApplications(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleSmartDescription}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  {t('smart_description')}
                </Button>
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-guests"
                checked={notifyGuests}
                onCheckedChange={(v) => setNotifyGuests(v === true)}
              />
              <Label htmlFor="notify-guests" className="font-normal">
                {t('notify_guests')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || !property}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PromotionCreatedDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        guestsNotified={createdGuestsNotified}
        notifyGuests={createdNotifyGuests}
      />
    </>
  );
}
