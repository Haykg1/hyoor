export const PROPOSE_CALENDAR_CHANGES_TOOL_NAME = 'propose_calendar_changes';

export function buildProposeCalendarChangesToolDefinition(): {
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
        'Propose availability or nightly rate changes for a date range on the current property. Call only when the host gave a clear action and date range.',
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
            minimum: 0,
            description: 'Custom nightly price in AMD minor units for each day in the range.',
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
