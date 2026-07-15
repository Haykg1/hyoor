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
        'Search short-term rental properties. Never use past dates (checkIn/availableFrom must be today or later). Call when the guest wants to find a stay — locationQuery is optional (omit to search without a place filter). If timing is omitted, use stayNights=1 and availableFrom/availableTo for the remainder of the current month. Exact checkIn/checkOut or a flexible window (stayNights + availableFrom + availableTo) also work.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          locationQuery: {
            type: 'string',
            description:
              'Optional city, region, or landmark in Armenia (e.g. Yerevan, Dilijan, Lake Sevan). Omit when the guest did not name a place.',
          },
          checkIn: {
            type: 'string',
            description:
              'Exact check-in date in YYYY-MM-DD. Must be today or later. Use with checkOut.',
          },
          checkOut: {
            type: 'string',
            description:
              'Exact check-out date in YYYY-MM-DD. Must be after checkIn. Use with checkIn.',
          },
          stayNights: {
            type: 'integer',
            minimum: 1,
            description:
              'Stay LENGTH in nights (e.g. "2 nights in July" → 2). Not the width of the month window. Default to 1 when unspecified.',
          },
          availableFrom: {
            type: 'string',
            description:
              'Earliest possible check-in (YYYY-MM-DD) for the flexible WINDOW. Must be today or later. When unspecified, use today. Use with stayNights and availableTo.',
          },
          availableTo: {
            type: 'string',
            description:
              'Latest possible check-in (YYYY-MM-DD) for the flexible WINDOW. Must be on/after availableFrom. For "in July", use end of July — this is NOT the stay length. Use with stayNights and availableFrom.',
          },
          maxGuests: {
            type: 'integer',
            minimum: 1,
            description:
              'Total guests only when explicitly stated (e.g. "2 guests", "for 3 people"). Do NOT set from night counts like "two nights".',
          },
          minBedrooms: { type: 'integer', minimum: 0 },
          minBeds: { type: 'integer', minimum: 0 },
          minBathrooms: { type: 'integer', minimum: 0 },
          minPrice: { type: 'integer', minimum: 0, description: 'Minimum price per night in AMD.' },
          maxPrice: { type: 'integer', minimum: 0, description: 'Maximum price per night in AMD.' },
          propertyType: {
            type: 'string',
            enum: [...PropertyTypes],
            description:
              'Property type filter. Set when the guest asks for apartment, house, villa, studio, guesthouse, hotel room, etc. Use exact enum values (e.g. apartment → APARTMENT).',
          },
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
      },
    },
  };
}
