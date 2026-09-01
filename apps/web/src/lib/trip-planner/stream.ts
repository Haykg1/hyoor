import type { TripPlanProgressEvent } from '@repo/shared';

import { getAccessTokenFromCookie } from '@/lib/auth-cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export function connectTripPlanStream(
  planId: string,
  onEvent: (event: TripPlanProgressEvent) => void,
  onError?: () => void,
): () => void {
  const accessToken = getAccessTokenFromCookie();
  if (!accessToken || typeof window === 'undefined') {
    return () => undefined;
  }
  const params = new URLSearchParams({ access_token: accessToken });
  const source = new EventSource(
    `${API_BASE_URL}/trip-planner/${planId}/events?${params.toString()}`,
  );
  source.onmessage = (message: MessageEvent<string>) => {
    try {
      onEvent(JSON.parse(message.data) as TripPlanProgressEvent);
    } catch {
      onError?.();
    }
  };
  source.onerror = () => {
    onError?.();
  };
  return () => {
    source.close();
  };
}
