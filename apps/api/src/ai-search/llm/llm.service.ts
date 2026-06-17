import type {
  AiSearchMessage,
  HostCalendarChangeEntry,
  ProposeCalendarChangesToolArgs,
  SearchPropertiesToolArgs,
} from '@repo/shared';

import type { HostCalendarSnapshot } from '../utils/host-calendar-snapshot';

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
}

export interface HostCalendarSuggestionsLlmContext {
  locale: string;
  snapshot: HostCalendarSnapshot;
  suggestionCount: number;
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
  abstract generateHostCalendarSuggestions(
    context: HostCalendarSuggestionsLlmContext,
  ): Promise<HostCalendarSuggestionsLlmResult>;
}

export type { HostCalendarChangeEntry };
