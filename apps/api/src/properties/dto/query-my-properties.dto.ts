import { ApiPropertyOptional } from '@nestjs/swagger';
import { HostListingTabs, PropertyTypes } from '@repo/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

const ALLOWED_LIMITS = [10, 20, 30] as const;
const ALLOWED_TABS = [...HostListingTabs];
const ALLOWED_ACTIVE_TAB_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE'] as const;
const ALLOWED_PROPERTY_TYPES = [...PropertyTypes];

export class QueryMyPropertiesDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    enum: ALLOWED_LIMITS,
    default: 10,
    description: 'Items per page (10, 20, or 30)',
  })
  @IsOptional()
  @IsIn([...ALLOWED_LIMITS])
  @Type(() => Number)
  limit?: (typeof ALLOWED_LIMITS)[number] = 10;

  @ApiPropertyOptional({
    enum: ALLOWED_TABS,
    description: '"active" shows all non-inactive listings; "disabled" shows INACTIVE only',
  })
  @IsOptional()
  @IsIn(ALLOWED_TABS)
  tab?: (typeof HostListingTabs)[number];

  @ApiPropertyOptional({
    enum: ALLOWED_ACTIVE_TAB_STATUSES,
    description:
      'Filter within the active tab. INACTIVE is intentionally excluded — use tab=disabled instead.',
  })
  @IsOptional()
  @IsIn([...ALLOWED_ACTIVE_TAB_STATUSES])
  status?: (typeof ALLOWED_ACTIVE_TAB_STATUSES)[number];

  @ApiPropertyOptional({ enum: ALLOWED_PROPERTY_TYPES })
  @IsOptional()
  @IsIn(ALLOWED_PROPERTY_TYPES)
  propertyType?: (typeof PropertyTypes)[number];

  @ApiPropertyOptional({
    description: 'Case-insensitive match against title, slug, description, city, region, country',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  search?: string;
}
