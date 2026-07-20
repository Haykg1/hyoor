import type { SearchPropertiesToolArgs } from '@repo/shared';
import {
  inferStayNightsFromText,
  mentionsGuestCount,
  nightsBetweenIso,
  resolveAiSearchDateFields,
  todayIsoUtc,
} from '@repo/shared';

/**
 * Corrects common LLM mistakes using the guest's raw text:
 * - never invent maxGuests from "N nights"
 * - force stayNights when the guest explicitly stated a length
 * - if exact dates disagree with that length, switch to a flexible window
 */
export function alignSearchArgsWithUserText(
  args: SearchPropertiesToolArgs,
  userText: string | undefined,
  todayIso: string = todayIsoUtc(),
): SearchPropertiesToolArgs {
  let next: SearchPropertiesToolArgs = { ...args };
  if (!userText?.trim() || !mentionsGuestCount(userText)) {
    next.maxGuests = undefined;
  }
  const statedNights = userText ? inferStayNightsFromText(userText) : undefined;
  if (!statedNights) {
    return resolveAiSearchDateFields(next, todayIso);
  }
  next.stayNights = statedNights;
  if (next.checkIn && next.checkOut) {
    const span = nightsBetweenIso(next.checkIn, next.checkOut);
    if (span !== statedNights) {
      next = {
        ...next,
        checkIn: undefined,
        checkOut: undefined,
        stayNights: statedNights,
      };
    }
  }
  return resolveAiSearchDateFields(next, todayIso);
}
