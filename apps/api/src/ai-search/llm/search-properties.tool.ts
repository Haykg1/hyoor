import { AMENITY_NAMES, PropertyTypes } from '@repo/shared';

export const SEARCH_PROPERTIES_TOOL_NAME = 'search_properties';

export function buildSearchPropertiesToolDefinition(): {
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
      name: SEARCH_PROPERTIES_TOOL_NAME,
      description:
        'Search short-term rental properties. Call when the guest provided a location and either (a) exact checkIn and checkOut dates, or (b) stayNights plus availableFrom and availableTo for a flexible window (e.g. "5 nights anytime in July").',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          locationQuery: {
            type: 'string',
            description:
              'City, region, or landmark in Armenia (e.g. Yerevan, Dilijan, Lake Sevan).',
          },
          checkIn: {
            type: 'string',
            description: 'Exact check-in date in YYYY-MM-DD format. Use with checkOut.',
          },
          checkOut: {
            type: 'string',
            description: 'Exact check-out date in YYYY-MM-DD format. Use with checkIn.',
          },
          stayNights: {
            type: 'integer',
            minimum: 1,
            description:
              'Length of stay in nights when the guest did not give exact dates (e.g. "5 nights").',
          },
          availableFrom: {
            type: 'string',
            description:
              'Earliest possible check-in (YYYY-MM-DD) for flexible search. Use with stayNights and availableTo.',
          },
          availableTo: {
            type: 'string',
            description:
              'Latest possible check-in (YYYY-MM-DD) for flexible search. Use with stayNights and availableFrom.',
          },
          maxGuests: { type: 'integer', minimum: 1, description: 'Total number of guests.' },
          minBedrooms: { type: 'integer', minimum: 0 },
          minBeds: { type: 'integer', minimum: 0 },
          minBathrooms: { type: 'integer', minimum: 0 },
          minPrice: { type: 'integer', minimum: 0, description: 'Minimum price per night in AMD.' },
          maxPrice: { type: 'integer', minimum: 0, description: 'Maximum price per night in AMD.' },
          propertyType: { type: 'string', enum: [...PropertyTypes] },
          amenities: {
            type: 'array',
            items: { type: 'string', enum: [...AMENITY_NAMES] },
          },
          petsAllowed: { type: 'boolean' },
          smokingAllowed: { type: 'boolean' },
          partiesAllowed: { type: 'boolean' },
          minAvgRating: { type: 'number', minimum: 0, maximum: 5 },
          q: { type: 'string', description: 'Free-text search in property titles.' },
        },
        required: ['locationQuery'],
      },
    },
  };
}
