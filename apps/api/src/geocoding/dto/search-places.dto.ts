import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GeocodingSearchLevels } from '@repo/shared';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchPlacesDto {
  @ApiProperty({ example: 'Ազատության', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;

  @ApiPropertyOptional({ enum: GeocodingSearchLevels, example: 'any' })
  @IsOptional()
  @IsIn(GeocodingSearchLevels)
  level?: (typeof GeocodingSearchLevels)[number];
}
