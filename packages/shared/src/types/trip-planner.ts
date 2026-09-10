import type { ChatLocale } from '../utils/chat-locale-type';

export const TRIP_PLAN_STATUSES = [
  'DRAFT',
  'GENERATING',
  'READY',
  'FAILED',
  'INTERVIEW',
  'PLANNED',
] as const;
export type TripPlanStatus = (typeof TRIP_PLAN_STATUSES)[number];

export const TRIP_PLANNER_QUESTION_IDS = ['pace', 'alcohol', 'era', 'focus'] as const;
export type TripPlannerQuestionId = (typeof TRIP_PLANNER_QUESTION_IDS)[number];

export interface LocalizedLabel {
  en: string;
  hy: string;
  ru: string;
}

export interface TripPlannerQuestionOption {
  id: string;
  labels: LocalizedLabel;
  tags: string[];
}

export interface TripPlannerQuestion {
  id: TripPlannerQuestionId;
  labels: LocalizedLabel;
  options: readonly TripPlannerQuestionOption[];
}

export const TRIP_PLANNER_QUESTIONS: readonly TripPlannerQuestion[] = [
  {
    id: 'pace',
    labels: {
      en: 'What pace do you want?',
      hy: 'Ի՞նչ տեմպ եք ուզում։',
      ru: 'Какой темп вам подходит?',
    },
    options: [
      {
        id: 'packed',
        labels: { en: 'Packed', hy: 'Խիտ', ru: 'Насыщенный' },
        tags: ['active'],
      },
      {
        id: 'balanced',
        labels: { en: 'Balanced', hy: 'Հավասարակշռված', ru: 'Смешанный' },
        tags: ['active', 'relaxed'],
      },
      {
        id: 'relaxed',
        labels: { en: 'Relaxed', hy: 'Հանգիստ', ru: 'Спокойный' },
        tags: ['relaxed'],
      },
    ],
  },
  {
    id: 'alcohol',
    labels: {
      en: 'Are you interested in wine, cognac, or nightlife drinks?',
      hy: 'Հետաքրքրվա՞ծ եք գինիով, կոնյակով կամ գիշերային խմիչքներով։',
      ru: 'Интересны ли вино, коньяк или бары?',
    },
    options: [
      {
        id: 'yes',
        labels: { en: 'Yes', hy: 'Այո', ru: 'Да' },
        tags: ['alcohol'],
      },
      {
        id: 'no',
        labels: { en: 'No', hy: 'Ոչ', ru: 'Нет' },
        tags: [],
      },
      {
        id: 'wine',
        labels: {
          en: 'Just wine & cognac',
          hy: 'Միայն գինի և կոնյակ',
          ru: 'Только вино и коньяк',
        },
        tags: ['alcohol'],
      },
    ],
  },
  {
    id: 'era',
    labels: {
      en: 'Historical sites, modern places, or a mix?',
      hy: 'Պատմական վայրե՞ր, ժամանակակից վայրե՞ր, թե՞ խառը։',
      ru: 'Исторические места, современные или смесь?',
    },
    options: [
      {
        id: 'historical',
        labels: { en: 'Historical', hy: 'Պատմական', ru: 'Исторические' },
        tags: ['historical'],
      },
      {
        id: 'modern',
        labels: { en: 'Modern', hy: 'Ժամանակակից', ru: 'Современные' },
        tags: ['modern'],
      },
      {
        id: 'mix',
        labels: { en: 'A mix', hy: 'Խառը', ru: 'Смесь' },
        tags: ['historical', 'modern'],
      },
    ],
  },
  {
    id: 'focus',
    labels: {
      en: 'What should the days lean toward?',
      hy: 'Ինչի՞ վրա կենտրոնանանք։',
      ru: 'На что сделать акцент?',
    },
    options: [
      {
        id: 'nature',
        labels: { en: 'Nature & views', hy: 'Բնություն և տեսարաններ', ru: 'Природа и виды' },
        tags: ['nature'],
      },
      {
        id: 'food',
        labels: { en: 'Food & dining', hy: 'Սնունդ', ru: 'Еда' },
        tags: ['food'],
      },
      {
        id: 'culture',
        labels: { en: 'Culture & art', hy: 'Մշակույթ և արվեստ', ru: 'Культура и искусство' },
        tags: ['culture'],
      },
      {
        id: 'adventure',
        labels: { en: 'Adventure', hy: 'Արկած', ru: 'Приключения' },
        tags: ['active', 'nature'],
      },
      {
        id: 'shopping',
        labels: { en: 'Shopping', hy: 'Գնումներ', ru: 'Шопинг' },
        tags: ['modern'],
      },
    ],
  },
] as const;

