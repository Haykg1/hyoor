import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const ARMENIA_MIN_LAT = 38.8;
const ARMENIA_MAX_LAT = 41.4;
const ARMENIA_MIN_LNG = 43.4;
const ARMENIA_MAX_LNG = 46.8;

export class NearestMetroQueryDto {
  @ApiProperty({ example: 40.178515 })
  @Type(() => Number)
  @IsNumber()
  @Min(ARMENIA_MIN_LAT)
  @Max(ARMENIA_MAX_LAT)
  latitude!: number;

  @ApiProperty({ example: 44.515628 })
  @Type(() => Number)
  @IsNumber()
  @Min(ARMENIA_MIN_LNG)
  @Max(ARMENIA_MAX_LNG)
  longitude!: number;

  @ApiProperty({ example: 'Yerevan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ example: 'Yerevan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;
}
