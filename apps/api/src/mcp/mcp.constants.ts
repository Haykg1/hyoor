export const MCP_SERVER_NAME = 'arimna';
export const MCP_SERVER_VERSION = '1.0.0';
export const MCP_RESULT_LIMIT = 8;
export const MCP_DESCRIPTION_MAX_CHARS = 600;
export const MCP_PHOTO_LIMIT = 5;
export const MCP_AMENITY_LIMIT = 20;
export const MCP_PROTOCOL_HEADER = 'MCP-Protocol-Version';
export const MCP_DEFAULT_PROTOCOL_VERSION = '2025-03-26';
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = ['2024-11-05', '2025-03-26', '2025-11-05'] as const;
export const SEARCH_LISTINGS_TOOL_NAME = 'search_listings';
export const GET_LISTING_TOOL_NAME = 'get_listing';
export const MCP_INSTRUCTIONS =
  'Search public short-term rental listings in Armenia. Always include listing urls in answers. Never invent listings, prices, or availability. Booking happens on the website, not via these tools.';