export interface TripPlanPreferences {
  pace?: string;
  alcohol?: string;
  era?: string;
  focus?: string;
}

export interface TripPlanSummary {
  id: string;
  city: string;
  citySlug: string;
  checkIn: string;
  checkOut: string;
  bookingId: string | null;
  status: TripPlanStatus;
  createdAt: string;
  updatedAt: string;
  guestCount: number | null;
  summary: string | null;
}

export type TripPlanItemKind = 'sight' | 'meal' | 'activity' | 'transfer' | 'rest';
export type TripPlanVerificationStatus = 'verified' | 'adjusted' | 'unverified' | 'rejected';

export interface TripPlanPrice {
  amount: number;
  currency: string;
  basis: string;
}

export interface TripPlanStaySnapshot {
  propertyId: string;
  title: string;
  city: string;
  country: string;
  coverPhotoUrl: string | null;
  nightlyMinor: number;
  currency: string;
  guestCount: number;
  latitude: number | null;
  longitude: number | null;
}

export type TripPlanPriceBand = 'budget' | 'mid' | 'upscale';

export interface TripPlanItemView {
  id: string;
  placeId: string | null;
  kind: TripPlanItemKind;
  nameLabels: LocalizedLabel;
  startTime: string;
  endTime: string;
  address: string | null;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  pricePerPerson: TripPlanPrice | null;
  priceBand: TripPlanPriceBand | null;
  bookingRequired: boolean;
  description: string;
  whyThisFits: string;
  photoUrl: string | null;
  photoAttribution: string | null;
  photoLicense: string | null;
  verificationStatus: TripPlanVerificationStatus;
  verifiedAt: string | null;
  adjustments: string[];
  mapsUrl: string;
  yandexUrl: string;
  website: string | null;
  driveToNextMeters: number | null;
  driveToNextMinutes: number | null;
}

export interface TripPlanDayView {
  id: string;
  date: string;
  theme: string;
  items: TripPlanItemView[];
  estimatedCostAmd: number | null;
}

export interface TripPlannerQuotaView {
  limit: number;
  used: number;
  remaining: number;
  unitsRemaining: number;
  resetsInSeconds?: number;
}

export const TRIP_PLAN_PROGRESS_TYPES = [
  'intake_complete',
  'selecting',
  'arranging',
  'ready',
  'failed',
] as const;
export type TripPlanProgressType = (typeof TRIP_PLAN_PROGRESS_TYPES)[number];

export interface TripPlanProgressEvent {
  type: TripPlanProgressType;
  message: string;
  dayIndex?: number;
  dayCount?: number;
  at: string;
}

export interface TripPlanDetail extends TripPlanSummary {
  preferences: TripPlanPreferences;
  locale: string;
  budgetProfile: unknown;
  stay: TripPlanStaySnapshot | null;
  days: TripPlanDayView[];
  progress: TripPlanProgressEvent[];
}

export interface TripPlanGenerateResponse {
  plan: TripPlanDetail;
  quota: TripPlannerQuotaView;
}

export function resolveLocalizedLabel(labels: LocalizedLabel, locale: string): string {
  if (locale === 'hy') return labels.hy;
  if (locale === 'ru') return labels.ru;
  return labels.en;
}

export function getTripPlannerQuestion(
  questionId: TripPlannerQuestionId,
): TripPlannerQuestion | undefined {
  return TRIP_PLANNER_QUESTIONS.find((question) => question.id === questionId);
}

export function nextUnansweredQuestion(
  preferences: TripPlanPreferences,
): TripPlannerQuestion | undefined {
  return TRIP_PLANNER_QUESTIONS.find((question) => !preferences[question.id]);
}

export function collectPreferenceTags(preferences: TripPlanPreferences): string[] {
  const tags = new Set<string>();
  for (const question of TRIP_PLANNER_QUESTIONS) {
    const selected = preferences[question.id];
    if (!selected) continue;
    const option = question.options.find((entry) => entry.id === selected);
    if (!option) continue;
    for (const tag of option.tags) tags.add(tag);
  }
  return [...tags];
}

export function isChatLocale(locale: string): locale is ChatLocale {
  return locale === 'en' || locale === 'hy' || locale === 'ru';
}
