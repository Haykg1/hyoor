import type { Prisma, TripPlan, TripPlanDay, TripPlanItem } from '@repo/database/client';
import type {
  BudgetProfile,
  LocalizedLabel,
  TripPlanDayView,
  TripPlanDetail,
  TripPlanItemKind,
  TripPlanItemView,
  TripPlanPreferences,
  TripPlanPriceBand,
  TripPlanProgressEvent,
  TripPlanStaySnapshot,
  TripPlanSummary,
  TripPlanVerificationStatus,
} from '@repo/shared';
import { computeDistanceMeters, defaultMidBudgetProfile } from '@repo/shared';

import { toIsoDate } from './trip-dates';

export const TRIP_PLAN_INCLUDE = {
  days: {
    orderBy: { sortOrder: 'asc' as const },
    include: { items: { orderBy: { sortOrder: 'asc' as const } } },
  },
};

export type TripPlanRow = Prisma.TripPlanGetPayload<{ include: typeof TRIP_PLAN_INCLUDE }>;

export function parsePreferences(value: unknown): TripPlanPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const preferences: TripPlanPreferences = {};
  for (const key of ['pace', 'alcohol', 'era', 'focus'] as const) {
    if (typeof record[key] === 'string') preferences[key] = record[key];
  }
  return preferences;
}

export function parseStaySnapshot(value: unknown): TripPlanStaySnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.propertyId !== 'string' || typeof record.title !== 'string') return null;
  return {
    propertyId: record.propertyId,
    title: record.title,
    city: typeof record.city === 'string' ? record.city : '',
    country: typeof record.country === 'string' ? record.country : 'AM',
    coverPhotoUrl: typeof record.coverPhotoUrl === 'string' ? record.coverPhotoUrl : null,
    nightlyMinor: Number(record.nightlyMinor) || 0,
    currency: typeof record.currency === 'string' ? record.currency : 'AMD',
    guestCount: Number(record.guestCount) || 1,
    latitude: typeof record.latitude === 'number' ? record.latitude : null,
    longitude: typeof record.longitude === 'number' ? record.longitude : null,
  };
}

export function parseBudgetProfile(value: unknown): BudgetProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultMidBudgetProfile();
  }
  const record = value as BudgetProfile;
  if (!record.diningTier || !record.activityTier) return defaultMidBudgetProfile();
  return record;
}

export function parseLabels(value: unknown, fallback: string): LocalizedLabel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { en: fallback, hy: fallback, ru: fallback };
  }
  const record = value as Record<string, unknown>;
  const en = typeof record.en === 'string' && record.en.trim() ? record.en : fallback;
  return {
    en,
    hy: typeof record.hy === 'string' && record.hy.trim() ? record.hy : en,
    ru: typeof record.ru === 'string' && record.ru.trim() ? record.ru : en,
  };
}

export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function yandexMapsUrl(latitude: number, longitude: number): string {
  return `https://yandex.com/maps/?pt=${longitude},${latitude}&z=17&l=map`;
}

const WALK_SPEED_MPS = 1.35;

function priceBandFromAmount(amount: number | null): TripPlanPriceBand | null {
  if (amount == null || amount <= 0) return null;
  if (amount < 3500) return 'budget';
  if (amount < 9000) return 'mid';
  return 'upscale';
}

function firstPhoto(value: unknown): {
  url: string | null;
  attribution: string | null;
  license: string | null;
} {
  const list = Array.isArray(value) ? value : [];
  const first = list[0];
  if (typeof first === 'string') return { url: first, attribution: null, license: null };
  if (first && typeof first === 'object') {
    const record = first as Record<string, unknown>;
    return {
      url: typeof record.url === 'string' ? record.url : null,
      attribution: typeof record.attribution === 'string' ? record.attribution : null,
      license: typeof record.license === 'string' ? record.license : null,
    };
  }
  return { url: null, attribution: null, license: null };
}

