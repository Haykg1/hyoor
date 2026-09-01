import type { LocalizedLabel, TripPlanItemKind } from '@repo/shared';

export interface GeneratedPlanPhoto {
  poiPhotoId?: string;
  key?: string;
  url?: string;
  attribution?: string | null;
  license?: string | null;
}

export interface GeneratedPlanItem {
  tempId: string;
  kind: TripPlanItemKind;
  name: LocalizedLabel;
  startTime: string;
  endTime: string;
  address: string;
  coordinates: { lat: number; lng: number };
  claimedOpeningHours: string;
  claimedPricePerPerson: { amount: number; currency: string; basis: string } | null;
  bookingRequired: boolean;
  description: string;
  whyThisFits: string;
  placeId?: string | null;
  verifiedAt?: string | null;
  photos: GeneratedPlanPhoto[];
}

export interface GeneratedPlanDay {
  date: string;
  theme: string;
  items: GeneratedPlanItem[];
}

export interface GeneratedPlan {
  city: string;
  summary: string;
  days: GeneratedPlanDay[];
}
