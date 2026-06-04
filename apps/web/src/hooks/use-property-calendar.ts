'use client';

import type { PropertyDetail } from '@repo/shared';
import { useEffect, useMemo } from 'react';

import { usePropertyCalendarStore } from '@/store';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Always loads a 3-month window (prev / current / next) centered on the cursor,
 * so navigating between adjacent months is instant from the cache. Re-runs only
 * when the cursor month or property changes.
 */
export function usePropertyCalendar(property: PropertyDetail): void {
  const init = usePropertyCalendarStore((s) => s.init);
  const loadRange = usePropertyCalendarStore((s) => s.loadRange);
  const monthCursor = usePropertyCalendarStore((s) => s.monthCursor);
  const propertyId = usePropertyCalendarStore((s) => s.propertyId);

  useEffect(() => {
    init(property.id, property.pricePerNight, property.currency);
  }, [init, property.id, property.pricePerNight, property.currency]);

  useEffect(() => {
    if (propertyId !== property.id) return;
    const from = toIso(
      startOfMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)),
    );
    const to = toIso(
      endOfMonth(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)),
    );
    void loadRange(from, to);
  }, [loadRange, monthCursor, property.id, propertyId]);
}

/** Memoised list of ISO dates currently selected (inclusive). */
export function useSelectionDates(): string[] {
  const selection = usePropertyCalendarStore((s) => s.selection);
  return useMemo(() => {
    if (!selection.from) return [];
    const fromDate = new Date(`${selection.from}T00:00:00Z`);
    const toDate = selection.to ? new Date(`${selection.to}T00:00:00Z`) : fromDate;
    if (toDate < fromDate) return [];
    const out: string[] = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      out.push(toIso(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
  }, [selection.from, selection.to]);
}

/**
 * Builds the bulk-upsert entries for the current selection, applying the host's
 * desired price/availability while skipping days locked by an existing booking.
 */
export function useBuildEntriesForSelection(): (input: {
  priceMinor: number | null;
  isAvailable: boolean;
}) => Array<{ date: string; isAvailable: boolean; priceOverride?: number }> {
  const daysByDate = usePropertyCalendarStore((s) => s.daysByDate);
  const selectionDates = useSelectionDates();
  return useMemo(() => {
    return ({ priceMinor, isAvailable }) =>
      selectionDates
        .filter((iso) => !daysByDate[iso]?.isBlockedByBooking)
        .map((iso) => {
          const entry: { date: string; isAvailable: boolean; priceOverride?: number } = {
            date: iso,
            isAvailable,
          };
          if (priceMinor !== null) entry.priceOverride = priceMinor;
          return entry;
        });
  }, [selectionDates, daysByDate]);
}
