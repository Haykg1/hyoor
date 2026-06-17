import type { AiSearchMessage, AiSearchQuota } from './ai-search';

export interface HostCalendarChangeEntry {
  date: string;
  isAvailable: boolean;
  priceOverride?: number | null;
}

export interface ProposeCalendarChangesToolArgs {
  dateFrom: string;
  dateTo: string;
  isAvailable?: boolean;
  priceOverride?: number;
  useBaseRate?: boolean;
}

export type HostCalendarResponseType =
  | 'clarify'
  | 'calendar_preview'
  | 'calendar_applied'
  | 'already_applied';

export interface HostCalendarChatResponse {
  type: HostCalendarResponseType;
  message: string;
  proposedChanges?: {
    entries: HostCalendarChangeEntry[];
    dateFrom: string;
    dateTo: string;
  };
  appliedSummary?: {
    appliedCount: number;
    skippedBookedCount: number;
    dateFrom: string;
    dateTo: string;
    isAvailable?: boolean;
    priceOverride?: number | null;
  };
  revertHint?: string;
  quota?: AiSearchQuota;
}

export interface HostCalendarChatRequest {
  messages: AiSearchMessage[];
  locale?: string;
}

export interface HostCalendarConfirmRequest {
  entries: HostCalendarChangeEntry[];
  locale?: string;
}

export interface HostCalendarSuggestionsResponse {
  suggestions: string[];
}
