import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class OpenRangeDto {
  @ApiPropertyOptional({
    example: '2026-06-03',
    format: 'date',
    description: 'Inclusive start date. Defaults to today (UTC).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2027-06-02',
    format: 'date',
    description: 'Inclusive end date. Defaults to today + 364 days (UTC) — 365-day window.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
