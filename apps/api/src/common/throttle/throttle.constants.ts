const THROTTLE_TTL_MS = parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10);

function buildThrottle(
  limitEnvVar: string,
  defaultLimit: number,
): {
  default: { ttl: number; limit: number };
} {
  return {
    default: {
      ttl: THROTTLE_TTL_MS,
      limit: parseInt(process.env[limitEnvVar] ?? String(defaultLimit), 10),
    },
  };
}

export const AUTH_THROTTLE = buildThrottle('THROTTLE_AUTH_LIMIT', 10);
export const WRITE_THROTTLE = buildThrottle('THROTTLE_WRITE_LIMIT', 30);
export const PAYMENTS_THROTTLE = buildThrottle('THROTTLE_PAYMENTS_LIMIT', 10);
export const MESSAGING_THROTTLE = buildThrottle('THROTTLE_MESSAGING_LIMIT', 60);
export const GEOCODING_THROTTLE = buildThrottle('THROTTLE_GEOCODING_LIMIT', 30);
