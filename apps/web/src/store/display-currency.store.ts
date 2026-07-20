import {
  SEARCH_DISPLAY_CURRENCIES,
  type CurrencyRatesPayload,
  type SearchDisplayCurrency,
} from '@repo/shared';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import { getCurrencyRates } from '@/lib/api/currency';

const STORAGE_KEY = 'hyoor-host-display-currency';

interface DisplayCurrencyState {
  currency: SearchDisplayCurrency;
  rates: CurrencyRatesPayload | null;
  ratesReady: boolean;
  ratesLoading: boolean;
  setCurrency: (currency: SearchDisplayCurrency) => void;
  ensureRates: () => Promise<void>;
}

function isSearchDisplayCurrency(value: unknown): value is SearchDisplayCurrency {
  return (
    typeof value === 'string' && (SEARCH_DISPLAY_CURRENCIES as readonly string[]).includes(value)
  );
}

export const useDisplayCurrencyStore = create<DisplayCurrencyState>()(
  devtools(
    persist(
      (set, get) => ({
        currency: 'USD',
        rates: null,
        ratesReady: false,
        ratesLoading: false,
        setCurrency: (currency) => {
          if (!isSearchDisplayCurrency(currency)) return;
          set({ currency });
        },
        ensureRates: async () => {
          const { ratesReady, ratesLoading } = get();
          if (ratesReady || ratesLoading) return;
          set({ ratesLoading: true });
          const rates = await getCurrencyRates();
          set({ rates, ratesReady: true, ratesLoading: false });
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ currency: state.currency }),
      },
    ),
    { name: 'display-currency-store' },
  ),
);
