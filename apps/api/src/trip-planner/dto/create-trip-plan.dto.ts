import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { TripPlanPreferencesDto } from './update-trip-plan.dto';

export class CreateTripPlanDto {
  @ApiPropertyOptional({ example: 'Yerevan' })
  @ValidateIf((dto: CreateTripPlanDto) => !dto.bookingId)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Yerevan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: '2026-09-10' })
  @ValidateIf((dto: CreateTripPlanDto) => !dto.bookingId)
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkIn?: string;

  @ApiPropertyOptional({ example: '2026-09-14' })
  @ValidateIf((dto: CreateTripPlanDto) => !dto.bookingId)
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  checkOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  bookingId?: string;

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
