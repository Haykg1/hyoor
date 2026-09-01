'use client';

import type { PoiCityOption, TripPlanSummary } from '@repo/shared';
import { Loader2, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Label } from '@/components/ui/label';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { listPlannerCities } from '@/lib/api/poi';
import { deleteTripPlan, listTripPlans } from '@/lib/api/trip-planner';
import { formatBookingDate } from '@/lib/format/booking-date';

const MAX_NIGHTS = 10;

interface TripPlannerHomeProps {
  bookingId?: string;
}

function nightCount(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00.000Z`);
  const end = Date.parse(`${checkOut}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function statusKey(status: TripPlanSummary['status']): string {
  if (status === 'READY' || status === 'PLANNED') return 'status_ready';
  if (status === 'GENERATING') return 'status_generating';
  if (status === 'FAILED') return 'status_failed';
  return 'status_draft';
}

export function TripPlannerHome({ bookingId }: TripPlannerHomeProps): React.JSX.Element {
  const t = useTranslations('trip_planner');
  const router = useRouter();
  const [cities, setCities] = useState<PoiCityOption[]>([]);
  const [plans, setPlans] = useState<TripPlanSummary[]>([]);
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nights = nightCount(checkIn, checkOut);

  useEffect(() => {
    Promise.all([listPlannerCities(), listTripPlans()])
      .then(([cityOptions, planRows]) => {
        setCities(cityOptions);
        setPlans(planRows);
        if (cityOptions[0]) setCity(cityOptions[0].city);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/auth/login?next=/trips/planner');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!bookingId) return;
    router.replace(`/trips/planner/new?bookingId=${encodeURIComponent(bookingId)}`);
  }, [bookingId, router]);

  function handleStart(): void {
    if (!city) return;
    if (nights < 1 || nights > MAX_NIGHTS) {
      setError(t('max_nights', { max: MAX_NIGHTS }));
      return;
    }
    setCreating(true);
    const selected = cities.find((option) => option.city === city);
    const query = new URLSearchParams({ city, checkIn, checkOut });
    if (selected?.region) query.set('region', selected.region);
    router.push(`/trips/planner/new?${query.toString()}`);
  }

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id);
    try {
      await deleteTripPlan(id);
      setPlans((prev) => prev.filter((plan) => plan.id !== id));
      toast.success(t('deleted'));
    } catch {
      toast.error(t('delete_error'));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (loading || bookingId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t('start_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('start_subtitle')}</p>
        {cities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t('no_supported_cities')}</p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{t('city')}</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={cities.length === 0}
            >
              {cities.map((option) => (
                <option key={option.citySlug} value={option.city}>
                  {option.city}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{t('dates')}</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-background px-3">
              <DateRangePicker
                from={checkIn}
                to={checkOut}
                placeholder={t('dates_placeholder')}
                numberOfMonths={1}
                onSelect={(f, tt) => {
                  setCheckIn(f);
                  setCheckOut(tt);
                  setError(null);
                }}
              />
            </div>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        <Button
          className="mt-4 rounded-full"
          type="button"
          disabled={creating || !city || !checkIn || !checkOut}
          onClick={handleStart}
        >
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('start')}
        </Button>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('history_title')}</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('history_empty')}</p>
        ) : (
          <ul className="space-y-2">
            {plans.map((plan) => (
              <li
                key={plan.id}
                className="relative rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
              >
                <Link href={`/trips/planner/${plan.id}`} className="block p-4 pr-12">
                  <p className="font-medium">
                    {plan.city} · {formatBookingDate(plan.checkIn)} →{' '}
                    {formatBookingDate(plan.checkOut)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t(statusKey(plan.status))}</p>
                </Link>
                {confirmDeleteId === plan.id ? (
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-7"
                      disabled={deletingId === plan.id}
                      onClick={() => void handleDelete(plan.id)}
                    >
                      {deletingId === plan.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t('delete_confirm')
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      {t('delete_cancel')}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={t('delete_plan')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => setConfirmDeleteId(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
