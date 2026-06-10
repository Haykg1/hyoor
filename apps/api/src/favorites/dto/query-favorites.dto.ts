import { ApiPropertyOptional } from '@nestjs/swagger';
import { FAVORITE_SORT_ORDERS, FAVORITE_SORT_VALUES } from '@repo/shared';
import {
  ARMENIA_CITIES,
  ARMENIA_REGION_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@repo/shared/constants';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

import { PROPERTY_TYPES } from '../../properties/dto/create-property.dto';

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

export class QueryFavoritesDto {
  @ApiPropertyOptional({
    description: 'Free-text title search',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  q?: string;

  @ApiPropertyOptional({ example: 'Yerevan', deprecated: true })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: ['Yerevan', 'Dilijan'], isArray: true })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsString({ each: true })
  @IsIn(ARMENIA_CITIES, { each: true })
  cities?: string[];

  @ApiPropertyOptional({ example: 'AM' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Tavush', deprecated: true })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: ['Tavush', 'Kotayk'], isArray: true })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsString({ each: true })
  @IsIn(ARMENIA_REGION_OPTIONS, { each: true })
  regions?: string[];

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

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Type(() => Number)
  minBathrooms?: number;

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

  @ApiPropertyOptional({ enum: FAVORITE_SORT_VALUES, default: 'favoritedAt' })
  @IsOptional()
  @IsIn(FAVORITE_SORT_VALUES)
  sortBy?: (typeof FAVORITE_SORT_VALUES)[number] = 'favoritedAt';

  @ApiPropertyOptional({ enum: FAVORITE_SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(FAVORITE_SORT_ORDERS)
  sortOrder?: (typeof FAVORITE_SORT_ORDERS)[number] = 'desc';
}
