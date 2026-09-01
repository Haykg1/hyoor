import type { BudgetProfile, TripPlanPreferences } from '@repo/shared';
import { TRIP_PLANNER_QUESTIONS, resolveLocalizedLabel } from '@repo/shared';

import { buildResponseLanguageRule, normalizeChatLocale } from '../ai-search/utils/chat-locale';

import type { CompactCandidate } from './trip-planner-candidates.service';

export interface TripPlanPromptParts {
  system: string;
  user: string;
}

/**
 * Static, byte-identical on every call so OpenAI can reuse the cached prefix.
 * No interpolation here — a snapshot test guards the invariant.
 */
const SYSTEM_PROMPT = [
  'You are the RentStar trip planner for Armenia. Output JSON only, no prose outside JSON.',
  'You are given a numbered list of real, pre-vetted places (candidates). You may ONLY use places from that list.',
  'Your job: choose which candidates to visit each day and put them in a sensible order and time.',
  'Rules:',
  '- Do not exceed the per-day pick limit stated in the request. Aim to fill each day close to that limit.',
  '- Reference each pick by its candidate number "n". Never invent a place or a number that is not in the list.',
  '- Do not repeat a candidate across the whole trip.',
  '- startTime/endTime are "HH:mm" 24h. Times within a day must not overlap; leave realistic travel gaps.',
  '- Put a meal candidate around 13:00 and, if the day is long, another around 19:30 when the list has one.',
  '- If the age band is "minor", never pick candidates tagged "alcohol" or "nightlife".',
  '- Prefer candidates whose tags match the traveller answers and whose price band fits the budget.',
  '- Keep each day geographically tight when possible (nearby lat/lng).',
  '- "whyThisFits" is one short sentence linking the pick to the traveller answers.',
  'Output shape:',
  '{ "summary": string, "days": [ { "theme": string, "picks": [ { "n": number, "startTime": "HH:mm", "endTime": "HH:mm", "whyThisFits": string } ] } ] }',
  'Return exactly one entry in "days" per trip day, in order.',
].join('\n');

function copyRule(locale: ReturnType<typeof normalizeChatLocale>): string {
  return [
    buildResponseLanguageRule(locale),
    'Write summary, theme, and whyThisFits in that same language.',
  ].join('\n');
}

function answersLine(preferences: TripPlanPreferences, locale: string): string {
  return TRIP_PLANNER_QUESTIONS.map((question) => {
    const selected = preferences[question.id];
    const option = question.options.find((entry) => entry.id === selected);
    const label = option ? resolveLocalizedLabel(option.labels, locale) : 'unanswered';
    return `${question.id}=${label}`;
  }).join('; ');
}

function budgetLine(budget: BudgetProfile): string {
  const lunch = budget.lunchMaxAmd == null ? 'no cap' : `${budget.lunchMaxAmd} AMD`;
  const dinner = budget.dinnerMaxAmd == null ? 'no cap' : `${budget.dinnerMaxAmd} AMD`;
  return `Budget: dining ${budget.diningTier} (lunch ${lunch}, dinner ${dinner}); activities ${budget.activityTier}.`;
}

function candidateLines(candidates: CompactCandidate[]): string {
  return candidates
    .map((candidate) => {
      const bits = [
        `${candidate.n}. ${candidate.name} [${candidate.category}]`,
        candidate.tags.length ? `tags:${candidate.tags.join('/')}` : null,
        candidate.priceBand ? `price:${candidate.priceBand}` : null,
        candidate.servesAlcohol ? 'alcohol' : null,
        candidate.durationMin ? `~${candidate.durationMin}min` : null,
        `@${candidate.lat},${candidate.lng}`,
        candidate.desc ? `— ${candidate.desc}` : null,
      ].filter(Boolean);
      return bits.join(' ');
    })
    .join('\n');
}

export function buildGeneratedTripPrompt(params: {
  locale?: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nightCount: number;
  preferences: TripPlanPreferences;
  budget: BudgetProfile;
  ageBand: string;
  maxStops: number;
  candidates: CompactCandidate[];
  stay?: { title: string; latitude: number | null; longitude: number | null } | null;
}): TripPlanPromptParts {
  const locale = normalizeChatLocale(params.locale);
  const stayLine = params.stay
    ? `Stay base: ${params.stay.title} @ ${params.stay.latitude ?? 'n/a'},${params.stay.longitude ?? 'n/a'}. Start and end days near here.`
    : 'No stay selected. Anchor days around the city centre.';
  const user = [
    copyRule(locale),
    `City: ${params.city}. Dates: ${params.checkIn} to ${params.checkOut} (${params.nightCount} day(s)).`,
    `Plan ${params.maxStops} picks per day (fewer only if candidates run out).`,
    stayLine,
    `Traveller answers: ${answersLine(params.preferences, locale)}. Age band: ${params.ageBand}.`,
    budgetLine(params.budget),
    `Candidates (pick by number):`,
    candidateLines(params.candidates),
  ].join('\n');
  return { system: SYSTEM_PROMPT, user };
}

export function buildRegenerateDayPrompt(params: {
  locale?: string;
  city: string;
  date: string;
  theme: string;
  preferences: TripPlanPreferences;
  budget: BudgetProfile;
  ageBand: string;
  maxStops: number;
  candidates: CompactCandidate[];
}): TripPlanPromptParts {
  const locale = normalizeChatLocale(params.locale);
  const user = [
    copyRule(locale),
    `Regenerate a single day in ${params.city} on ${params.date}. Previous theme: ${params.theme}.`,
    `Plan ${params.maxStops} picks for the day (fewer only if candidates run out).`,
    `Traveller answers: ${answersLine(params.preferences, locale)}. Age band: ${params.ageBand}.`,
    budgetLine(params.budget),
    'Return exactly one entry in "days".',
    `Candidates (pick by number):`,
    candidateLines(params.candidates),
  ].join('\n');
  return { system: SYSTEM_PROMPT, user };
}

export { SYSTEM_PROMPT as TRIP_PLAN_SYSTEM_PROMPT };
