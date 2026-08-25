import { AMENITY_NAMES, PropertyTypes } from '@repo/shared';

import { GET_LISTING_TOOL_NAME, SEARCH_LISTINGS_TOOL_NAME } from './mcp.constants';
import type { McpToolDefinition } from './mcp.types';

export function getMcpToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: SEARCH_LISTINGS_TOOL_NAME,
      description:
        'Search public short-term rental listings in Armenia. Omit locationQuery to search without a place filter. Prefer exact checkIn/checkOut, or a flexible window (stayNights + availableFrom + availableTo). Never use past dates. Prices are per night in AMD unless display currency is implied. Return listings to the user with their url fields.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          locationQuery: {
            type: 'string',
            description:
              'Optional city, region, or landmark in Armenia. For "near X" use "X, City" (e.g. "Republic Square, Yerevan").',
          },
          searchRadiusKm: {
            type: 'number',
            minimum: 0.1,
            maximum: 50,
            description: 'Optional geo radius in km. For near-landmark searches use about 1.2.',
          },
          checkIn: {
            type: 'string',
            description:
              'Exact check-in date YYYY-MM-DD. Use with checkOut. Must be today or later.',
          },
          checkOut: {
            type: 'string',
            description:
              'Exact check-out date YYYY-MM-DD. Use with checkIn. Must be after checkIn.',
          },
          stayNights: {
            type: 'integer',
            minimum: 1,
            description:
              'Stay length in nights for flexible search. Use with availableFrom/availableTo.',
          },
          availableFrom: {
            type: 'string',
            description: 'Earliest possible check-in YYYY-MM-DD for a flexible window.',
          },
          availableTo: {
            type: 'string',
            description: 'Latest possible check-in YYYY-MM-DD for a flexible window.',
          },
          maxGuests: {
            type: 'integer',
            minimum: 1,
            description: 'Total guests when the user stated a number of people.',
          },
          minBedrooms: { type: 'integer', minimum: 0 },
          minBeds: { type: 'integer', minimum: 0 },
          minBathrooms: { type: 'integer', minimum: 0 },
          minPrice: { type: 'integer', minimum: 0, description: 'Minimum price per night in AMD.' },
          maxPrice: { type: 'integer', minimum: 0, description: 'Maximum price per night in AMD.' },
          propertyType: {
            type: 'string',
            enum: [...PropertyTypes],
            description: 'Exact enum value, e.g. APARTMENT, HOUSE, VILLA, STUDIO, GUESTHOUSE.',
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
          locale: {
            type: 'string',
            enum: ['en', 'hy', 'ru'],
            description: 'Listing page language. Default en.',
          },
        },
      },
    },
    {
      name: GET_LISTING_TOOL_NAME,
      description:
        'Get public details for one listing by id. Use after search_listings when the user wants more information. Always include the url in the answer.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Listing id from search_listings.' },
          locale: {
            type: 'string',
            enum: ['en', 'hy', 'ru'],
            description: 'Listing page language. Default en.',
          },
        },
      },
    },
  ];
}