export function toSummary(
  row: Pick<
    TripPlan,
    | 'id'
    | 'city'
    | 'citySlug'
    | 'checkIn'
    | 'checkOut'
    | 'bookingId'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'guestCount'
    | 'summary'
  >,
): TripPlanSummary {
  const status =
    row.status === 'INTERVIEW' ? 'DRAFT' : row.status === 'PLANNED' ? 'READY' : row.status;
  return {
    id: row.id,
    city: row.city,
    citySlug: row.citySlug,
    checkIn: toIsoDate(row.checkIn),
    checkOut: toIsoDate(row.checkOut),
    bookingId: row.bookingId,
    status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    guestCount: row.guestCount,
    summary: row.summary,
  };
}

export function toItemView(
  item: TripPlanItem,
  next?: Pick<TripPlanItem, 'latitude' | 'longitude'> | null,
): TripPlanItemView {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  const photo = firstPhoto(item.photos);
  const adjustments = Array.isArray(item.adjustments)
    ? item.adjustments.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const price = parsePrice(item.pricePerPerson);
  let walkToNextMeters: number | null = null;
  let walkToNextMinutes: number | null = null;
  if (next) {
    walkToNextMeters = Math.round(
      computeDistanceMeters(latitude, longitude, Number(next.latitude), Number(next.longitude)),
    );
    walkToNextMinutes = Math.max(1, Math.round(walkToNextMeters / WALK_SPEED_MPS / 60));
  }
  return {
    id: item.id,
    placeId: item.placeId ?? null,
    kind: item.kind as TripPlanItemKind,
    nameLabels: parseLabels(item.nameLabels, 'Stop'),
    startTime: item.startTime,
    endTime: item.endTime,
    address: item.address,
    latitude,
    longitude,
    openingHours: item.openingHours,
    pricePerPerson: price,
    priceBand: priceBandFromAmount(price?.amount ?? null),
    bookingRequired: item.bookingRequired,
    description: item.description,
    whyThisFits: item.whyThisFits,
    photoUrl: photo.url,
    photoAttribution: photo.attribution,
    photoLicense: photo.license,
    verificationStatus: item.verificationStatus as TripPlanVerificationStatus,
    verifiedAt: verifiedAtFromRefs(item),
    adjustments,
    mapsUrl: mapsUrl(latitude, longitude),
    yandexUrl: yandexMapsUrl(latitude, longitude),
    walkToNextMeters,
    walkToNextMinutes,
  };
}

function verifiedAtFromRefs(item: TripPlanItem): string | null {
  if (item.verificationStatus !== 'verified') return null;
  const refs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
  for (const ref of refs) {
    if (ref && typeof ref === 'object' && 'verifiedAt' in ref) {
      const value = (ref as { verifiedAt: unknown }).verifiedAt;
      if (typeof value === 'string') return value;
    }
  }
  return item.updatedAt instanceof Date ? item.updatedAt.toISOString() : null;
}

export function toDayView(day: TripPlanDay & { items: TripPlanItem[] }): TripPlanDayView {
  const items = day.items.map((item, index) => toItemView(item, day.items[index + 1] ?? null));
  const costs = items
    .map((item) => item.pricePerPerson?.amount ?? 0)
    .filter((amount) => amount > 0);
  return {
    id: day.id,
    date: toIsoDate(day.date),
    theme: day.theme,
    items,
    estimatedCostAmd: costs.length > 0 ? costs.reduce((sum, amount) => sum + amount, 0) : null,
  };
}

export function toDetail(row: TripPlanRow, progress: TripPlanProgressEvent[] = []): TripPlanDetail {
  return {
    ...toSummary(row),
    preferences: parsePreferences(row.preferences),
    locale: row.locale,
    budgetProfile: parseBudgetProfile(row.budgetProfile),
    stay: parseStaySnapshot(row.staySnapshot),
    days: row.days.map(toDayView),
    progress,
  };
}

function parsePrice(value: unknown): TripPlanItemView['pricePerPerson'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.amount !== 'number') return null;
  return {
    amount: record.amount,
    currency: typeof record.currency === 'string' ? record.currency : 'AMD',
    basis: typeof record.basis === 'string' ? record.basis : 'ticket',
  };
}
