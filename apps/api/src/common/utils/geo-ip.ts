import type { Request } from 'express';
import geoip from 'geoip-lite';

import { getRequestClientIp } from './request-ip';

/** Resolves the guest's ISO-3166 country code from their request IP, offline (no external
 * call, no API key). Returns `null` for local/private IPs or when the lookup misses. */
export function resolveCountryFromRequest(req: Request): string | null {
  const ip = getRequestClientIp(req);
  return geoip.lookup(ip)?.country ?? null;
}
