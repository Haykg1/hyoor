export const PROPOSE_CALENDAR_CHANGES_TOOL_NAME = 'propose_calendar_changes';

export function buildProposeCalendarChangesToolDefinition(currency: string): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
} {
  return {
    type: 'function',
    function: {
      name: PROPOSE_CALENDAR_CHANGES_TOOL_NAME,
      description:
        'Propose availability or nightly rate changes for a date range on the current property. Call when the host gave a clear action and dates — including month/season phrases you resolved to YYYY-MM-DD (e.g. August → that full month). Do not wait for the host to spell out day numbers.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dateFrom: { type: 'string', description: 'Start date YYYY-MM-DD (inclusive).' },
          dateTo: { type: 'string', description: 'End date YYYY-MM-DD (inclusive).' },
          isAvailable: {
            type: 'boolean',
            description: 'true to open dates, false to close/block them.',
          },
          priceOverride: {
            type: 'integer',
            minimum: 1,
            description: `Custom nightly price in ${currency} (settlement currency) for each day in the range. Integer whole units, not cents. May be any positive integer above or below the property base rate — not capped by base.`,
          },
          useBaseRate: {
            type: 'boolean',
            description: 'When true, clear custom price overrides and use the property base rate.',
          },
        },
        required: ['dateFrom', 'dateTo'],
      },
    },
  };
}
