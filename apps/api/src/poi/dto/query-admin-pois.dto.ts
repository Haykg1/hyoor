import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  POI_DESTINATION_CATEGORIES,
  POI_STATUSES,
} from '@repo/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const BOOLEAN_STRINGS = ['true', 'false'] as const;

export class QueryAdminPoisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  citySlug?: string;

  @ApiPropertyOptional({ enum: POI_DESTINATION_CATEGORIES })
  @IsOptional()
  @IsIn([...POI_DESTINATION_CATEGORIES])
  category?: (typeof POI_DESTINATION_CATEGORIES)[number];

  @ApiPropertyOptional({ enum: POI_STATUSES })
  @IsOptional()
  @IsIn([...POI_STATUSES])
  status?: (typeof POI_STATUSES)[number];

  @ApiPropertyOptional({ enum: BOOLEAN_STRINGS })
  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  usableInPlanner?: (typeof BOOLEAN_STRINGS)[number];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  @Type(() => Number)
  limit?: number = DEFAULT_PAGE_SIZE;
}
