/** Single calendar day's availability state as returned by the API. */
export interface AvailabilityDayView {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** True when the day is bookable. False when blocked (manually or by a booking). */
  isAvailable: boolean;
  /** True when the day is occupied by a PENDING/CONFIRMED booking. Cannot be re-opened by the host. */
  isBlockedByBooking: boolean;
  /** Custom price override in minor units, or `null` to fall back to the property's base price. */
  priceOverride: number | null;
  /** `priceOverride ?? property.pricePerNight` — convenience for UI rendering. */
  effectivePricePerNight: number;
}

export interface AvailabilityRangeResponse {
  propertyId: string;
  basePricePerNight: number;
  currency: string;
  from: string;
  to: string;
  entries: AvailabilityDayView[];
}

export interface AvailabilityEntryInput {
  date: string;
  isAvailable: boolean;
  priceOverride?: number;
}

export interface OpenRangeInput {
  from?: string;
  to?: string;
}

export interface OpenRangeResult {
  propertyId: string;
  from: string;
  to: string;
  openedCount: number;
  skippedBookedCount: number;
}
