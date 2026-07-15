const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
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
