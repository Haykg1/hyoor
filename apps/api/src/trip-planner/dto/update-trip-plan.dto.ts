import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TripPlanPreferencesDto {
  @ApiPropertyOptional({ example: 'balanced' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsIn(['packed', 'balanced', 'relaxed'])
  pace?: string;

  @ApiPropertyOptional({ example: 'wine' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsIn(['yes', 'no', 'wine'])
  alcohol?: string;

  @ApiPropertyOptional({ example: 'mix' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsIn(['historical', 'modern', 'mix'])
  era?: string;

  @ApiPropertyOptional({ example: 'nature' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsIn(['nature', 'food', 'culture', 'adventure', 'shopping'])
  focus?: string;
}

export class UpdateTripPlanDto {
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
