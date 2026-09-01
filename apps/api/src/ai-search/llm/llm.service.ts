import type {
  AiSearchMessage,
  HostCalendarChangeEntry,
  ProposeCalendarChangesToolArgs,
  SearchPropertiesToolArgs,
} from '@repo/shared';

import type { NormalizedRow } from '../../properties/bulk-import/row-normalizer';
import type { HostCalendarSnapshot } from '../utils/host-calendar-snapshot';
import type { HostCalendarSuggestionPricing } from '../utils/host-calendar-suggestion-pricing';

export interface LlmTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface HostCalendarLlmContext {
  propertyId: string;
  propertyTitle: string;
  basePricePerNight: number;
  currency: string;
  locale: string;
  /** Approximate FX rates text injected into the system prompt (AMD/EUR → USD). */
  fxRatesHint: string;
  todayIso: string;
  maxEditableIso: string;
}

export interface HostCalendarSuggestionsLlmContext {
  locale: string;
  snapshot: HostCalendarSnapshot;
  suggestionCount: number;
  pricing: HostCalendarSuggestionPricing;
}

export type HostCalendarSuggestionsLlmResult = {
  suggestions: string[];
  usage: LlmTokenUsage;
};

export type LlmCompletionResult =
  | { kind: 'clarify'; message: string; usage: LlmTokenUsage }
  | { kind: 'tool'; message: string; args: SearchPropertiesToolArgs; usage: LlmTokenUsage };

export type HostCalendarLlmResult =
  | { kind: 'clarify'; message: string; usage: LlmTokenUsage }
  | {
      kind: 'calendar_proposal';
      message: string;
      args: ProposeCalendarChangesToolArgs;
      usage: LlmTokenUsage;
    };

export abstract class LlmService {
  abstract complete(messages: AiSearchMessage[], locale: string): Promise<LlmCompletionResult>;
  abstract completeHostCalendar(
    messages: AiSearchMessage[],
    context: HostCalendarLlmContext,
  ): Promise<HostCalendarLlmResult>;
  abstract completeGeneratedTripPlan(prompt: {
    system: string;
    user: string;
  }): Promise<{ json: unknown; usage: LlmTokenUsage }>;
  abstract generateHostCalendarSuggestions(
    context: HostCalendarSuggestionsLlmContext,
  ): Promise<HostCalendarSuggestionsLlmResult>;
  /**
   * Normalize raw spreadsheet rows to canonical property fields.
   * Headers and raw rows come from a parsed CSV/XLSX file.
   * Returns one normalized row per input row; may throw if LLM unavailable.
   */
  abstract normalizeBulkPropertyRows(
    headers: string[],
    rows: Record<string, string>[],
  ): Promise<NormalizedRow[]>;
}

export type { HostCalendarChangeEntry };
