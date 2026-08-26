import type { SearchPropertiesToolArgs } from '@repo/shared';

export type McpJsonRpcId = string | number | null;

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id?: McpJsonRpcId;
  method: string;
  params?: unknown;
}

export interface McpJsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface McpJsonRpcSuccess {
  jsonrpc: '2.0';
  id: McpJsonRpcId;
  result: unknown;
}

export interface McpJsonRpcFailure {
  jsonrpc: '2.0';
  id: McpJsonRpcId;
  error: McpJsonRpcError;
}

export type McpJsonRpcResponse = McpJsonRpcSuccess | McpJsonRpcFailure;

export interface McpHttpResult {
  status: number;
  body?: unknown;
  protocolVersion: string;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolContent {
  type: 'text';
  text: string;
}

export interface McpToolCallResult {
  content: McpToolContent[];
  isError?: boolean;
}

export interface McpSearchListingsArgs extends SearchPropertiesToolArgs {
  locale?: string;
}

export interface McpGetListingArgs {
  id: string;
  locale?: string;
}

export interface McpListingCard {
  id: string;
  title: string;
  city: string;
  region: string | null;
  country: string;
  propertyType: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  avgRating?: number;
  reviewCount: number;
  coverPhotoUrl?: string;
  url: string;
  suggestedCheckIn?: string;
  suggestedCheckOut?: string;
}

export interface McpListingDetail extends McpListingCard {
  description: string | null;
  beds: number;
  bathrooms: number;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  amenities: string[];
  photos: string[];
  hostName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  minNights: number;
  maxNights: number | null;
  cancellationPolicy: string;
}

export interface McpSearchListingsResult {
  total: number;
  listings: McpListingCard[];
  searchUrl: string;
}
