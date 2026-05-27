import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConfirmPhotoUploadInput } from '@repo/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ConfirmPhotoUploadDto implements ConfirmPhotoUploadInput {
  @ApiProperty({ example: 'properties/abc123/photo-uuid.jpg', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  key!: string;

  @ApiPropertyOptional({ example: 'Living room', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
