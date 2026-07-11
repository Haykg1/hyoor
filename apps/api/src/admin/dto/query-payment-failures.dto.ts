import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentFailureCategories } from '@repo/shared';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@repo/shared/constants';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

const BOOLEAN_STRINGS = ['true', 'false'] as const;

export class QueryPaymentFailuresDto {
  @ApiPropertyOptional({ example: 'clxyz123booking456' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: 'clxyz123property456' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'HostProfile id', example: 'clxyz123host456' })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiPropertyOptional({ example: 'clxyz123guest456' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiPropertyOptional({ enum: PaymentFailureCategories })
  @IsOptional()
  @IsIn(PaymentFailureCategories)
  category?: (typeof PaymentFailureCategories)[number];

  @ApiPropertyOptional({
    enum: BOOLEAN_STRINGS,
    description: 'Filter by resolved / unresolved',
  })
  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  resolved?: (typeof BOOLEAN_STRINGS)[number];

  @ApiPropertyOptional({
    description: 'Case-insensitive match against guest name, host name, or property title',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;

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
