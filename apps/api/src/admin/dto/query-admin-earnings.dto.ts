import { ApiPropertyOptional } from '@nestjs/swagger';
import { EarningsPresets } from '@repo/shared';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class QueryAdminEarningsDto {
  @ApiPropertyOptional({
    enum: EarningsPresets,
    default: 'last_30_days',
    description:
      'Earnings window preset. Use custom with from/to for an explicit range. Defaults to last_30_days.',
  })
  @IsOptional()
  @IsIn([...EarningsPresets])
  preset?: (typeof EarningsPresets)[number];

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
}
