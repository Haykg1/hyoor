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
        'Search short-term rental properties. Call only when the guest provided a location and both check-in and check-out dates.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          locationQuery: {
            type: 'string',
            description:
              'City, region, or landmark in Armenia (e.g. Yerevan, Dilijan, Lake Sevan).',
          },
          checkIn: { type: 'string', description: 'Check-in date in YYYY-MM-DD format.' },
          checkOut: { type: 'string', description: 'Check-out date in YYYY-MM-DD format.' },
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
        required: ['locationQuery', 'checkIn', 'checkOut'],
      },
    },
  };
}
