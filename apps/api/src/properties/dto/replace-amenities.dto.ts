import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { AmenityDto } from './amenity.dto';

export class ReplaceAmenitiesDto {
  @ApiProperty({ type: [AmenityDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => AmenityDto)
  amenities!: AmenityDto[];
}
