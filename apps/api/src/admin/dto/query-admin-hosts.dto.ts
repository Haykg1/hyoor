import { ApiPropertyOptional } from '@nestjs/swagger';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@repo/shared/constants';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const HOST_TYPES = ['INDIVIDUAL', 'COMPANY'] as const;

const BOOLEAN_STRINGS = ['true', 'false'] as const;

export class QueryAdminHostsDto {
  @ApiPropertyOptional({ example: 'anna' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: HOST_TYPES })
  @IsOptional()
  @IsIn(HOST_TYPES)
  hostType?: (typeof HOST_TYPES)[number];

  @ApiPropertyOptional({
    enum: BOOLEAN_STRINGS,
    example: 'true',
    description: 'Filter by host verification status',
  })
  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  isVerified?: (typeof BOOLEAN_STRINGS)[number];

  @ApiPropertyOptional({
    enum: BOOLEAN_STRINGS,
    example: 'true',
    description: 'When true, only hosts with a custom platformFeePercent',
  })
  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  hasFeeOverride?: (typeof BOOLEAN_STRINGS)[number];

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
}
