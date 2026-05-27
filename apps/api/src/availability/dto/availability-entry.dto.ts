import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class AvailabilityEntryDto {
  @ApiProperty({ example: '2026-06-15', format: 'date' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;

  @ApiPropertyOptional({
    example: 32000,
    minimum: 0,
    description: 'Override nightly price in minor units',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priceOverride?: number;
}
