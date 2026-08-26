import type { McpListingsService } from './mcp-listings.service';
import { McpProtocolService } from './mcp-protocol.service';
import { GET_LISTING_TOOL_NAME, SEARCH_LISTINGS_TOOL_NAME } from './mcp.constants';
import type { McpListingCard, McpSearchListingsResult } from './mcp.types';

jest.mock('./mcp-listings.service');

describe('McpProtocolService', () => {
  let listings: {
    searchListings: jest.Mock;
    getListing: jest.Mock;
  };
  let protocol: McpProtocolService;

  beforeEach(() => {
    listings = {
      searchListings: jest.fn(),
      getListing: jest.fn(),
    };
    protocol = new McpProtocolService(listings as unknown as McpListingsService);
  });

  it('initializes with tools capability and negotiated protocol version', async () => {
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });
    expect(result.status).toBe(200);
    expect(result.protocolVersion).toBe('2025-03-26');
    expect(result.body).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'arimna' },
      },
    });
  });

  it('lists search and get listing tools', async () => {
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });
    const body = result.body as { result: { tools: Array<{ name: string }> } };
    const names = body.result.tools.map((tool) => tool.name);
    expect(names).toEqual([SEARCH_LISTINGS_TOOL_NAME, GET_LISTING_TOOL_NAME]);
  });

  it('returns 202 for initialized notifications', async () => {
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    expect(result.status).toBe(202);
    expect(result.body).toBeUndefined();
  });

  it('returns method not found for unknown methods', async () => {
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
    });
    expect(result.body).toMatchObject({
      jsonrpc: '2.0',
      id: 3,
      error: { code: -32601 },
    });
  });

  it('calls search_listings and returns listing urls', async () => {
    const listing: McpListingCard = {
      id: 'p1',
      title: 'Yerevan loft',
      city: 'Yerevan',
      region: 'Yerevan',
      country: 'AM',
      propertyType: 'APARTMENT',
      pricePerNight: 25000,
      currency: 'AMD',
      maxGuests: 2,
      bedrooms: 1,
      reviewCount: 0,
      url: 'http://localhost:3000/en/property/p1',
    };
    const searchResult: McpSearchListingsResult = {
      total: 1,
      listings: [listing],
      searchUrl: 'http://localhost:3000/en/search',
    };
    listings.searchListings.mockResolvedValue(searchResult);
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: SEARCH_LISTINGS_TOOL_NAME,
        arguments: { locationQuery: 'Yerevan', maxGuests: 2 },
      },
    });
    expect(listings.searchListings).toHaveBeenCalledWith(
      expect.objectContaining({ locationQuery: 'Yerevan', maxGuests: 2 }),
    );
    const body = result.body as { result: { content: Array<{ text: string }>; isError?: boolean } };
    expect(body.result.isError).toBeUndefined();
    expect(body.result.content[0]?.text).toContain('http://localhost:3000/en/property/p1');
  });

  it('returns a tool error when get_listing misses', async () => {
    listings.getListing.mockResolvedValue(null);
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: GET_LISTING_TOOL_NAME, arguments: { id: 'missing' } },
    });
    const body = result.body as { result: { isError?: boolean; content: Array<{ text: string }> } };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0]?.text).toMatch(/not found/i);
  });

  it('rejects get_listing without id', async () => {
    const result = await protocol.handleMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: GET_LISTING_TOOL_NAME, arguments: {} },
    });
    expect(result.body).toMatchObject({
      jsonrpc: '2.0',
      id: 6,
      error: { code: -32602 },
    });
  });
});
