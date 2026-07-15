import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  LEGACY_PROPERTY_SORT_VALUES,
  normalizePropertySortBy,
  PROPERTY_SORT_VALUES,
} from '@repo/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@repo/shared/constants';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { CACHED_CURRENCIES } from '../../currency/currency.constants';

import { PROPERTY_TYPES } from './create-property.dto';

export const SORT_BY = [...PROPERTY_SORT_VALUES, ...LEGACY_PROPERTY_SORT_VALUES] as const;

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (typeof value === 'boolean') return value;
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null) return [];
  return [String(value)];
}

export class SearchPropertiesDto {
  @ApiPropertyOptional({ example: 'Yerevan' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'AM' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Tavush' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Noramarg village' })
  @IsOptional()
  @IsString()
  searchCity?: string;

  @ApiPropertyOptional({ example: 'Azatutyan Street' })
  @IsOptional()
  @IsString()
  searchStreet?: string;

  @ApiPropertyOptional({ example: '11' })
  @IsOptional()
  @IsString()
  searchBuildingNumber?: string;

  @ApiPropertyOptional({ example: 'house' })
  @IsOptional()
  @IsString()
  searchPlaceKind?: string;

  @ApiPropertyOptional({ example: 40.1776 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  searchLatitude?: number;

  @ApiPropertyOptional({ example: 44.5128 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  searchLongitude?: number;

  @ApiPropertyOptional({
    example: 5,
    minimum: 0.05,
    maximum: 200,
    description:
      'Optional radius (km) around searchLatitude/searchLongitude. If omitted, a sensible default is derived from searchPlaceKind.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(200)
  @Type(() => Number)
  searchRadiusKm?: number;

  @ApiPropertyOptional({
    description:
      'Free-text title search. Case-insensitive on the canonical `title`; case-sensitive substring on `titleLabels.<locale>` (Postgres JSON limitation).',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  q?: string;

  @ApiPropertyOptional({ enum: PROPERTY_TYPES })
  @IsOptional()
  @IsIn(PROPERTY_TYPES)
  propertyType?: (typeof PROPERTY_TYPES)[number];

  @ApiPropertyOptional({ example: 10000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxGuests?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minAdults?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minChildren?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minInfants?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minBedrooms?: number;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minBeds?: number;

  @ApiPropertyOptional({
    example: 1.5,
    minimum: 0,
    description: 'Bathrooms (supports decimals like 1.5)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Type(() => Number)
  minBathrooms?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minCleaningFee?: number;

  @ApiPropertyOptional({ example: 5000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxCleaningFee?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minSecurityDeposit?: number;

  @ApiPropertyOptional({ example: 50000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxSecurityDeposit?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    description:
      'Desired minimum nights for the stay. Property must allow this (property.minNights <= value).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minNights?: number;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    description:
      'Desired maximum nights for the stay. Property must allow this (property.maxNights is null OR >= value).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxNights?: number;

  @ApiPropertyOptional({ example: true, description: 'Only show listings that allow smoking' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  smokingAllowed?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Only show listings that allow pets' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Only show listings that allow parties' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  partiesAllowed?: boolean;

  @ApiPropertyOptional({
    example: ['WiFi', 'Kitchen'],
    isArray: true,
    description: 'Amenity names. Property must include ALL selected amenities.',
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: 4.5, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minAvgRating?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minReviewCount?: number;

  @ApiPropertyOptional({ example: '2026-06-01', format: 'date' })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({ example: '2026-06-05', format: 'date' })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    description: 'Flexible search: length of stay when exact dates are not provided.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  stayNights?: number;

  @ApiPropertyOptional({
    example: '2026-07-01',
    format: 'date',
    description: 'Flexible search: earliest possible check-in date.',
  })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({
    example: '2026-07-27',
    format: 'date',
    description: 'Flexible search: latest possible check-in date.',
  })
  @IsOptional()
  @IsDateString()
  availableTo?: string;

  @ApiPropertyOptional({ example: true, description: 'Return only featured listings' })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @Type(() => Number)
  limit?: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    enum: SORT_BY,
    default: 'recommended',
    description: 'Legacy createdAt→recommended, pricePerNight→priceAsc are accepted.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizePropertySortBy(typeof value === 'string' ? value : undefined))
  @IsIn([...PROPERTY_SORT_VALUES])
  sortBy?: (typeof PROPERTY_SORT_VALUES)[number] = 'recommended';

  @ApiPropertyOptional({
    example: 'AMD',
    description:
      'Override guest display currency and currency of minPrice/maxPrice. Must be a cached rate currency.',
  })
  @IsOptional()
  @IsString()
  @IsIn([...CACHED_CURRENCIES])
  displayCurrency?: string;
}
