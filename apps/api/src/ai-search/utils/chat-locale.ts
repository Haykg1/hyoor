export type ChatLocale = 'en' | 'hy' | 'ru';

const LANGUAGE_NAMES: Record<ChatLocale, string> = {
  en: 'English',
  hy: 'Armenian',
  ru: 'Russian',
};

export function normalizeChatLocale(locale?: string): ChatLocale {
  if (locale === 'hy' || locale === 'ru') return locale;
  return 'en';
}

export function buildResponseLanguageRule(locale: ChatLocale): string {
  return `Always reply to the user in ${LANGUAGE_NAMES[locale]}. Keep tool arguments (dates, prices) in technical format.`;
}

type LocalizedCopy = Record<ChatLocale, string>;

export const AI_SEARCH_OFF_TOPIC_MESSAGES: LocalizedCopy = {
  en: 'I can only help you find short-term rentals in Armenia — describe location, dates, guests, budget, and amenities for your stay.',
  hy: 'Կարող եմ օգնել միայն Հայաստանում կարճաժամկետ վարձակալության որոնման հարցում — նկարագրեք վայրը, ամսաթվերը, հյուրերի քանակը, բյուջեն և հարմարավետությունները։',
  ru: 'Я могу помочь только с поиском краткосрочной аренды в Армении — укажите место, даты, число гостей, бюджет и удобства.',
};

export const HOST_CALENDAR_OFF_TOPIC_MESSAGES: LocalizedCopy = {
  en: 'I can only help you manage availability and nightly rates for this property. Try: "Close June 10–15" or "Set 55,000 AMD for next weekend."',
  hy: 'Կարող եմ օգնել միայն այս գույքի հասանելիության և գիշերակացի գների կառավարման հարցում։ Օրինակ՝ «Փակիր հունիսի 10-15» կամ «55,000 դրամ հաջորդ շաբաթ-կիրակի»։',
  ru: 'Я могу помочь только с доступностью и ценами за ночь для этого объекта. Например: «Закрой 10–15 июня» или «55 000 драм на следующие выходные».',
};

export function getAiSearchOffTopicMessage(locale?: string): string {
  return AI_SEARCH_OFF_TOPIC_MESSAGES[normalizeChatLocale(locale)];
}

export function getHostCalendarOffTopicMessage(locale?: string): string {
  return HOST_CALENDAR_OFF_TOPIC_MESSAGES[normalizeChatLocale(locale)];
}

export function buildOtherPropertyMessage(propertyTitle: string, locale?: string): string {
  const key = normalizeChatLocale(locale);
  const templates: Record<ChatLocale, string> = {
    en: `I can only change availability and rates for ${propertyTitle} on this page. Open that listing's calendar to manage another property.`,
    hy: `Կարող եմ փոխել միայն ${propertyTitle} գույքի հասանելիությունն ու գները այս էջում։ Այլ գույքի համար բացեք նրա օրացույցը։`,
    ru: `Я могу менять доступность и цены только для «${propertyTitle}» на этой странице. Для другого объекта откройте его календарь.`,
  };
  return templates[key];
}

export const HOST_CALENDAR_ALREADY_APPLIED_MESSAGES: LocalizedCopy = {
  en: 'These dates already have that availability and rate. No changes needed.',
  hy: 'Այս ամսաթվերն արդեն ունեն նշված հասանելիությունն ու գինը։ Փոփոխություններ չեն պետք։',
  ru: 'На эти даты уже установлены такая доступность и цена. Изменения не нужны.',
};

export const HOST_CALENDAR_NO_CHANGES_MESSAGES: LocalizedCopy = {
  en: 'No calendar changes to apply.',
  hy: 'Կիրառելու օրացույցի փոփոխություններ չկան։',
  ru: 'Нет изменений календаря для применения.',
};

export const HOST_CALENDAR_ALL_BOOKED_MESSAGES: LocalizedCopy = {
  en: 'All selected dates are blocked by bookings and cannot be changed.',
  hy: 'Բոլոր ընտրված ամսաթվերն ամրագրված են և չեն կարող փոփոխվել։',
  ru: 'Все выбранные даты забронированы и не могут быть изменены.',
};

export const HOST_CALENDAR_REVERT_HINTS: LocalizedCopy = {
  en: 'To revert, ask me to open those dates again, set the rate back to base, or edit the dates directly on the calendar grid.',
  hy: 'Չեղարկելու համար խնդրեք կրկին բացել այդ ամսաթվերը, վերադարձնել հիմնական գինը կամ խմբագրել օրացույցից։',
  ru: 'Чтобы отменить, попросите снова открыть эти даты, вернуть базовую цену или изменить даты прямо в календаре.',
};

export const AI_SEARCH_MISSING_FIELDS_MESSAGES: LocalizedCopy = {
  en: 'I need a destination and travel dates before I can search. Where would you like to stay, and what are your check-in and check-out dates?',
  hy: 'Որոնելու համար պետք են վայրը և ամսաթվերը։ Որտե՞ղ եք ցանկանում մնալ, և որոնե՞ն են մուտքի ու ելքի ամսաթվերը։',
  ru: 'Для поиска нужны место и даты поездки. Где вы хотите остановиться и какие даты заезда и выезда?',
};

export const AI_SEARCH_NO_MATCHES_SUFFIX: LocalizedCopy = {
  en: ' I could not find exact matches — try adjusting dates, budget, or amenities.',
  hy: ' Ճշգրիտ համընկնումներ չգտա — փորձեք փոխել ամսաթվերը, բյուջեն կամ հարմարավետությունները։',
  ru: ' Точных совпадений не найдено — попробуйте изменить даты, бюджет или удобства.',
};

export function buildHostCalendarAppliedMessage(
  summary: {
    appliedCount: number;
    skippedBookedCount: number;
    dateFrom: string;
    dateTo: string;
    isAvailable?: boolean;
    priceOverride?: number | null;
  },
  propertyTitle: string,
  locale?: string,
): string {
  const key = normalizeChatLocale(locale);
  const action =
    summary.isAvailable === false
      ? { en: 'Closed', hy: 'Փակված', ru: 'Закрыто' }[key]
      : { en: 'Opened', hy: 'Բացված', ru: 'Открыто' }[key];
  const ratePart =
    summary.priceOverride === null
      ? { en: ' at base rate', hy: ' հիմնական գնով', ru: ' по базовой цене' }[key]
      : summary.priceOverride !== undefined
        ? {
            en: ` with rate ${summary.priceOverride} AMD`,
            hy: ` ${summary.priceOverride} AMD գնով`,
            ru: ` с ценой ${summary.priceOverride} AMD`,
          }[key]
        : '';
  const skipped =
    summary.skippedBookedCount > 0
      ? {
          en: ` (${summary.skippedBookedCount} booked night(s) skipped)`,
          hy: ` (${summary.skippedBookedCount} ամրագրված գիշեր բաց թողնված)`,
          ru: ` (пропущено забронированных ночей: ${summary.skippedBookedCount})`,
        }[key]
      : '';
  const dayLabel = { en: 'day(s) updated', hy: 'օր թարմացված', ru: 'дн. обновлено' }[key];
  return `${action} ${summary.dateFrom}–${summary.dateTo} — «${propertyTitle}»${ratePart}. ${summary.appliedCount} ${dayLabel}${skipped}.`;
}
