import { ApiPropertyOptional } from '@nestjs/swagger';
import { HostListingTabs } from '@repo/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

const ALLOWED_LIMITS = [10, 20, 30] as const;
const ALLOWED_TABS = [...HostListingTabs];

export class QueryMyPropertiesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ enum: ALLOWED_LIMITS, default: 10, description: 'Items per page (10, 20, or 30)' })
  @IsOptional()
  @IsIn([...ALLOWED_LIMITS])
  @Type(() => Number)
  limit?: (typeof ALLOWED_LIMITS)[number] = 10;

  @ApiPropertyOptional({ enum: ALLOWED_TABS, description: '"active" shows all non-inactive listings; "disabled" shows INACTIVE only' })
  @IsOptional()
  @IsIn(ALLOWED_TABS)
  tab?: (typeof HostListingTabs)[number];
}
