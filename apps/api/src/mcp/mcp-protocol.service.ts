import { HttpException, Injectable } from '@nestjs/common';
import { AMENITY_NAMES, PropertyTypes, type PropertyType } from '@repo/shared';

import { McpListingsService } from './mcp-listings.service';
import { getMcpToolDefinitions } from './mcp-tools';
import {
  GET_LISTING_TOOL_NAME,
  MCP_DEFAULT_PROTOCOL_VERSION,
  MCP_INSTRUCTIONS,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
  SEARCH_LISTINGS_TOOL_NAME,
} from './mcp.constants';
import type {
  McpGetListingArgs,
  McpHttpResult,
  McpJsonRpcFailure,
  McpJsonRpcId,
  McpJsonRpcRequest,
  McpJsonRpcResponse,
  McpSearchListingsArgs,
  McpToolCallResult,
} from './mcp.types';

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

@Injectable()
export class McpProtocolService {
  constructor(private readonly listings: McpListingsService) {}

  /**
   * Handle a Streamable HTTP MCP POST body (single JSON-RPC message or batch).
   */
  async handleMessage(body: unknown, protocolHeader?: string): Promise<McpHttpResult> {
    const protocolVersion = this.negotiateProtocolVersion(undefined, protocolHeader);
    if (body === undefined || body === null || typeof body !== 'object') {
      return {
        status: 400,
        protocolVersion,
        body: this.failure(null, PARSE_ERROR, 'Parse error'),
      };
    }
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return {
          status: 400,
          protocolVersion,
          body: this.failure(null, INVALID_REQUEST, 'Invalid Request'),
        };
      }
      const responses: McpJsonRpcResponse[] = [];
      for (const item of body) {
        const response = await this.handleSingle(item, protocolHeader);
        if (response) responses.push(response);
      }
      if (responses.length === 0) {
        return { status: 202, protocolVersion };
      }
      return { status: 200, protocolVersion, body: responses };
    }
    const response = await this.handleSingle(body, protocolHeader);
    if (!response) {
      return { status: 202, protocolVersion };
    }
    const negotiated =
      this.readProtocolVersionFromResult(response) ??
      this.negotiateProtocolVersion(this.readClientProtocolVersion(body), protocolHeader);
    return { status: 200, protocolVersion: negotiated, body: response };
  }

  private async handleSingle(
    body: unknown,
    protocolHeader?: string,
  ): Promise<McpJsonRpcResponse | undefined> {
    if (!this.isObject(body) || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
      return this.failure(this.readId(body), INVALID_REQUEST, 'Invalid Request');
    }
    const request = body as unknown as McpJsonRpcRequest;
    const isNotification = !('id' in request);
    try {
      const result = await this.dispatch(request, protocolHeader);
      if (isNotification) return undefined;
      return { jsonrpc: '2.0', id: request.id ?? null, result };
    } catch (error) {
      if (isNotification) return undefined;
      if (error instanceof McpRpcError) {
        return this.failure(request.id ?? null, error.code, error.message);
      }
      const message = error instanceof Error ? error.message : 'Internal error';
      return this.failure(request.id ?? null, INTERNAL_ERROR, message);
    }
  }

  private async dispatch(request: McpJsonRpcRequest, protocolHeader?: string): Promise<unknown> {
    switch (request.method) {
      case 'initialize':
        return this.initialize(request.params, protocolHeader);
      case 'notifications/initialized':
      case 'initialized':
      case 'notifications/cancelled':
        return {};
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: getMcpToolDefinitions() };
      case 'tools/call':
        return this.callTool(request.params);
      default:
        throw new McpRpcError(METHOD_NOT_FOUND, `Method not found: ${request.method}`);
    }
  }

  private initialize(params: unknown, protocolHeader?: string): Record<string, unknown> {
    const clientVersion = this.readClientProtocolVersion(params) ?? protocolHeader;
    const protocolVersion = this.negotiateProtocolVersion(clientVersion, protocolHeader);
    return {
      protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      instructions: MCP_INSTRUCTIONS,
    };
  }

  private async callTool(params: unknown): Promise<McpToolCallResult> {
    if (!this.isObject(params) || typeof params.name !== 'string') {
      throw new McpRpcError(INVALID_PARAMS, 'tools/call requires name');
    }
    const args = this.isObject(params.arguments) ? params.arguments : {};
    if (params.name === SEARCH_LISTINGS_TOOL_NAME) {
      return this.runSearch(args);
    }
    if (params.name === GET_LISTING_TOOL_NAME) {
      return this.runGetListing(args);
    }
    throw new McpRpcError(INVALID_PARAMS, `Unknown tool: ${params.name}`);
  }

  private async runSearch(rawArgs: Record<string, unknown>): Promise<McpToolCallResult> {
    try {
      const result = await this.listings.searchListings(parseSearchArgs(rawArgs));
      const preface =
        result.listings.length > 0
          ? `Found ${result.listings.length} public listing(s). Show titles, prices, and urls. Do not invent extra listings.`
          : 'No matching public listings. Suggest broadening dates, location, or guest count.';
      return {
        content: [{ type: 'text', text: `${preface}\n${JSON.stringify(result, null, 2)}` }],
      };
    } catch (error) {
      return this.toolHttpError(error);
    }
  }

  private async runGetListing(rawArgs: Record<string, unknown>): Promise<McpToolCallResult> {
    const parsed = parseGetListingArgs(rawArgs);
    if (!parsed) {
      throw new McpRpcError(INVALID_PARAMS, 'get_listing requires id');
    }
    try {
      const listing = await this.listings.getListing(parsed);
      if (!listing) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Listing not found or not publicly listed.' }],
        };
      }
      return {
        content: [
          {
            type: 'text',
            text: `Public listing detail. Include the url when answering.\n${JSON.stringify(listing, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return this.toolHttpError(error);
    }
  }

  private toolHttpError(error: unknown): McpToolCallResult {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : this.isObject(response) && typeof response.message === 'string'
            ? response.message
            : error.message;
      return { isError: true, content: [{ type: 'text', text: message }] };
    }
    throw error;
  }

  private negotiateProtocolVersion(clientVersion?: string, headerVersion?: string): string {
    const candidate = clientVersion || headerVersion;
    if (candidate && (MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(candidate)) {
      return candidate;
    }
    return MCP_DEFAULT_PROTOCOL_VERSION;
  }

  private readClientProtocolVersion(value: unknown): string | undefined {
    if (!this.isObject(value)) return undefined;
    if (typeof value.protocolVersion === 'string') return value.protocolVersion;
    if (this.isObject(value.params) && typeof value.params.protocolVersion === 'string') {
      return value.params.protocolVersion;
    }
    return undefined;
  }

  private readProtocolVersionFromResult(response: McpJsonRpcResponse): string | undefined {
    if (!('result' in response) || !this.isObject(response.result)) return undefined;
    return typeof response.result.protocolVersion === 'string'
      ? response.result.protocolVersion
      : undefined;
  }

  private readId(value: unknown): McpJsonRpcId {
    if (!this.isObject(value)) return null;
    const id = value.id;
    if (typeof id === 'string' || typeof id === 'number' || id === null) return id;
    return null;
  }

  private failure(id: McpJsonRpcId, code: number, message: string): McpJsonRpcFailure {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

class McpRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'McpRpcError';
  }
}

function parseSearchArgs(raw: Record<string, unknown>): McpSearchListingsArgs {
  const args: McpSearchListingsArgs = {};
  if (typeof raw.locationQuery === 'string') args.locationQuery = raw.locationQuery;
  if (typeof raw.searchRadiusKm === 'number') args.searchRadiusKm = raw.searchRadiusKm;
  if (typeof raw.checkIn === 'string') args.checkIn = raw.checkIn;
  if (typeof raw.checkOut === 'string') args.checkOut = raw.checkOut;
  if (typeof raw.stayNights === 'number') args.stayNights = raw.stayNights;
  if (typeof raw.availableFrom === 'string') args.availableFrom = raw.availableFrom;
  if (typeof raw.availableTo === 'string') args.availableTo = raw.availableTo;
  if (typeof raw.maxGuests === 'number') args.maxGuests = raw.maxGuests;
  if (typeof raw.minBedrooms === 'number') args.minBedrooms = raw.minBedrooms;
  if (typeof raw.minBeds === 'number') args.minBeds = raw.minBeds;
  if (typeof raw.minBathrooms === 'number') args.minBathrooms = raw.minBathrooms;
  if (typeof raw.minPrice === 'number') args.minPrice = raw.minPrice;
  if (typeof raw.maxPrice === 'number') args.maxPrice = raw.maxPrice;
  if (isPropertyType(raw.propertyType)) args.propertyType = raw.propertyType;
  if (Array.isArray(raw.amenities)) {
    args.amenities = raw.amenities.filter(
      (item): item is string => typeof item === 'string' && AMENITY_NAMES.includes(item),
    );
  }
  if (typeof raw.petsAllowed === 'boolean') args.petsAllowed = raw.petsAllowed;
  if (typeof raw.smokingAllowed === 'boolean') args.smokingAllowed = raw.smokingAllowed;
  if (typeof raw.partiesAllowed === 'boolean') args.partiesAllowed = raw.partiesAllowed;
  if (typeof raw.minAvgRating === 'number') args.minAvgRating = raw.minAvgRating;
  if (typeof raw.q === 'string') args.q = raw.q;
  if (typeof raw.locale === 'string') args.locale = raw.locale;
  return args;
}

function parseGetListingArgs(raw: Record<string, unknown>): McpGetListingArgs | null {
  if (typeof raw.id !== 'string' || raw.id.trim().length === 0) return null;
  const args: McpGetListingArgs = { id: raw.id.trim() };
  if (typeof raw.locale === 'string') args.locale = raw.locale;
  return args;
}

function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === 'string' && (PropertyTypes as readonly string[]).includes(value);
}
