import type { AiSearchExtractedFilters } from '@repo/shared';
import { propertyTypeLabelKey } from '@repo/shared';

import { type ChatLocale, normalizeChatLocale } from './chat-locale';

function formatShortDate(iso: string, locale: ChatLocale): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const tag = locale === 'hy' ? 'hy-AM' : locale === 'ru' ? 'ru-RU' : 'en-US';
  return date.toLocaleDateString(tag, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Builds the guest-facing "Interpreted as" line from applied filters only
 * (never from free-form LLM prose).
 */
export function buildAiSearchInterpretation(
  filters: AiSearchExtractedFilters,
  suggestedDates: { checkIn: string; checkOut: string } | undefined,
  locale?: string,
): string {
  const key = normalizeChatLocale(locale);
  const parts: string[] = [];
  if (filters.propertyType) {
    const typeLabel = propertyTypeLabelKey(filters.propertyType).replace(/_/g, ' ');
    parts.push({ en: `a ${typeLabel}`, hy: typeLabel, ru: typeLabel }[key]);
  }
  const place = filters.locationLabel ?? filters.searchCity ?? filters.region;
  if (place) {
    parts.push({ en: `in ${place}`, hy: `՝ ${place}`, ru: `в ${place}` }[key]);
  }
  const checkIn = suggestedDates?.checkIn ?? filters.checkIn;
  const checkOut = suggestedDates?.checkOut ?? filters.checkOut;
  if (checkIn && checkOut) {
    const range = `${formatShortDate(checkIn, key)} – ${formatShortDate(checkOut, key)}`;
    parts.push({ en: `for ${range}`, hy: `՝ ${range}`, ru: `на ${range}` }[key]);
  } else if (filters.stayNights && filters.availableFrom && filters.availableTo) {
    const from = formatShortDate(filters.availableFrom, key);
    const to = formatShortDate(filters.availableTo, key);
    const nights = filters.stayNights;
    parts.push(
      {
        en: `for ${nights} night${nights === 1 ? '' : 's'} anytime ${from} – ${to}`,
        hy: `՝ ${nights} գիշեր ${from} – ${to} միջակայքում`,
        ru: `на ${nights} ноч. в окне ${from} – ${to}`,
      }[key],
    );
  } else if (filters.stayNights) {
    const nights = filters.stayNights;
    parts.push(
      {
        en: `for ${nights} night${nights === 1 ? '' : 's'}`,
        hy: `՝ ${nights} գիշեր`,
        ru: `на ${nights} ноч.`,
      }[key],
    );
  }
  if (filters.guests && filters.guests > 1) {
    parts.push(
      {
        en: `for ${filters.guests} guests`,
        hy: `՝ ${filters.guests} հյուր`,
        ru: `для ${filters.guests} гостей`,
      }[key],
    );
  }
  const summary = parts.filter(Boolean).join(' ');
  if (!summary) {
    return {
      en: 'Showing stays that match your request.',
      hy: 'Ցուցադրվում են ձեր հարցմանը համապատասխան տարբերակներ։',
      ru: 'Показываю варианты по вашему запросу.',
    }[key];
  }
  return {
    en: `Searching for ${summary}.`,
    hy: `Որոնում՝ ${summary}.`,
    ru: `Ищу ${summary}.`,
  }[key];
}
