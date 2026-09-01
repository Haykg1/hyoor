import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

import { TripPlanPreferencesDto } from './update-trip-plan.dto';

export class GenerateTripPlanDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  guestCount?: number;

  @ApiPropertyOptional({ type: TripPlanPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TripPlanPreferencesDto)
  preferences?: TripPlanPreferencesDto;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;
}
