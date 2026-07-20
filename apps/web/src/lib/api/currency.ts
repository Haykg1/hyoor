import type { CurrencyRatesPayload } from '@repo/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

function unwrapEnvelope<T>(json: ApiEnvelope<T> | T): T {
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as ApiEnvelope<T>).data;
  }
  return json as T;
}

export async function getDisplayCurrencyDefault(): Promise<string> {
  const res = await fetch(`${BASE_URL}/currency/display-default`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return 'AMD';
  const json = (await res.json()) as ApiEnvelope<{ currency: string }> | { currency: string };
  if ('data' in json && json.data?.currency) return json.data.currency;
  if ('currency' in json && typeof json.currency === 'string') return json.currency;
  return 'AMD';
}

export async function getCurrencyRates(): Promise<CurrencyRatesPayload | null> {
  try {
    const res = await fetch(`${BASE_URL}/currency/rates`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<CurrencyRatesPayload> | CurrencyRatesPayload;
    const data = unwrapEnvelope(json);
    if (!data || typeof data !== 'object' || !data.rates) return null;
    return data;
  } catch {
    return null;
  }
}
