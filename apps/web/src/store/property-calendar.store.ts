import type { AvailabilityDayView, AvailabilityEntryInput, OpenRangeResult } from '@repo/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  bulkUpsertAvailability,
  getAvailabilityRange,
  openAvailabilityRange,
} from '@/lib/api/availability';

export interface DateRangeSelection {
  from?: string;
  to?: string;
}

interface PropertyCalendarState {
  propertyId: string | null;
  monthCursor: Date;
  basePricePerNight: number;
  currency: string;
  daysByDate: Record<string, AvailabilityDayView>;
  selection: DateRangeSelection;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface PropertyCalendarActions {
  init: (propertyId: string, basePricePerNight: number, currency: string) => void;
  setMonthCursor: (date: Date) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  setSelection: (selection: DateRangeSelection) => void;
  clearSelection: () => void;
  loadRange: (from: string, to: string) => Promise<void>;
  applyEntries: (entries: AvailabilityEntryInput[]) => Promise<void>;
  openYear: () => Promise<OpenRangeResult | null>;
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export const usePropertyCalendarStore = create<PropertyCalendarState & PropertyCalendarActions>()(
  devtools(
    (set, get) => ({
      propertyId: null,
      monthCursor: firstOfMonth(new Date()),
      basePricePerNight: 0,
      currency: 'AMD',
      daysByDate: {},
      selection: {},
      isLoading: false,
      isSaving: false,
      error: null,

      init: (propertyId, basePricePerNight, currency) => {
        const current = get();
        if (current.propertyId === propertyId) {
          set({ basePricePerNight, currency });
          return;
        }
        set({
          propertyId,
          basePricePerNight,
          currency,
          monthCursor: firstOfMonth(new Date()),
          daysByDate: {},
          selection: {},
          error: null,
        });
      },

      setMonthCursor: (date) => set({ monthCursor: firstOfMonth(date) }),
      goToPreviousMonth: () => {
        const { monthCursor } = get();
        set({ monthCursor: new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1) });
      },
      goToNextMonth: () => {
        const { monthCursor } = get();
        set({ monthCursor: new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1) });
      },
      goToToday: () => set({ monthCursor: firstOfMonth(new Date()) }),

      setSelection: (selection) => set({ selection }),
      clearSelection: () => set({ selection: {} }),

      loadRange: async (from, to) => {
        const { propertyId } = get();
        if (!propertyId) return;
        set({ isLoading: true, error: null });
        try {
          const res = await getAvailabilityRange(propertyId, from, to);
          set((state) => {
            const next = { ...state.daysByDate };
            for (const entry of res.entries) next[entry.date] = entry;
            return {
              daysByDate: next,
              basePricePerNight: res.basePricePerNight,
              currency: res.currency,
              isLoading: false,
            };
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load availability',
          });
        }
      },

      applyEntries: async (entries) => {
        const { propertyId } = get();
        if (!propertyId || entries.length === 0) return;
        set({ isSaving: true, error: null });
        try {
          const updated = await bulkUpsertAvailability(propertyId, entries);
          set((state) => {
            const next = { ...state.daysByDate };
            for (const day of updated) next[day.date] = day;
            return { daysByDate: next, isSaving: false };
          });
        } catch (err) {
          set({
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to save changes',
          });
          throw err;
        }
      },

      openYear: async () => {
        const { propertyId } = get();
        if (!propertyId) return null;
        set({ isSaving: true, error: null });
        try {
          const result = await openAvailabilityRange(propertyId);
          await get().loadRange(result.from, result.to);
          set({ isSaving: false });
          return result;
        } catch (err) {
          set({
            isSaving: false,
            error: err instanceof Error ? err.message : 'Failed to open year',
          });
          throw err;
        }
      },
    }),
    { name: 'property-calendar-store' },
  ),
);
