export const CONNECTION_RETRY_BASE_DELAY_MS = 200;
export const CONNECTION_RETRY_MAX_DELAY_MS = 5_000;
export const CONNECTION_MAX_ATTEMPTS = 5;

export function retryBackoffMs(attempt: number): number {
  return Math.min(attempt * CONNECTION_RETRY_BASE_DELAY_MS, CONNECTION_RETRY_MAX_DELAY_MS);
}

export function exponentialBackoffMs(attempt: number): number {
  return Math.min(
    CONNECTION_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
    CONNECTION_RETRY_MAX_DELAY_MS,
  );
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  onRetry: () => Promise<void> = async () => undefined,
  maxAttempts = CONNECTION_MAX_ATTEMPTS,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      await onRetry();
      await delay(retryBackoffMs(attempt));
    }
  }
  throw lastError;
}

export function isPrismaSerializationFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2034'
  );
}
