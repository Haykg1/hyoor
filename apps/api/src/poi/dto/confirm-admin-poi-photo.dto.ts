import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmAdminPoiPhotoDto {
  @ApiProperty({ example: 'pois/republic_square/photo.jpg', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key!: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}
