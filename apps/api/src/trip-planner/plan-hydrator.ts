import type { LocalizedLabel, TripPlanItemKind } from '@repo/shared';
import { parsePoiAttributes, resolveLocalizedLabel } from '@repo/shared';

import {
  parseDescriptionLabels,
  parseNameLabels,
  toCoord,
  type PoiRecord,
} from '../poi/poi-mapper';

import type { GeneratedPlan, GeneratedPlanItem, GeneratedPlanPhoto } from './generated-plan';
import { kindFor } from './poi-kind';
import type { ResolvedPlan, ResolvedPick } from './proposed-plan';
import { optimizeVisitOrder, type RoutePoint } from './trip-route';

const PRICE_BAND_AMD: Record<string, number> = { budget: 2000, mid: 5000, upscale: 12000 };
const BOOKING_CATEGORIES = new Set(['winery', 'factory', 'gastrobar']);

function priceFor(
  kind: TripPlanItemKind,
  attributes: ReturnType<typeof parsePoiAttributes>,
): GeneratedPlanItem['claimedPricePerPerson'] {
  if (typeof attributes.averageMealAmd === 'number' && attributes.averageMealAmd > 0) {
    return { amount: attributes.averageMealAmd, currency: 'AMD', basis: 'meal' };
  }
  const banded = attributes.priceBand ? PRICE_BAND_AMD[attributes.priceBand] : undefined;
  if (banded) return { amount: banded, currency: 'AMD', basis: 'estimate' };
  if (kind === 'meal') {
    return { amount: PRICE_BAND_AMD.mid ?? 5000, currency: 'AMD', basis: 'estimate' };
  }
  return null;
}

function timeSlots(picks: ResolvedPick[]): { startTime: string; endTime: string }[] {
  return picks
    .map((pick) => ({ startTime: pick.startTime, endTime: pick.endTime }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function hydratePlan(params: {
  proposed: ResolvedPlan;
  candidates: PoiRecord[];
  dates: string[];
  city: string;
  locale: string;
  photosByPoiId: Map<string, GeneratedPlanPhoto[]>;
  anchor?: RoutePoint | null;
}): GeneratedPlan {
  const byId = new Map(params.candidates.map((poi) => [poi.id, poi]));
  const days: GeneratedPlan['days'] = params.proposed.days.map((day, dayIndex) => {
    const resolved = day.picks
      .map((pick) => {
        const poi = byId.get(pick.poiId);
        if (!poi) return null;
        const kind = kindFor(poi.category);
        return {
          pick,
          poi,
          kind,
          lat: toCoord(poi.latitude),
          lng: toCoord(poi.longitude),
          isMeal: kind === 'meal',
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    const slots = timeSlots(resolved.map((entry) => entry.pick));
    const ordered = optimizeVisitOrder(resolved, params.anchor ?? null);
    const items: GeneratedPlanItem[] = ordered.map((entry, index) => {
      const { poi, kind } = entry;
      const attributes = parsePoiAttributes(poi.attributes);
      const nameLabels = parseNameLabels(poi.nameLabels) as LocalizedLabel;
      const descriptionLabels = parseDescriptionLabels(poi.descriptionLabels) as LocalizedLabel;
      const slot = slots[index] ?? { startTime: entry.pick.startTime, endTime: entry.pick.endTime };
      return {
        tempId: `d${dayIndex + 1}i${index + 1}`,
        kind,
        name: nameLabels,
        startTime: slot.startTime,
        endTime: slot.endTime,
        address: '',
        coordinates: { lat: entry.lat, lng: entry.lng },
        claimedOpeningHours: attributes.openingHoursNote ?? '',
        claimedPricePerPerson: priceFor(kind, attributes),
        bookingRequired: BOOKING_CATEGORIES.has(poi.category),
        description: resolveLocalizedLabel(descriptionLabels, params.locale) || nameLabels.en,
        whyThisFits: entry.pick.whyThisFits,
        placeId: poi.id,
        verifiedAt: poi.lastVerifiedAt ? new Date(poi.lastVerifiedAt).toISOString() : null,
        photos: params.photosByPoiId.get(poi.id) ?? [],
      };
    });
    return {
      date: params.dates[dayIndex] ?? params.dates[params.dates.length - 1] ?? '',
      theme: day.theme,
      items,
    };
  });
  return { city: params.city, summary: params.proposed.summary, days };
}
