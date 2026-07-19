import { ApiPropertyOptional } from '@nestjs/swagger';
import { HostAnalyticsPresets } from '@repo/shared';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryHostAnalyticsDto {
  @ApiPropertyOptional({
    enum: HostAnalyticsPresets,
    default: 'last_30_days',
    description:
      'Analytics window preset. Use custom with from/to for an explicit range. Defaults to last_30_days.',
  })
  @IsOptional()
  @IsIn([...HostAnalyticsPresets])
  preset?: (typeof HostAnalyticsPresets)[number];

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Inclusive range start (ISO date). Required with to when preset=custom.',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Exclusive range end (ISO date). Required with from when preset=custom.',
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    description:
      'Optional property id to scope analytics to one listing. Omit or leave empty for all properties.',
  })
  @IsOptional()
  @IsString()
  propertyId?: string;
}
